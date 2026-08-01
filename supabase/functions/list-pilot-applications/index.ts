/**
 * Operator-only: list Founding Pilot applications with related platform_access status.
 *
 * Security:
 * - Requires a valid operator JWT (platform_operators row via requirePlatformOperator).
 * - Uses service role only inside this function (never exposed to the browser).
 * - Returns a restricted field shape only — no hotel membership, Hotel Brain,
 *   handovers, maintenance, or other operational/Zetter data.
 * - Does not open browser SELECT on early_access_applications.
 */
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requirePlatformOperator } from "../_shared/operator-auth.ts";

type ApplicationRow = {
  id: string;
  first_name: string | null;
  email: string | null;
  property_name: string | null;
  property_type: string | null;
  room_count: number | null;
  role: string | null;
  founding_status: string | null;
  submitted_at: string | null;
};

type AccessRow = {
  id: string;
  email: string | null;
  access_status: string | null;
  early_access_application_id: string | null;
  updated_at: string | null;
};

type ListedApplication = {
  id: string;
  first_name: string | null;
  email: string | null;
  property_name: string | null;
  property_type: string | null;
  room_count: number | null;
  role: string | null;
  founding_status: string | null;
  created_at: string | null;
  access_status: string | null;
};

function pendingRank(app: ListedApplication): number {
  const founding = String(app.founding_status || "").toLowerCase();
  const access = String(app.access_status || "").toLowerCase();

  if (founding === "declined") return 2;
  if (access === "invited" || access === "active" || access === "suspended") return 1;
  if (founding === "pending") return 0;
  return 1;
}

function sortApplications(a: ListedApplication, b: ListedApplication): number {
  const rankDiff = pendingRank(a) - pendingRank(b);
  if (rankDiff !== 0) return rankDiff;

  const aTime = Date.parse(a.created_at || "") || 0;
  const bTime = Date.parse(b.created_at || "") || 0;
  return bTime - aTime;
}

function resolveAccessStatus(
  application: ApplicationRow,
  byAppId: Map<string, AccessRow>,
  byEmail: Map<string, AccessRow>,
): string | null {
  const byId = byAppId.get(application.id);
  if (byId?.access_status) return byId.access_status;

  const email = String(application.email || "").trim().toLowerCase();
  if (!email) return null;

  const byMail = byEmail.get(email);
  return byMail?.access_status || null;
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

    const { serviceClient } = operator;

    const { data: applications, error: appError } = await serviceClient
      .from("early_access_applications")
      .select(
        "id, first_name, email, property_name, property_type, room_count, role, founding_status, submitted_at",
      );

    if (appError) {
      console.error("[list-pilot-applications] Application list failed:", appError);
      return jsonResponse({ ok: false, error: "Could not load applications." }, 500);
    }

    const rows = (applications || []) as ApplicationRow[];
    if (rows.length === 0) {
      return jsonResponse({ ok: true, applications: [] as ListedApplication[] });
    }

    const applicationIds = rows.map((row) => row.id);
    const emails = Array.from(
      new Set(
        rows
          .map((row) => String(row.email || "").trim().toLowerCase())
          .filter(Boolean),
      ),
    );

    // Prefer application_id match, then email — same resolution order as invite-pilot-applicant.
    const { data: accessByAppRows, error: accessByAppError } = await serviceClient
      .from("platform_access")
      .select("id, email, access_status, early_access_application_id, updated_at")
      .in("early_access_application_id", applicationIds);

    if (accessByAppError) {
      console.error(
        "[list-pilot-applications] platform_access by application failed:",
        accessByAppError,
      );
      return jsonResponse({ ok: false, error: "Could not load platform access." }, 500);
    }

    let accessByEmailRows: AccessRow[] = [];
    if (emails.length > 0) {
      const { data: emailRows, error: accessByEmailError } = await serviceClient
        .from("platform_access")
        .select("id, email, access_status, early_access_application_id, updated_at")
        .in("email", emails);

      if (accessByEmailError) {
        console.error(
          "[list-pilot-applications] platform_access by email failed:",
          accessByEmailError,
        );
        return jsonResponse({ ok: false, error: "Could not load platform access." }, 500);
      }

      accessByEmailRows = (emailRows || []) as AccessRow[];
    }

    const accessList = [
      ...((accessByAppRows || []) as AccessRow[]),
      ...accessByEmailRows,
    ];
    const byAppId = new Map<string, AccessRow>();
    const byEmail = new Map<string, AccessRow>();

    for (const access of accessList) {
      if (access.early_access_application_id) {
        const existing = byAppId.get(access.early_access_application_id);
        if (
          !existing ||
          (Date.parse(access.updated_at || "") || 0) >=
            (Date.parse(existing.updated_at || "") || 0)
        ) {
          byAppId.set(access.early_access_application_id, access);
        }
      }

      const emailKey = String(access.email || "").trim().toLowerCase();
      if (emailKey) {
        const existing = byEmail.get(emailKey);
        if (
          !existing ||
          (Date.parse(access.updated_at || "") || 0) >=
            (Date.parse(existing.updated_at || "") || 0)
        ) {
          byEmail.set(emailKey, access);
        }
      }
    }

    const listed: ListedApplication[] = rows.map((row) => ({
      id: row.id,
      first_name: row.first_name,
      email: row.email,
      property_name: row.property_name,
      property_type: row.property_type,
      room_count: row.room_count,
      role: row.role,
      founding_status: row.founding_status,
      // API contract uses created_at; table column is submitted_at.
      created_at: row.submitted_at,
      access_status: resolveAccessStatus(row, byAppId, byEmail),
    }));

    listed.sort(sortApplications);

    return jsonResponse({
      ok: true,
      applications: listed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    console.error("[list-pilot-applications] Unhandled error:", message);
    return jsonResponse({ ok: false, error: "Applications could not be loaded." }, 500);
  }
});
