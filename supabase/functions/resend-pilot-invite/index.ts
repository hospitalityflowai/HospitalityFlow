/**
 * Operator-only: resend a setup-password / invite link for an invited applicant.
 *
 * Allowed only when founding_status=accepted and access_status=invited.
 * Preserves both statuses. Updates invite_resent_at.
 * Never downgrades active access.
 */
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requirePlatformOperator } from "../_shared/operator-auth.ts";
import { resolveInviteRedirectTo } from "../_shared/safe-redirect.ts";
import { sendEmail } from "../_shared/resend.ts";
import { writeOperatorAuditEvent } from "../_shared/operator-audit.ts";
import {
  UUID_RE,
  loadApplication,
  loadAccessForApplication,
} from "../_shared/pilot-application.ts";

type Body = { applicationId?: string };

function isAlreadyRegisteredError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const authError = error as { message?: string; code?: string };
  const message = String(authError.message || "").toLowerCase();
  const code = String(authError.code || "").toLowerCase();
  return (
    code === "email_exists" ||
    code === "user_already_exists" ||
    /already\s+(?:been\s+)?registered|already exists|email.*exists/i.test(message)
  );
}

function buildResendEmailHtml(opts: {
  firstName: string;
  propertyName: string;
  actionLink: string;
}): string {
  const name = opts.firstName || "there";
  const property = opts.propertyName || "your hotel";
  return `
    <p>Hi ${name},</p>
    <p>Here is a fresh Hospitality Flow invitation link for <strong>${property}</strong>.</p>
    <p><a href="${opts.actionLink}">Set your password and open your account</a></p>
    <p>If you did not expect this email, you can ignore it.</p>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  try {
    const operator = await requirePlatformOperator(req);
    if (!operator.ok) {
      return jsonResponse({ ok: false, error: operator.error }, operator.status);
    }

    let body: Body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400);
    }

    const applicationId = String(body.applicationId || "").trim();
    if (!UUID_RE.test(applicationId)) {
      return jsonResponse({ ok: false, error: "A valid applicationId is required." }, 400);
    }

    const { serviceClient, user: operatorUser } = operator;
    const loaded = await loadApplication(serviceClient, applicationId);
    if (loaded.error) {
      return jsonResponse({ ok: false, error: loaded.error }, 500);
    }
    if (!loaded.row) {
      return jsonResponse({ ok: false, error: "Application not found." }, 404);
    }

    const founding = String(loaded.row.founding_status || "").toLowerCase();
    const email = String(loaded.row.email || "").trim().toLowerCase();
    if (!email) {
      return jsonResponse({ ok: false, error: "Application has no email address." }, 400);
    }

    const access = await loadAccessForApplication(serviceClient, applicationId, email);
    if (access.error) {
      return jsonResponse({ ok: false, error: access.error }, 500);
    }
    if (!access.row) {
      return jsonResponse({
        ok: false,
        code: "INVALID_TRANSITION",
        error: "No platform access row found for this application.",
      }, 409);
    }

    const accessStatus = String(access.row.access_status || "").toLowerCase();
    if (accessStatus === "active") {
      return jsonResponse({
        ok: false,
        code: "ACTIVE_ACCESS",
        error: "Active hotels cannot be resent an invitation.",
      }, 409);
    }
    if (founding === "declined" || accessStatus === "suspended") {
      return jsonResponse({
        ok: false,
        code: "INVALID_TRANSITION",
        error: "Declined applications cannot be resent. Restore to pending first.",
      }, 409);
    }
    if (founding !== "accepted" || accessStatus !== "invited") {
      return jsonResponse({
        ok: false,
        code: "INVALID_TRANSITION",
        error: "Resend is only allowed when founding_status=accepted and access_status=invited.",
      }, 409);
    }

    const redirectTo = resolveInviteRedirectTo();
    let inviteSent = false;
    let delivery: "auth_invite" | "generated_invite_email" | "recovery_email" = "auth_invite";
    let actionLink: string | null = null;

    if (access.row.user_id) {
      /* Existing Auth user: generate invite link and email via Resend; fallback to recovery email. */
      const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
        type: "invite",
        email,
        options: { redirectTo },
      });

      if (linkError || !linkData?.properties?.action_link) {
        const { error: recoveryError } = await serviceClient.auth.resetPasswordForEmail(email, {
          redirectTo,
        });
        if (recoveryError) {
          console.error("[resend-pilot-invite] generateLink + recovery failed:", {
            linkError,
            recoveryError,
          });
          return jsonResponse({
            ok: false,
            inviteSent: false,
            error: "Could not send a fresh setup-password link.",
          }, 502);
        }
        inviteSent = true;
        delivery = "recovery_email";
      } else {
        actionLink = String(linkData.properties.action_link);
        const emailed = await sendEmail({
          to: email,
          subject: "Your Hospitality Flow invitation link",
          html: buildResendEmailHtml({
            firstName: String(loaded.row.first_name || ""),
            propertyName: String(loaded.row.property_name || ""),
            actionLink,
          }),
        });
        if (!emailed.ok) {
          const { error: recoveryError } = await serviceClient.auth.resetPasswordForEmail(email, {
            redirectTo,
          });
          if (recoveryError) {
            console.error("[resend-pilot-invite] Resend email + recovery failed:", {
              emailed,
              recoveryError,
            });
            return jsonResponse({
              ok: false,
              inviteSent: false,
              error: "Could not send a fresh setup-password link.",
            }, 502);
          }
          inviteSent = true;
          delivery = "recovery_email";
        } else {
          inviteSent = true;
          delivery = "generated_invite_email";
        }
      }
    } else {
      /* No linked Auth user yet — send a normal Auth invite email. */
      const { error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          first_name: loaded.row.first_name || null,
          property_name: loaded.row.property_name || null,
          early_access_application_id: applicationId,
          invited_by: operatorUser.id,
          resent: true,
        },
      });

      if (inviteError) {
        if (isAlreadyRegisteredError(inviteError)) {
          const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
            type: "invite",
            email,
            options: { redirectTo },
          });
          if (linkError || !linkData?.properties?.action_link) {
            const { error: recoveryError } = await serviceClient.auth.resetPasswordForEmail(email, {
              redirectTo,
            });
            if (recoveryError) {
              return jsonResponse({
                ok: false,
                inviteSent: false,
                error: "Auth user exists but a fresh link could not be sent.",
              }, 502);
            }
            inviteSent = true;
            delivery = "recovery_email";
          } else {
            actionLink = String(linkData.properties.action_link);
            const emailed = await sendEmail({
              to: email,
              subject: "Your Hospitality Flow invitation link",
              html: buildResendEmailHtml({
                firstName: String(loaded.row.first_name || ""),
                propertyName: String(loaded.row.property_name || ""),
                actionLink,
              }),
            });
            if (!emailed.ok) {
              const { error: recoveryError } = await serviceClient.auth.resetPasswordForEmail(email, {
                redirectTo,
              });
              if (recoveryError) {
                return jsonResponse({
                  ok: false,
                  inviteSent: false,
                  error: "Could not send a fresh setup-password link.",
                }, 502);
              }
              inviteSent = true;
              delivery = "recovery_email";
            } else {
              inviteSent = true;
              delivery = "generated_invite_email";
            }
          }
        } else {
          console.error("[resend-pilot-invite] inviteUserByEmail failed:", inviteError);
          return jsonResponse({
            ok: false,
            inviteSent: false,
            error: "Invitation email could not be sent.",
          }, 502);
        }
      } else {
        inviteSent = true;
        delivery = "auth_invite";
      }
    }

    const resentAt = new Date().toISOString();
    const { error: stampError } = await serviceClient
      .from("platform_access")
      .update({
        invite_resent_at: resentAt,
        updated_at: resentAt,
      })
      .eq("id", access.row.id)
      .eq("access_status", "invited");

    if (stampError) {
      console.error("[resend-pilot-invite] invite_resent_at update failed:", stampError);
      return jsonResponse({
        ok: false,
        inviteSent: true,
        statusUpdated: false,
        error:
          "Invite/link was sent, but invite_resent_at could not be updated. Re-run resend after checking platform_access.",
      }, 500);
    }

    /* Confirm statuses were not mutated */
    const verify = await loadAccessForApplication(serviceClient, applicationId, email);
    if (verify.row?.access_status === "active") {
      return jsonResponse({
        ok: false,
        code: "ACTIVE_ACCESS",
        error: "Access became active unexpectedly; no further changes made.",
      }, 409);
    }

    const audit = await writeOperatorAuditEvent(serviceClient, {
      operatorUserId: operatorUser.id,
      action: "resend_invite",
      applicationId,
      applicantEmail: email,
      previousFoundingStatus: "accepted",
      newFoundingStatus: "accepted",
      previousAccessStatus: "invited",
      newAccessStatus: "invited",
      metadata: {
        delivery,
        invite_resent_at: resentAt,
        has_action_link: !!actionLink,
      },
    });

    if (!audit.ok) {
      console.error("[resend-pilot-invite] Audit write failed after successful resend:", audit.error);
    }

    return jsonResponse({
      ok: true,
      inviteSent,
      applicationId,
      email,
      foundingStatus: "accepted",
      accessStatus: "invited",
      inviteResentAt: resentAt,
      delivery,
      auditId: audit.ok ? audit.auditId : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    console.error("[resend-pilot-invite] Unhandled error:", message);
    return jsonResponse({ ok: false, error: "Resend could not be completed." }, 500);
  }
});
