/**
 * Live cross-tenant RLS isolation proof (Audit 1 Remediation — Step 1).
 *
 * Requires an explicitly marked non-production Supabase project and dedicated
 * test accounts. Never targets Zetter / real Pilot Lab / customer data.
 *
 * Run:
 *   node scripts/test-live-rls-isolation.mjs
 *
 * Setup guide:
 *   docs/security/LIVE_RLS_TEST_SETUP.md
 *
 * Exit codes:
 *   0 — all isolation assertions passed
 *   1 — one or more isolation assertions failed
 *   2 — environment/safety gate failed (suite did not run live proofs)
 */
import {
  loadEnvFiles,
  assertSafeTestEnvironment,
  createRestClient,
  createReporter,
  makeRunId,
  hotelName,
  marker,
  isEmptySelect,
  isDeniedOrEmpty,
  verifyPasswordResetDevModeConfig,
  describeConfigSafely,
  HarnessSetupError,
  HOTEL_NAME_PREFIX
} from "./lib/live-rls-test-helpers.mjs";

loadEnvFiles();

const reporter = createReporter();
const runId = makeRunId();
const created = {
  hotelIds: [],
  membershipIds: [],
  brainHotelIds: [],
  handoverIds: [],
  maintenanceIssueIds: [],
  operatorRows: false,
  userResolution: []
};

function expectDenied(scenario, expected, result) {
  if (result && result.networkError) {
    return reporter.fail(
      scenario,
      expected,
      result.summary || "network error",
      "Network failures must not be treated as RLS denial"
    );
  }
  if (isDeniedOrEmpty(result)) {
    const actual = isEmptySelect(result)
      ? "empty result set"
      : `authorization denial (${result.summary})`;
    return reporter.pass(scenario, expected, actual);
  }
  const actual = result && result.ok
    ? `unexpected success (${Array.isArray(result.body) ? result.body.length + " rows" : "payload"})`
    : result
      ? result.summary
      : "no result";
  return reporter.fail(scenario, expected, actual);
}

function expectOkRows(scenario, expected, result, minRows = 1) {
  if (result && result.networkError) {
    return reporter.fail(scenario, expected, result.summary, "Network failure");
  }
  if (result && result.ok && Array.isArray(result.body) && result.body.length >= minRows) {
    return reporter.pass(scenario, expected, `${result.body.length} row(s)`);
  }
  return reporter.fail(
    scenario,
    expected,
    result ? result.summary || "unexpected response" : "no result"
  );
}

async function cleanupSuiteHotels(admin) {
  // Delete only hotels created by this suite (name prefix + run marker in city/country optional).
  // Prefer explicit IDs tracked during the run; also sweep by name prefix for this runId.
  const ids = new Set(created.hotelIds.filter(Boolean));

  const listed = await admin.select("hotels", {
    select: "id,name",
    name: `like.${HOTEL_NAME_PREFIX}%${runId}%`
  });
  if (listed.ok && Array.isArray(listed.body)) {
    for (const row of listed.body) ids.add(row.id);
  }

  for (const hotelId of ids) {
    // Cascades: brain, handovers, maintenance (per migrations).
    await admin.delete("hotels", { id: `eq.${hotelId}` });
  }
}

async function seedFixture(admin, sessions) {
  const mark = marker("seed", runId);

  async function createHotel(kind, rooms) {
    const name = hotelName(kind, runId);
    const result = await admin.insert("hotels", {
      name,
      property_type: "boutique-hotel",
      number_of_rooms: rooms,
      city: "RLS-Test-City",
      country: "United Kingdom",
      status: "active"
    });
    if (!result.ok) {
      throw new HarnessSetupError(
        `Failed to create ${kind} hotel during fixture setup.`,
        result.summary || "unknown error"
      );
    }
    const row = Array.isArray(result.body) ? result.body[0] : result.body;
    created.hotelIds.push(row.id);
    return row;
  }

  async function addMember(hotelId, userId, role) {
    const result = await admin.insert("hotel_members", {
      hotel_id: hotelId,
      user_id: userId,
      role
    });
    if (!result.ok) {
      throw new HarnessSetupError(
        "Failed to insert hotel_members during fixture setup.",
        result.summary || "unknown error"
      );
    }
    const row = Array.isArray(result.body) ? result.body[0] : result.body;
    if (row && row.id) created.membershipIds.push(row.id);
    return row;
  }

  const hotelA = await createHotel("HotelA", 42);
  const hotelB = await createHotel("HotelB", 88);
  const opLab = await createHotel("OpLab", 1);

  await addMember(hotelA.id, sessions.hotelAOwner.user.id, "owner");
  await addMember(hotelB.id, sessions.hotelBOwner.user.id, "owner");
  await addMember(hotelA.id, sessions.revoked.user.id, "member");
  if (sessions.hotelAStaff) {
    await addMember(hotelA.id, sessions.hotelAStaff.user.id, "member");
  }

  // Brain
  const brainA = await admin.insert("hotel_brain_profiles", {
    hotel_id: hotelA.id,
    profile_data: {
      schemaVersion: 4,
      savedAt: new Date().toISOString(),
      general: { hotelName: hotelA.name },
      _workspaceHotelId: hotelA.id,
      _rlsMarker: mark
    },
    schema_version: 4
  });
  if (!brainA.ok) {
    throw new HarnessSetupError("Seed Brain A failed.", brainA.summary || "unknown error");
  }
  created.brainHotelIds.push(hotelA.id);

  const brainB = await admin.insert("hotel_brain_profiles", {
    hotel_id: hotelB.id,
    profile_data: {
      schemaVersion: 4,
      savedAt: new Date().toISOString(),
      general: { hotelName: hotelB.name },
      _workspaceHotelId: hotelB.id,
      _rlsMarker: mark
    },
    schema_version: 4
  });
  if (!brainB.ok) {
    throw new HarnessSetupError("Seed Brain B failed.", brainB.summary || "unknown error");
  }
  created.brainHotelIds.push(hotelB.id);

  const brainOp = await admin.insert("hotel_brain_profiles", {
    hotel_id: opLab.id,
    profile_data: {
      schemaVersion: 4,
      savedAt: new Date().toISOString(),
      general: { hotelName: opLab.name },
      _workspaceHotelId: opLab.id,
      _rlsMarker: mark
    },
    schema_version: 4
  });
  if (!brainOp.ok) {
    throw new HarnessSetupError("Seed Brain OpLab failed.", brainOp.summary || "unknown error");
  }
  created.brainHotelIds.push(opLab.id);

  // Handovers
  async function seedHandover(hotelId, userId, label) {
    const result = await admin.insert("handover_reports", {
      workspace_id: hotelId,
      user_id: userId,
      hotel_name: label,
      department: "Front Office",
      shift: "AM",
      handover_date: new Date().toISOString().slice(0, 10),
      prepared_by: "RLS Test",
      metrics: { marker: mark },
      source_notes: mark,
      generated_handover: { aiSummary: mark, hotelName: label },
      checklist_state: [],
      recommendation_state: [],
      status: "saved"
    });
    if (!result.ok) {
      throw new HarnessSetupError(
        `Seed handover failed (${label}).`,
        result.summary || "unknown error"
      );
    }
    const row = Array.isArray(result.body) ? result.body[0] : result.body;
    created.handoverIds.push(row.id);
    return row;
  }

  const handoverA = await seedHandover(hotelA.id, sessions.hotelAOwner.user.id, hotelA.name);
  const handoverB = await seedHandover(hotelB.id, sessions.hotelBOwner.user.id, hotelB.name);
  const handoverOp = await seedHandover(opLab.id, sessions.operator.user.id, opLab.name);

  // Maintenance
  async function seedIssue(hotelId, userId, title) {
    const result = await admin.insert("maintenance_issues", {
      workspace_id: hotelId,
      title,
      description: mark,
      location_type: "back_of_house",
      category: "other",
      priority: "medium",
      status: "open",
      reported_by_name: "RLS Test",
      include_in_handover: false
    });
    if (!result.ok) {
      throw new HarnessSetupError(
        "Seed maintenance issue failed.",
        result.summary || "unknown error"
      );
    }
    const row = Array.isArray(result.body) ? result.body[0] : result.body;
    created.maintenanceIssueIds.push(row.id);

    const upd = await admin.insert("maintenance_updates", {
      issue_id: row.id,
      workspace_id: hotelId,
      update_type: "created",
      note: mark
    });
    if (!upd.ok) {
      // Parent insert succeeded; update seed is nice-to-have for immutability tests.
      console.warn("WARN: maintenance_updates seed failed:", upd.summary);
    }
    return row;
  }

  const issueA = await seedIssue(hotelA.id, sessions.hotelAOwner.user.id, `Issue A ${runId}`);
  const issueB = await seedIssue(hotelB.id, sessions.hotelBOwner.user.id, `Issue B ${runId}`);
  const issueOp = await seedIssue(opLab.id, sessions.operator.user.id, `Issue Op ${runId}`);

  return {
    hotelA,
    hotelB,
    opLab,
    handoverA,
    handoverB,
    handoverOp,
    issueA,
    issueB,
    issueOp,
    mark
  };
}

async function resolveFrontendWorkspace(userClient, userId) {
  // Membership query used by frontend workspace resolution (oldest membership + hotel join).
  // App-level suspension gating is covered by test-platform-suspend-authoritative.mjs;
  // this suite proves RLS after membership deletion (Launch Gate #1).
  return userClient.select("hotel_members", {
    select: "role,hotel_id,created_at,hotels(id,name,property_type,number_of_rooms,city,country,created_at)",
    user_id: `eq.${userId}`,
    order: "created_at.asc",
    limit: "1"
  });
}

async function runLiveProofs(config) {
  const admin = createRestClient({
    url: config.url,
    apikey: config.anonKey,
    accessToken: config.serviceRoleKey
  });
  const anon = createRestClient({
    url: config.url,
    apikey: config.anonKey,
    accessToken: config.anonKey
  });

  console.log("Validating service-role admin Auth access…");
  const adminOk = await admin.validateAdminAccess();
  console.log(`Admin Auth access OK (${adminOk.diagnostic}).`);

  console.log("Resolving test Auth users (lookup-first; create only if missing)…");
  const ensured = {};
  const userResolution = [];
  for (const [key, account] of Object.entries(config.accounts)) {
    if (!account) continue;
    const resolved = await admin.adminEnsureUser(account.email, account.password);
    ensured[key] = resolved.user;
    userResolution.push({
      account: key,
      emailDomain: resolved.emailDomain,
      reused: !!resolved.reused,
      created: !!resolved.created,
      userIdPrefix: String(resolved.userId || "").slice(0, 8)
    });
    console.log(
      ` - ${key}: ${resolved.reused ? "REUSED existing" : "CREATED new"} Auth user` +
        ` @${resolved.emailDomain} id=${String(resolved.userId || "").slice(0, 8)}…`
    );
    await admin.adminEnsurePlatformAccess(resolved.user.id, account.email, "active");
  }
  await admin.adminEnsureOperator(ensured.operator.id, config.accounts.operator.email);
  created.operatorRows = true;
  created.userResolution = userResolution;

  // Strip any prior suite memberships for operator / revoked before seeding.
  console.log("Clearing prior suite hotel memberships for operator/revoked users…");
  const priorHotels = await admin.select("hotels", {
    select: "id,name",
    name: `like.${HOTEL_NAME_PREFIX}%`
  });
  if (priorHotels.ok && Array.isArray(priorHotels.body)) {
    for (const h of priorHotels.body) {
      await admin.delete("hotel_members", {
        hotel_id: `eq.${h.id}`,
        user_id: `eq.${ensured.operator.id}`
      });
      await admin.delete("hotel_members", {
        hotel_id: `eq.${h.id}`,
        user_id: `eq.${ensured.revoked.id}`
      });
    }
    // Also remove orphaned prior suite hotels from earlier failed runs.
    for (const h of priorHotels.body) {
      await admin.delete("hotels", { id: `eq.${h.id}` });
    }
  }

  console.log("Signing in test users (real JWT sessions)…");
  const sessions = {
    hotelAOwner: await anon.signInWithPassword(
      config.accounts.hotelAOwner.email,
      config.accounts.hotelAOwner.password
    ),
    hotelBOwner: await anon.signInWithPassword(
      config.accounts.hotelBOwner.email,
      config.accounts.hotelBOwner.password
    ),
    operator: await anon.signInWithPassword(
      config.accounts.operator.email,
      config.accounts.operator.password
    ),
    revoked: await anon.signInWithPassword(
      config.accounts.revoked.email,
      config.accounts.revoked.password
    ),
    hotelAStaff: null
  };
  if (config.accounts.hotelAStaff) {
    sessions.hotelAStaff = await anon.signInWithPassword(
      config.accounts.hotelAStaff.email,
      config.accounts.hotelAStaff.password
    );
  }

  console.log(`Seeding isolated fixture runId=${runId}…`);
  const fx = await seedFixture(admin, sessions);
  const a = sessions.hotelAOwner.client;
  const b = sessions.hotelBOwner.client;
  const op = sessions.operator.client;
  const rev = sessions.revoked.client;

  // ── A. HOTEL BRAIN ──────────────────────────────────────────────
  await expectOkRows(
    "1. Hotel A can read Hotel A Brain",
    "≥1 brain row for Hotel A",
    await a.select("hotel_brain_profiles", { hotel_id: `eq.${fx.hotelA.id}` })
  );

  await expectDenied(
    "2. Hotel A cannot read Hotel B Brain",
    "empty set or RLS denial",
    await a.select("hotel_brain_profiles", { hotel_id: `eq.${fx.hotelB.id}` })
  );

  await expectDenied(
    "3. Hotel A cannot insert Brain for Hotel B",
    "RLS denial",
    await a.insert("hotel_brain_profiles", {
      hotel_id: fx.hotelB.id,
      profile_data: { injected: true, _rlsMarker: fx.mark },
      schema_version: 4
    })
  );

  await expectDenied(
    "4. Hotel A cannot update Hotel B Brain",
    "empty update / RLS denial",
    await a.update(
      "hotel_brain_profiles",
      { hotel_id: `eq.${fx.hotelB.id}` },
      { profile_data: { hacked: true, _rlsMarker: fx.mark } }
    )
  );
  // PostgREST often returns [] with 200 for zero matching RLS rows on UPDATE.
  // Re-check Brain B content via service role was not changed by A.
  {
    const still = await admin.select("hotel_brain_profiles", {
      hotel_id: `eq.${fx.hotelB.id}`,
      select: "profile_data"
    });
    const data =
      still.ok && Array.isArray(still.body) && still.body[0]
        ? still.body[0].profile_data
        : null;
    const intact = data && data._rlsMarker === fx.mark && !data.hacked;
    reporter.assert(
      "4b. Hotel B Brain content unchanged after A update attempt",
      "marker intact, no hacked flag",
      intact ? "intact" : "modified or missing",
      intact
    );
  }

  await expectDenied(
    "5. Hotel A cannot delete Hotel B Brain",
    "empty delete / RLS denial (or no DELETE policy)",
    await a.delete("hotel_brain_profiles", { hotel_id: `eq.${fx.hotelB.id}` })
  );
  {
    const still = await admin.select("hotel_brain_profiles", {
      hotel_id: `eq.${fx.hotelB.id}`,
      select: "hotel_id"
    });
    reporter.assert(
      "5b. Hotel B Brain row still exists after A delete attempt",
      "row present",
      still.ok && Array.isArray(still.body) && still.body.length === 1
        ? "present"
        : "missing",
      still.ok && Array.isArray(still.body) && still.body.length === 1
    );
  }

  // ── B. HANDOVERS ────────────────────────────────────────────────
  await expectOkRows(
    "6. Hotel A can read Hotel A handovers",
    "≥1 handover for Hotel A",
    await a.select("handover_reports", {
      workspace_id: `eq.${fx.hotelA.id}`,
      status: "eq.saved"
    })
  );

  await expectDenied(
    "7. Hotel A cannot read Hotel B handovers",
    "empty set or RLS denial",
    await a.select("handover_reports", {
      workspace_id: `eq.${fx.hotelB.id}`,
      status: "eq.saved"
    })
  );

  await expectDenied(
    "8. Hotel A cannot insert handover with Hotel B workspace_id",
    "RLS denial",
    await a.insert("handover_reports", {
      workspace_id: fx.hotelB.id,
      user_id: sessions.hotelAOwner.user.id,
      hotel_name: "spoof",
      department: "Front Office",
      shift: "AM",
      handover_date: new Date().toISOString().slice(0, 10),
      prepared_by: "spoof",
      metrics: {},
      source_notes: "spoof",
      generated_handover: {},
      checklist_state: [],
      recommendation_state: [],
      status: "saved"
    })
  );

  await expectDenied(
    "9. Hotel A cannot update Hotel B handovers",
    "empty update / RLS denial",
    await a.update(
      "handover_reports",
      { id: `eq.${fx.handoverB.id}` },
      { prepared_by: "hacked-by-A" }
    )
  );
  {
    const check = await admin.select("handover_reports", {
      id: `eq.${fx.handoverB.id}`,
      select: "prepared_by"
    });
    const intact =
      check.ok &&
      Array.isArray(check.body) &&
      check.body[0] &&
      check.body[0].prepared_by === "RLS Test";
    reporter.assert(
      "9b. Hotel B handover unchanged after A update attempt",
      "prepared_by still RLS Test",
      intact ? "unchanged" : "changed",
      intact
    );
  }

  await expectDenied(
    "10. Hotel A cannot delete Hotel B handovers",
    "empty delete / RLS denial",
    await a.delete("handover_reports", { id: `eq.${fx.handoverB.id}` })
  );
  {
    const check = await admin.select("handover_reports", {
      id: `eq.${fx.handoverB.id}`,
      select: "id"
    });
    reporter.assert(
      "10b. Hotel B handover still exists after A delete attempt",
      "row present",
      check.ok && Array.isArray(check.body) && check.body.length === 1
        ? "present"
        : "missing",
      check.ok && Array.isArray(check.body) && check.body.length === 1
    );
  }

  // ── C. MAINTENANCE ──────────────────────────────────────────────
  await expectDenied(
    "11. Hotel A cannot read Hotel B maintenance issues",
    "empty set or RLS denial",
    await a.select("maintenance_issues", { workspace_id: `eq.${fx.hotelB.id}` })
  );

  await expectDenied(
    "12. Hotel A cannot insert into Hotel B maintenance workspace",
    "RLS denial",
    await a.insert("maintenance_issues", {
      workspace_id: fx.hotelB.id,
      title: `spoof ${runId}`,
      description: "spoof",
      location_type: "back_of_house",
      category: "other",
      priority: "low",
      status: "open",
      include_in_handover: false
    })
  );

  await expectDenied(
    "13. Hotel A cannot update Hotel B maintenance records",
    "empty update / RLS denial",
    await a.update(
      "maintenance_issues",
      { id: `eq.${fx.issueB.id}` },
      { title: "hacked-by-A" }
    )
  );
  {
    const check = await admin.select("maintenance_issues", {
      id: `eq.${fx.issueB.id}`,
      select: "title,workspace_id"
    });
    const intact =
      check.ok &&
      Array.isArray(check.body) &&
      check.body[0] &&
      check.body[0].title === `Issue B ${runId}` &&
      check.body[0].workspace_id === fx.hotelB.id;
    reporter.assert(
      "13b. Hotel B maintenance unchanged after A update attempt",
      "title/workspace intact",
      intact ? "intact" : "modified",
      intact
    );
  }

  // Workspace immutability: member of A tries to move issue A to hotel B.
  {
    const move = await a.update(
      "maintenance_issues",
      { id: `eq.${fx.issueA.id}` },
      { workspace_id: fx.hotelB.id, title: `moved ${runId}` }
    );
    const check = await admin.select("maintenance_issues", {
      id: `eq.${fx.issueA.id}`,
      select: "workspace_id,title"
    });
    const row = check.ok && Array.isArray(check.body) ? check.body[0] : null;
    const immutable =
      row &&
      row.workspace_id === fx.hotelA.id &&
      row.title === `moved ${runId}`; // title may update; workspace must not
    // If entire update denied, title stays original — also OK for isolation.
    const deniedFully = isDeniedOrEmpty(move) && row && row.workspace_id === fx.hotelA.id;
    const workspaceLocked = row && row.workspace_id === fx.hotelA.id;
    reporter.assert(
      "14. Maintenance workspace_id immutability remains effective",
      "workspace_id stays Hotel A after client attempt to set Hotel B",
      workspaceLocked
        ? `workspace_id locked to Hotel A (update status: ${move.summary || move.status})`
        : `workspace_id drifted to ${row && row.workspace_id}`,
      workspaceLocked || deniedFully || immutable
    );
  }

  // Spoofed update attach: insert maintenance_updates for B's issue with A's JWT claiming B workspace.
  await expectDenied(
    "14b. Hotel A cannot insert maintenance_updates for Hotel B issue",
    "RLS denial",
    await a.insert("maintenance_updates", {
      issue_id: fx.issueB.id,
      workspace_id: fx.hotelB.id,
      update_type: "note",
      note: "spoof"
    })
  );

  // ── D. OPERATOR SEPARATION ──────────────────────────────────────
  // Operator currently has no membership (seed did not attach op to opLab yet).
  await expectDenied(
    "15a. Operator without membership cannot read Hotel A Brain",
    "empty set or RLS denial",
    await op.select("hotel_brain_profiles", { hotel_id: `eq.${fx.hotelA.id}` })
  );
  await expectDenied(
    "15b. Operator without membership cannot read Hotel B handovers",
    "empty set or RLS denial",
    await op.select("handover_reports", { workspace_id: `eq.${fx.hotelB.id}` })
  );
  await expectDenied(
    "15c. Operator without membership cannot read Hotel A maintenance",
    "empty set or RLS denial",
    await op.select("maintenance_issues", { workspace_id: `eq.${fx.hotelA.id}` })
  );

  // Attach operator to OpLab-style test workspace (NOT production Pilot Lab name).
  const opMembership = await admin.insert("hotel_members", {
    hotel_id: fx.opLab.id,
    user_id: sessions.operator.user.id,
    role: "owner"
  });
  if (!opMembership.ok) {
    throw new HarnessSetupError(
      "Failed to attach operator to OpLab during fixture setup.",
      opMembership.summary || "unknown error"
    );
  }

  await expectDenied(
    "16a. Operator OpLab workspace cannot read Hotel A Brain",
    "empty set or RLS denial",
    await op.select("hotel_brain_profiles", { hotel_id: `eq.${fx.hotelA.id}` })
  );
  await expectDenied(
    "16b. Operator OpLab workspace cannot read Hotel B handovers",
    "empty set or RLS denial",
    await op.select("handover_reports", { workspace_id: `eq.${fx.hotelB.id}` })
  );
  await expectOkRows(
    "16c. Operator can read own OpLab Brain",
    "≥1 OpLab brain row",
    await op.select("hotel_brain_profiles", { hotel_id: `eq.${fx.opLab.id}` })
  );

  await expectDenied(
    "17. Hotel A cannot read operator OpLab Brain",
    "empty set or RLS denial",
    await a.select("hotel_brain_profiles", { hotel_id: `eq.${fx.opLab.id}` })
  );

  // ── D2. PLATFORM SUSPENSION (data-plane / same JWT) ─────────────
  // Requires migration 20260802153000_rls_require_active_platform_access.sql
  {
    const helperProbe = await a.rpc("has_active_platform_access");
    if (!helperProbe.ok || helperProbe.body !== true) {
      throw new HarnessSetupError(
        "has_active_platform_access() unavailable or returned false for active Hotel A owner. Apply supabase/migrations/20260802153000_rls_require_active_platform_access.sql on the non-production test project before running this suite.",
        helperProbe.summary || JSON.stringify(helperProbe.body)
      );
    }
    reporter.pass(
      "S0. has_active_platform_access helper available for active member",
      "rpc returns true",
      "true"
    );
  }

  await expectOkRows(
    "S1. Active member can read Hotel A Brain before suspend",
    "≥1 brain row",
    await a.select("hotel_brain_profiles", { hotel_id: `eq.${fx.hotelA.id}` })
  );
  await expectOkRows(
    "S1b. Active member can read Hotel A handovers before suspend",
    "≥1 handover row",
    await a.select("handover_reports", { workspace_id: `eq.${fx.hotelA.id}` })
  );
  await expectOkRows(
    "S1c. Active member can read Hotel A maintenance before suspend",
    "≥1 issue row",
    await a.select("maintenance_issues", { workspace_id: `eq.${fx.hotelA.id}` })
  );

  // Capture the SAME JWT client before suspension (no re-login afterward).
  const suspendedMemberClient = a;
  const suspendedMemberUserId = sessions.hotelAOwner.user.id;

  await admin.adminEnsurePlatformAccess(
    suspendedMemberUserId,
    config.accounts.hotelAOwner.email,
    "suspended"
  );
  reporter.pass(
    "S2. Admin sets Hotel A owner platform_access to suspended",
    "access_status=suspended",
    "suspended"
  );

  {
    const accessRpc = await suspendedMemberClient.rpc("get_my_platform_access");
    const denied =
      accessRpc.ok &&
      accessRpc.body &&
      accessRpc.body.allowed === false &&
      accessRpc.body.reason === "SUSPENDED";
    reporter.assert(
      "S3. Same JWT get_my_platform_access returns SUSPENDED",
      "allowed=false reason=SUSPENDED",
      accessRpc.ok
        ? JSON.stringify({
            allowed: accessRpc.body && accessRpc.body.allowed,
            reason: accessRpc.body && accessRpc.body.reason
          })
        : accessRpc.summary,
      denied
    );
  }

  {
    const helper = await suspendedMemberClient.rpc("has_active_platform_access");
    reporter.assert(
      "S3b. Same JWT has_active_platform_access is false",
      "false",
      helper.ok ? String(helper.body) : helper.summary,
      helper.ok && helper.body === false
    );
  }

  await expectDenied(
    "S4a. Suspended member SELECT Hotel Brain denied (same JWT)",
    "empty set or RLS denial",
    await suspendedMemberClient.select("hotel_brain_profiles", {
      hotel_id: `eq.${fx.hotelA.id}`
    })
  );
  await expectDenied(
    "S4b. Suspended member SELECT handovers denied (same JWT)",
    "empty set or RLS denial",
    await suspendedMemberClient.select("handover_reports", {
      workspace_id: `eq.${fx.hotelA.id}`
    })
  );
  await expectDenied(
    "S4c. Suspended member SELECT maintenance denied (same JWT)",
    "empty set or RLS denial",
    await suspendedMemberClient.select("maintenance_issues", {
      workspace_id: `eq.${fx.hotelA.id}`
    })
  );
  await expectDenied(
    "S4d. Suspended member INSERT handover denied (same JWT)",
    "RLS denial",
    await suspendedMemberClient.insert("handover_reports", {
      workspace_id: fx.hotelA.id,
      user_id: suspendedMemberUserId,
      hotel_name: "suspended-write",
      department: "Front Office",
      shift: "AM",
      handover_date: new Date().toISOString().slice(0, 10),
      prepared_by: "suspended",
      metrics: {},
      source_notes: "suspended",
      generated_handover: {},
      checklist_state: [],
      recommendation_state: [],
      status: "saved"
    })
  );
  await expectDenied(
    "S4e. Suspended member UPDATE Brain denied (same JWT)",
    "empty update / RLS denial",
    await suspendedMemberClient.update(
      "hotel_brain_profiles",
      { hotel_id: `eq.${fx.hotelA.id}` },
      { profile_data: { suspended: true } }
    )
  );
  await expectDenied(
    "S4f. Suspended member UPDATE handover denied (same JWT)",
    "empty update / RLS denial",
    await suspendedMemberClient.update(
      "handover_reports",
      { id: `eq.${fx.handoverA.id}` },
      { prepared_by: "suspended-hack" }
    )
  );
  await expectDenied(
    "S4g. Suspended member DELETE handover denied (same JWT)",
    "empty delete / RLS denial",
    await suspendedMemberClient.delete("handover_reports", {
      id: `eq.${fx.handoverA.id}`
    })
  );
  await expectDenied(
    "S4h. Suspended member UPDATE maintenance denied (same JWT)",
    "empty update / RLS denial",
    await suspendedMemberClient.update(
      "maintenance_issues",
      { id: `eq.${fx.issueA.id}` },
      { title: "suspended-hack" }
    )
  );
  await expectDenied(
    "S4i. Suspended member DELETE maintenance denied (same JWT)",
    "empty delete / RLS denial (no member DELETE policy)",
    await suspendedMemberClient.delete("maintenance_issues", {
      id: `eq.${fx.issueA.id}`
    })
  );
  await expectDenied(
    "S4j. Suspended member SELECT hotels row denied (same JWT)",
    "empty set or RLS denial",
    await suspendedMemberClient.select("hotels", { id: `eq.${fx.hotelA.id}` })
  );
  await expectDenied(
    "S4k. Suspended member SELECT hotel_members denied (same JWT)",
    "empty set or RLS denial",
    await suspendedMemberClient.select("hotel_members", {
      hotel_id: `eq.${fx.hotelA.id}`,
      user_id: `eq.${suspendedMemberUserId}`
    })
  );

  // Hotel B isolation must remain intact while A is suspended.
  await expectOkRows(
    "S5. Hotel B owner still reads Hotel B Brain while A is suspended",
    "≥1 row",
    await b.select("hotel_brain_profiles", { hotel_id: `eq.${fx.hotelB.id}` })
  );

  // Operator suspension: OpLab membership remains, but platform_access suspended.
  await admin.adminEnsurePlatformAccess(
    sessions.operator.user.id,
    config.accounts.operator.email,
    "suspended"
  );
  await expectDenied(
    "S6. Suspended operator cannot read own OpLab Brain (same JWT)",
    "empty set or RLS denial",
    await op.select("hotel_brain_profiles", { hotel_id: `eq.${fx.opLab.id}` })
  );
  await admin.adminEnsurePlatformAccess(
    sessions.operator.user.id,
    config.accounts.operator.email,
    "active"
  );
  await expectOkRows(
    "S6b. Unsuspended operator regains OpLab Brain with membership",
    "≥1 OpLab brain row",
    await op.select("hotel_brain_profiles", { hotel_id: `eq.${fx.opLab.id}` })
  );

  // Unsuspend Hotel A owner — membership still present → access returns.
  await admin.adminEnsurePlatformAccess(
    suspendedMemberUserId,
    config.accounts.hotelAOwner.email,
    "active"
  );
  await expectOkRows(
    "S7. Unsuspend with membership restores Hotel Brain SELECT (same JWT)",
    "≥1 brain row",
    await suspendedMemberClient.select("hotel_brain_profiles", {
      hotel_id: `eq.${fx.hotelA.id}`
    })
  );
  await expectOkRows(
    "S7b. Unsuspend with membership restores handovers SELECT",
    "≥1 handover row",
    await suspendedMemberClient.select("handover_reports", {
      workspace_id: `eq.${fx.hotelA.id}`
    })
  );
  await expectOkRows(
    "S7c. Unsuspend with membership restores maintenance SELECT",
    "≥1 issue row",
    await suspendedMemberClient.select("maintenance_issues", {
      workspace_id: `eq.${fx.hotelA.id}`
    })
  );

  // Unsuspend without membership does not restore data access (revoked user path).
  await admin.adminEnsurePlatformAccess(
    sessions.revoked.user.id,
    config.accounts.revoked.email,
    "active"
  );
  await expectOkRows(
    "S8. Revoked fixture (still member, active) can read Hotel A Brain",
    "≥1 brain row",
    await rev.select("hotel_brain_profiles", { hotel_id: `eq.${fx.hotelA.id}` })
  );
  const dropRevokedMembership = await admin.delete("hotel_members", {
    hotel_id: `eq.${fx.hotelA.id}`,
    user_id: `eq.${sessions.revoked.user.id}`
  });
  if (!dropRevokedMembership.ok) {
    throw new HarnessSetupError(
      "Failed to delete revoked-user membership for unsuspend-without-membership scenario.",
      dropRevokedMembership.summary || "unknown error"
    );
  }
  await admin.adminEnsurePlatformAccess(
    sessions.revoked.user.id,
    config.accounts.revoked.email,
    "active"
  );
  await expectDenied(
    "S9. Active platform_access without membership does not restore Hotel A Brain",
    "empty set or RLS denial",
    await rev.select("hotel_brain_profiles", { hotel_id: `eq.${fx.hotelA.id}` })
  );
  // Re-attach revoked membership for the classic membership-removal block below.
  const reattach = await admin.insert("hotel_members", {
    hotel_id: fx.hotelA.id,
    user_id: sessions.revoked.user.id,
    role: "member"
  });
  if (!reattach.ok) {
    throw new HarnessSetupError(
      "Failed to re-attach revoked-user membership before membership-removal scenarios.",
      reattach.summary || "unknown error"
    );
  }

  // ── E. MEMBERSHIP REMOVAL ───────────────────────────────────────
  await expectOkRows(
    "18. Revoked-user (still member) can read Hotel A Brain",
    "≥1 brain row",
    await rev.select("hotel_brain_profiles", { hotel_id: `eq.${fx.hotelA.id}` })
  );

  const revoke = await admin.delete("hotel_members", {
    hotel_id: `eq.${fx.hotelA.id}`,
    user_id: `eq.${sessions.revoked.user.id}`
  });
  if (!revoke.ok) {
    throw new HarnessSetupError(
      "Failed to revoke membership during membership-removal scenario setup.",
      revoke.summary || "unknown error"
    );
  }
  reporter.pass(
    "19. Remove membership via test admin setup",
    "membership row deleted",
    "deleted"
  );

  // Same JWT — no re-login.
  await expectDenied(
    "20a. Same JWT loses SELECT on Hotel A Brain after membership removal",
    "empty set or RLS denial",
    await rev.select("hotel_brain_profiles", { hotel_id: `eq.${fx.hotelA.id}` })
  );
  await expectDenied(
    "20b. Same JWT loses INSERT handover on Hotel A after removal",
    "RLS denial",
    await rev.insert("handover_reports", {
      workspace_id: fx.hotelA.id,
      user_id: sessions.revoked.user.id,
      hotel_name: "revoked-spoof",
      department: "Front Office",
      shift: "AM",
      handover_date: new Date().toISOString().slice(0, 10),
      prepared_by: "revoked",
      metrics: {},
      source_notes: "revoked",
      generated_handover: {},
      checklist_state: [],
      recommendation_state: [],
      status: "saved"
    })
  );
  await expectDenied(
    "20c. Same JWT loses UPDATE on Hotel A handover after removal",
    "empty update / RLS denial",
    await rev.update(
      "handover_reports",
      { id: `eq.${fx.handoverA.id}` },
      { prepared_by: "revoked-hack" }
    )
  );
  await expectDenied(
    "20d. Same JWT loses DELETE on Hotel A handover after removal",
    "empty delete / RLS denial",
    await rev.delete("handover_reports", { id: `eq.${fx.handoverA.id}` })
  );

  {
    const ws = await resolveFrontendWorkspace(rev, sessions.revoked.user.id);
    const empty =
      ws.ok && Array.isArray(ws.body) && ws.body.length === 0;
    reporter.assert(
      "21. Frontend workspace resolution returns no workspace after membership removal",
      "hotel_members query (order created_at asc limit 1) returns 0 rows",
      empty ? "0 rows" : ws.summary || `${(ws.body && ws.body.length) || "?"} rows`,
      empty
    );
  }

  // ── F. SPOOFING ─────────────────────────────────────────────────
  await expectDenied(
    "22. Client-supplied Hotel B workspace_id from Hotel A fails (handover insert)",
    "RLS denial",
    await a.insert("handover_reports", {
      workspace_id: fx.hotelB.id,
      user_id: sessions.hotelAOwner.user.id,
      hotel_name: "cache-spoof",
      department: "Front Office",
      shift: "PM",
      handover_date: new Date().toISOString().slice(0, 10),
      prepared_by: "cache-spoof",
      metrics: {},
      source_notes: "cache-spoof",
      generated_handover: {},
      checklist_state: [],
      recommendation_state: [],
      status: "saved"
    })
  );

  await expectDenied(
    "23. Client-supplied Hotel B hotel_id from Hotel A fails (brain upsert)",
    "RLS denial",
    await a.insert("hotel_brain_profiles", {
      hotel_id: fx.hotelB.id,
      profile_data: { spoof: true },
      schema_version: 4
    })
  );

  // Local tenant/cache identifiers: simulate by querying with B's id while authenticated as A.
  // Cloud access must still be denied (already covered); explicit cache-spoof scenario:
  await expectDenied(
    "24. Changing local tenant/cache identifiers does not grant cloud access",
    "empty set or RLS denial when A queries B via spoofed id filter",
    await a.select("handover_reports", {
      workspace_id: `eq.${fx.hotelB.id}`,
      select: "id,workspace_id"
    })
  );

  // ── G. UNAUTHENTICATED ──────────────────────────────────────────
  await expectDenied(
    "25. Anonymous clients cannot read private hotel data (Brain)",
    "empty set or RLS denial",
    await anon.select("hotel_brain_profiles", { hotel_id: `eq.${fx.hotelA.id}` })
  );
  await expectDenied(
    "25b. Anonymous clients cannot read handovers",
    "empty set or RLS denial",
    await anon.select("handover_reports", { workspace_id: `eq.${fx.hotelA.id}` })
  );
  await expectDenied(
    "25c. Anonymous clients cannot read maintenance",
    "empty set or RLS denial",
    await anon.select("maintenance_issues", { workspace_id: `eq.${fx.hotelA.id}` })
  );

  await expectDenied(
    "26. Anonymous clients cannot mutate private hotel data (handover insert)",
    "RLS denial / not authenticated",
    await anon.insert("handover_reports", {
      workspace_id: fx.hotelA.id,
      user_id: sessions.hotelAOwner.user.id,
      hotel_name: "anon",
      department: "Front Office",
      shift: "AM",
      handover_date: new Date().toISOString().slice(0, 10),
      prepared_by: "anon",
      metrics: {},
      source_notes: "anon",
      generated_handover: {},
      checklist_state: [],
      recommendation_state: [],
      status: "saved"
    })
  );
  await expectDenied(
    "26b. Anonymous clients cannot update Hotel A Brain",
    "RLS denial / not authenticated",
    await anon.update(
      "hotel_brain_profiles",
      { hotel_id: `eq.${fx.hotelA.id}` },
      { profile_data: { anon: true } }
    )
  );

  // Positive control: Hotel B owner can still read B after all spoof attempts.
  await expectOkRows(
    "Control. Hotel B owner can still read Hotel B Brain",
    "≥1 row",
    await b.select("hotel_brain_profiles", { hotel_id: `eq.${fx.hotelB.id}` })
  );
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log(" Hospitality Flow — Live RLS Isolation Suite");
  console.log(" WARNING: Requires a dedicated NON-PRODUCTION project.");
  console.log(" Never point this suite at Zetter / customer data.");
  console.log("═══════════════════════════════════════════════════════════");

  // Always run DEV-mode configuration check (safe, no secrets printed).
  const devCheck = verifyPasswordResetDevModeConfig(process.env);
  console.log("\n── Password-reset DEV-mode configuration check ──");
  console.log(`Verdict: ${devCheck.verdict}`);
  for (const f of devCheck.findings) console.log(` - ${f}`);

  let config;
  try {
    config = assertSafeTestEnvironment(process.env);
  } catch (err) {
    console.error("\nSAFETY GATE / ENV ERROR — live proofs were NOT executed.");
    if (err && err.errors) {
      for (const e of err.errors) console.error(" -", e);
    } else {
      console.error(err && err.message ? err.message : err);
    }
    console.error("\nSee docs/security/LIVE_RLS_TEST_SETUP.md");
    console.error("\n── Launch-gate verdict ──");
    console.error("LIVE PROOF PENDING — isolation is NOT proven by this run.");
    console.error(`Password-reset DEV check: ${devCheck.verdict}`);
    process.exit(2);
  }

  console.log("\n── Target (redacted) ──");
  console.log(JSON.stringify(describeConfigSafely(config), null, 2));

  const admin = createRestClient({
    url: config.url,
    apikey: config.anonKey,
    accessToken: config.serviceRoleKey
  });

  let harnessSetupFailed = false;
  let harnessSetupMessage = "";

  try {
    await runLiveProofs(config);
  } catch (err) {
    const isSetup =
      (err && err.code === "HF_RLS_HARNESS_SETUP") ||
      (err && err.name === "HarnessSetupError");
    if (isSetup) {
      harnessSetupFailed = true;
      harnessSetupMessage = err.message || "Harness setup failed";
      console.error("\nHARNESS / SETUP FAILURE — isolation assertions are incomplete.");
      console.error(" -", harnessSetupMessage);
      if (err.details) console.error(" - details:", err.details);
      console.error(
        "This is NOT reported as an RLS isolation failure (exit 2)."
      );
    } else {
      // Unexpected runtime error after/during proofs — treat as harness failure too
      // unless isolation assertions already recorded failures.
      harnessSetupFailed = true;
      harnessSetupMessage = err && err.message ? err.message : String(err);
      console.error("\nUNEXPECTED HARNESS ERROR — stopping.");
      console.error(" -", harnessSetupMessage);
    }
  } finally {
    console.log("\nCleaning up suite-created hotels (CASCADE child rows)…");
    try {
      await cleanupSuiteHotels(admin);
      console.log("Cleanup complete for suite hotel prefix + runId.");
    } catch (cleanupErr) {
      console.error(
        "WARN: cleanup encountered an error:",
        cleanupErr && cleanupErr.message ? cleanupErr.message : cleanupErr
      );
    }
  }

  const { passed, failed, total } = reporter.summary();
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(` Isolation assertions: ${passed} passed, ${failed} failed, ${total} total`);
  console.log(` Password-reset DEV check: ${devCheck.verdict}`);
  if (created.userResolution && created.userResolution.length) {
    console.log(" Auth user resolution:");
    for (const row of created.userResolution) {
      console.log(
        `  - ${row.account}: ${row.reused ? "reused" : "created"} @${row.emailDomain}`
      );
    }
  }

  let exitCode;
  let launchGate;
  if (harnessSetupFailed && total === 0) {
    exitCode = 2;
    launchGate =
      "LAUNCH GATE: SETUP FAILED — live isolation proof did not complete. Not an RLS assertion failure.";
  } else if (harnessSetupFailed && total > 0) {
    // Partial run then setup/scenario helper failed mid-suite.
    exitCode = 2;
    launchGate =
      "LAUNCH GATE: SETUP/HARNESS FAILED mid-run — do not treat incomplete results as a full RLS proof.";
  } else if (failed === 0 && total > 0) {
    exitCode = 0;
    launchGate =
      "LAUNCH GATE (RLS proof): PASS — live isolation assertions succeeded on non-production project.";
    if (devCheck.verdict === "enabled — launch blocker") {
      launchGate +=
        " HOWEVER password-reset DEV mode is a launch blocker until disabled.";
    } else if (devCheck.verdict === "cannot verify automatically") {
      launchGate +=
        " Password-reset Edge secrets still need a manual production dashboard confirmation.";
    }
  } else if (total === 0) {
    exitCode = 2;
    launchGate = "LAUNCH GATE: SETUP FAILED — no isolation assertions executed.";
  } else {
    exitCode = 1;
    launchGate =
      "LAUNCH GATE (RLS proof): FAIL — one or more isolation assertions failed.";
  }
  console.log(launchGate);
  console.log(` Exit code: ${exitCode}`);
  console.log("═══════════════════════════════════════════════════════════");

  process.exit(exitCode);
}

main().catch((err) => {
  console.error("Fatal harness error:", err && err.message ? err.message : err);
  if (err && err.details) console.error("Details:", err.details);
  process.exit(2);
});
