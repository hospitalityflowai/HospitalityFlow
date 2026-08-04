/**
 * Operator-only: decline a pending or invited Founding Pilot application.
 * Sets founding_status=declined and access_status=suspended.
 * Preserves Auth users. Never declines active hotels.
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
        error: "Active hotels cannot be declined.",
      }, 409);
    }

    const { data, error } = await serviceClient.rpc("mark_pilot_applicant_declined", {
      p_application_id: applicationId,
      p_operator_user_id: operatorUser.id,
    });

    if (error) {
      const code = rpcErrorCode(error.message);
      const status = code === "ACTIVE_ACCESS" || code === "INVALID_TRANSITION" ? 409 : 500;
      console.error("[decline-pilot-applicant] RPC failed:", error);
      return jsonResponse({
        ok: false,
        code,
        error: error.message || "Decline failed.",
      }, status);
    }

    return jsonResponse({
      ok: true,
      applicationId,
      email,
      result: data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    console.error("[decline-pilot-applicant] Unhandled error:", message);
    return jsonResponse({ ok: false, error: "Decline could not be completed." }, 500);
  }
});
