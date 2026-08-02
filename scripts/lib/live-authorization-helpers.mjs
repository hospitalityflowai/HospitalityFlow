/**
 * Helpers for Launch Gate #3 live authorization proof suite.
 * Reuses safety gates, redaction, REST/Auth clients from live RLS + Auth suites.
 * Never logs passwords, JWTs, refresh tokens, or API keys.
 */
import {
  loadEnvFiles,
  assertSafeTestEnvironment,
  createRestClient,
  createReporter,
  makeRunId,
  isDeniedOrEmpty,
  isEmptySelect,
  isRlsDenial,
  HarnessSetupError,
  formatResultDiagnostic,
  describeConfigSafely,
  PRODUCTION_PROJECT_REFS
} from "./live-rls-test-helpers.mjs";
import {
  assertAuthTestProject,
  EXPECTED_TEST_PROJECT_REF,
  createSession,
  invokeEdgeFunction,
  suiteEmail
} from "./live-auth-test-helpers.mjs";
import {
  resolveInternalRedirect,
  DEFAULT_POST_AUTH_ROUTE,
  OPERATOR_ROUTE,
  ALLOWED_POST_AUTH_ROUTES
} from "./safe-redirect.mjs";

export {
  loadEnvFiles,
  assertSafeTestEnvironment,
  createRestClient,
  createReporter,
  makeRunId,
  isDeniedOrEmpty,
  isEmptySelect,
  isRlsDenial,
  HarnessSetupError,
  formatResultDiagnostic,
  describeConfigSafely,
  PRODUCTION_PROJECT_REFS,
  assertAuthTestProject,
  EXPECTED_TEST_PROJECT_REF,
  createSession,
  invokeEdgeFunction,
  suiteEmail,
  resolveInternalRedirect,
  DEFAULT_POST_AUTH_ROUTE,
  OPERATOR_ROUTE,
  ALLOWED_POST_AUTH_ROUTES
};

export const AUTHZ_HOTEL_PREFIX = "HF_AUTHZ_TEST_";
export const OWNER_MODEL = {
  /** Current product model — do not invent new owner restrictions in this suite. */
  code: "A",
  summary:
    "All hotel members have equal operational permissions (Brain/handovers/maintenance); only hotel details update is owner-restricted (RLS hotels_update_owner + update_hotel_workspace)."
};

export function authzHotelName(kind, runId) {
  return `${AUTHZ_HOTEL_PREFIX}${kind}_${runId}`;
}

export function authzMarker(kind, runId) {
  return `hf-authz:${kind}:${runId}`;
}

/** True when PostgREST/RPC mutation was denied or returned empty under RLS. */
export function isPrivilegeDenied(result) {
  if (!result) return false;
  if (result.networkError) return false;
  if (isRlsDenial(result) || isDeniedOrEmpty(result)) return true;
  // PATCH/INSERT with return=representation and zero rows ⇒ RLS filtered write
  if (result.ok && Array.isArray(result.body) && result.body.length === 0) return true;
  if (result.ok === false) {
    const status = result.status;
    if (status === 401 || status === 403 || status === 404 || status === 409) return true;
    const msg = JSON.stringify(result.body || {}).toLowerCase();
    if (
      /permission denied|row-level security|42501|pgrst|not authorised|not an authorised|suspended|only workspace owners|not authenticated|could not find|must be an authorised operator|not an operator/i.test(
        msg
      )
    ) {
      return true;
    }
    // RPC EXCEPTION often surfaces as 400/500 with SQLSTATE message
    if (status >= 400) return true;
  }
  return false;
}

/**
 * Seed Hotel A (owner + member) and Hotel B (owner only) for authorization proofs.
 * Uses service-role admin client. Tracks IDs on `created`.
 */
export async function seedAuthzFixtures(admin, users, runId, created) {
  async function createHotel(kind, rooms) {
    const name = authzHotelName(kind, runId);
    const result = await admin.insert("hotels", {
      name,
      property_type: "boutique-hotel",
      number_of_rooms: rooms,
      city: authzMarker("city", runId),
      country: "United Kingdom",
      status: "active"
    });
    if (!result.ok || !Array.isArray(result.body) || !result.body[0]) {
      throw new HarnessSetupError(`Failed to seed ${kind}`, result.summary);
    }
    created.hotelIds.push(result.body[0].id);
    return result.body[0];
  }

  async function addMember(hotelId, userId, role) {
    const result = await admin.insert("hotel_members", {
      hotel_id: hotelId,
      user_id: userId,
      role
    });
    if (!result.ok || !Array.isArray(result.body) || !result.body[0]) {
      throw new HarnessSetupError(`Failed to seed membership (${role})`, result.summary);
    }
    if (result.body[0].id) created.membershipIds.push(result.body[0].id);
    return result.body[0];
  }

  // Clear leftover suite hotels
  const prior = await admin.select("hotels", {
    select: "id,name",
    name: `like.${AUTHZ_HOTEL_PREFIX}%`
  });
  if (prior.ok && Array.isArray(prior.body)) {
    for (const h of prior.body) {
      await admin.delete("hotels", { id: `eq.${h.id}` });
    }
  }

  // Strip memberships for fixture users before re-seed (suite-owned hotels only after create)
  for (const u of [users.member, users.ownerA, users.ownerB, users.operator, users.revoked]) {
    if (!u?.id) continue;
    await admin.delete("hotel_members", { user_id: `eq.${u.id}` });
  }

  const hotelA = await createHotel("HotelA", 24);
  const hotelB = await createHotel("HotelB", 36);

  await addMember(hotelA.id, users.ownerA.id, "owner");
  const memberRow = await addMember(hotelA.id, users.member.id, "member");
  await addMember(hotelB.id, users.ownerB.id, "owner");

  const brainA = await admin.insert("hotel_brain_profiles", {
    hotel_id: hotelA.id,
    profile_data: { marker: authzMarker("brainA", runId) },
    schema_version: 4
  });
  if (!brainA.ok) {
    throw new HarnessSetupError("Failed to seed Hotel A Brain", brainA.summary);
  }
  const brainB = await admin.insert("hotel_brain_profiles", {
    hotel_id: hotelB.id,
    profile_data: { marker: authzMarker("brainB", runId) },
    schema_version: 4
  });
  if (!brainB.ok) {
    throw new HarnessSetupError("Failed to seed Hotel B Brain", brainB.summary);
  }

  return { hotelA, hotelB, memberMembershipId: memberRow.id };
}

export async function cleanupAuthzFixtures(admin, created) {
  console.log("\nCleaning up AUTHZ suite fixtures…");
  for (const hotelId of (created.hotelIds || []).filter(Boolean)) {
    await admin.delete("hotels", { id: `eq.${hotelId}` });
  }
  const listed = await admin.select("hotels", {
    select: "id,name",
    name: `like.${AUTHZ_HOTEL_PREFIX}%`
  });
  if (listed.ok && Array.isArray(listed.body)) {
    for (const row of listed.body) {
      await admin.delete("hotels", { id: `eq.${row.id}` });
    }
  }
  for (const appId of (created.applicationIds || []).filter(Boolean)) {
    await admin.delete("platform_access", {
      early_access_application_id: `eq.${appId}`
    });
    await admin.delete("early_access_applications", { id: `eq.${appId}` });
  }
  console.log("AUTHZ cleanup complete.");
}
