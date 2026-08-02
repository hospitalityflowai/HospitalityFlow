/**
 * Verify the request JWT belongs to an authorised Hospitality Flow operator.
 * Operators are rows in public.platform_operators (no browser RLS access).
 */
import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type OperatorAuthResult =
  | { ok: true; user: User; serviceClient: SupabaseClient }
  | { ok: false; status: number; error: string };

function createServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service credentials are not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createAnonClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase anon credentials are not configured.");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requirePlatformOperator(
  req: Request,
): Promise<OperatorAuthResult> {
  const authHeader = req.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const jwt = match?.[1]?.trim() || "";

  if (!jwt) {
    return { ok: false, status: 401, error: "Missing operator authorization." };
  }

  let serviceClient: SupabaseClient;
  let anonClient: SupabaseClient;
  try {
    serviceClient = createServiceClient();
    anonClient = createAnonClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Config error.";
    console.error("[operator-auth] Missing credentials:", message);
    return { ok: false, status: 500, error: "Server configuration error." };
  }

  const { data: userData, error: userError } = await anonClient.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return { ok: false, status: 401, error: "Invalid or expired operator session." };
  }

  const user = userData.user;
  const { data: operator, error: operatorError } = await serviceClient
    .from("platform_operators")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (operatorError) {
    console.error("[operator-auth] Operator lookup failed:", operatorError);
    return { ok: false, status: 500, error: "Could not verify operator access." };
  }

  if (!operator?.user_id) {
    return { ok: false, status: 403, error: "Caller is not an authorised operator." };
  }

  // Suspension is a global deny — no emergency operator bypass.
  const email = (user.email || "").trim().toLowerCase();
  let accessStatus: string | null = null;

  const { data: byUser, error: byUserError } = await serviceClient
    .from("platform_access")
    .select("access_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (byUserError) {
    console.error("[operator-auth] platform_access user lookup failed:", byUserError);
    return { ok: false, status: 500, error: "Could not verify operator access." };
  }

  if (byUser?.access_status) {
    accessStatus = String(byUser.access_status);
  } else if (email) {
    const { data: byEmail, error: byEmailError } = await serviceClient
      .from("platform_access")
      .select("access_status")
      .eq("email", email)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (byEmailError) {
      console.error("[operator-auth] platform_access email lookup failed:", byEmailError);
      return { ok: false, status: 500, error: "Could not verify operator access." };
    }

    if (byEmail?.access_status) {
      accessStatus = String(byEmail.access_status);
    }
  }

  if (accessStatus === "suspended") {
    return {
      ok: false,
      status: 403,
      error: "Operator platform access is suspended.",
    };
  }

  return { ok: true, user, serviceClient };
}
