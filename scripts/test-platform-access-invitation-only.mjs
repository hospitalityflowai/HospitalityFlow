/**
 * Invitation-only platform access checks.
 * Run: node scripts/test-platform-access-invitation-only.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

function main() {
  let ok = true;
  const authSrc = read("js/auth.js");
  const earlyAccessSrc = read("js/early-access.js");
  const edgeFnSrc = read("supabase/functions/send-early-access-emails/index.ts");
  const migrationSrc = read("supabase/migrations/phase10_platform_access.sql");
  const resetFnSrc = read("supabase/functions/request-password-reset/index.ts");

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

  if (ok) {
    console.log("\nAll invitation-only access checks passed.");
    process.exit(0);
  }

  console.error("\nInvitation-only access checks failed.");
  process.exit(1);
}

main();
