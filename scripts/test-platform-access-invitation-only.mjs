/**
 * Invitation-only platform access checks.
 * Run: node scripts/test-platform-access-invitation-only.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

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

function scriptOrder(html, earlier, later) {
  const earlierIdx = html.indexOf(earlier);
  const laterIdx = html.indexOf(later);
  return earlierIdx !== -1 && laterIdx !== -1 && earlierIdx < laterIdx;
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

async function run() {
  let ok = true;
  const authSrc = read("js/auth.js");
  const earlyAccessSrc = read("js/early-access.js");
  const edgeFnSrc = read("supabase/functions/send-early-access-emails/index.ts");
  const migrationSrc = read("supabase/migrations/phase10_platform_access.sql");
  const resetFnSrc = read("supabase/functions/request-password-reset/index.ts");
  const platformAccessSrc = read("js/platform-access.js");
  const hotelBrainStoreSrc = read("js/hotel-brain-store.js");
  const handoverStoreSrc = read("js/handover-store.js");
  const loginHtml = read("login.html");
  const resetPasswordHtml = read("reset-password.html");
  const sopHtml = read("sop.html");

  if (/auth\.admin\.createUser|inviteUserByEmail|signUp\(/i.test(earlyAccessSrc + edgeFnSrc)) {
    ok = fail("Pilot application flow must not create auth users") && ok;
  } else {
    ok = pass("Pilot application flow does not create auth users") && ok;
  }

  if (!/client\.auth\.resetPasswordForEmail/.test(authSrc)) {
    ok = pass("Client no longer calls resetPasswordForEmail directly") && ok;
  } else if (!/functions\.invoke\("request-password-reset"/.test(authSrc)) {
    ok = fail("auth.js still calls resetPasswordForEmail without access gate") && ok;
  } else {
    ok = pass("Password reset routed through request-password-reset edge function") && ok;
  }

  if (!/is_password_reset_allowed/.test(resetFnSrc)) {
    ok = fail("request-password-reset must call is_password_reset_allowed") && ok;
  } else {
    ok = pass("Edge function checks reset eligibility server-side") && ok;
  }

  if (!/get_my_platform_access/.test(migrationSrc)) {
    ok = fail("Missing get_my_platform_access migration") && ok;
  } else {
    ok = pass("Server RPC get_my_platform_access present") && ok;
  }

  if (!/Platform access has not been approved/.test(migrationSrc)) {
    ok = fail("create_hotel_workspace must enforce platform access") && ok;
  } else {
    ok = pass("Workspace creation gated server-side") && ok;
  }

  if (!/guardSignInResult/.test(authSrc)) {
    ok = fail("signIn must guard against unapproved access") && ok;
  } else {
    ok = pass("Sign-in blocked for unapproved users") && ok;
  }

  if (!scriptOrder(loginHtml, 'src="js/platform-access.js"', 'src="js/auth.js"') ||
      !scriptOrder(loginHtml, 'src="js/platform-access.js"', 'src="js/workspace.js"')) {
    ok = fail("login.html must load platform-access.js before auth.js and workspace.js") && ok;
  } else {
    ok = pass("login.html loads platform-access.js before auth.js and workspace.js") && ok;
  }

  if (!scriptOrder(resetPasswordHtml, 'src="js/platform-access.js"', 'src="js/auth.js"')) {
    ok = fail("reset-password.html must load platform-access.js before auth.js") && ok;
  } else {
    ok = pass("reset-password.html loads platform-access.js before auth.js") && ok;
  }

  if (!/src="js\/platform-access\.js"/.test(sopHtml)) {
    ok = fail("sop.html must load platform-access.js") && ok;
  } else {
    ok = pass("sop.html loads platform-access.js") && ok;
  }

  if (!/HFPlatformAccess\.checkPlatformAccess/.test(sopHtml) ||
      !/HFAuth\.getSession/.test(sopHtml) ||
      !/access\.allowed/.test(sopHtml)) {
    ok = fail("sop.html must require session + approved access before Hotel Brain cloud load") && ok;
  } else {
    ok = pass("sop.html gates Hotel Brain cloud load on approved access") && ok;
  }

  if (!/requireApprovedAccess/.test(read("handover.html"))) {
    ok = fail("handover.html must require approved access") && ok;
  } else {
    ok = pass("Handover page requires approved access") && ok;
  }

  if (!/requireApprovedAccess/.test(read("hotel-profile.html"))) {
    ok = fail("hotel-profile.html must require approved access") && ok;
  } else {
    ok = pass("Hotel Brain page requires approved access") && ok;
  }

  if (!/platform_access/.test(migrationSrc) || !/pending_application/.test(migrationSrc)) {
    ok = fail("platform_access statuses missing from migration") && ok;
  } else {
    ok = pass("platform_access table and statuses defined") && ok;
  }

  if (!/INSERT INTO public\.platform_access \(user_id, email, access_status\)/.test(migrationSrc)) {
    ok = fail("Existing members must be grandfathered as active") && ok;
  } else {
    ok = pass("Existing workspace members grandfathered as active") && ok;
  }

  if (/allowed:\s*true[\s\S]{0,120}MIGRATION_PENDING|MIGRATION_PENDING[\s\S]{0,120}allowed:\s*true/.test(platformAccessSrc)) {
    ok = fail("platform-access.js must fail closed on MIGRATION_PENDING") && ok;
  } else if (!/MIGRATION_PENDING/.test(platformAccessSrc) || !/ACCESS_CHECK_FAILED/.test(platformAccessSrc)) {
    ok = fail("platform-access.js must use MIGRATION_PENDING and ACCESS_CHECK_FAILED reasons") && ok;
  } else {
    ok = pass("platform-access.js fail-closed reasons present") && ok;
  }

  if (!/allowed:\s*false,\s*reason:\s*"MODULE_MISSING"/.test(hotelBrainStoreSrc)) {
    ok = fail("hotel-brain-store.js must deny when HFPlatformAccess is missing") && ok;
  } else {
    ok = pass("hotel-brain-store.js fails closed when HFPlatformAccess missing") && ok;
  }

  if (!/allowed:\s*false,\s*reason:\s*"MODULE_MISSING"/.test(handoverStoreSrc)) {
    ok = fail("handover-store.js must deny when HFPlatformAccess is missing") && ok;
  } else {
    ok = pass("handover-store.js fails closed when HFPlatformAccess missing") && ok;
  }

  if (/allowed:\s*true/.test(hotelBrainStoreSrc) || /allowed:\s*true/.test(handoverStoreSrc)) {
    ok = fail("cloud stores must not fail open with allowed: true") && ok;
  } else {
    ok = pass("cloud stores have no allowed: true fail-open") && ok;
  }

  try {
    const access = loadPlatformAccessModule({});
    const result = await access.checkPlatformAccess();
    if (!result || result.allowed !== false || result.reason !== "MODULE_MISSING") {
      ok = fail("checkPlatformAccess must deny with MODULE_MISSING when HFAuth is absent") && ok;
    } else {
      ok = pass("checkPlatformAccess denies with MODULE_MISSING when HFAuth is absent") && ok;
    }
  } catch (err) {
    ok = fail("checkPlatformAccess MODULE_MISSING runtime check threw: " + err.message) && ok;
  }

  try {
    const access = loadPlatformAccessModule({
      HospitalityFlowSupabase: {
        isConfigured: function () { return true; }
      },
      HFAuth: {
        ensureClient: function () {
          return Promise.resolve({
            rpc: function () {
              return Promise.resolve({
                data: null,
                error: {
                  message: "Could not find the function public.get_my_platform_access in the schema cache",
                  code: "PGRST202"
                }
              });
            }
          });
        }
      }
    });
    const result = await access.checkPlatformAccess();
    if (!result || result.allowed !== false || result.reason !== "MIGRATION_PENDING") {
      ok = fail("checkPlatformAccess must deny with MIGRATION_PENDING when RPC is missing") && ok;
    } else {
      ok = pass("checkPlatformAccess denies with MIGRATION_PENDING when RPC is missing") && ok;
    }
  } catch (err) {
    ok = fail("checkPlatformAccess MIGRATION_PENDING runtime check threw: " + err.message) && ok;
  }

  try {
    const access = loadPlatformAccessModule({
      HospitalityFlowSupabase: {
        isConfigured: function () { return true; }
      },
      HFAuth: {
        ensureClient: function () {
          return Promise.resolve({
            rpc: function () {
              return Promise.resolve({
                data: null,
                error: { message: "network error" }
              });
            }
          });
        }
      }
    });
    const result = await access.checkPlatformAccess();
    if (!result || result.allowed !== false || result.reason !== "ACCESS_CHECK_FAILED") {
      ok = fail("checkPlatformAccess must deny with ACCESS_CHECK_FAILED on RPC errors") && ok;
    } else {
      ok = pass("checkPlatformAccess denies with ACCESS_CHECK_FAILED on RPC errors") && ok;
    }
  } catch (err) {
    ok = fail("checkPlatformAccess ACCESS_CHECK_FAILED runtime check threw: " + err.message) && ok;
  }

  if (ok) {
    console.log("\nAll invitation-only access checks passed.");
    process.exit(0);
  }

  console.error("\nInvitation-only access checks failed.");
  process.exit(1);
}

run();
