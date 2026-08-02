/**
 * Live F-A03 proof — early-access submit Edge-only authorization.
 *
 * Target: hospitality-flow-security-test (ozxfqyuihoxokwdqollm) only.
 * Run: npm run test:live-early-access-submit
 *
 * Exit: 0 pass · 1 assertion fail · 2 harness/setup
 */
import {
  loadEnvFiles,
  assertSafeTestEnvironment,
  createRestClient,
  createReporter,
  makeRunId,
  HarnessSetupError,
  describeConfigSafely,
  formatResultDiagnostic
} from "./lib/live-rls-test-helpers.mjs";
import {
  assertAuthTestProject,
  EXPECTED_TEST_PROJECT_REF,
  suiteEmail,
  createSession,
  invokeEdgeFunction,
  adminDeleteUser
} from "./lib/live-auth-test-helpers.mjs";

loadEnvFiles();

const reporter = createReporter();
const runId = makeRunId();
const SUITE_MARKER = `hf-fa03-${runId}`;

function assert(scenario, expected, actual, condition, detail = "") {
  return reporter.assert(scenario, expected, actual, condition, detail);
}

function isExecuteDenied(result) {
  if (!result || result.ok) return false;
  const status = result.status;
  if (status === 401 || status === 403 || status === 404) return true;
  const msg = JSON.stringify(result.body || {}).toLowerCase();
  return (
    /permission denied|42501|pgrst202|could not find the function|not find.*function|jwt/i.test(
      msg
    ) || status >= 400
  );
}

function isInsertDenied(result) {
  if (!result || result.ok) return false;
  const status = result.status;
  if (status === 401 || status === 403) return true;
  const msg = JSON.stringify(result.body || {}).toLowerCase();
  return /row-level security|permission denied|42501|42501|pgrst/i.test(msg) || status >= 400;
}

async function cleanup(admin, created) {
  console.log("\nCleaning up suite fixtures…");
  for (const appId of created.applicationIds.filter(Boolean)) {
    await admin.delete("early_access_applications", { id: `eq.${appId}` });
    await admin.delete("platform_access", {
      early_access_application_id: `eq.${appId}`
    });
  }
  // Sweep by email marker
  const listed = await admin.select("early_access_applications", {
    select: "id,email",
    email: `like.%${SUITE_MARKER}%`
  });
  if (listed.ok && Array.isArray(listed.body)) {
    for (const row of listed.body) {
      await admin.delete("platform_access", {
        early_access_application_id: `eq.${row.id}`
      });
      await admin.delete("early_access_applications", { id: `eq.${row.id}` });
    }
  }
  for (const userId of created.userIds.filter(Boolean)) {
    await adminDeleteUser(
      {
        url: process.env.HF_RLS_TEST_SUPABASE_URL,
        anonKey: process.env.HF_RLS_TEST_ANON_KEY,
        serviceRoleKey: process.env.HF_RLS_TEST_SERVICE_ROLE_KEY
      },
      userId
    );
  }
  console.log("Cleanup complete.");
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log(" Live F-A03 — Early Access Submit Edge-Only Authorization");
  console.log(` Target: ${EXPECTED_TEST_PROJECT_REF} only`);
  console.log("═══════════════════════════════════════════════════════════");

  let config;
  try {
    config = assertSafeTestEnvironment(process.env);
    assertAuthTestProject(config);
  } catch (err) {
    console.error("\nSAFETY GATE / ENV ERROR");
    if (err && err.errors) for (const e of err.errors) console.error(" -", e);
    else console.error(err && err.message ? err.message : err);
    process.exit(2);
  }

  console.log("\n── Target (redacted) ──");
  console.log(JSON.stringify(describeConfigSafely(config), null, 2));
  console.log(` runId=${runId}`);

  const anon = createRestClient({
    url: config.url,
    apikey: config.anonKey,
    accessToken: config.anonKey
  });
  const admin = createRestClient({
    url: config.url,
    apikey: config.anonKey,
    accessToken: config.serviceRoleKey
  });

  const created = { applicationIds: [], userIds: [] };
  let harnessFailed = false;
  let harnessMessage = "";

  const rpcArgs = {
    p_first_name: "Fa03",
    p_email: suiteEmail(config.accounts.hotelAOwner.email, "fa03rpc", runId).replace(
      "hf.auth.lifecycle",
      SUITE_MARKER
    ),
    p_property_name: `FA03 Hotel ${runId}`,
    p_property_type: "boutique-hotel",
    p_room_count: 8,
    p_role: "GM",
    p_source: "fa03-live-suite"
  };

  try {
    // Ensure fixture users exist for authenticated JWT
    await admin.validateAdminAccess();
    const ensuredOwner = await admin.adminEnsureUser(
      config.accounts.hotelAOwner.email,
      config.accounts.hotelAOwner.password
    );
    await admin.adminEnsurePlatformAccess(
      ensuredOwner.user.id,
      config.accounts.hotelAOwner.email,
      "active"
    );
    const ensuredOp = await admin.adminEnsureUser(
      config.accounts.operator.email,
      config.accounts.operator.password
    );
    await admin.adminEnsurePlatformAccess(
      ensuredOp.user.id,
      config.accounts.operator.email,
      "active"
    );
    await admin.adminEnsureOperator(ensuredOp.user.id, config.accounts.operator.email);

    const memberSession = await createSession(
      config,
      config.accounts.hotelAOwner.email,
      config.accounts.hotelAOwner.password
    );
    if (!memberSession.ok) {
      throw new HarnessSetupError("Could not sign in hotel A owner", memberSession.summary);
    }
    const authed = memberSession.session.client;

    // ── Direct RPC denials ─────────────────────────────────────────
    const anonRpc = await anon.rpc("submit_early_access_application", rpcArgs);
    assert(
      "anon cannot EXECUTE submit_early_access_application directly",
      "denied (4xx / permission)",
      anonRpc.summary,
      isExecuteDenied(anonRpc)
    );

    const authedRpc = await authed.rpc("submit_early_access_application", {
      ...rpcArgs,
      p_email: suiteEmail(config.accounts.hotelAOwner.email, "fa03auth", runId).replace(
        "hf.auth.lifecycle",
        SUITE_MARKER
      )
    });
    assert(
      "authenticated user cannot EXECUTE submit_early_access_application directly",
      "denied (4xx / permission)",
      authedRpc.summary,
      isExecuteDenied(authedRpc)
    );

    // ── Direct INSERT denials ──────────────────────────────────────
    const insertRow = {
      first_name: "Fa03Insert",
      email: suiteEmail(config.accounts.hotelAOwner.email, "fa03ins", runId).replace(
        "hf.auth.lifecycle",
        SUITE_MARKER
      ),
      property_name: `FA03 Insert ${runId}`,
      property_type: "boutique-hotel",
      room_count: 5,
      role: "GM",
      source: "fa03-live-suite",
      founding_status: "pending"
    };

    const anonInsert = await anon.insert("early_access_applications", insertRow);
    assert(
      "anon cannot INSERT into early_access_applications",
      "denied (401/403 / RLS)",
      anonInsert.summary,
      isInsertDenied(anonInsert)
    );

    const authedInsert = await authed.insert("early_access_applications", {
      ...insertRow,
      email: suiteEmail(config.accounts.hotelAOwner.email, "fa03insa", runId).replace(
        "hf.auth.lifecycle",
        SUITE_MARKER
      )
    });
    assert(
      "authenticated user cannot INSERT into early_access_applications",
      "denied (401/403 / RLS)",
      authedInsert.summary,
      isInsertDenied(authedInsert)
    );

    // ── service_role RPC still works ───────────────────────────────
    const serviceEmail = suiteEmail(config.accounts.hotelAOwner.email, "fa03svc", runId).replace(
      "hf.auth.lifecycle",
      SUITE_MARKER
    );
    const serviceRpc = await admin.rpc("submit_early_access_application", {
      p_first_name: "Fa03Svc",
      p_email: serviceEmail,
      p_property_name: `FA03 Service ${runId}`,
      p_property_type: "boutique-hotel",
      p_room_count: 9,
      p_role: "GM",
      p_source: "fa03-live-suite"
    });
    const serviceId =
      typeof serviceRpc.body === "string"
        ? serviceRpc.body
        : serviceRpc.body && serviceRpc.body[0]
          ? serviceRpc.body[0]
          : serviceRpc.body;
    assert(
      "service_role internal RPC call still works",
      "uuid returned",
      serviceRpc.ok ? `id=${String(serviceId).slice(0, 8)}…` : serviceRpc.summary,
      serviceRpc.ok && typeof serviceId === "string" && serviceId.length > 10
    );
    if (serviceRpc.ok && serviceId) created.applicationIds.push(serviceId);

    // ── Edge valid submission ──────────────────────────────────────
    const edgeEmail = suiteEmail(config.accounts.hotelAOwner.email, "fa03edge", runId).replace(
      "hf.auth.lifecycle",
      SUITE_MARKER
    );
    const edge1 = await invokeEdgeFunction(config, "submit-early-access-application", {
      body: {
        firstName: "Fa03Edge",
        email: edgeEmail,
        propertyName: `FA03 Edge ${runId}`,
        propertyType: "boutique-hotel",
        roomCount: 11,
        role: "General Manager",
        source: "fa03-live-suite"
      }
    });
    assert(
      "Edge submission succeeds with a valid payload",
      "HTTP 200 ok / applicationSaved",
      edge1.summary,
      edge1.ok && edge1.body && (edge1.body.ok === true || edge1.body.applicationSaved === true)
    );

    // Resolve application id for cleanup
    const edgeRow = await admin.select("early_access_applications", {
      select: "id,email",
      email: `eq.${edgeEmail}`,
      founding_status: "eq.pending",
      limit: "1"
    });
    let edgeAppId = null;
    if (edgeRow.ok && edgeRow.body && edgeRow.body[0]) {
      edgeAppId = edgeRow.body[0].id;
      created.applicationIds.push(edgeAppId);
    }

    // ── Duplicate pending idempotent ───────────────────────────────
    const edge2 = await invokeEdgeFunction(config, "submit-early-access-application", {
      body: {
        firstName: "Fa03Edge",
        email: edgeEmail,
        propertyName: `FA03 Edge Dup ${runId}`,
        propertyType: "boutique-hotel",
        roomCount: 11,
        role: "General Manager",
        source: "fa03-live-suite"
      }
    });
    const countRows = await admin.select("early_access_applications", {
      select: "id",
      email: `eq.${edgeEmail}`,
      founding_status: "eq.pending"
    });
    const pendingCount =
      countRows.ok && Array.isArray(countRows.body) ? countRows.body.length : -1;
    assert(
      "duplicate pending submission is idempotent",
      "Edge ok + exactly 1 pending row for email",
      `edge2.ok=${edge2.ok} pendingCount=${pendingCount}`,
      edge2.ok && pendingCount === 1
    );

    // ── Malformed / oversized fail safely ──────────────────────────
    const malformed = await invokeEdgeFunction(config, "submit-early-access-application", {
      body: { firstName: "OnlyName" }
    });
    assert(
      "malformed payload fails safely",
      "HTTP 400",
      malformed.summary,
      !malformed.ok && malformed.status === 400
    );

    const oversized = await invokeEdgeFunction(config, "submit-early-access-application", {
      body: {
        firstName: "Fa03",
        email: suiteEmail(config.accounts.hotelAOwner.email, "fa03big", runId).replace(
          "hf.auth.lifecycle",
          SUITE_MARKER
        ),
        propertyName: "X".repeat(201),
        propertyType: "boutique-hotel",
        roomCount: 3,
        role: "GM",
        source: "fa03-live-suite"
      }
    });
    assert(
      "oversized payload fails safely",
      "HTTP 400",
      oversized.summary,
      !oversized.ok && oversized.status === 400
    );

    // ── Rate limit (burst) ─────────────────────────────────────────
    let saw429 = false;
    const rateEmail = suiteEmail(config.accounts.hotelAOwner.email, "fa03rate", runId).replace(
      "hf.auth.lifecycle",
      SUITE_MARKER
    );
    for (let i = 0; i < 12; i += 1) {
      const r = await invokeEdgeFunction(config, "submit-early-access-application", {
        body: {
          firstName: "Fa03Rate",
          email: rateEmail,
          propertyName: `FA03 Rate ${runId}`,
          propertyType: "boutique-hotel",
          roomCount: 2,
          role: "GM",
          source: "fa03-live-suite"
        },
        headers: { "x-forwarded-for": `203.0.113.${(i % 1) + 40}` }
      });
      if (r.status === 429) {
        saw429 = true;
        break;
      }
      if (r.ok) {
        const row = await admin.select("early_access_applications", {
          select: "id",
          email: `eq.${rateEmail}`,
          limit: "1"
        });
        if (row.ok && row.body && row.body[0]) {
          created.applicationIds.push(row.body[0].id);
        }
      }
    }
    assert(
      "rate-limit behaviour remains active",
      "HTTP 429 within burst (or documented isolate miss)",
      saw429 ? "observed 429" : "no 429 in 12 hits (cold-start / isolate variance)",
      saw429
    );

    // ── Operator list / invite still function ──────────────────────
    const opSess = await createSession(
      config,
      config.accounts.operator.email,
      config.accounts.operator.password
    );
    if (!opSess.ok) {
      throw new HarnessSetupError("Operator sign-in failed", opSess.summary);
    }

    const listApps = await invokeEdgeFunction(config, "list-pilot-applications", {
      accessToken: opSess.session.accessToken,
      body: {}
    });
    assert(
      "operator list-pilot-applications still functions",
      "HTTP 200",
      listApps.summary,
      listApps.ok && listApps.status === 200
    );

    // Invite against a declined fixture — must fail closed without marking invited
    const declineEmail = suiteEmail(config.accounts.hotelAOwner.email, "fa03dec", runId).replace(
      "hf.auth.lifecycle",
      SUITE_MARKER
    );
    const declineApp = await admin.insert("early_access_applications", {
      first_name: "Fa03Decline",
      email: declineEmail,
      property_name: `FA03 Decline ${runId}`,
      property_type: "boutique-hotel",
      room_count: 4,
      role: "GM",
      source: "fa03-live-suite",
      founding_status: "declined"
    });
    if (!declineApp.ok || !declineApp.body || !declineApp.body[0]) {
      throw new HarnessSetupError("Failed to seed declined application", declineApp.summary);
    }
    created.applicationIds.push(declineApp.body[0].id);

    const inviteDeclined = await invokeEdgeFunction(config, "invite-pilot-applicant", {
      accessToken: opSess.session.accessToken,
      body: { applicationId: declineApp.body[0].id }
    });
    assert(
      "operator invite workflow still functions (declined fails closed)",
      "HTTP 409 / not invited",
      inviteDeclined.summary,
      !inviteDeclined.ok &&
        (inviteDeclined.status === 409 ||
          /declined/i.test(JSON.stringify(inviteDeclined.body || {})))
    );

    // Non-operator still denied on list (sanity)
    const memberList = await invokeEdgeFunction(config, "list-pilot-applications", {
      accessToken: memberSession.session.accessToken,
      body: {}
    });
    assert(
      "non-operator still cannot list pilot applications",
      "403",
      memberList.summary,
      !memberList.ok && memberList.status === 403
    );
  } catch (err) {
    harnessFailed = true;
    harnessMessage = err && err.message ? err.message : String(err);
    console.error("\nHARNESS / SETUP FAILURE");
    console.error(" -", harnessMessage);
    if (err && err.details) console.error(" - details:", err.details);
  } finally {
    try {
      await cleanup(admin, created);
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

  let exitCode;
  let verdict;
  if (harnessFailed && summary.total === 0) {
    exitCode = 2;
    verdict = "F-A03 LIVE PROOF: SETUP FAILED";
  } else if (harnessFailed) {
    exitCode = 2;
    verdict = "F-A03 LIVE PROOF: HARNESS FAILED mid-run";
  } else if (summary.failed === 0 && summary.total > 0) {
    exitCode = 0;
    verdict =
      "F-A03 LIVE PROOF: PASS — Edge-only submit authorization proven on security-test.";
  } else if (summary.total === 0) {
    exitCode = 2;
    verdict = "F-A03 LIVE PROOF: SETUP FAILED — no assertions";
  } else {
    exitCode = 1;
    verdict = "F-A03 LIVE PROOF: FAIL — one or more live assertions failed.";
  }

  console.log(verdict);
  console.log(` Exit code: ${exitCode}`);
  console.log("═══════════════════════════════════════════════════════════");
  process.exit(exitCode);
}

main().catch((err) => {
  console.error("Fatal:", err && err.message ? err.message : err);
  process.exit(2);
});
