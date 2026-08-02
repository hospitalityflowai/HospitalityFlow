/**
 * Launch Gate #3 — Live Authorization Proof Suite.
 *
 * Run: npm run test:live-authorization
 * Target: hospitality-flow-security-test (ozxfqyuihoxokwdqollm) only.
 *
 * Exit: 0 all pass · 1 assertion fail · 2 harness/setup
 */
import {
  loadEnvFiles,
  assertSafeTestEnvironment,
  assertAuthTestProject,
  createRestClient,
  createReporter,
  makeRunId,
  describeConfigSafely,
  HarnessSetupError,
  createSession,
  invokeEdgeFunction,
  suiteEmail,
  resolveInternalRedirect,
  DEFAULT_POST_AUTH_ROUTE,
  OPERATOR_ROUTE,
  OWNER_MODEL,
  AUTHZ_HOTEL_PREFIX,
  seedAuthzFixtures,
  cleanupAuthzFixtures,
  isPrivilegeDenied,
  isDeniedOrEmpty,
  EXPECTED_TEST_PROJECT_REF
} from "./lib/live-authorization-helpers.mjs";

loadEnvFiles();

const reporter = createReporter();
const runId = makeRunId();
const created = {
  hotelIds: [],
  membershipIds: [],
  applicationIds: []
};

function assert(scenario, expected, actual, condition, detail = "") {
  return reporter.assert(scenario, expected, actual, condition, detail);
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log(" Hospitality Flow — Live Authorization Launch Gate (#3)");
  console.log(` Target: ${EXPECTED_TEST_PROJECT_REF} / hospitality-flow-security-test`);
  console.log(" Never point this suite at production.");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`\nOwner/member model: ${OWNER_MODEL.code} — ${OWNER_MODEL.summary}\n`);

  let config;
  try {
    config = assertSafeTestEnvironment(process.env);
    assertAuthTestProject(config);
  } catch (err) {
    console.error("\nSAFETY GATE / ENV ERROR — authorization proofs were NOT executed.");
    if (err && err.errors) for (const e of err.errors) console.error(" -", e);
    else console.error(err && err.message ? err.message : err);
    console.error("\nSee docs/security/LIVE_AUTHORIZATION_TEST_SETUP.md");
    process.exit(2);
  }

  console.log("── Target (redacted) ──");
  console.log(JSON.stringify(describeConfigSafely(config), null, 2));
  console.log(` runId=${runId}`);
  console.log(` hotelPrefix=${AUTHZ_HOTEL_PREFIX}`);

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

  let harnessFailed = false;
  let harnessMessage = "";

  try {
    await admin.validateAdminAccess();

    // ── Ensure fixture Auth users ──────────────────────────────────
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

    // Normal member = revoked fixture user attached as "member" (not owner)
    // Owner A = hotelAOwner, Owner B = hotelBOwner, Operator = operator (no hotel mem)
    const users = {
      ownerA: ensured.hotelAOwner,
      ownerB: ensured.hotelBOwner,
      member: ensured.revoked,
      operator: ensured.operator,
      revoked: ensured.revoked
    };

    const { hotelA, hotelB, memberMembershipId } = await seedAuthzFixtures(
      admin,
      users,
      runId,
      created
    );

    const memberSess = await createSession(
      config,
      config.accounts.revoked.email,
      config.accounts.revoked.password
    );
    const ownerASess = await createSession(
      config,
      config.accounts.hotelAOwner.email,
      config.accounts.hotelAOwner.password
    );
    const ownerBSess = await createSession(
      config,
      config.accounts.hotelBOwner.email,
      config.accounts.hotelBOwner.password
    );
    const opSess = await createSession(
      config,
      config.accounts.operator.email,
      config.accounts.operator.password
    );

    if (!memberSess.ok || !ownerASess.ok || !ownerBSess.ok || !opSess.ok) {
      throw new HarnessSetupError("One or more fixture sign-ins failed", {
        member: memberSess.summary,
        ownerA: ownerASess.summary,
        ownerB: ownerBSess.summary,
        operator: opSess.summary
      });
    }

    const member = memberSess.session.client;
    const ownerA = ownerASess.session.client;
    const ownerB = ownerBSess.session.client;
    const operator = opSess.session.client;

    // Confirm member role is "member"
    const memCheck = await admin.select("hotel_members", {
      select: "id,role",
      id: `eq.${memberMembershipId}`
    });
    if (
      !memCheck.ok ||
      !memCheck.body?.[0] ||
      String(memCheck.body[0].role).toLowerCase() !== "member"
    ) {
      throw new HarnessSetupError("Member fixture role is not 'member'", memCheck.summary);
    }

    // ── 1. Member cannot change role to owner ──────────────────────
    const roleEscalation = await member.update(
      "hotel_members",
      { id: `eq.${memberMembershipId}` },
      { role: "owner" }
    );
    const roleAfter = await admin.select("hotel_members", {
      select: "role",
      id: `eq.${memberMembershipId}`
    });
    const stillMember =
      roleAfter.ok &&
      roleAfter.body?.[0] &&
      String(roleAfter.body[0].role).toLowerCase() === "member";
    assert(
      "1. Normal member cannot change hotel_members.role to owner",
      "update denied + role remains member",
      `${roleEscalation.summary}; role=${roleAfter.body?.[0]?.role}`,
      isPrivilegeDenied(roleEscalation) && stillMember
    );

    // ── 2. Member cannot insert hotel_members for themselves ───────
    const selfInsert = await member.insert("hotel_members", {
      hotel_id: hotelA.id,
      user_id: users.member.id,
      role: "owner"
    });
    assert(
      "2. Normal member cannot insert a new hotel_members row for themselves",
      "insert denied",
      selfInsert.summary,
      isPrivilegeDenied(selfInsert)
    );

    // ── 3. Member cannot add themselves to another hotel ───────────
    const joinB = await member.insert("hotel_members", {
      hotel_id: hotelB.id,
      user_id: users.member.id,
      role: "member"
    });
    assert(
      "3. Normal member cannot add themselves to another hotel",
      "insert denied",
      joinB.summary,
      isPrivilegeDenied(joinB)
    );

    // ── 4. Member cannot modify platform_access ────────────────────
    const paPatch = await member.update(
      "platform_access",
      { user_id: `eq.${users.member.id}` },
      { access_status: "active" }
    );
    const paInsert = await member.insert("platform_access", {
      email: suiteEmail(config.accounts.revoked.email, "paesc", runId),
      access_status: "active",
      user_id: users.member.id
    });
    assert(
      "4. Normal member cannot modify platform_access",
      "update/insert denied",
      `update=${paPatch.summary}; insert=${paInsert.summary}`,
      isPrivilegeDenied(paPatch) && isPrivilegeDenied(paInsert)
    );

    // ── 5. Member cannot insert/update platform_operators ──────────
    const opInsert = await member.insert("platform_operators", {
      user_id: users.member.id,
      email: config.accounts.revoked.email
    });
    const opUpdate = await member.update(
      "platform_operators",
      { user_id: `eq.${users.operator.id}` },
      { email: "evil@example.com" }
    );
    assert(
      "5. Normal member cannot insert or update platform_operators",
      "insert/update denied",
      `insert=${opInsert.summary}; update=${opUpdate.summary}`,
      isPrivilegeDenied(opInsert) && isPrivilegeDenied(opUpdate)
    );

    // ── 6. Member cannot enable operator capability ────────────────
    // Capability = platform_operators row (no can_* columns). Re-check insert denied
    // and get_my_platform_access.is_operator remains false for member.
    const memberAccess = await member.rpc("get_my_platform_access");
    assert(
      "6. Normal member cannot enable operator capability flags",
      "is_operator false + cannot insert platform_operators",
      memberAccess.ok
        ? JSON.stringify({
            is_operator: memberAccess.body?.is_operator,
            insertDenied: isPrivilegeDenied(opInsert)
          })
        : memberAccess.summary,
      memberAccess.ok &&
        memberAccess.body?.is_operator === false &&
        isPrivilegeDenied(opInsert)
    );

    // ── 7. Member cannot invoke operator Edge Functions ────────────
    const memberList = await invokeEdgeFunction(config, "list-pilot-applications", {
      accessToken: memberSess.session.accessToken,
      body: {}
    });
    const memberInvite = await invokeEdgeFunction(config, "invite-pilot-applicant", {
      accessToken: memberSess.session.accessToken,
      body: { applicationId: "00000000-0000-4000-8000-000000000001" }
    });
    assert(
      "7. Normal member cannot invoke operator Edge Functions",
      "403 / not authorised operator",
      `list=${memberList.summary}; invite=${memberInvite.summary}`,
      !memberList.ok &&
        memberList.status === 403 &&
        !memberInvite.ok &&
        (memberInvite.status === 403 || memberInvite.status === 400)
    );

    // ── 8. Suspended operator cannot invoke operator Edge ──────────
    await admin.adminEnsurePlatformAccess(
      users.operator.id,
      config.accounts.operator.email,
      "suspended"
    );
    const suspOpList = await invokeEdgeFunction(config, "list-pilot-applications", {
      accessToken: opSess.session.accessToken,
      body: {}
    });
    assert(
      "8. Suspended operator cannot invoke operator Edge Functions",
      "403 suspended/forbidden",
      suspOpList.summary,
      !suspOpList.ok && suspOpList.status === 403
    );
    await admin.adminEnsurePlatformAccess(
      users.operator.id,
      config.accounts.operator.email,
      "active"
    );

    // ── 9. Capability-disabled operator cannot perform action ──────
    // No granular can_* flags — disable by removing platform_operators row.
    await admin.delete("platform_operators", { user_id: `eq.${users.operator.id}` });
    const disabledList = await invokeEdgeFunction(config, "list-pilot-applications", {
      accessToken: opSess.session.accessToken,
      body: {}
    });
    assert(
      "9. Capability-disabled operator cannot perform the disabled action",
      "403 after platform_operators removal (binary capability model)",
      disabledList.summary,
      !disabledList.ok && disabledList.status === 403
    );
    await admin.adminEnsureOperator(users.operator.id, config.accounts.operator.email);

    // ── 10. Operator without membership cannot read/modify Hotel A ─
    // Ensure operator has no membership
    await admin.delete("hotel_members", { user_id: `eq.${users.operator.id}` });
    const opBrain = await operator.select("hotel_brain_profiles", {
      hotel_id: `eq.${hotelA.id}`
    });
    const opUpdateBrain = await operator.update(
      "hotel_brain_profiles",
      { hotel_id: `eq.${hotelA.id}` },
      { profile_data: { marker: "evil" } }
    );
    const opHotelPatch = await operator.update(
      "hotels",
      { id: `eq.${hotelA.id}` },
      { city: "EvilCity" }
    );
    assert(
      "10. Operator without hotel membership cannot read or modify Hotel A data",
      "Brain SELECT empty/denied + updates denied",
      `select=${opBrain.summary}; brainUp=${opUpdateBrain.summary}; hotelUp=${opHotelPatch.summary}`,
      isDeniedOrEmpty(opBrain) &&
        isPrivilegeDenied(opUpdateBrain) &&
        isPrivilegeDenied(opHotelPatch)
    );

    // ── 11. Hotel owner A cannot access Hotel B ────────────────────
    const aReadsB = await ownerA.select("hotel_brain_profiles", {
      hotel_id: `eq.${hotelB.id}`
    });
    const aUpdatesB = await ownerA.update(
      "hotel_brain_profiles",
      { hotel_id: `eq.${hotelB.id}` },
      { profile_data: { marker: "cross-tenant" } }
    );
    assert(
      "11. Hotel owner cannot access Hotel B data",
      "empty/denied Brain SELECT + update denied",
      `select=${aReadsB.summary}; update=${aUpdatesB.summary}`,
      isDeniedOrEmpty(aReadsB) && isPrivilegeDenied(aUpdatesB)
    );

    // ── 12. Non-owner cannot update owner-only hotel details ───────
    // Model A: hotel details are owner-restricted.
    const memberHotelPatch = await member.update(
      "hotels",
      { id: `eq.${hotelA.id}` },
      { city: "MemberCity" }
    );
    const memberRpc = await member.rpc("update_hotel_workspace", {
      p_hotel_id: hotelA.id,
      p_name: "Hacked Name",
      p_property_type: "boutique-hotel",
      p_number_of_rooms: 99,
      p_city: "MemberCity",
      p_country: "United Kingdom"
    });
    const hotelAfter = await admin.select("hotels", {
      select: "name,city",
      id: `eq.${hotelA.id}`
    });
    const nameUnchanged =
      hotelAfter.ok &&
      hotelAfter.body?.[0] &&
      hotelAfter.body[0].name === hotelA.name &&
      hotelAfter.body[0].city !== "MemberCity";
    assert(
      "12. Non-owner cannot update owner-only hotel details (model A)",
      "PostgREST + RPC denied; hotel row unchanged",
      `patch=${memberHotelPatch.summary}; rpc=${memberRpc.summary}; city=${hotelAfter.body?.[0]?.city}`,
      isPrivilegeDenied(memberHotelPatch) &&
        isPrivilegeDenied(memberRpc) &&
        nameUnchanged
    );

    // Owner can still update (control — proves owner path works)
    const ownerRpc = await ownerA.rpc("update_hotel_workspace", {
      p_hotel_id: hotelA.id,
      p_name: hotelA.name,
      p_property_type: "boutique-hotel",
      p_number_of_rooms: hotelA.number_of_rooms || 24,
      p_city: hotelA.city || "AuthzCity",
      p_country: "United Kingdom"
    });
    assert(
      "12b. Owner can update hotel details (control)",
      "RPC ok",
      ownerRpc.summary,
      ownerRpc.ok === true
    );

    // ── 13. Foreign hotel_id / workspace_id fails ──────────────────
    const foreignBrain = await member.insert("hotel_brain_profiles", {
      hotel_id: hotelB.id,
      profile_data: { marker: "foreign" },
      schema_version: 4
    });
    const foreignHandover = await member.insert("handover_reports", {
      workspace_id: hotelB.id,
      user_id: users.member.id,
      hotel_name: "Foreign",
      shift: "Day",
      handover_date: new Date().toISOString().slice(0, 10),
      status: "saved",
      metrics: {},
      generated_handover: {},
      checklist_state: [],
      recommendation_state: []
    });
    const foreignUpdateRpc = await member.rpc("update_hotel_workspace", {
      p_hotel_id: hotelB.id,
      p_name: "No",
      p_property_type: "boutique-hotel",
      p_number_of_rooms: 1,
      p_city: "X",
      p_country: "United Kingdom"
    });
    assert(
      "13. Client-supplied foreign hotel_id/workspace_id fails for privileged writes",
      "Brain/handover insert + update RPC denied",
      `brain=${foreignBrain.summary}; handover=${foreignHandover.summary}; rpc=${foreignUpdateRpc.summary}`,
      isPrivilegeDenied(foreignBrain) &&
        isPrivilegeDenied(foreignHandover) &&
        isPrivilegeDenied(foreignUpdateRpc)
    );

    // ── 14. Direct RPC privilege-escalation attempts fail ──────────
    const pilotLabAsMember = await member.rpc("create_operator_pilot_lab_workspace");
    const markInviteAsMember = await member.rpc("mark_pilot_applicant_invited", {
      p_application_id: "00000000-0000-4000-8000-000000000001",
      p_operator_user_id: users.member.id
    });
    assert(
      "14. Direct RPC privilege-escalation attempts fail",
      "create_operator_pilot_lab + mark_pilot_applicant_invited denied",
      `pilotLab=${pilotLabAsMember.summary}; mark=${markInviteAsMember.summary}`,
      isPrivilegeDenied(pilotLabAsMember) && isPrivilegeDenied(markInviteAsMember)
    );

    // ── 15. Anonymous privileged calls fail ────────────────────────
    const anonBrain = await anon.select("hotel_brain_profiles", {
      hotel_id: `eq.${hotelA.id}`
    });
    const anonRpc = await anon.rpc("update_hotel_workspace", {
      p_hotel_id: hotelA.id,
      p_name: "Anon",
      p_property_type: "boutique-hotel",
      p_number_of_rooms: 1,
      p_city: "X",
      p_country: "Y"
    });
    const anonSubmit = await anon.rpc("submit_early_access_application", {
      p_first_name: "Anon",
      p_email: suiteEmail(config.accounts.hotelAOwner.email, "anonsub", runId),
      p_property_name: "X",
      p_property_type: "boutique-hotel",
      p_room_count: 1,
      p_role: "GM",
      p_source: "authz-suite"
    });
    const anonList = await invokeEdgeFunction(config, "list-pilot-applications", {
      accessToken: config.anonKey,
      body: {}
    });
    assert(
      "15. Anonymous privileged calls fail",
      "data/RPC/Edge denied",
      `brain=${anonBrain.summary}; rpc=${anonRpc.summary}; submit=${anonSubmit.summary}; list=${anonList.summary}`,
      isDeniedOrEmpty(anonBrain) &&
        isPrivilegeDenied(anonRpc) &&
        isPrivilegeDenied(anonSubmit) &&
        !anonList.ok
    );

    // ── 16. Safe redirect allowlist rejects bypasses ───────────────
    const redirectCases = [
      { in: "https://evil.example", expect: DEFAULT_POST_AUTH_ROUTE },
      { in: "//evil.example", expect: DEFAULT_POST_AUTH_ROUTE },
      { in: "javascript:alert(1)", expect: DEFAULT_POST_AUTH_ROUTE },
      { in: "%68%74%74%70%73%3a%2f%2fevil.example", expect: DEFAULT_POST_AUTH_ROUTE },
      { in: OPERATOR_ROUTE, expect: DEFAULT_POST_AUTH_ROUTE }, // non-operator
      { in: "admin.html", expect: DEFAULT_POST_AUTH_ROUTE },
      { in: "handover.html", expect: "handover.html" }
    ];
    let redirectOk = true;
    const redirectActuals = [];
    for (const c of redirectCases) {
      const out = resolveInternalRedirect(c.in, { isOperator: false });
      redirectActuals.push(`${c.in}→${out}`);
      if (out !== c.expect) redirectOk = false;
    }
    assert(
      "16. Safe redirect allowlist rejects external, encoded and operator-route bypasses",
      "unsafe → account.html; handover allowed",
      redirectActuals.join("; "),
      redirectOk
    );

    // ── 17. Operator redirect only after fresh operator check ──────
    const freshOpAccess = await operator.rpc("get_my_platform_access");
    const isOp =
      freshOpAccess.ok &&
      freshOpAccess.body?.allowed === true &&
      freshOpAccess.body?.is_operator === true;
    const opRedirect = resolveInternalRedirect(OPERATOR_ROUTE, {
      isOperator: isOp
    });
    const memberRedirect = resolveInternalRedirect(OPERATOR_ROUTE, {
      isOperator:
        memberAccess.ok &&
        memberAccess.body?.allowed === true &&
        memberAccess.body?.is_operator === true
    });
    assert(
      "17. Authorized operator redirect works only after a fresh operator check",
      "operator → operator.html; member → account.html",
      `op.is_operator=${freshOpAccess.body?.is_operator}; opRedirect=${opRedirect}; memberRedirect=${memberRedirect}`,
      isOp && opRedirect === OPERATOR_ROUTE && memberRedirect === DEFAULT_POST_AUTH_ROUTE
    );

    // ── 18. F-A03 Edge-only early-access submit remains enforced ───
    const directSubmit = await member.rpc("submit_early_access_application", {
      p_first_name: "Authz",
      p_email: suiteEmail(config.accounts.revoked.email, "fa03", runId),
      p_property_name: "Authz Hotel",
      p_property_type: "boutique-hotel",
      p_room_count: 3,
      p_role: "GM",
      p_source: "authz-suite"
    });
    const directInsert = await member.insert("early_access_applications", {
      first_name: "Authz",
      email: suiteEmail(config.accounts.revoked.email, "fa03i", runId),
      property_name: "Authz Hotel",
      property_type: "boutique-hotel",
      room_count: 3,
      role: "GM",
      source: "authz-suite",
      founding_status: "pending"
    });
    const edgeSubmit = await invokeEdgeFunction(config, "submit-early-access-application", {
      body: {
        firstName: "AuthzEdge",
        email: suiteEmail(config.accounts.revoked.email, "fa03e", runId),
        propertyName: `Authz Edge ${runId}`,
        propertyType: "boutique-hotel",
        roomCount: 4,
        role: "GM",
        source: "authz-suite"
      }
    });
    if (edgeSubmit.ok) {
      const row = await admin.select("early_access_applications", {
        select: "id",
        email: `eq.${suiteEmail(config.accounts.revoked.email, "fa03e", runId)}`,
        limit: "1"
      });
      if (row.ok && row.body?.[0]?.id) created.applicationIds.push(row.body[0].id);
    }
    assert(
      "18. F-A03 Edge-only early-access submission remains enforced",
      "direct RPC/INSERT denied; Edge path ok",
      `rpc=${directSubmit.summary}; insert=${directInsert.summary}; edge=${edgeSubmit.summary}`,
      isPrivilegeDenied(directSubmit) &&
        isPrivilegeDenied(directInsert) &&
        edgeSubmit.ok === true
    );

    // Restore operator active (already restored after #9)
    await admin.adminEnsurePlatformAccess(
      users.operator.id,
      config.accounts.operator.email,
      "active"
    );
    await admin.adminEnsureOperator(users.operator.id, config.accounts.operator.email);
  } catch (err) {
    harnessFailed = true;
    harnessMessage = err && err.message ? err.message : String(err);
    console.error("\nHARNESS / SETUP FAILURE — assertions incomplete.");
    console.error(" -", harnessMessage);
    if (err && err.details) console.error(" - details:", err.details);
    if (!(err instanceof HarnessSetupError) && !(err && err.code === "HF_RLS_HARNESS_SETUP")) {
      console.error(err);
    }
  } finally {
    try {
      await cleanupAuthzFixtures(admin, created);
    } catch (cleanupErr) {
      console.error(
        "WARN cleanup:",
        cleanupErr && cleanupErr.message ? cleanupErr.message : cleanupErr
      );
    }
  }

  const summary = reporter.summary();
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(
    ` Assertions: ${summary.passed} passed, ${summary.failed} failed, ${summary.total} total`
  );
  console.log(` Owner model: ${OWNER_MODEL.code}`);

  let exitCode;
  let verdict;
  if (harnessFailed && summary.total === 0) {
    exitCode = 2;
    verdict = "LAUNCH GATE #3 LIVE AUTHZ: SETUP FAILED";
  } else if (harnessFailed) {
    exitCode = 2;
    verdict =
      "LAUNCH GATE #3 LIVE AUTHZ: HARNESS FAILED mid-run — do not treat incomplete results as full proof.";
  } else if (summary.failed === 0 && summary.total > 0) {
    exitCode = 0;
    verdict =
      "LAUNCH GATE #3 LIVE AUTHZ: PASS — privilege-escalation and privileged-action denials proven on security-test.";
  } else if (summary.total === 0) {
    exitCode = 2;
    verdict = "LAUNCH GATE #3 LIVE AUTHZ: SETUP FAILED — no assertions";
  } else {
    exitCode = 1;
    verdict = "LAUNCH GATE #3 LIVE AUTHZ: FAIL — one or more authorization assertions failed.";
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
