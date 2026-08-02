import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { readInternalSecretEnv } from "../_shared/internal-auth.ts";
import {
  checkSubmitRateLimit,
  clientRateLimitKey,
  validateSubmitBody,
  type EarlyAccessSubmitBody,
} from "../_shared/early-access-submit.ts";

const INTERNAL_SECRET_ENV = "EARLY_ACCESS_EMAILS_INTERNAL_SECRET";
const EMAIL_FUNCTION_NAME = "send-early-access-emails";

function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service credentials are not configured.");
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    client: createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

async function invokeInternalEmailFunction(
  supabaseUrl: string,
  serviceRoleKey: string,
  applicationId: string,
) {
  const internalSecret = readInternalSecretEnv(INTERNAL_SECRET_ENV);
  if (!internalSecret) {
    // Application row is already saved — do not fail the submit path.
    console.error(
      "[submit-early-access-application] Internal email secret missing; skipping email dispatch",
    );
    return {
      status: 503,
      payload: { ok: false, error: "Email dispatch not configured." },
    };
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/${EMAIL_FUNCTION_NAME}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        "X-Early-Access-Internal-Secret": internalSecret,
      },
      body: JSON.stringify({ applicationId }),
    },
  );

  let payload: Record<string, unknown> | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return { status: response.status, payload };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    let body: EarlyAccessSubmitBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    const validated = validateSubmitBody(body);
    if ("error" in validated) {
      return jsonResponse({ error: validated.error }, 400);
    }

    const input = validated.value;
    const { client, supabaseUrl, serviceRoleKey } = createServiceClient();

    // Durable rate limit (DB) — survives Edge isolate restarts.
    // Limit both per-email and per-IP so bursts are capped even when egress IP varies.
    const compositeKey = clientRateLimitKey(req, input.email);
    const emailKey = `email:${input.email}`;
    const memoryRate = checkSubmitRateLimit(compositeKey);

    const emailLimit = await client.rpc("check_early_access_submit_rate_limit", {
      p_rate_key: emailKey,
      p_window_seconds: 600,
      p_max_hits: 8,
    });
    const ipLimit = await client.rpc("check_early_access_submit_rate_limit", {
      p_rate_key: compositeKey,
      p_window_seconds: 600,
      p_max_hits: 8,
    });

    if (emailLimit.error || ipLimit.error) {
      console.error(
        "[submit-early-access-application] Rate-limit RPC failed:",
        emailLimit.error || ipLimit.error,
      );
      return jsonResponse({ ok: false, error: "Application could not be saved." }, 500);
    }

    if (!memoryRate.allowed || emailLimit.data !== true || ipLimit.data !== true) {
      console.warn("[submit-early-access-application] Rate limit hit", {
        emailDomain: input.email.includes("@")
          ? input.email.split("@")[1]
          : "unknown",
        memoryAllowed: memoryRate.allowed,
        emailAllowed: emailLimit.data === true,
        ipAllowed: ipLimit.data === true,
      });
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Too many application attempts. Please try again later.",
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(memoryRate.retryAfterSec || 60),
          },
        },
      );
    }

    const { data: applicationId, error: submitError } = await client.rpc(
      "submit_early_access_application",
      {
        p_first_name: input.firstName,
        p_email: input.email,
        p_property_name: input.propertyName,
        p_property_type: input.propertyType,
        p_room_count: input.roomCount,
        p_role: input.role,
        p_source: input.source,
      },
    );

    if (submitError || !applicationId) {
      console.error(
        "[submit-early-access-application] RPC failed:",
        submitError,
      );
      return jsonResponse({ ok: false, error: "Application could not be saved." }, 500);
    }

    console.log("[submit-early-access-application] Application saved", {
      applicationId,
      emailDomain: input.email.includes("@") ? input.email.split("@")[1] : "unknown",
    });

    const emailResult = await invokeInternalEmailFunction(
      supabaseUrl,
      serviceRoleKey,
      String(applicationId),
    );

    if (emailResult.status >= 400 || emailResult.payload?.ok === false) {
      console.error("[submit-early-access-application] Email dispatch failed:", {
        status: emailResult.status,
        payload: emailResult.payload,
        applicationId,
      });
      return jsonResponse({
        ok: true,
        applicationSaved: true,
        emailWarning: true,
      });
    }

    return jsonResponse({
      ok: true,
      applicationSaved: true,
      emailWarning: emailResult.payload?.emailWarning === true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    console.error("[submit-early-access-application] Unhandled error:", message);
    return jsonResponse({ ok: false, error: "Application could not be saved." }, 500);
  }
});
