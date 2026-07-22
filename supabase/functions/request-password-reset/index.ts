import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const NEUTRAL_SUCCESS_MESSAGE =
  "If this email is eligible, a reset link will be sent shortly.";

/**
 * TEMPORARY DEVELOPMENT / QA ONLY
 * --------------------------------
 * Password-reset email rate limits are enforced by Supabase Auth (GoTrue), not
 * Resend and not this Edge Function. During QA we can bypass Auth email sending
 * when PASSWORD_RESET_DEV_RELAXED=true AND PASSWORD_RESET_DEV_KEY match the
 * X-HF-DEV-RESET-KEY header. That path uses auth.admin.generateLink() and logs
 * the recovery URL to function logs instead of sending mail.
 *
 * BEFORE PUBLIC LAUNCH:
 * - Unset PASSWORD_RESET_DEV_RELAXED and PASSWORD_RESET_DEV_KEY function secrets
 * - Remove js/dev-flags.js from local machines or set PASSWORD_RESET_DEV_RELAXED=false
 * - Restore normal Supabase Auth rate limits in the dashboard
 */

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function neutralSuccessResponse() {
  return jsonResponse({
    ok: true,
    message: NEUTRAL_SUCCESS_MESSAGE,
  });
}

function isDevRelaxedRequest(req: Request): boolean {
  const devRelaxed = Deno.env.get("PASSWORD_RESET_DEV_RELAXED") === "true";
  const devKey = Deno.env.get("PASSWORD_RESET_DEV_KEY") || "";
  if (!devRelaxed || !devKey) {
    return false;
  }
  return req.headers.get("X-HF-DEV-RESET-KEY") === devKey;
}

function isEmailRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const authError = error as {
    status?: number;
    code?: string;
    message?: string;
    error_code?: string;
  };

  if (authError.status === 429) {
    return true;
  }

  const code = String(authError.code || authError.error_code || "").toLowerCase();
  if (code === "over_email_send_rate_limit") {
    return true;
  }

  const message = String(authError.message || "").toLowerCase();
  return /rate limit|too many requests|over_email_send_rate_limit/.test(message);
}

function logResetDeliveryFailure(
  reason: string,
  error: unknown,
  email: string,
): void {
  const authError = error && typeof error === "object"
    ? error as { status?: number; code?: string; message?: string; error_code?: string }
    : null;

  console.error("[request-password-reset] Reset delivery failed:", {
    reason,
    emailDomain: email.includes("@") ? email.split("@")[1] : "unknown",
    status: authError?.status ?? null,
    code: authError?.code || authError?.error_code || null,
    message: authError?.message || null,
  });
}

function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service credentials are not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function deliverPasswordReset(
  supabase: ReturnType<typeof createClient>,
  email: string,
  redirectTo: string,
  devRelaxed: boolean,
): Promise<{ ok: boolean; error: unknown | null }> {
  if (devRelaxed) {
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: redirectTo || undefined,
      },
    });

    if (error) {
      return { ok: false, error };
    }

    const actionLink = data?.properties?.action_link || null;
    console.warn("[request-password-reset][DEV-QA] Recovery link generated without sending email:", {
      emailDomain: email.includes("@") ? email.split("@")[1] : "unknown",
      actionLink,
    });

    return { ok: true, error: null };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || undefined,
  });

  return { ok: !error, error: error || null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    let body: { email?: string; redirectTo?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    const email = normalizeEmail(body.email);
    const redirectTo = typeof body.redirectTo === "string" ? body.redirectTo.trim() : "";
    const devRelaxed = isDevRelaxedRequest(req);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: "A valid email address is required." }, 400);
    }

    const supabase = createServiceClient();

    const { data: allowed, error: allowError } = await supabase.rpc(
      "is_password_reset_allowed",
      { p_email: email },
    );

    if (allowError) {
      console.error("[request-password-reset] Access check failed:", allowError);
      return jsonResponse({ error: "Could not process password reset request." }, 500);
    }

    if (!allowed) {
      console.log("[request-password-reset] Reset not sent (access not allowed)", {
        emailDomain: email.includes("@") ? email.split("@")[1] : "unknown",
      });
      return neutralSuccessResponse();
    }

    const delivery = await deliverPasswordReset(supabase, email, redirectTo, devRelaxed);

    if (!delivery.ok && delivery.error) {
      if (isEmailRateLimitError(delivery.error)) {
        console.error("[request-password-reset] Supabase Auth rate limit:", {
          status: 429,
          code: "over_email_send_rate_limit",
          emailDomain: email.includes("@") ? email.split("@")[1] : "unknown",
          hint: devRelaxed
            ? null
            : "Enable PASSWORD_RESET_DEV_RELAXED QA mode or raise Auth rate limits in Supabase dashboard.",
        });
      } else {
        logResetDeliveryFailure(
          devRelaxed ? "admin_generate_link" : "reset_password_for_email",
          delivery.error,
          email,
        );
      }
      return neutralSuccessResponse();
    }

    console.log("[request-password-reset] Reset delivery complete", {
      emailDomain: email.includes("@") ? email.split("@")[1] : "unknown",
      mode: devRelaxed ? "dev-generate-link" : "auth-email",
    });

    return neutralSuccessResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    console.error("[request-password-reset] Unhandled error:", message);
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
