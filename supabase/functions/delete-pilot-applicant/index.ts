/**
 * Operator-only: permanently delete a declined test / invalid application.
 *
 * Allowed only when assert_pilot_applicant_deletable says deletable.
 * Writes audit event BEFORE deleting records.
 * Deletes platform_access, early_access_applications, then Auth user if present.
 * Never deletes active hotels or rows with operational data.
 */
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requirePlatformOperator } from "../_shared/operator-auth.ts";
import { writeOperatorAuditEvent } from "../_shared/operator-audit.ts";
import {
  UUID_RE,
  loadApplication,
  loadAccessForApplication,
} from "../_shared/pilot-application.ts";

type Body = { applicationId?: string; confirm?: string };

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
    const confirm = String(body.confirm || "").trim();
    if (!UUID_RE.test(applicationId)) {
      return jsonResponse({ ok: false, error: "A valid applicationId is required." }, 400);
    }
    if (confirm !== "DELETE") {
      return jsonResponse({
        ok: false,
        error: "Confirmation required. Pass confirm: \"DELETE\".",
      }, 400);
    }

    const { serviceClient, user: operatorUser } = operator;
    const loaded = await loadApplication(serviceClient, applicationId);
    if (loaded.error) {
      return jsonResponse({ ok: false, error: loaded.error }, 500);
    }
    if (!loaded.row) {
      return jsonResponse({ ok: false, error: "Application not found." }, 404);
    }

    const email = String(loaded.row.email || "").trim().toLowerCase();
    const access = await loadAccessForApplication(serviceClient, applicationId, email);
    if (access.error) {
      return jsonResponse({ ok: false, error: access.error }, 500);
    }
    if (access.row?.access_status === "active") {
      return jsonResponse({
        ok: false,
        code: "ACTIVE_ACCESS",
        error: "Active hotels cannot be deleted from the operator dashboard.",
      }, 409);
    }

    const { data: assertData, error: assertError } = await serviceClient.rpc(
      "assert_pilot_applicant_deletable",
      { p_application_id: applicationId },
    );

    if (assertError) {
      console.error("[delete-pilot-applicant] assert RPC failed:", assertError);
      return jsonResponse({
        ok: false,
        error: "Could not verify deletion eligibility.",
      }, 500);
    }

    const assertion = (assertData || {}) as {
      deletable?: boolean;
      blockers?: string[];
      user_id?: string | null;
      platform_access_id?: string | null;
      founding_status?: string | null;
      access_status?: string | null;
    };

    if (!assertion.deletable) {
      return jsonResponse({
        ok: false,
        code: "DELETE_BLOCKED",
        error:
          "Deletion blocked because linked hotel membership, ownership, or operational data exists.",
        blockers: assertion.blockers || [],
        foundingStatus: assertion.founding_status || loaded.row.founding_status,
        accessStatus: assertion.access_status || access.row?.access_status || null,
      }, 409);
    }

    const previousFounding = String(loaded.row.founding_status || "");
    const previousAccess = String(access.row?.access_status || assertion.access_status || "");
    const authUserId = access.row?.user_id || assertion.user_id || null;
    const platformAccessId = access.row?.id || assertion.platform_access_id || null;

    const audit = await writeOperatorAuditEvent(serviceClient, {
      operatorUserId: operatorUser.id,
      action: "delete_test_application",
      applicationId,
      applicantEmail: email,
      previousFoundingStatus: previousFounding,
      newFoundingStatus: null,
      previousAccessStatus: previousAccess,
      newAccessStatus: null,
      metadata: {
        platform_access_id: platformAccessId,
        auth_user_id: authUserId,
        confirm: "DELETE",
      },
    });

    if (!audit.ok) {
      console.error("[delete-pilot-applicant] Audit write failed; aborting delete:", audit.error);
      return jsonResponse({
        ok: false,
        error: "Delete aborted because the audit event could not be written.",
      }, 500);
    }

    if (platformAccessId) {
      const { error: accessDeleteError } = await serviceClient
        .from("platform_access")
        .delete()
        .eq("id", platformAccessId);
      if (accessDeleteError) {
        console.error("[delete-pilot-applicant] platform_access delete failed:", accessDeleteError);
        return jsonResponse({
          ok: false,
          auditId: audit.auditId,
          error: "Audit written, but platform_access could not be deleted.",
        }, 500);
      }
    }

    const { error: appDeleteError } = await serviceClient
      .from("early_access_applications")
      .delete()
      .eq("id", applicationId);
    if (appDeleteError) {
      console.error("[delete-pilot-applicant] application delete failed:", appDeleteError);
      return jsonResponse({
        ok: false,
        auditId: audit.auditId,
        error: "Audit written, but early_access_applications could not be deleted.",
      }, 500);
    }

    let authUserDeleted = false;
    if (authUserId) {
      const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(authUserId);
      if (authDeleteError) {
        console.error("[delete-pilot-applicant] Auth user delete failed:", authDeleteError);
        return jsonResponse({
          ok: false,
          auditId: audit.auditId,
          applicationDeleted: true,
          platformAccessDeleted: true,
          authUserDeleted: false,
          error:
            "Application records deleted, but the Auth user could not be removed. Resolve Auth delete manually.",
          authError: authDeleteError.message,
        }, 500);
      }
      authUserDeleted = true;
    }

    return jsonResponse({
      ok: true,
      applicationId,
      email,
      auditId: audit.auditId,
      platformAccessDeleted: !!platformAccessId,
      applicationDeleted: true,
      authUserDeleted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    console.error("[delete-pilot-applicant] Unhandled error:", message);
    return jsonResponse({ ok: false, error: "Delete could not be completed." }, 500);
  }
});
