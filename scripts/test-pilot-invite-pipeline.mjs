/**
 * Static + structural checks for the operator pilot-invite pipeline.
 * Run: node scripts/test-pilot-invite-pipeline.mjs
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

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function inviteBeforeMark(src) {
  const inviteIdx = src.search(/inviteUserByEmail/);
  const markIdx = src.search(/mark_pilot_applicant_invited/);
  return inviteIdx !== -1 && markIdx !== -1 && inviteIdx < markIdx;
}

function main() {
  let ok = true;

  const migration = read("supabase/migrations/phase14_pilot_invite_operators.sql");
  const inviteFn = read("supabase/functions/invite-pilot-applicant/index.ts");
  const operatorAuth = read("supabase/functions/_shared/operator-auth.ts");
  const configToml = read("supabase/config.toml");
  const authJs = read("js/auth.js");
  const docs = read("docs/OPERATOR_INVITE.md");
  const inviteFnBody = stripComments(inviteFn);

  const frontendFiles = [
    "js/early-access.js",
    "js/auth.js",
    "js/platform-access.js",
    "js/workspace.js",
    "index.html",
    "login.html",
    "signup.html",
    "account.html"
  ];

  if (!/CREATE TABLE IF NOT EXISTS public\.platform_operators/i.test(migration)) {
    ok = fail("Migration must create platform_operators") && ok;
  } else {
    ok = pass("Migration creates platform_operators") && ok;
  }

  if (!/ENABLE ROW LEVEL SECURITY/i.test(migration) ||
      !/REVOKE ALL ON public\.platform_operators FROM anon, authenticated/i.test(migration)) {
    ok = fail("platform_operators must enable RLS and revoke client grants") && ok;
  } else {
    ok = pass("platform_operators denies browser roles") && ok;
  }

  if (!/mark_pilot_applicant_invited/i.test(migration) ||
      !/GRANT EXECUTE ON FUNCTION public\.mark_pilot_applicant_invited\(uuid, uuid\) TO service_role/i.test(migration)) {
    ok = fail("mark_pilot_applicant_invited must exist and be service_role only") && ok;
  } else {
    ok = pass("mark_pilot_applicant_invited is service_role only") && ok;
  }

  if (/GRANT EXECUTE ON FUNCTION public\.mark_pilot_applicant_invited\(uuid, uuid\) TO (anon|authenticated)/i.test(migration)) {
    ok = fail("mark_pilot_applicant_invited must not be granted to browser roles") && ok;
  } else {
    ok = pass("mark_pilot_applicant_invited not granted to browser roles") && ok;
  }

  if (!/requirePlatformOperator/.test(inviteFn) || !/platform_operators/.test(operatorAuth)) {
    ok = fail("Invite function must verify platform operator") && ok;
  } else {
    ok = pass("Invite function verifies authorised operator") && ok;
  }

  if (!/inviteUserByEmail/.test(inviteFn)) {
    ok = fail("Invite function must use Auth Admin inviteUserByEmail") && ok;
  } else {
    ok = pass("Invite function uses Auth Admin inviteUserByEmail") && ok;
  }

  if (!inviteBeforeMark(inviteFnBody)) {
    ok = fail("inviteUserByEmail must run before mark_pilot_applicant_invited") && ok;
  } else {
    ok = pass("Status mark runs only after Auth invite attempt") && ok;
  }

  if (!/Invitation email could not be sent\. Application left pending/.test(inviteFn)) {
    ok = fail("Invite failure path must leave application pending") && ok;
  } else {
    ok = pass("Invite failure leaves application pending") && ok;
  }

  if (!/statusUpdated:\s*false/.test(inviteFn) || !/inviteSent:\s*false/.test(inviteFn)) {
    ok = fail("Failed invite response must report inviteSent/statusUpdated false") && ok;
  } else {
    ok = pass("Failed invite response is explicit about no status change") && ok;
  }

  if (!/\[functions\.invite-pilot-applicant\][\s\S]*verify_jwt\s*=\s*true/.test(configToml)) {
    ok = fail("config.toml must require JWT for invite-pilot-applicant") && ok;
  } else {
    ok = pass("invite-pilot-applicant requires JWT verification") && ok;
  }

  if (!/hashType === "invite"|queryType === "invite"/.test(authJs)) {
    ok = fail("auth.js must treat Auth invite links as password-setup") && ok;
  } else {
    ok = pass("auth.js accepts Auth invite password-setup links") && ok;
  }

  if (!/hashType === "recovery"|queryType === "recovery"/.test(authJs)) {
    ok = fail("auth.js must still treat recovery links as password-setup") && ok;
  } else {
    ok = pass("auth.js still accepts recovery password-setup links") && ok;
  }

  if (!/finish\(\(isRecoveryActive\(\) \|\| urlHint\) && !!session,\s*session\)/.test(authJs)) {
    ok = fail("auth.js timeout must treat invite/recovery URL + session as password-setup") && ok;
  } else {
    ok = pass("auth.js timeout uses urlHint with session for password-setup") && ok;
  }

  if (/finish\(isRecoveryActive\(\) && !!session,\s*session\)/.test(authJs)) {
    ok = fail("auth.js must not use recovery-only timeout that ignores urlHint") && ok;
  } else {
    ok = pass("auth.js no longer ignores urlHint on password-setup timeout") && ok;
  }

  // Normal login has no recovery/invite URL hint — detectPasswordRecovery finishes false without urlHint.
  if (!/if \(!urlHint\) \{\s*finish\(false, session\);/m.test(authJs)) {
    ok = fail("auth.js must finish non-recovery for normal sessions without URL hint") && ok;
  } else {
    ok = pass("auth.js normal login does not enter password-setup without URL hint") && ok;
  }

  if (!/CREATE OR REPLACE FUNCTION public\.get_my_platform_access/i.test(migration)) {
    ok = fail("Phase 14 must replace get_my_platform_access for operator login") && ok;
  } else {
    ok = pass("Phase 14 replaces get_my_platform_access") && ok;
  }

  const operatorAccessOk =
    /IF EXISTS \(\s*SELECT 1\s*FROM public\.platform_operators/i.test(migration) &&
    /'operator'/.test(migration) &&
    /'has_membership',\s*false/.test(migration);

  if (!operatorAccessOk) {
    ok = fail("get_my_platform_access must allow platform_operators as access_status operator without membership") && ok;
  } else {
    ok = pass("Operators allowed via get_my_platform_access without hotel membership") && ok;
  }

  // Operator status must not be added to workspace-create allow-list in phase14.
  if (/NOT IN \('active', 'invited', 'operator'\)/.test(migration) ||
      /IN \('active', 'invited', 'operator'\)/.test(migration)) {
    ok = fail("Operator status must not grant create_hotel_workspace access") && ok;
  } else {
    ok = pass("Operator status does not widen workspace-create allow-list") && ok;
  }

  if (/\.select\([\s\S]*submitted_at/.test(inviteFn) || /\.select\([\s\S]*invited_at/.test(inviteFn)) {
    ok = fail("invite-pilot-applicant must not select unused submitted_at/invited_at") && ok;
  } else {
    ok = pass("invite-pilot-applicant selects omit unused submitted_at/invited_at") && ok;
  }

  if (!/invite-pilot-applicant/.test(docs) || !/platform_operators/.test(docs)) {
    ok = fail("Operator docs must describe invite function and platform_operators") && ok;
  } else {
    ok = pass("Operator docs cover approve-and-invite process") && ok;
  }

  for (const file of frontendFiles) {
    const src = read(file);
    if (/auth\.admin|inviteUserByEmail|service_role|SERVICE_ROLE/i.test(src)) {
      ok = fail(`Browser file must not call Admin API / service_role: ${file}`) && ok;
    }
  }
  if (ok) {
    ok = pass("No browser Admin API or service_role usage in checked frontend files") && ok;
  }

  if (/PUBLIC_SIGNUP_ENABLED\s*=\s*true/.test(authJs)) {
    ok = fail("Public signup must remain disabled") && ok;
  } else {
    ok = pass("Public signup remains disabled") && ok;
  }

  // Ensure create_hotel_workspace gate still requires invited|active (phase10 unchanged contract)
  const phase10 = read("supabase/migrations/phase10_platform_access.sql");
  if (!/NOT IN \('active', 'invited'\)/.test(phase10)) {
    ok = fail("Workspace create must still require invited|active") && ok;
  } else {
    ok = pass("Workspace create still gated to invited|active") && ok;
  }

  if (ok) {
    console.log("\nAll pilot invite pipeline checks passed.");
    process.exit(0);
  }

  console.error("\nPilot invite pipeline checks failed.");
  process.exit(1);
}

main();
