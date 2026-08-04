/**
 * Operator-only: approve a Founding Pilot application and send a Supabase Auth invitation.
 *
 * Security:
 * - Requires a valid operator JWT (platform_operators row).
 * - Uses service role only inside this function (never exposed to the browser).
 * - Marks platform_access as invited ONLY after Auth invitation succeeds.
 */
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requirePlatformOperator } from "../_shared/operator-auth.ts";
import { resolveInviteRedirectTo } from "../_shared/safe-redirect.ts";
import { writeOperatorAuditEvent } from "../_shared/operator-audit.ts";

type InviteBody = {
  applicationId?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getInviteRedirectTo(): string {
  return resolveInviteRedirectTo();
}

function isAlreadyRegisteredError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const authError = error as { message?: string; code?: string; status?: number };
  const message = String(authError.message || "").toLowerCase();
  const code = String(authError.code || "").toLowerCase();
  return (
    code === "email_exists" ||
    code === "user_already_exists" ||
    /already\s+(?:been\s+)?registered|already exists|email.*exists/i.test(message)
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const operator = await requirePlatformOperator(req);
    if (!operator.ok) {
      return jsonResponse({ ok: false, error: operator.error }, operator.status);
    }

    let body: InviteBody;
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

    const { data: application, error: appError } = await serviceClient
      .from("early_access_applications")
      .select(
        "id, first_name, email, property_name, founding_status",
      )
      .eq("id", applicationId)
      .maybeSingle();

    if (appError) {
      console.error("[invite-pilot-applicant] Application lookup failed:", appError);
      return jsonResponse({ ok: false, error: "Could not load application." }, 500);
    }

    if (!application) {
      return jsonResponse({ ok: false, error: "Application not found." }, 404);
    }

    if (application.founding_status === "declined") {
      return jsonResponse({
        ok: false,
        error: "Application was declined and cannot be invited.",
      }, 409);
    }

    const email = String(application.email || "").trim().toLowerCase();
    if (!email) {
      return jsonResponse({ ok: false, error: "Application has no email address." }, 400);
    }

    let accessRow: {
      id: string;
      access_status: string;
    } | null = null;

    const { data: accessByApp, error: accessByAppError } = await serviceClient
      .from("platform_access")
      .select("id, access_status")
      .eq("early_access_application_id", applicationId)
      .maybeSingle();

    if (accessByAppError) {
      console.error(
        "[invite-pilot-applicant] platform_access lookup by application failed:",
        accessByAppError,
      );
      return jsonResponse({ ok: false, error: "Could not load platform access." }, 500);
    }

    accessRow = accessByApp;

    if (!accessRow) {
      const { data: accessByEmail, error: accessByEmailError } = await serviceClient
        .from("platform_access")
        .select("id, access_status")
        .eq("email", email)
        .maybeSingle();

      if (accessByEmailError) {
        console.error(
          "[invite-pilot-applicant] platform_access lookup by email failed:",
          accessByEmailError,
        );
        return jsonResponse({ ok: false, error: "Could not load platform access." }, 500);
      }

      accessRow = accessByEmail;
    }

    if (accessRow?.access_status === "suspended") {
      return jsonResponse({
        ok: false,
        error: "Applicant access is suspended.",
      }, 409);
    }

    /*
     * Already active: reconcile founding_status (never downgrade access),
     * then refuse a new invite.
     */
    if (accessRow?.access_status === "active") {
      const { data: reconcileData, error: reconcileError } = await serviceClient.rpc(
        "mark_pilot_applicant_invited",
        {
          p_application_id: applicationId,
          p_operator_user_id: operatorUser.id,
        },
      );

      if (reconcileError) {
        console.error(
          "[invite-pilot-applicant] Active applicant founding reconcile failed:",
          reconcileError,
        );
        return jsonResponse({
          ok: false,
          alreadyActive: true,
          statusUpdated: false,
          error:
            "Applicant already has an active workspace, and application status could not be reconciled.",
        }, 409);
      }

      return jsonResponse({
        ok: false,
        alreadyActive: true,
        statusUpdated: true,
        applicationId,
        email,
        accessStatus: "active",
        markResult: reconcileData,
        error: "Applicant already has an active workspace.",
      }, 409);
    }

    /*
     * Already invited: do not resend Auth invite, but always reconcile
     * founding_status → accepted (and keep access_status invited).
     */
    if (accessRow?.access_status === "invited") {
      const { data: markData, error: markError } = await serviceClient.rpc(
        "mark_pilot_applicant_invited",
        {
          p_application_id: applicationId,
          p_operator_user_id: operatorUser.id,
        },
      );

      if (markError) {
        console.error(
          "[invite-pilot-applicant] Already-invited reconcile failed:",
          markError,
        );
        return jsonResponse({
          ok: false,
          alreadyInvited: true,
          inviteSent: false,
          statusUpdated: false,
          error:
            "Applicant is already invited, but application status could not be reconciled. Fix founding_status and access_status together, then retry.",
        }, 500);
      }

      return jsonResponse({
        ok: true,
        alreadyInvited: true,
        inviteSent: false,
        statusUpdated: true,
        applicationId,
        email,
        accessStatus: "invited",
        markResult: markData,
        message:
          "Applicant is already invited. Application founding_status reconciled to accepted. No new invite email sent.",
      });
    }

    const redirectTo = getInviteRedirectTo();
    const { data: inviteData, error: inviteError } = await serviceClient.auth.admin
      .inviteUserByEmail(email, {
        redirectTo,
        data: {
          first_name: application.first_name || null,
          property_name: application.property_name || null,
          early_access_application_id: applicationId,
          invited_by: operatorUser.id,
        },
      });

    if (inviteError) {
      if (isAlreadyRegisteredError(inviteError)) {
        // Auth user exists (prior invite / manual create). Mark invited only now —
        // never mark invited when a brand-new invite email failed for other reasons.
        const { data: markData, error: markError } = await serviceClient.rpc(
          "mark_pilot_applicant_invited",
          {
            p_application_id: applicationId,
            p_operator_user_id: operatorUser.id,
          },
        );

        if (markError) {
          console.error(
            "[invite-pilot-applicant] Status update failed after existing-user detect:",
            markError,
          );
          return jsonResponse({
            ok: false,
            inviteSent: false,
            alreadyRegistered: true,
            statusUpdated: false,
            error:
              "Auth user already exists, but platform access could not be marked invited. Fix status manually, then ask the user to reset their password.",
          }, 500);
        }

        console.warn(
          "[invite-pilot-applicant] Auth user already registered; marked invited without new invite email.",
          { applicationId, emailDomain: email.split("@")[1] || "unknown" },
        );

        /* Best-effort audit — never fail the invite response if logging fails. */
        const auditExisting = await writeOperatorAuditEvent(serviceClient, {
          operatorUserId: operatorUser.id,
          action: "approve_invite",
          applicationId,
          applicantEmail: email,
          previousFoundingStatus: application.founding_status,
          newFoundingStatus: "accepted",
          previousAccessStatus: accessRow?.access_status || null,
          newAccessStatus: "invited",
          metadata: { alreadyRegistered: true, inviteSent: false },
        });
        if (!auditExisting.ok) {
          console.error(
            "[invite-pilot-applicant] Approve audit failed (alreadyRegistered):",
            auditExisting.error,
          );
        }

        return jsonResponse({
          ok: true,
          inviteSent: false,
          alreadyRegistered: true,
          statusUpdated: true,
          applicationId,
          email,
          accessStatus: "invited",
          markResult: markData,
          auditId: auditExisting.ok ? auditExisting.auditId : null,
          message:
            "Auth user already existed. Marked invited. Ask the applicant to use the prior invite email or password reset.",
        });
      }

      console.error("[invite-pilot-applicant] inviteUserByEmail failed:", {
        applicationId,
        emailDomain: email.split("@")[1] || "unknown",
        message: inviteError.message,
        code: (inviteError as { code?: string }).code || null,
      });

      // Critical: do NOT mark invited when invitation email failed.
      return jsonResponse({
        ok: false,
        inviteSent: false,
        statusUpdated: false,
        error: "Invitation email could not be sent. Application left pending.",
      }, 502);
    }

    const { data: markData, error: markError } = await serviceClient.rpc(
      "mark_pilot_applicant_invited",
      {
        p_application_id: applicationId,
        p_operator_user_id: operatorUser.id,
      },
    );

    if (markError) {
      console.error(
        "[invite-pilot-applicant] CRITICAL: invite sent but status update failed:",
        {
          applicationId,
          emailDomain: email.split("@")[1] || "unknown",
          invitedUserId: inviteData?.user?.id || null,
          markError,
        },
      );
      return jsonResponse({
        ok: false,
        inviteSent: true,
        statusUpdated: false,
        invitedUserId: inviteData?.user?.id || null,
        error:
          "Invitation email was sent, but access status could not be updated. Re-run this function or set platform_access to invited manually.",
      }, 500);
    }

    console.log("[invite-pilot-applicant] Invite sent and status marked invited", {
      applicationId,
      emailDomain: email.split("@")[1] || "unknown",
      operatorUserId: operatorUser.id,
      invitedUserId: inviteData?.user?.id || null,
    });

    /* Best-effort audit — never fail the invite response if logging fails. */
    const auditApprove = await writeOperatorAuditEvent(serviceClient, {
      operatorUserId: operatorUser.id,
      action: "approve_invite",
      applicationId,
      applicantEmail: email,
      previousFoundingStatus: application.founding_status,
      newFoundingStatus: "accepted",
      previousAccessStatus: accessRow?.access_status || null,
      newAccessStatus: "invited",
      metadata: {
        inviteSent: true,
        invitedUserId: inviteData?.user?.id || null,
      },
    });
    if (!auditApprove.ok) {
      console.error(
        "[invite-pilot-applicant] Approve audit failed:",
        auditApprove.error,
      );
    }

    return jsonResponse({
      ok: true,
      inviteSent: true,
      statusUpdated: true,
      applicationId,
      email,
      accessStatus: "invited",
      invitedUserId: inviteData?.user?.id || null,
      markResult: markData,
      auditId: auditApprove.ok ? auditApprove.auditId : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    console.error("[invite-pilot-applicant] Unhandled error:", message);
    return jsonResponse({ ok: false, error: "Invitation could not be completed." }, 500);
  }
});
