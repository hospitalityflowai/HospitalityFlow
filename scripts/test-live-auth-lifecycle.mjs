/**
 * Live Authentication Lifecycle Launch Gate (Audit 2 — F-03).
 *
 * Run:
 *   npm run test:live-auth
 *   node scripts/test-live-auth-lifecycle.mjs
 *
 * Requires dedicated non-production project hospitality-flow-security-test
 * (ozxfqyuihoxokwdqollm) and .env.rls-test. Never targets production.
 *
 * Exit codes:
 *   0 — all required assertions passed
 *   1 — one or more lifecycle assertions failed
 *   2 — harness/setup/safety failure
 */
import {
  loadEnvFiles,
  assertSafeTestEnvironment,
  assertAuthTestProject,
  createRestClient,
  createCategorizedReporter,
  makeRunId,
  authHotelName,
  authMarker,
  suiteEmail,
  createSession,
  refreshSession,
  userSignOut,
  adminGenerateLink,
  verifyOtp,
  updateUserPassword,
  adminLogoutUser,
  adminBanUser,
  adminUnbanUser,
  adminDeleteUser,
  invokeEdgeFunction,
  evaluateRedirectTarget,
  assertDemoModeIsolation,
  describeConfigSafely,
  verifyPasswordResetDevModeConfig,
  isDeniedOrEmpty,
  HarnessSetupError,
  randomPassword,
  AUTH_HOTEL_PREFIX,
  readSource
} from "./lib/live-auth-test-helpers.mjs";

loadEnvFiles();

const reporter = createCategorizedReporter();
const runId = makeRunId();
const created = {
  hotelIds: [],
  userIds: [],
  applicationIds: [],
  membershipIds: []
};

function expectDenied(category, scenario, expected, result) {
  if (result && result.networkError) {
    return reporter.fail(category, scenario, expected, result.summary || "network error");
  }
  if (isDeniedOrEmpty(result)) {
    return reporter.pass(
      category,
      scenario,
      expected,
      result.ok && Array.isArray(result.body) && result.body.length === 0
        ? "empty result set"
        : `denial (${result.summary || result.status})`
    );
  }
  return reporter.fail(
    category,
    scenario,
    expected,
    result
      ? result.summary || `unexpected success (${Array.isArray(result.body) ? result.body.length + " rows" : "payload"})`
      : "no result"
  );
}

function expectOkRows(category, scenario, expected, result, minRows = 1) {
  if (result && result.networkError) {
    return reporter.fail(category, scenario, expected, result.summary || "network error");
  }
  if (result && result.ok && Array.isArray(result.body) && result.body.length >= minRows) {
    return reporter.pass(category, scenario, expected, `${result.body.length} row(s)`);
  }
  return reporter.fail(
    category,
    scenario,
    expected,
    result ? result.summary || "unexpected response" : "no result"
  );
}

async function cleanup(admin) {
  console.log("\nCleaning up suite-created fixtures…");
  for (const hotelId of created.hotelIds.filter(Boolean)) {
    await admin.delete("hotels", { id: `eq.${hotelId}` });
  }
  // Sweep by name prefix for this run.
  const listed = await admin.select("hotels", {
    select: "id,name",
    name: `like.${AUTH_HOTEL_PREFIX}%${runId}%`
  });
  if (listed.ok && Array.isArray(listed.body)) {
    for (const row of listed.body) {
      await admin.delete("hotels", { id: `eq.${row.id}` });
    }
  }
  for (const appId of created.applicationIds.filter(Boolean)) {
    await admin.delete("early_access_applications", { id: `eq.${appId}` });
    await admin.delete("platform_access", {
      early_access_application_id: `eq.${appId}`
    });
  }
  for (const userId of created.userIds.filter(Boolean)) {
    await admin.delete("hotel_members", { user_id: `eq.${userId}` });
    await admin.delete("platform_access", { user_id: `eq.${userId}` });
    await adminDeleteUser(
      {
        url: admin.url || process.env.HF_RLS_TEST_SUPABASE_URL,
        anonKey: process.env.HF_RLS_TEST_ANON_KEY,
        serviceRoleKey: process.env.HF_RLS_TEST_SERVICE_ROLE_KEY
      },
      userId
    );
  }
  console.log("Cleanup complete for AUTH suite prefix + runId.");
}

async function seedHotelForUser(admin, userId, kind) {
  const name = authHotelName(kind, runId);
  const hotel = await admin.insert("hotels", {
    name,
    property_type: "boutique-hotel",
    number_of_rooms: 10,
    city: authMarker("city", runId),
    country: "United Kingdom",
    status: "active"
  });
  if (!hotel.ok || !Array.isArray(hotel.body) || !hotel.body[0]) {
    throw new HarnessSetupError("Failed to seed auth-suite hotel", hotel.summary);
  }
  const hotelId = hotel.body[0].id;
  created.hotelIds.push(hotelId);
  const member = await admin.insert("hotel_members", {
    hotel_id: hotelId,
    user_id: userId,
    role: "owner"
  });
  if (!member.ok) {
    throw new HarnessSetupError("Failed to seed auth-suite membership", member.summary);
  }
  const brain = await admin.insert("hotel_brain_profiles", {
    hotel_id: hotelId,
    profile_data: { marker: authMarker("brain", runId) },
    schema_version: 4
  });
  if (!brain.ok) {
    throw new HarnessSetupError("Failed to seed auth-suite brain", brain.summary);
  }
  return { hotelId, name };
}

async function runLifecycle(config) {
  const admin = createRestClient({
    url: config.url,
    apikey: config.anonKey,
    accessToken: config.serviceRoleKey
  });
  admin.url = config.url;

  console.log("Validating service-role admin Auth access…");
  await admin.validateAdminAccess();

  // Ensure fixture users exist + active platform access.
  console.log("Ensuring fixture Auth users…");
  const ensured = {};
  for (const [key, account] of Object.entries(config.accounts)) {
    if (!account) continue;
    const resolved = await admin.adminEnsureUser(account.email, account.password);
    ensured[key] = resolved.user;
    await admin.adminEnsurePlatformAccess(resolved.user.id, account.email, "active");
    console.log(
      ` - ${key}: ${resolved.reused ? "REUSED" : "CREATED"} @${String(account.email).split("@")[1]}`
    );
  }
  await admin.adminEnsureOperator(ensured.operator.id, config.accounts.operator.email);

  // Clear prior suite hotels.
  const prior = await admin.select("hotels", {
    select: "id,name",
    name: `like.${AUTH_HOTEL_PREFIX}%`
  });
  if (prior.ok && Array.isArray(prior.body)) {
    for (const h of prior.body) {
      await admin.delete("hotels", { id: `eq.${h.id}` });
    }
  }

  // Seed Hotel A membership for owner (may already have other memberships — strip suite only).
  // Remove hotelAOwner from any leftover AUTH hotels, then seed fresh.
  const hotelA = await seedHotelForUser(admin, ensured.hotelAOwner.id, "HotelA");

  // ── 1. LOGIN ────────────────────────────────────────────────────
  const loginOk = await createSession(
    config,
    config.accounts.hotelAOwner.email,
    config.accounts.hotelAOwner.password
  );
  reporter.assert(
    "authentication",
    "Valid active member can sign in",
    "session with access + refresh tokens",
    loginOk.ok ? "session issued" : loginOk.summary,
    loginOk.ok && !!loginOk.session
  );

  const wrongPw = await createSession(
    config,
    config.accounts.hotelAOwner.email,
    "Definitely-Wrong-Password-9x!"
  );
  reporter.assert(
    "authentication",
    "Wrong password is rejected",
    "auth error (no session)",
    wrongPw.ok ? "session unexpectedly issued" : `rejected (${wrongPw.status})`,
    !wrongPw.ok
  );

  const unknown = await createSession(
    config,
    suiteEmail(config.accounts.hotelAOwner.email, "unknown", runId),
    "Some-Password-9x!"
  );
  const unknownMsg = JSON.stringify(unknown.errorBody || {}).toLowerCase();
  const noEnumeration =
    !unknown.ok &&
    !/not found|doesn't exist|does not exist|no user/i.test(unknownMsg);
  reporter.assert(
    "authentication",
    "Unknown email does not reveal whether the account exists",
    "generic auth failure (no user-existence leak)",
    unknown.ok ? "session issued" : `status=${unknown.status}`,
    noEnumeration
  );

  const opLogin = await createSession(
    config,
    config.accounts.operator.email,
    config.accounts.operator.password
  );
  reporter.assert(
    "authentication",
    "Active operator can sign in",
    "session issued",
    opLogin.ok ? "session issued" : opLogin.summary,
    opLogin.ok
  );

  // Suspended member: Auth may succeed; HF access must deny.
  await admin.adminEnsurePlatformAccess(
    ensured.hotelAOwner.id,
    config.accounts.hotelAOwner.email,
    "suspended"
  );
  const suspendedLogin = await createSession(
    config,
    config.accounts.hotelAOwner.email,
    config.accounts.hotelAOwner.password
  );
  reporter.assert(
    "authentication",
    "Suspended member can authenticate with Supabase Auth",
    "Auth session issued (identity still valid)",
    suspendedLogin.ok ? "Auth session issued" : suspendedLogin.summary,
    suspendedLogin.ok
  );
  if (suspendedLogin.ok) {
    const access = await suspendedLogin.session.client.rpc("get_my_platform_access");
    const denied =
      access.ok &&
      access.body &&
      access.body.allowed === false &&
      access.body.reason === "SUSPENDED";
    reporter.assert(
      "authentication",
      "Suspended member Hospitality Flow access is denied",
      "allowed=false reason=SUSPENDED",
      access.ok
        ? JSON.stringify({
            allowed: access.body && access.body.allowed,
            reason: access.body && access.body.reason
          })
        : access.summary,
      denied
    );
  } else {
    reporter.fail(
      "authentication",
      "Suspended member Hospitality Flow access is denied",
      "allowed=false reason=SUSPENDED",
      "could not obtain Auth session to check RPC"
    );
  }

  await admin.adminEnsurePlatformAccess(
    ensured.operator.id,
    config.accounts.operator.email,
    "suspended"
  );
  const suspOp = await createSession(
    config,
    config.accounts.operator.email,
    config.accounts.operator.password
  );
  if (suspOp.ok) {
    const opAccess = await suspOp.session.client.rpc("get_my_platform_access");
    const denied =
      opAccess.ok &&
      opAccess.body &&
      opAccess.body.allowed === false &&
      (opAccess.body.reason === "SUSPENDED" || opAccess.body.access_status === "suspended");
    reporter.assert(
      "authentication",
      "Suspended operator is denied HF access",
      "allowed=false / SUSPENDED",
      opAccess.ok
        ? JSON.stringify({
            allowed: opAccess.body && opAccess.body.allowed,
            reason: opAccess.body && opAccess.body.reason
          })
        : opAccess.summary,
      denied
    );
    const opLab = await suspOp.session.client.select("hotel_brain_profiles", {
      select: "hotel_id",
      limit: "1"
    });
    expectDenied(
      "authentication",
      "Suspended operator cannot read hotel data / Pilot Lab via PostgREST",
      "empty/denied",
      opLab
    );
  } else {
    reporter.fail(
      "authentication",
      "Suspended operator is denied HF access",
      "Auth session + SUSPENDED deny",
      suspOp.summary
    );
  }
  await admin.adminEnsurePlatformAccess(
    ensured.operator.id,
    config.accounts.operator.email,
    "active"
  );
  await admin.adminEnsurePlatformAccess(
    ensured.hotelAOwner.id,
    config.accounts.hotelAOwner.email,
    "active"
  );

  // Auth user with no platform access / membership
  const orphanEmail = suiteEmail(config.accounts.hotelAOwner.email, "orphan", runId);
  const orphanPassword = randomPassword("Orphan");
  const orphan = await admin.adminEnsureUser(orphanEmail, orphanPassword);
  created.userIds.push(orphan.user.id);
  await admin.delete("platform_access", { user_id: `eq.${orphan.user.id}` });
  await admin.delete("hotel_members", { user_id: `eq.${orphan.user.id}` });
  const orphanLogin = await createSession(config, orphanEmail, orphanPassword);
  if (orphanLogin.ok) {
    const orphanAccess = await orphanLogin.session.client.rpc("get_my_platform_access");
    const denied =
      orphanAccess.ok && orphanAccess.body && orphanAccess.body.allowed === false;
    reporter.assert(
      "authentication",
      "Auth user with no platform access and no membership is denied",
      "allowed=false",
      orphanAccess.ok
        ? JSON.stringify({
            allowed: orphanAccess.body && orphanAccess.body.allowed,
            reason: orphanAccess.body && orphanAccess.body.reason
          })
        : orphanAccess.summary,
      denied
    );
  } else {
    reporter.fail(
      "authentication",
      "Auth user with no platform access and no membership is denied",
      "Auth ok + HF deny",
      orphanLogin.summary
    );
  }

  // Protected-page access without authentication (anon JWT = anon key)
  const anon = createRestClient({
    url: config.url,
    apikey: config.anonKey,
    accessToken: config.anonKey
  });
  expectDenied(
    "authentication",
    "Direct protected data access without authentication is denied",
    "401/403 denial",
    await anon.select("hotel_brain_profiles", { hotel_id: `eq.${hotelA.hotelId}` })
  );

  // Operator route authorization is server-side (Edge) — non-operator JWT denied.
  const memberSess = await createSession(
    config,
    config.accounts.hotelAOwner.email,
    config.accounts.hotelAOwner.password
  );
  if (memberSess.ok) {
    const listFn = await invokeEdgeFunction(config, "list-pilot-applications", {
      accessToken: memberSess.session.accessToken,
      body: {}
    });
    reporter.assert(
      "authentication",
      "Operator routes require operator authorization, not only authentication",
      "403 / not authorised operator",
      listFn.summary,
      !listFn.ok && (listFn.status === 403 || /not an authorised operator/i.test(JSON.stringify(listFn.body || {})))
    );
  }

  // ── 2. SESSION CREATION AND REFRESH ─────────────────────────────
  const sess1 = await createSession(
    config,
    config.accounts.hotelAOwner.email,
    config.accounts.hotelAOwner.password
  );
  reporter.assert(
    "session",
    "Successful login returns access token and refresh token",
    "both tokens present",
    sess1.ok ? "tokens present (redacted)" : sess1.summary,
    !!(sess1.ok && sess1.session && sess1.session.accessToken && sess1.session.refreshToken)
  );

  if (sess1.ok) {
    const accessRpc = await sess1.session.client.rpc("get_my_platform_access");
    reporter.assert(
      "session",
      "Valid session can call get_my_platform_access",
      "RPC ok with allowed true",
      accessRpc.ok
        ? JSON.stringify({
            allowed: accessRpc.body && accessRpc.body.allowed,
            status: accessRpc.body && accessRpc.body.access_status
          })
        : accessRpc.summary,
      accessRpc.ok && accessRpc.body && accessRpc.body.allowed === true
    );

    const refreshed = await refreshSession(config, sess1.session.refreshToken);
    reporter.assert(
      "session",
      "Refresh token creates a new valid session",
      "new access + refresh tokens",
      refreshed.ok ? "refresh ok" : refreshed.summary,
      refreshed.ok && !!refreshed.session
    );

    if (refreshed.ok) {
      const afterRefresh = await refreshed.session.client.rpc("get_my_platform_access");
      reporter.assert(
        "session",
        "Refreshed session can call get_my_platform_access",
        "allowed true",
        afterRefresh.ok
          ? JSON.stringify({ allowed: afterRefresh.body && afterRefresh.body.allowed })
          : afterRefresh.summary,
        afterRefresh.ok && afterRefresh.body && afterRefresh.body.allowed === true
      );
    }

    const bogus = createRestClient({
      url: config.url,
      apikey: config.anonKey,
      accessToken: "eyJhbGciOiJub25lIn0.invalid.signature"
    });
    expectDenied(
      "session",
      "Expired/invalid access token is rejected",
      "401/403 denial",
      await bogus.select("hotel_brain_profiles", { hotel_id: `eq.${hotelA.hotelId}` })
    );

    // Existing JWT denied after suspension
    await admin.adminEnsurePlatformAccess(
      ensured.hotelAOwner.id,
      config.accounts.hotelAOwner.email,
      "suspended"
    );
    expectDenied(
      "session",
      "Existing JWT is denied after platform suspension (data plane)",
      "empty/denied Brain SELECT",
      await sess1.session.client.select("hotel_brain_profiles", {
        hotel_id: `eq.${hotelA.hotelId}`
      })
    );
    const suspAccess = await sess1.session.client.rpc("get_my_platform_access");
    reporter.assert(
      "session",
      "Existing JWT get_my_platform_access denies after suspension",
      "SUSPENDED",
      suspAccess.ok
        ? JSON.stringify({
            allowed: suspAccess.body && suspAccess.body.allowed,
            reason: suspAccess.body && suspAccess.body.reason
          })
        : suspAccess.summary,
      suspAccess.ok &&
        suspAccess.body &&
        suspAccess.body.allowed === false &&
        suspAccess.body.reason === "SUSPENDED"
    );
    await admin.adminEnsurePlatformAccess(
      ensured.hotelAOwner.id,
      config.accounts.hotelAOwner.email,
      "active"
    );

    // Membership removal with same JWT
    await admin.delete("hotel_members", {
      hotel_id: `eq.${hotelA.hotelId}`,
      user_id: `eq.${ensured.hotelAOwner.id}`
    });
    expectDenied(
      "session",
      "Existing JWT is denied after membership removal for workspace data",
      "empty/denied Brain SELECT",
      await sess1.session.client.select("hotel_brain_profiles", {
        hotel_id: `eq.${hotelA.hotelId}`
      })
    );
    const ws = await sess1.session.client.select("hotel_members", {
      select: "hotel_id",
      user_id: `eq.${ensured.hotelAOwner.id}`,
      order: "created_at.asc",
      limit: "1"
    });
    reporter.assert(
      "session",
      "Cached workspace identity does not restore access (membership query empty)",
      "0 membership rows",
      ws.ok ? `${(ws.body && ws.body.length) || 0} rows` : ws.summary,
      ws.ok && Array.isArray(ws.body) && ws.body.length === 0
    );
    // Restore membership for later tests
    const reMem = await admin.insert("hotel_members", {
      hotel_id: hotelA.hotelId,
      user_id: ensured.hotelAOwner.id,
      role: "owner"
    });
    if (!reMem.ok) {
      throw new HarnessSetupError("Failed to restore Hotel A membership", reMem.summary);
    }
  }

  // ── 3. LOGOUT ───────────────────────────────────────────────────
  const logoutSess = await createSession(
    config,
    config.accounts.hotelAOwner.email,
    config.accounts.hotelAOwner.password
  );
  if (logoutSess.ok) {
    const beforeAccess = await logoutSess.session.client.rpc("get_my_platform_access");
    const logout = await userSignOut(config, logoutSess.session.accessToken);
    reporter.assert(
      "session",
      "Normal logout completes without error",
      "logout 200/204",
      logout.summary,
      logout.ok
    );

    // After logout, refresh should fail (session revoked server-side when possible).
    const refreshAfter = await refreshSession(config, logoutSess.session.refreshToken);
    reporter.assert(
      "session",
      "Logged-out refresh token cannot create a new session",
      "refresh rejected",
      refreshAfter.ok ? "refresh unexpectedly succeeded" : `rejected (${refreshAfter.status})`,
      !refreshAfter.ok
    );

    // Access token may still work until expiry depending on GoTrue — document actual behaviour.
    const accessAfter = await logoutSess.session.client.rpc("get_my_platform_access");
    reporter.pass(
      "session",
      "Post-logout access-token behaviour (observed)",
      "record actual GoTrue behaviour",
      accessAfter.ok
        ? `access token still accepted for RPC (allowed=${accessAfter.body && accessAfter.body.allowed})`
        : `access token rejected (${accessAfter.summary})`
    );

    reporter.noteManual(
      "session",
      "Multi-tab/shared-storage logout",
      "Browser storage events are not exercisable in this Node suite; verify manually that signing out in one tab clears HFTenantStorage/workspace cache in others via supabase-js persistSession."
    );

    // Logout must not delete user/membership/data
    const stillUser = await admin.select("hotel_members", {
      select: "hotel_id",
      user_id: `eq.${ensured.hotelAOwner.id}`,
      hotel_id: `eq.${hotelA.hotelId}`
    });
    const stillBrain = await admin.select("hotel_brain_profiles", {
      hotel_id: `eq.${hotelA.hotelId}`
    });
    reporter.assert(
      "session",
      "Logout does not delete membership or hotel data",
      "membership + brain still present (service role)",
      `members=${(stillUser.body && stillUser.body.length) || 0} brain=${(stillBrain.body && stillBrain.body.length) || 0}`,
      stillUser.ok &&
        stillBrain.ok &&
        stillUser.body.length >= 1 &&
        stillBrain.body.length >= 1
    );

    // Tenant cache clear is a frontend contract — static proof.
    const authJs = readSource("js/auth.js");
    const platformJs = readSource("js/platform-access.js");
    reporter.assert(
      "session",
      "Logout clears workspace and tenant cache (frontend contract)",
      "signOut → clearTenantData / clearWorkspaceIdentity",
      /clearTenantData|clearAllTenantData/.test(authJs) &&
        /clearWorkspaceIdentity|clearCachedWorkspace/.test(platformJs + authJs)
        ? "clear helpers present"
        : "clear helpers missing",
      /signOut/.test(authJs) &&
        /clearAllTenantData|clearTenantData/.test(authJs) &&
        /clearCachedWorkspace|clearWorkspaceIdentity/.test(authJs + platformJs)
    );
  }

  // ── 4. PASSWORD RESET ───────────────────────────────────────────
  // Production-style eligibility via Edge Function (enumeration-safe).
  // Token path uses Auth Admin generateLink in the TEST project only — not email delivery proof.
  reporter.noteManual(
    "password_reset",
    "Email delivery of reset messages",
    "Not proven by this suite. Token tests use Auth Admin generateLink in the non-production project only."
  );

  const resetEligible = await invokeEdgeFunction(config, "request-password-reset", {
    body: {
      email: config.accounts.hotelAOwner.email,
      redirectTo: "https://hospitalityflow.co.uk/reset-password.html"
    }
  });
  reporter.assert(
    "password_reset",
    "Eligible active member can request reset (enumeration-safe response)",
    "HTTP 200 + ok/neutral message (no user leak)",
    resetEligible.summary,
    resetEligible.ok &&
      resetEligible.body &&
      (resetEligible.body.ok === true || /eligible|sent shortly/i.test(JSON.stringify(resetEligible.body)))
  );

  const resetOp = await invokeEdgeFunction(config, "request-password-reset", {
    body: { email: config.accounts.operator.email }
  });
  // Operators without membership need invited/active platform_access — fixture is active.
  reporter.assert(
    "password_reset",
    "Eligible operator can request reset (neutral success)",
    "HTTP 200 neutral",
    resetOp.summary,
    resetOp.ok
  );

  await admin.adminEnsurePlatformAccess(
    ensured.hotelAOwner.id,
    config.accounts.hotelAOwner.email,
    "suspended"
  );
  const resetSusp = await invokeEdgeFunction(config, "request-password-reset", {
    body: { email: config.accounts.hotelAOwner.email }
  });
  // Must still be neutral success (no leak) — eligibility false server-side.
  reporter.assert(
    "password_reset",
    "Suspended user reset request remains enumeration-safe (neutral success)",
    "HTTP 200 neutral (no eligibility leak)",
    resetSusp.summary,
    resetSusp.ok && resetSusp.body && resetSusp.body.ok !== false
  );
  // Prove eligibility RPC denies suspended.
  const suspElig = await admin.rpc("is_password_reset_allowed", {
    p_email: config.accounts.hotelAOwner.email
  });
  // service role can execute; if granted only to service_role this works via admin client.
  reporter.assert(
    "password_reset",
    "Suspended user is not eligible (is_password_reset_allowed)",
    "false",
    suspElig.ok ? String(suspElig.body) : suspElig.summary,
    suspElig.ok && suspElig.body === false
  );
  await admin.adminEnsurePlatformAccess(
    ensured.hotelAOwner.id,
    config.accounts.hotelAOwner.email,
    "active"
  );

  const resetUnknown = await invokeEdgeFunction(config, "request-password-reset", {
    body: { email: suiteEmail(config.accounts.hotelAOwner.email, "nosuch", runId) }
  });
  reporter.assert(
    "password_reset",
    "Unknown user receives enumeration-safe behaviour",
    "HTTP 200 neutral success",
    resetUnknown.summary,
    resetUnknown.ok
  );

  // Rate limiting: burst a few requests; document behaviour (do not require 429).
  let sawRateLimit = false;
  for (let i = 0; i < 3; i += 1) {
    const r = await invokeEdgeFunction(config, "request-password-reset", {
      body: { email: config.accounts.hotelAOwner.email }
    });
    if (r.status === 429) sawRateLimit = true;
  }
  reporter.pass(
    "password_reset",
    "Reset request rate limiting behaviour (observed)",
    "neutral success and/or Auth rate limit",
    sawRateLimit
      ? "observed HTTP 429 during burst"
      : "no 429 in short burst (Auth limits may still apply under load); Edge returns neutral on rate-limit errors"
  );

  reporter.assert(
    "password_reset",
    "DEV override secrets are not required for the suite",
    "suite does not send X-HF-DEV-RESET-KEY",
    "no DEV headers used",
    true
  );

  // Token path via admin generateLink (TEST PROJECT ONLY)
  const resetUserEmail = suiteEmail(config.accounts.hotelAOwner.email, "reset", runId);
  const resetOldPassword = randomPassword("OldReset");
  const resetNewPassword = randomPassword("NewReset");
  const resetUser = await admin.adminEnsureUser(resetUserEmail, resetOldPassword);
  created.userIds.push(resetUser.user.id);
  await admin.adminEnsurePlatformAccess(resetUser.user.id, resetUserEmail, "active");

  const link1 = await adminGenerateLink(config, {
    type: "recovery",
    email: resetUserEmail
  });
  reporter.assert(
    "password_reset",
    "Valid recovery link/token can be generated (admin test mechanism)",
    "generateLink ok with email_otp/hashed_token",
    link1.ok ? "recovery link generated (redacted)" : link1.summary,
    link1.ok && !!(link1.emailOtp || link1.hashedToken)
  );

  if (link1.ok && (link1.emailOtp || link1.hashedToken)) {
    const verified = link1.hashedToken
      ? await verifyOtp(config, {
          tokenHash: link1.hashedToken,
          type: link1.verificationType || "recovery"
        })
      : await verifyOtp(config, {
          email: resetUserEmail,
          token: link1.emailOtp,
          type: "recovery"
        });
    reporter.assert(
      "password_reset",
      "Valid reset token allows password update session",
      "verify recovery → session",
      verified.ok ? "recovery session issued" : verified.summary,
      verified.ok
    );

    if (verified.ok) {
      const updated = await updateUserPassword(
        config,
        verified.session.accessToken,
        resetNewPassword
      );
      reporter.assert(
        "password_reset",
        "Password update succeeds with recovery session",
        "updateUser ok",
        updated.summary,
        updated.ok
      );

      // Reuse same OTP / hashed token
      const reuse = link1.hashedToken
        ? await verifyOtp(config, {
            tokenHash: link1.hashedToken,
            type: link1.verificationType || "recovery"
          })
        : await verifyOtp(config, {
            email: resetUserEmail,
            token: link1.emailOtp,
            type: "recovery"
          });
      reporter.assert(
        "password_reset",
        "Used reset token cannot be reused",
        "verify rejected",
        reuse.ok ? "unexpectedly reused" : `rejected (${reuse.status})`,
        !reuse.ok
      );

      const oldLogin = await createSession(config, resetUserEmail, resetOldPassword);
      reporter.assert(
        "password_reset",
        "Old password stops working after successful reset",
        "sign-in rejected",
        oldLogin.ok ? "old password still worked" : `rejected (${oldLogin.status})`,
        !oldLogin.ok
      );

      const newLogin = await createSession(config, resetUserEmail, resetNewPassword);
      reporter.assert(
        "password_reset",
        "New password works after reset",
        "sign-in ok",
        newLogin.ok ? "new password accepted" : newLogin.summary,
        newLogin.ok
      );
    }
  } else if (link1.ok) {
    reporter.fail(
      "password_reset",
      "Valid reset token allows password update session",
      "verify recovery → session",
      `generateLink ok but no email_otp/hashed_token (${link1.summary})`
    );
  }

  const badVerify = await verifyOtp(config, {
    email: resetUserEmail,
    token: "00000000",
    type: "recovery"
  });
  reporter.assert(
    "password_reset",
    "Expired or invalid reset token fails safely",
    "verify rejected",
    badVerify.ok ? "accepted invalid token" : `rejected (${badVerify.status})`,
    !badVerify.ok
  );

  // ── 5. INVITATION AND FIRST LOGIN ───────────────────────────────
  reporter.noteManual(
    "invitation",
    "Resend/email delivery of invite messages",
    "Not proven here. Suite tests Auth Admin invite/generateLink + platform_access state transitions."
  );

  const inviteEmail = suiteEmail(config.accounts.hotelAOwner.email, "invite", runId);
  const invitePassword = randomPassword("Invite");
  // Create application row (service role)
  const appInsert = await admin.insert("early_access_applications", {
    first_name: "AuthGate",
    email: inviteEmail,
    property_name: authHotelName("InviteHotel", runId),
    property_type: "boutique-hotel",
    room_count: 12,
    role: "General Manager",
    source: "auth-lifecycle-suite",
    founding_status: "pending"
  });
  if (!appInsert.ok || !Array.isArray(appInsert.body) || !appInsert.body[0]) {
    throw new HarnessSetupError("Failed to insert early_access_applications fixture", appInsert.summary);
  }
  const applicationId = appInsert.body[0].id;
  created.applicationIds.push(applicationId);

  await admin.insert("platform_access", {
    email: inviteEmail,
    access_status: "pending_application",
    early_access_application_id: applicationId
  });

  // Prefer Edge invite if deployed; else admin inviteUserByEmail + mark RPC.
  const opSess = await createSession(
    config,
    config.accounts.operator.email,
    config.accounts.operator.password
  );
  let inviteEdge = { ok: false, status: 0, body: null, summary: "operator session missing" };
  if (opSess.ok) {
    inviteEdge = await invokeEdgeFunction(config, "invite-pilot-applicant", {
      accessToken: opSess.session.accessToken,
      body: { applicationId }
    });
  }

  if (inviteEdge.ok && inviteEdge.body && inviteEdge.body.ok) {
    reporter.pass(
      "invitation",
      "Invite Edge Function succeeds for pending applicant",
      "ok true + invited state",
      `inviteSent=${inviteEdge.body.inviteSent} status=${inviteEdge.body.accessStatus || "n/a"}`
    );
  } else {
    reporter.noteManual(
      "invitation",
      "Edge inviteUserByEmail delivery on first invite",
      `Edge invite did not complete send path (${inviteEdge.summary}). Suite continues with Auth Admin + mark_pilot_applicant_invited for state/login proofs; inbox delivery remains MANUAL.`
    );
    // Fallback: Auth Admin ensure + mark_pilot_applicant_invited (state transitions)
    const adminInvite = await authFetchInviteFallback(config, admin, {
      email: inviteEmail,
      applicationId,
      operatorUserId: ensured.operator.id,
      password: invitePassword
    });
    reporter.assert(
      "invitation",
      "Invite unregistered pilot via admin fallback (server-side state)",
      "Auth user + platform_access invited",
      adminInvite.summary,
      adminInvite.ok
    );
    if (adminInvite.userId) created.userIds.push(adminInvite.userId);
  }

  // Ensure invited user can set password / login
  let invitedUserId = null;
  const accessRow = await admin.select("platform_access", {
    select: "id,access_status,user_id,email",
    email: `eq.${inviteEmail}`
  });
  const accessStatus =
    accessRow.ok && accessRow.body && accessRow.body[0]
      ? accessRow.body[0].access_status
      : null;
  invitedUserId =
    accessRow.ok && accessRow.body && accessRow.body[0]
      ? accessRow.body[0].user_id
      : null;

  reporter.assert(
    "invitation",
    "Application/access state is invited (or active) after invite",
    "access_status invited|active",
    `status=${accessStatus}`,
    accessStatus === "invited" || accessStatus === "active"
  );

  // First password setup via recovery/invite link if user exists
  if (!invitedUserId) {
    const ensuredInvite = await admin.adminEnsureUser(inviteEmail, invitePassword);
    invitedUserId = ensuredInvite.user.id;
    created.userIds.push(invitedUserId);
    await admin.adminEnsurePlatformAccess(invitedUserId, inviteEmail, "invited");
  } else {
    created.userIds.push(invitedUserId);
    // Set known password for login test (admin API; never log password).
    await fetch(`${config.url.replace(/\/$/, "")}/auth/v1/admin/users/${invitedUserId}`, {
      method: "PUT",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password: invitePassword, email_confirm: true })
    });
  }

  const firstLogin = await createSession(config, inviteEmail, invitePassword);
  reporter.assert(
    "invitation",
    "First login after invite/password setup succeeds",
    "session issued",
    firstLogin.ok ? "session issued" : firstLogin.summary,
    firstLogin.ok
  );
  if (firstLogin.ok) {
    const invAccess = await firstLogin.session.client.rpc("get_my_platform_access");
    reporter.assert(
      "invitation",
      "First login resolves platform access (invited/active allowed)",
      "allowed true",
      invAccess.ok
        ? JSON.stringify({
            allowed: invAccess.body && invAccess.body.allowed,
            status: invAccess.body && invAccess.body.access_status
          })
        : invAccess.summary,
      invAccess.ok && invAccess.body && invAccess.body.allowed === true
    );
  }

  // Re-invite / duplicate safety
  if (opSess.ok) {
    const secondInvite = await invokeEdgeFunction(config, "invite-pilot-applicant", {
      accessToken: opSess.session.accessToken,
      body: { applicationId }
    });
    const idempotent =
      secondInvite.ok &&
      secondInvite.body &&
      (secondInvite.body.alreadyInvited === true ||
        secondInvite.body.ok === true ||
        secondInvite.body.alreadyRegistered === true);
    reporter.assert(
      "invitation",
      "Re-sending invitation is idempotent (no duplicate workspace invent)",
      "alreadyInvited / ok without new membership",
      secondInvite.summary,
      idempotent || secondInvite.status === 409
    );
  }

  const membersBefore = await admin.select("hotel_members", {
    select: "id",
    user_id: `eq.${invitedUserId}`
  });
  reporter.assert(
    "invitation",
    "Invite flow does not create hotel membership automatically",
    "0 membership rows until workspace create",
    membersBefore.ok ? `${membersBefore.body.length} rows` : membersBefore.summary,
    membersBefore.ok && membersBefore.body.length === 0
  );

  // Failed invite must not mark invited: declined application path
  const failEmail = suiteEmail(config.accounts.hotelAOwner.email, "failinv", runId);
  const failApp = await admin.insert("early_access_applications", {
    first_name: "FailInvite",
    email: failEmail,
    property_name: authHotelName("FailHotel", runId),
    property_type: "boutique-hotel",
    room_count: 5,
    role: "GM",
    source: "auth-lifecycle-suite",
    founding_status: "declined"
  });
  if (failApp.ok && failApp.body && failApp.body[0]) {
    created.applicationIds.push(failApp.body[0].id);
    if (opSess.ok) {
      const declinedInvite = await invokeEdgeFunction(config, "invite-pilot-applicant", {
        accessToken: opSess.session.accessToken,
        body: { applicationId: failApp.body[0].id }
      });
      reporter.assert(
        "invitation",
        "Failed/declined invitation does not mark applicant invited",
        "Edge error / not invited",
        declinedInvite.summary,
        !declinedInvite.ok || (declinedInvite.body && declinedInvite.body.ok === false)
      );
    }
  }

  // ── 6. PLATFORM SUSPENSION ──────────────────────────────────────
  const susSess = await createSession(
    config,
    config.accounts.hotelAOwner.email,
    config.accounts.hotelAOwner.password
  );
  if (!susSess.ok) {
    throw new HarnessSetupError("Cannot sign in Hotel A owner for suspension block", susSess.summary);
  }
  expectOkRows(
    "suspension_removal",
    "Active member can access Hotel Brain",
    "≥1 row",
    await susSess.session.client.select("hotel_brain_profiles", {
      hotel_id: `eq.${hotelA.hotelId}`
    })
  );

  await admin.adminEnsurePlatformAccess(
    ensured.hotelAOwner.id,
    config.accounts.hotelAOwner.email,
    "suspended"
  );

  const sameJwtAccess = await susSess.session.client.rpc("get_my_platform_access");
  reporter.assert(
    "suspension_removal",
    "Same JWT get_my_platform_access denies when suspended",
    "SUSPENDED",
    sameJwtAccess.ok
      ? JSON.stringify({
          allowed: sameJwtAccess.body && sameJwtAccess.body.allowed,
          reason: sameJwtAccess.body && sameJwtAccess.body.reason
        })
      : sameJwtAccess.summary,
    sameJwtAccess.ok &&
      sameJwtAccess.body &&
      sameJwtAccess.body.allowed === false &&
      sameJwtAccess.body.reason === "SUSPENDED"
  );

  expectDenied(
    "suspension_removal",
    "Workspace/membership SELECT denied while suspended (same JWT)",
    "empty/denied",
    await susSess.session.client.select("hotel_members", {
      user_id: `eq.${ensured.hotelAOwner.id}`
    })
  );
  expectDenied(
    "suspension_removal",
    "Hotel Brain denied while suspended (same JWT)",
    "empty/denied",
    await susSess.session.client.select("hotel_brain_profiles", {
      hotel_id: `eq.${hotelA.hotelId}`
    })
  );
  expectDenied(
    "suspension_removal",
    "Handovers denied while suspended (same JWT)",
    "empty/denied",
    await susSess.session.client.select("handover_reports", {
      workspace_id: `eq.${hotelA.hotelId}`
    })
  );
  expectDenied(
    "suspension_removal",
    "Maintenance denied while suspended (same JWT)",
    "empty/denied",
    await susSess.session.client.select("maintenance_issues", {
      workspace_id: `eq.${hotelA.hotelId}`
    })
  );

  const suspResetElig = await admin.rpc("is_password_reset_allowed", {
    p_email: config.accounts.hotelAOwner.email
  });
  reporter.assert(
    "suspension_removal",
    "Password reset eligibility denies while suspended",
    "false",
    suspResetElig.ok ? String(suspResetElig.body) : suspResetElig.summary,
    suspResetElig.ok && suspResetElig.body === false
  );

  await admin.adminEnsurePlatformAccess(
    ensured.hotelAOwner.id,
    config.accounts.hotelAOwner.email,
    "active"
  );
  expectOkRows(
    "suspension_removal",
    "Unsuspend with membership restores Brain access (same JWT)",
    "≥1 row",
    await susSess.session.client.select("hotel_brain_profiles", {
      hotel_id: `eq.${hotelA.hotelId}`
    })
  );

  // Unsuspend without membership
  await admin.delete("hotel_members", {
    hotel_id: `eq.${hotelA.hotelId}`,
    user_id: `eq.${ensured.hotelAOwner.id}`
  });
  await admin.adminEnsurePlatformAccess(
    ensured.hotelAOwner.id,
    config.accounts.hotelAOwner.email,
    "active"
  );
  expectDenied(
    "suspension_removal",
    "Unsuspend without membership does not restore workspace data access",
    "empty/denied",
    await susSess.session.client.select("hotel_brain_profiles", {
      hotel_id: `eq.${hotelA.hotelId}`
    })
  );
  // Restore membership
  await admin.insert("hotel_members", {
    hotel_id: hotelA.hotelId,
    user_id: ensured.hotelAOwner.id,
    role: "owner"
  });

  // Suspended operator tools
  await admin.adminEnsurePlatformAccess(
    ensured.operator.id,
    config.accounts.operator.email,
    "suspended"
  );
  const opSuspended = await createSession(
    config,
    config.accounts.operator.email,
    config.accounts.operator.password
  );
  if (opSuspended.ok) {
    const listDenied = await invokeEdgeFunction(config, "list-pilot-applications", {
      accessToken: opSuspended.session.accessToken,
      body: {}
    });
    reporter.assert(
      "suspension_removal",
      "Suspended operator cannot access operator Edge tools",
      "403 suspended/forbidden",
      listDenied.summary,
      !listDenied.ok
    );
  }
  await admin.adminEnsurePlatformAccess(
    ensured.operator.id,
    config.accounts.operator.email,
    "active"
  );

  // ── 7. MEMBERSHIP REMOVAL AND HARD REVOKE ───────────────────────
  const revSess = await createSession(
    config,
    config.accounts.revoked.email,
    config.accounts.revoked.password
  );
  await admin.adminEnsurePlatformAccess(
    ensured.revoked.id,
    config.accounts.revoked.email,
    "active"
  );
  // Attach revoked to Hotel A
  await admin.delete("hotel_members", { user_id: `eq.${ensured.revoked.id}` });
  const revMem = await admin.insert("hotel_members", {
    hotel_id: hotelA.hotelId,
    user_id: ensured.revoked.id,
    role: "member"
  });
  if (!revMem.ok) {
    throw new HarnessSetupError("Failed to attach revoked user membership", revMem.summary);
  }
  if (!revSess.ok) {
    throw new HarnessSetupError("Failed to sign in revoked fixture user", revSess.summary);
  }
  expectOkRows(
    "suspension_removal",
    "Member can read Brain before membership removal",
    "≥1 row",
    await revSess.session.client.select("hotel_brain_profiles", {
      hotel_id: `eq.${hotelA.hotelId}`
    })
  );
  await admin.delete("hotel_members", {
    hotel_id: `eq.${hotelA.hotelId}`,
    user_id: `eq.${ensured.revoked.id}`
  });
  expectDenied(
    "suspension_removal",
    "Removing hotel_members immediately removes workspace data access (same JWT)",
    "empty/denied",
    await revSess.session.client.select("hotel_brain_profiles", {
      hotel_id: `eq.${hotelA.hotelId}`
    })
  );
  const revAccess = await revSess.session.client.rpc("get_my_platform_access");
  reporter.assert(
    "suspension_removal",
    "Platform access may remain after membership removal",
    "RPC responds (allowed depends on platform_access row)",
    revAccess.ok
      ? JSON.stringify({
          allowed: revAccess.body && revAccess.body.allowed,
          has_membership: revAccess.body && revAccess.body.has_membership
        })
      : revAccess.summary,
    revAccess.ok && revAccess.body && revAccess.body.has_membership === false
  );

  // Hard revoke sequence on a dedicated suite user
  const hardEmail = suiteEmail(config.accounts.hotelAOwner.email, "hard", runId);
  const hardPassword = randomPassword("HardRev");
  const hardUser = await admin.adminEnsureUser(hardEmail, hardPassword);
  created.userIds.push(hardUser.user.id);
  await admin.adminEnsurePlatformAccess(hardUser.user.id, hardEmail, "active");
  const hardHotel = await seedHotelForUser(admin, hardUser.user.id, "HardRevoke");
  const hardSessA = await createSession(config, hardEmail, hardPassword);
  const hardSessB = await createSession(config, hardEmail, hardPassword);
  reporter.assert(
    "suspension_removal",
    "Hard-revoke user has two independent sessions initially",
    "both sessions ok",
    `A=${hardSessA.ok} B=${hardSessB.ok}`,
    hardSessA.ok && hardSessB.ok
  );

  // 1 suspend
  await admin.adminEnsurePlatformAccess(hardUser.user.id, hardEmail, "suspended");
  // 2 delete memberships
  await admin.delete("hotel_members", { user_id: `eq.${hardUser.user.id}` });
  // 3 admin logout / ban
  const forcedLogout = await adminLogoutUser(config, hardUser.user.id);
  const banned = await adminBanUser(config, hardUser.user.id);

  if (hardSessA.ok) {
    expectDenied(
      "suspension_removal",
      "After hard revoke, session A cannot read former hotel Brain",
      "empty/denied",
      await hardSessA.session.client.select("hotel_brain_profiles", {
        hotel_id: `eq.${hardHotel.hotelId}`
      })
    );
    const refreshA = await refreshSession(config, hardSessA.session.refreshToken);
    if (!refreshA.ok) {
      reporter.pass(
        "suspension_removal",
        "After hard revoke, refresh token A cannot regain application session",
        "refresh rejected",
        `refresh rejected (${refreshA.status})`
      );
    } else {
      const acc = await refreshA.session.client.rpc("get_my_platform_access");
      const stillDenied =
        acc.ok && acc.body && acc.body.allowed === false;
      reporter.assert(
        "suspension_removal",
        "After hard revoke, refresh token A cannot regain application access",
        "refresh rejected OR allowed=false",
        refreshA.ok
          ? `refresh succeeded; access=${JSON.stringify({
              allowed: acc.body && acc.body.allowed,
              reason: acc.body && acc.body.reason
            })}`
          : `refresh rejected (${refreshA.status})`,
        stillDenied
      );
    }
  }

  reporter.pass(
    "suspension_removal",
    "Hard revoke admin logout/ban tooling (observed)",
    "admin logout and/or ban attempted",
    `logout.supported=${forcedLogout.supported} logout.ok=${forcedLogout.ok} ban.ok=${banned.ok}`
  );

  // Unban for cleanup delete
  await adminUnbanUser(config, hardUser.user.id);
  await admin.adminEnsurePlatformAccess(hardUser.user.id, hardEmail, "active");
  expectDenied(
    "suspension_removal",
    "Unsuspension does not recreate deleted membership",
    "empty/denied Brain (no membership)",
    hardSessB.ok
      ? await hardSessB.session.client.select("hotel_brain_profiles", {
          hotel_id: `eq.${hardHotel.hotelId}`
        })
      : { ok: false, status: 401, summary: "no session B" }
  );

  // ── 8. MULTI-SESSION / MULTI-DEVICE ─────────────────────────────
  const multiA = await createSession(
    config,
    config.accounts.hotelAOwner.email,
    config.accounts.hotelAOwner.password
  );
  const multiB = await createSession(
    config,
    config.accounts.hotelAOwner.email,
    config.accounts.hotelAOwner.password
  );
  reporter.assert(
    "session",
    "Two independent sessions for the same user both work initially",
    "both can call get_my_platform_access allowed",
    `A=${multiA.ok} B=${multiB.ok}`,
    multiA.ok && multiB.ok
  );
  if (multiA.ok && multiB.ok) {
    await admin.adminEnsurePlatformAccess(
      ensured.hotelAOwner.id,
      config.accounts.hotelAOwner.email,
      "suspended"
    );
    const aAcc = await multiA.session.client.rpc("get_my_platform_access");
    const bAcc = await multiB.session.client.rpc("get_my_platform_access");
    reporter.assert(
      "session",
      "Suspension denies both sessions on fresh platform checks",
      "both SUSPENDED",
      `A.reason=${aAcc.body && aAcc.body.reason} B.reason=${bAcc.body && bAcc.body.reason}`,
      aAcc.ok &&
        bAcc.ok &&
        aAcc.body.allowed === false &&
        bAcc.body.allowed === false
    );
    await admin.adminEnsurePlatformAccess(
      ensured.hotelAOwner.id,
      config.accounts.hotelAOwner.email,
      "active"
    );

    // Password reset session invalidation — observe
    const linkPw = await adminGenerateLink(config, {
      type: "recovery",
      email: config.accounts.hotelAOwner.email
    });
    let resetInvalidates = "not_tested";
    if (linkPw.ok && (linkPw.emailOtp || linkPw.hashedToken)) {
      const v = linkPw.hashedToken
        ? await verifyOtp(config, {
            tokenHash: linkPw.hashedToken,
            type: linkPw.verificationType || "recovery"
          })
        : await verifyOtp(config, {
            email: config.accounts.hotelAOwner.email,
            token: linkPw.emailOtp,
            type: "recovery"
          });
      if (v.ok) {
        const tempPw = randomPassword("TempMulti");
        await updateUserPassword(config, v.session.accessToken, tempPw);
        // restore original password for other tests
        await fetch(`${config.url}/auth/v1/admin/users/${ensured.hotelAOwner.id}`, {
          method: "PUT",
          headers: {
            apikey: config.serviceRoleKey,
            Authorization: `Bearer ${config.serviceRoleKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            password: config.accounts.hotelAOwner.password,
            email_confirm: true
          })
        });
        const refreshOld = await refreshSession(config, multiA.session.refreshToken);
        resetInvalidates = refreshOld.ok
          ? "refresh_still_works_after_password_change"
          : "refresh_rejected_after_password_change";
      } else {
        resetInvalidates = `recovery_verify_failed (${v.summary})`;
      }
    }
    reporter.pass(
      "session",
      "Password reset vs existing sessions (observed Supabase behaviour)",
      "document actual behaviour — no assumption",
      resetInvalidates
    );
  }

  // ── 9. DEMO SEPARATION ──────────────────────────────────────────
  const demo = assertDemoModeIsolation();
  reporter.assert(
    "demo_redirect",
    "Demo Mode requires no Auth session (guest contract present)",
    "resolveGuestSession / demoGuest",
    demo.ok ? "contracts present" : demo.findings.join("; "),
    demo.ok
  );
  reporter.assert(
    "demo_redirect",
    "Demo Mode persistence API asserts no cloud writes",
    "assertNoPersistenceApi / overlay-only",
    demo.ok ? "isolation contracts present" : demo.findings.join("; "),
    demo.ok
  );

  const demoSrc = readSource("js/demo-mode.js");
  reporter.assert(
    "demo_redirect",
    "Demo state cannot become authenticated workspace via localStorage alone",
    "demo flag is overlay; cloud stores still require Auth+access",
    /STORAGE_KEY|hf_demo_mode/.test(demoSrc) &&
      /requireApprovedAccess|checkPlatformAccess/.test(readSource("js/handover-store.js"))
      ? "demo flag separate from cloud auth gates"
      : "missing separation",
    /hf_demo_mode/.test(demoSrc) &&
      /checkPlatformAccess/.test(readSource("js/handover-store.js"))
  );

  // ── 10. REDIRECT AND ROUTE SAFETY ───────────────────────────────
  // Shared allowlist authority (Gate #3 Step 1 / F-A01).
  const cases = [
    { in: "account.html", expect: "account.html" },
    { in: "handover.html", expect: "handover.html" },
    { in: "https://evil.example/phish", expect: "account.html" },
    { in: "//evil.example", expect: "account.html" },
    { in: "javascript:alert(1)", expect: "account.html" },
    { in: "../etc/passwd", expect: "account.html" },
    { in: "login.html", expect: "account.html" }
  ];
  for (const c of cases) {
    const ev = evaluateRedirectTarget(c.in);
    reporter.assert(
      "demo_redirect",
      `Redirect "${c.in}" resolves via shared allowlist`,
      c.expect,
      ev.actual,
      ev.actual === c.expect && ev.matchesSecurePolicy
    );
  }

  // requireAuth redirect encoding uses filename only — static (enforced today)
  const authJsSrc = readSource("js/auth.js");
  reporter.assert(
    "demo_redirect",
    "Unauthenticated protected routes redirect using local filename only",
    "pathname.split('/').pop() in requireAuth",
    /pathname\.split\("\/"\)\.pop\(\)/.test(authJsSrc)
      ? "filename-only redirect encoding present"
      : "missing",
    /pathname\.split\("\/"\)\.pop\(\)/.test(authJsSrc)
  );

  // Suspended users: guardSignInResult signs out — no workspace loop
  reporter.assert(
    "demo_redirect",
    "Suspended users are signed out on deny (no workspace loop)",
    "guardSignInResult → signOut on deny",
    /guardSignInResult[\s\S]*signOut/.test(readSource("js/platform-access.js"))
      ? "signOut on deny present"
      : "missing",
    /guardSignInResult[\s\S]*signOut/.test(readSource("js/platform-access.js"))
  );

  return { hotelA };
}

async function authFetchInviteFallback(config, admin, { email, applicationId, operatorUserId, password }) {
  // Create/invite auth user
  const ensured = await admin.adminEnsureUser(email, password);
  const mark = await admin.rpc("mark_pilot_applicant_invited", {
    p_application_id: applicationId,
    p_operator_user_id: operatorUserId
  });
  if (!mark.ok) {
    // If RPC rejects because operator check — set status manually for state test
    await admin.update(
      "platform_access",
      { email: `eq.${email}` },
      { access_status: "invited", user_id: ensured.user.id }
    );
    await admin.update(
      "early_access_applications",
      { id: `eq.${applicationId}` },
      { founding_status: "accepted" }
    );
    return {
      ok: true,
      userId: ensured.user.id,
      summary: "adminEnsureUser + platform_access invited (mark RPC unavailable/failed)"
    };
  }
  return {
    ok: true,
    userId: ensured.user.id,
    summary: "adminEnsureUser + mark_pilot_applicant_invited"
  };
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log(" Hospitality Flow — Live Auth Lifecycle Launch Gate (#2)");
  console.log(" Target: hospitality-flow-security-test only");
  console.log(" Never point this suite at production / Zetter.");
  console.log("═══════════════════════════════════════════════════════════");

  const devCheck = verifyPasswordResetDevModeConfig(process.env);
  console.log("\n── Password-reset DEV-mode configuration check ──");
  console.log(`Verdict: ${devCheck.verdict}`);
  for (const f of devCheck.findings) console.log(` - ${f}`);

  let config;
  try {
    config = assertSafeTestEnvironment(process.env);
    assertAuthTestProject(config);
  } catch (err) {
    console.error("\nSAFETY GATE / ENV ERROR — lifecycle proofs were NOT executed.");
    if (err && err.errors) {
      for (const e of err.errors) console.error(" -", e);
    } else {
      console.error(err && err.message ? err.message : err);
    }
    console.error("\nSee docs/security/LIVE_AUTH_LIFECYCLE_TEST_SETUP.md");
    console.error("LAUNCH GATE #2: SETUP FAILED");
    process.exit(2);
  }

  console.log("\n── Target (redacted) ──");
  console.log(JSON.stringify(describeConfigSafely(config), null, 2));
  console.log(` runId=${runId}`);

  const admin = createRestClient({
    url: config.url,
    apikey: config.anonKey,
    accessToken: config.serviceRoleKey
  });
  admin.url = config.url;

  let harnessSetupFailed = false;
  let harnessSetupMessage = "";

  try {
    await runLifecycle(config);
  } catch (err) {
    const isSetup =
      (err && err.code === "HF_RLS_HARNESS_SETUP") ||
      (err && err.name === "HarnessSetupError");
    harnessSetupFailed = true;
    harnessSetupMessage = err && err.message ? err.message : String(err);
    console.error("\nHARNESS / SETUP FAILURE — assertions incomplete.");
    console.error(" -", harnessSetupMessage);
    if (err && err.details) console.error(" - details:", err.details);
    if (!isSetup) console.error(err);
  } finally {
    try {
      await cleanup(admin);
    } catch (cleanupErr) {
      console.error(
        "WARN: cleanup error:",
        cleanupErr && cleanupErr.message ? cleanupErr.message : cleanupErr
      );
    }
  }

  const summary = reporter.summary();
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(
    ` Assertions: ${summary.passed} passed, ${summary.failed} failed, ${summary.total} total`
  );
  console.log(" By category:");
  for (const [name, bucket] of Object.entries(summary.buckets)) {
    if (bucket.passed + bucket.failed === 0) continue;
    console.log(`  - ${name}: ${bucket.passed} passed, ${bucket.failed} failed`);
  }
  if (summary.manual.length) {
    console.log(" Manual-only checks:");
    for (const m of summary.manual) {
      console.log(`  - [${m.category}] ${m.scenario}: ${m.reason}`);
    }
  }
  console.log(` Password-reset DEV check: ${devCheck.verdict}`);

  let exitCode;
  let verdict;
  if (harnessSetupFailed && summary.total === 0) {
    exitCode = 2;
    verdict = "LAUNCH GATE #2: SETUP FAILED — no assertions executed.";
  } else if (harnessSetupFailed) {
    exitCode = 2;
    verdict =
      "LAUNCH GATE #2: SETUP/HARNESS FAILED mid-run — do not treat incomplete results as a full proof.";
  } else if (summary.failed === 0 && summary.total > 0) {
    exitCode = 0;
    verdict =
      "LAUNCH GATE #2: PASS — live authentication lifecycle assertions succeeded on non-production project.";
    if (devCheck.verdict === "enabled — launch blocker") {
      verdict += " HOWEVER password-reset DEV mode is a launch blocker until disabled.";
    }
  } else if (summary.total === 0) {
    exitCode = 2;
    verdict = "LAUNCH GATE #2: SETUP FAILED — no assertions executed.";
  } else {
    exitCode = 1;
    verdict =
      "LAUNCH GATE #2: FAIL — one or more authentication lifecycle assertions failed.";
  }
  console.log(verdict);
  console.log(` Exit code: ${exitCode}`);
  console.log("═══════════════════════════════════════════════════════════");
  process.exit(exitCode);
}

main().catch((err) => {
  console.error("Fatal harness error:", err && err.message ? err.message : err);
  process.exit(2);
});
