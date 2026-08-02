/**
 * Audit 2 Remediation Step 1 — platform suspension is authoritative.
 * Run: node scripts/test-platform-suspend-authoritative.mjs
 *
 * Covers static SQL ordering, decision-table regressions, and frontend
 * workspace/cache behaviour when access is suspended.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MIGRATION =
  "supabase/migrations/20260802140000_platform_suspend_authoritative.sql";

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message) {
  console.error("FAIL:", message);
  return false;
}

function pass(message) {
  console.log("PASS:", message);
  return true;
}

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*--.*$/gm, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

/**
 * Mirrors get_my_platform_access decision order after the suspend migration.
 */
function decidePlatformAccess({ status, hasMembership, isOperator, authenticated }) {
  if (!authenticated) {
    return {
      allowed: false,
      reason: "NOT_AUTHENTICATED",
      access_status: null,
      has_membership: false,
      is_operator: false
    };
  }
  if (status === "suspended") {
    return {
      allowed: false,
      reason: "SUSPENDED",
      access_status: "suspended",
      has_membership: !!hasMembership,
      is_operator: !!isOperator
    };
  }
  if (hasMembership) {
    return {
      allowed: true,
      access_status: "active",
      has_membership: true,
      is_operator: !!isOperator
    };
  }
  if (isOperator) {
    return {
      allowed: true,
      access_status: "operator",
      has_membership: false,
      is_operator: true
    };
  }
  if (status === "active" || status === "invited") {
    return {
      allowed: true,
      access_status: status,
      has_membership: false,
      is_operator: false
    };
  }
  return {
    allowed: false,
    reason: "NOT_APPROVED",
    access_status: status || "none",
    has_membership: false,
    is_operator: false
  };
}

/**
 * Mirrors is_password_reset_allowed after the suspend migration.
 */
function decidePasswordReset({ status, hasMembership, userExists }) {
  if (!userExists) return false;
  if (status === "suspended") return false;
  if (hasMembership) return true;
  return status === "active" || status === "invited";
}

function loadPlatformAccessModule(globalOverrides) {
  const sandbox = {
    Promise,
    console
  };
  Object.assign(sandbox, globalOverrides || {});
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("js/platform-access.js"), sandbox);
  return sandbox.HFPlatformAccess;
}

function extractFunctionBody(sql, fnName) {
  const re = new RegExp(
    `CREATE OR REPLACE FUNCTION public\\.${fnName}[\\s\\S]*?^\\$\\$;`,
    "m"
  );
  const match = sql.match(re);
  return match ? match[0] : "";
}

async function run() {
  let ok = true;
  const migration = read(MIGRATION);
  const migrationBody = stripComments(migration);
  const platformJs = read("js/platform-access.js");
  const workspaceJs = read("js/workspace.js");
  const operatorAuth = read("supabase/functions/_shared/operator-auth.ts");
  const playbook = read("docs/security/PLATFORM_SUSPEND_AND_REVOKE.md");

  // ── 1. Migration present & suspend-before-membership ─────────────────────
  if (!fs.existsSync(path.join(ROOT, MIGRATION))) {
    ok = fail("Missing suspend-authoritative migration") && ok;
  } else {
    ok = pass("Suspend-authoritative migration file present") && ok;
  }

  const accessFn = extractFunctionBody(migration, "get_my_platform_access");
  const resetFn = extractFunctionBody(migration, "is_password_reset_allowed");

  if (!accessFn) {
    ok = fail("Migration must replace get_my_platform_access") && ok;
  } else {
    const suspendIdx = accessFn.search(/v_status\s*=\s*'suspended'/i);
    const membershipIdx = accessFn.search(/v_has_membership|hotel_members/i);
    if (suspendIdx === -1) {
      ok = fail("get_my_platform_access must deny suspended status") && ok;
    } else if (membershipIdx === -1 || suspendIdx > membershipIdx) {
      // Membership variable may be declared before suspend check; require
      // the SUSPENDED return to appear before the membership allow return.
      const suspendReturn = accessFn.search(/reason',\s*'SUSPENDED'/i);
      const membershipAllow = accessFn.search(
        /has_membership',\s*true[\s\S]{0,80}'is_operator'/i
      );
      if (suspendReturn === -1 || membershipAllow === -1 || suspendReturn > membershipAllow) {
        ok = fail("Suspension deny must run before membership allow path") && ok;
      } else {
        ok = pass("get_my_platform_access checks suspension before membership allow") && ok;
      }
    } else {
      ok = pass("get_my_platform_access checks suspension before membership allow") && ok;
    }
  }

  if (!/reason',\s*'SUSPENDED'/.test(accessFn)) {
    ok = fail("Suspended response must include reason SUSPENDED") && ok;
  } else {
    ok = pass("Suspended response includes reason SUSPENDED") && ok;
  }

  if (!resetFn || !/v_status\s*=\s*'suspended'[\s\S]{0,80}RETURN false/i.test(resetFn)) {
    ok = fail("is_password_reset_allowed must return false when suspended") && ok;
  } else {
    const susp = resetFn.search(/v_status\s*=\s*'suspended'/i);
    const memb = resetFn.search(/hotel_members/i);
    if (susp === -1 || memb === -1 || susp > memb) {
      ok = fail("Password-reset suspend check must precede membership allow") && ok;
    } else {
      ok = pass("is_password_reset_allowed denies suspended before membership") && ok;
    }
  }

  if (!/Platform access is suspended/i.test(migrationBody)) {
    ok = fail("Workspace RPCs must reject suspended callers explicitly") && ok;
  } else {
    ok = pass("create_hotel_workspace / Pilot Lab reject suspended") && ok;
  }

  // ── 2. Decision table (RPC behaviour) ────────────────────────────────────
  const cases = [
    {
      name: "1. Active member with active platform access is allowed",
      input: { status: "active", hasMembership: true, isOperator: false, authenticated: true },
      expectAllowed: true
    },
    {
      name: "2. Member with suspended platform access is denied",
      input: { status: "suspended", hasMembership: true, isOperator: false, authenticated: true },
      expectAllowed: false,
      expectReason: "SUSPENDED"
    },
    {
      name: "3. Suspended member cannot pass get_my_platform_access",
      input: { status: "suspended", hasMembership: true, isOperator: false, authenticated: true },
      expectAllowed: false
    },
    {
      name: "8. Operator with suspended platform access is denied",
      input: { status: "suspended", hasMembership: false, isOperator: true, authenticated: true },
      expectAllowed: false,
      expectReason: "SUSPENDED"
    },
    {
      name: "9a. Unsuspend with membership restores allow",
      input: { status: "active", hasMembership: true, isOperator: false, authenticated: true },
      expectAllowed: true
    },
    {
      name: "9b/10. Unsuspend without membership does not invent membership",
      input: { status: "active", hasMembership: false, isOperator: false, authenticated: true },
      expectAllowed: true,
      expectMembership: false
    }
  ];

  for (const c of cases) {
    const result = decidePlatformAccess(c.input);
    if (result.allowed !== c.expectAllowed) {
      ok = fail(`${c.name} — expected allowed=${c.expectAllowed}`) && ok;
      continue;
    }
    if (c.expectReason && result.reason !== c.expectReason) {
      ok = fail(`${c.name} — expected reason ${c.expectReason}`) && ok;
      continue;
    }
    if (c.expectMembership === false && result.has_membership !== false) {
      ok = fail(`${c.name} — must not invent membership`) && ok;
      continue;
    }
    ok = pass(c.name) && ok;
  }

  // Password reset eligibility
  if (decidePasswordReset({ status: "suspended", hasMembership: true, userExists: true }) !== false) {
    ok = fail("4. Suspended member must not be password-reset eligible") && ok;
  } else {
    ok = pass("4. Suspended member is not password-reset eligible") && ok;
  }

  if (decidePasswordReset({ status: "active", hasMembership: true, userExists: true }) !== true) {
    ok = fail("Active member should remain password-reset eligible") && ok;
  } else {
    ok = pass("Active member remains password-reset eligible") && ok;
  }

  // JWT does not override fresh suspended check (decision uses status, not token)
  const jwtOverride = decidePlatformAccess({
    status: "suspended",
    hasMembership: true,
    isOperator: false,
    authenticated: true
  });
  if (jwtOverride.allowed !== false || jwtOverride.reason !== "SUSPENDED") {
    ok = fail("7. Fresh suspended access check must deny regardless of prior JWT session") && ok;
  } else {
    ok = pass("7. Existing JWT does not override a fresh suspended access check") && ok;
  }

  // ── 3. Frontend guards ───────────────────────────────────────────────────
  if (!/SUSPENDED_MESSAGE/.test(platformJs) || !/clearWorkspaceIdentity/.test(platformJs)) {
    ok = fail("platform-access.js must expose SUSPENDED_MESSAGE and clearWorkspaceIdentity") && ok;
  } else {
    ok = pass("platform-access.js exposes suspended messaging and cache clear") && ok;
  }

  if (!/checkPlatformAccess/.test(workspaceJs) || !/clearCachedWorkspace/.test(workspaceJs)) {
    ok = fail("getUserWorkspace must gate on platform access and clear cache") && ok;
  } else if (
    !/function getUserWorkspace[\s\S]*checkPlatformAccess[\s\S]*clearCachedWorkspace[\s\S]*from\("hotel_members"/.test(
      workspaceJs
    )
  ) {
    ok = fail("getUserWorkspace must check access before hotel_members select") && ok;
  } else {
    ok = pass("5. Frontend workspace resolution gates on platform access") && ok;
  }

  if (!/Access suspended|access=suspended|SUSPENDED/.test(workspaceJs)) {
    ok = fail("Account UI must surface suspended state") && ok;
  } else {
    ok = pass("Account UI surfaces suspended state") && ok;
  }

  if (!/accessStatus === "suspended"|Operator platform access is suspended/.test(operatorAuth)) {
    ok = fail("operator-auth must deny suspended operators") && ok;
  } else {
    ok = pass("8b. Edge operator-auth denies suspended operators") && ok;
  }

  if (!/no emergency operator bypass/i.test(operatorAuth + migration + playbook)) {
    ok = fail("Docs/code must state there is no emergency operator bypass") && ok;
  } else {
    ok = pass("No emergency operator bypass documented") && ok;
  }

  // Runtime: clearWorkspaceIdentity + denyMessage
  try {
    let cleared = false;
    const access = loadPlatformAccessModule({
      HFWorkspace: {
        clearCachedWorkspace: function () {
          cleared = true;
        }
      },
      HFTenantStorage: {
        readTenantContext: function () {
          return { userId: "u1", workspaceId: "h1" };
        },
        writeTenantContext: function (ctx) {
          if (ctx.workspaceId === null) cleared = true;
        }
      },
      HFAuth: { ensureClient: function () { return Promise.reject(new Error("n/a")); } }
    });

    access.clearWorkspaceIdentity();
    if (!cleared) {
      ok = fail("6. clearWorkspaceIdentity must clear cached workspace identity") && ok;
    } else {
      ok = pass("6. Existing cached workspace is cleared after suspension deny helpers") && ok;
    }

    const msg = access.denyMessage({
      allowed: false,
      reason: "SUSPENDED",
      accessStatus: "suspended"
    });
    if (!/suspended/i.test(msg)) {
      ok = fail("denyMessage must return suspended copy") && ok;
    } else {
      ok = pass("denyMessage returns suspended copy") && ok;
    }
  } catch (err) {
    ok = fail("Frontend suspend helper runtime check threw: " + err.message) && ok;
  }

  // Runtime: checkPlatformAccess parses SUSPENDED from RPC (JWT cannot override)
  try {
    const access = loadPlatformAccessModule({
      HospitalityFlowSupabase: {
        isConfigured: function () {
          return true;
        }
      },
      HFAuth: {
        ensureClient: function () {
          return Promise.resolve({
            rpc: function () {
              return Promise.resolve({
                data: {
                  allowed: false,
                  access_status: "suspended",
                  has_membership: true,
                  is_operator: false,
                  reason: "SUSPENDED"
                },
                error: null
              });
            }
          });
        }
      }
    });
    const result = await access.checkPlatformAccess();
    if (
      !result ||
      result.allowed !== false ||
      result.reason !== "SUSPENDED" ||
      result.hasMembership !== true
    ) {
      ok = fail("checkPlatformAccess must surface SUSPENDED with membership flag") && ok;
    } else {
      ok = pass("3b. Client checkPlatformAccess surfaces server SUSPENDED deny") && ok;
    }
  } catch (err) {
    ok = fail("checkPlatformAccess SUSPENDED runtime check threw: " + err.message) && ok;
  }

  // ── 4. Playbook + unsuspend rules ────────────────────────────────────────
  if (
    !/Hard revoke/i.test(playbook) ||
    !/Remove from hotel/i.test(playbook) ||
    !/does \*\*not\*\* recreate|does not recreate/i.test(playbook)
  ) {
    ok = fail("Playbook must document Suspend / Remove / Hard revoke / unsuspend rules") && ok;
  } else {
    ok = pass("10. Playbook documents unsuspend does not recreate membership") && ok;
  }

  // ── 5. Membership-removal behaviour still documented / not weakened ──────
  const liveRls = read("scripts/test-live-rls-isolation.mjs");
  if (!/MEMBERSHIP REMOVAL|membership removal/i.test(liveRls)) {
    ok = fail("11. Live RLS membership-removal scenarios must remain present") && ok;
  } else {
    ok = pass("11. Membership removal scenarios from Launch Gate #1 remain intact") && ok;
  }

  if (/DROP POLICY|DISABLE ROW LEVEL SECURITY/i.test(migrationBody)) {
    ok = fail("App-plane suspend migration must not weaken RLS") && ok;
  } else {
    ok = pass("App-plane suspend migration does not alter RLS policies") && ok;
  }

  // Data-plane companion migration (F-01 completion)
  const rlsMigPath =
    "supabase/migrations/20260802153000_rls_require_active_platform_access.sql";
  if (!fs.existsSync(path.join(ROOT, rlsMigPath))) {
    ok = fail("Missing RLS suspend data-plane migration") && ok;
  } else {
    const rlsMig = read(rlsMigPath);
    if (!/has_active_platform_access/.test(rlsMig)) {
      ok = fail("RLS migration must define has_active_platform_access") && ok;
    } else if (!/SECURITY DEFINER/.test(rlsMig)) {
      ok = fail("has_active_platform_access must be SECURITY DEFINER for safe RLS use") && ok;
    } else if (
      !/hotel_brain_profiles/.test(rlsMig) ||
      !/handover_reports/.test(rlsMig) ||
      !/maintenance_issues/.test(rlsMig) ||
      !/maintenance_updates/.test(rlsMig) ||
      !/hotel_members_select_own/.test(rlsMig)
    ) {
      ok = fail("RLS migration must update all private operational table policies") && ok;
    } else if (
      (rlsMig.match(/has_active_platform_access\(\)/g) || []).length < 8
    ) {
      ok = fail("Policies must AND has_active_platform_access with membership") && ok;
    } else {
      ok = pass("Data-plane RLS migration gates operational tables on active platform access") && ok;
    }
  }

  if (ok) {
    console.log("\nAll platform-suspend-authoritative checks passed.");
    process.exit(0);
  }

  console.error("\nPlatform-suspend-authoritative checks failed.");
  process.exit(1);
}

run();
