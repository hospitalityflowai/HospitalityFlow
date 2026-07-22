import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { readInternalSecretEnv } from "../_shared/internal-auth.ts";

const INTERNAL_SECRET_ENV = "EARLY_ACCESS_EMAILS_INTERNAL_SECRET";
const EMAIL_FUNCTION_NAME = "send-early-access-emails";
const MAX_FIELD_LENGTH = 200;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SubmitBody = {
  firstName?: string;
  email?: string;
  propertyName?: string;
  propertyType?: string;
  roomCount?: number | string | null;
  role?: string;
  source?: string;
};

function trimField(value: unknown, maxLength = MAX_FIELD_LENGTH): string {
  return String(value == null ? "" : value).trim().slice(0, maxLength);
}

function normalizeEmail(value: unknown): string {
  return trimField(value, 320).toLowerCase();
}

function parseRoomCount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10000) {
    return null;
  }
  return parsed;
}

function validateSubmitBody(body: SubmitBody) {
  const firstName = trimField(body.firstName);
  const email = normalizeEmail(body.email);
  const propertyName = trimField(body.propertyName);
  const propertyType = trimField(body.propertyType);
  const role = trimField(body.role);
  const source = trimField(body.source || "early-access-programme") ||
    "early-access-programme";
  const roomCount = parseRoomCount(body.roomCount);

  if (!firstName || !email || !propertyName || !propertyType || !role) {
    return { error: "Missing required application fields." };
  }

  if (!EMAIL_RE.test(email)) {
    return { error: "A valid email address is required." };
  }

  return {
    value: {
      firstName,
      email,
      propertyName,
      propertyType,
      role,
      source,
      roomCount,
    },
  };
}

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
    throw new Error("Internal email secret is not configured.");
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
    let body: SubmitBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    const validated = validateSubmitBody(body);
    if (validated.error || !validated.value) {
      return jsonResponse({ error: validated.error || "Invalid application." }, 400);
    }

    const input = validated.value;
    const { client, supabaseUrl, serviceRoleKey } = createServiceClient();

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
