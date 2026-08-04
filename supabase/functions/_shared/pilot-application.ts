/**
 * Shared pilot-application helpers for operator Edge Functions.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ApplicationRow = {
  id: string;
  first_name: string | null;
  email: string | null;
  property_name: string | null;
  founding_status: string | null;
};

export type AccessRow = {
  id: string;
  email: string | null;
  access_status: string | null;
  user_id: string | null;
  early_access_application_id: string | null;
  invited_at: string | null;
  invite_resent_at: string | null;
};

export async function loadApplication(
  serviceClient: SupabaseClient,
  applicationId: string,
): Promise<{ row: ApplicationRow | null; error: string | null }> {
  const { data, error } = await serviceClient
    .from("early_access_applications")
    .select("id, first_name, email, property_name, founding_status")
    .eq("id", applicationId)
    .maybeSingle();

  if (error) {
    return { row: null, error: "Could not load application." };
  }
  return { row: (data as ApplicationRow) || null, error: null };
}

export async function loadAccessForApplication(
  serviceClient: SupabaseClient,
  applicationId: string,
  email: string,
): Promise<{ row: AccessRow | null; error: string | null }> {
  const { data: byApp, error: byAppError } = await serviceClient
    .from("platform_access")
    .select(
      "id, email, access_status, user_id, early_access_application_id, invited_at, invite_resent_at",
    )
    .eq("early_access_application_id", applicationId)
    .maybeSingle();

  if (byAppError) {
    return { row: null, error: "Could not load platform access." };
  }
  if (byApp) {
    return { row: byApp as AccessRow, error: null };
  }

  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) {
    return { row: null, error: null };
  }

  const { data: byEmail, error: byEmailError } = await serviceClient
    .from("platform_access")
    .select(
      "id, email, access_status, user_id, early_access_application_id, invited_at, invite_resent_at",
    )
    .eq("email", normalized)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byEmailError) {
    return { row: null, error: "Could not load platform access." };
  }

  return { row: (byEmail as AccessRow) || null, error: null };
}

export function rpcErrorCode(message: string | undefined | null): string {
  const text = String(message || "");
  if (/ACTIVE_ACCESS/i.test(text)) return "ACTIVE_ACCESS";
  if (/INVALID_TRANSITION/i.test(text)) return "INVALID_TRANSITION";
  if (/not an authorised operator/i.test(text)) return "NOT_OPERATOR";
  if (/Application not found/i.test(text)) return "NOT_FOUND";
  if (/declined and cannot be invited/i.test(text)) return "DECLINED";
  return "RPC_ERROR";
}
