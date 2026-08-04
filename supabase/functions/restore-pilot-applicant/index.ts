/**
 * Operator-only: restore a declined application to pending.
 * Requires founding_status=declined and access_status=suspended.
 * Does not send an invitation.
 */
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requirePlatformOperator } from "../_shared/operator-auth.ts";
import {
  UUID_RE,
  loadApplication,
  loadAccessForApplication,
  rpcErrorCode,
} from "../_shared/pilot-application.ts";

type Body = { applicationId?: string };

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

    const email = String(loaded.row.email || "").trim().toLowerCase();
    const access = await loadAccessForApplication(serviceClient, applicationId, email);
    if (access.error) {
      return jsonResponse({ ok: false, error: access.error }, 500);
    }
    if (access.row?.access_status === "active") {
      return jsonResponse({
        ok: false,
        code: "ACTIVE_ACCESS",
        error: "Active hotels cannot be restored through this path.",
      }, 409);
    }

    const { data, error } = await serviceClient.rpc("restore_pilot_applicant", {
      p_application_id: applicationId,
      p_operator_user_id: operatorUser.id,
    });

    if (error) {
      const code = rpcErrorCode(error.message);
      const status = code === "ACTIVE_ACCESS" || code === "INVALID_TRANSITION" ? 409 : 500;
      console.error("[restore-pilot-applicant] RPC failed:", error);
      return jsonResponse({
        ok: false,
        code,
        error: error.message || "Restore failed.",
      }, status);
    }

    return jsonResponse({
      ok: true,
      applicationId,
      email,
      inviteSent: false,
      result: data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    console.error("[restore-pilot-applicant] Unhandled error:", message);
    return jsonResponse({ ok: false, error: "Restore could not be completed." }, 500);
  }
});
