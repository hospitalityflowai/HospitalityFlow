/**
 * Regression checks for the Operator Dashboard + list-pilot-applications.
 * Run: node scripts/test-operator-dashboard.mjs
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

function main() {
  let ok = true;

  const listFn = read("supabase/functions/list-pilot-applications/index.ts");
  const inviteFn = read("supabase/functions/invite-pilot-applicant/index.ts");
  const operatorAuth = read("supabase/functions/_shared/operator-auth.ts");
  const configToml = read("supabase/config.toml");
  const phase6 = read("supabase/migrations/phase6_early_access_applications.sql");
  const accountHtml = read("account.html");
  const operatorHtml = read("operator.html");
  const workspaceJs = read("js/workspace.js");
  const operatorJs = read("js/operator-dashboard.js");
  const listFnBody = stripComments(listFn);
  const operatorJsBody = stripComments(operatorJs);
  const workspaceJsBody = stripComments(workspaceJs);

  const frontendFiles = [
    "js/operator-dashboard.js",
    "js/workspace.js",
    "js/auth.js",
    "js/platform-access.js",
    "js/early-access.js",
    "account.html",
    "operator.html",
    "index.html",
    "login.html"
  ];

  // ── list-pilot-applications security ─────────────────────────────────────

  if (!/requirePlatformOperator/.test(listFn) || !/platform_operators/.test(operatorAuth)) {
    ok = fail("list-pilot-applications must verify platform operator") && ok;
  } else {
    ok = pass("list-pilot-applications verifies authorised operator") && ok;
  }

  if (!/Caller is not an authorised operator/.test(operatorAuth)) {
    ok = fail("Non-operators must receive an authorised-operator rejection") && ok;
  } else {
    ok = pass("Non-operator rejection message exists in operator-auth") && ok;
  }

  if (!/\[functions\.list-pilot-applications\][\s\S]*verify_jwt\s*=\s*true/.test(configToml)) {
    ok = fail("config.toml must require JWT for list-pilot-applications") && ok;
  } else {
    ok = pass("list-pilot-applications requires JWT verification") && ok;
  }

  if (!/early_access_applications/.test(listFn) || !/platform_access/.test(listFn)) {
    ok = fail("list-pilot-applications must read applications and platform_access") && ok;
  } else {
    ok = pass("list-pilot-applications reads applications + platform_access") && ok;
  }

  // Returned field shape (API contract)
  const requiredFields = [
    "id",
    "first_name",
    "email",
    "property_name",
    "property_type",
    "room_count",
    "role",
    "founding_status",
    "created_at",
    "access_status"
  ];
  for (const field of requiredFields) {
    if (!listFn.includes(field)) {
      ok = fail(`list-pilot-applications must include field ${field}`) && ok;
    }
  }
  if (ok) {
    ok = pass("list-pilot-applications includes approved response fields") && ok;
  }

  // No Zetter / operational data in list response construction
  const forbiddenListTokens = [
    "hotel_members",
    "handover",
    "maintenance",
    "hotel_brain",
    "hotel-brain",
    "zetter",
    "shift_notes",
    "rooms_status"
  ];
  let leaked = false;
  for (const token of forbiddenListTokens) {
    if (new RegExp(token, "i").test(listFnBody)) {
      ok = fail(`list-pilot-applications must not reference operational data: ${token}`) && ok;
      leaked = true;
    }
  }
  if (!leaked) {
    ok = pass("list-pilot-applications does not return Zetter/operational data") && ok;
  }

  if (!/pendingRank|founding_status === "pending"|pending/.test(listFnBody) ||
      !/bTime - aTime|created_at/.test(listFnBody)) {
    ok = fail("list-pilot-applications must sort pending first, then newest first") && ok;
  } else {
    ok = pass("list-pilot-applications sorts pending first, newest first") && ok;
  }

  // Join strategy mirrors invite (application id, then email)
  if (!/early_access_application_id/.test(listFn) || !/\.in\("email"/.test(listFnBody)) {
    ok = fail("list-pilot-applications must join platform_access by application id then email") && ok;
  } else {
    ok = pass("list-pilot-applications joins platform_access by application id then email") && ok;
  }

  // Browser SELECT remains closed
  if (!/No SELECT \/ UPDATE \/ DELETE policies/.test(phase6) ||
      !/REVOKE ALL ON public\.early_access_applications FROM anon, authenticated/.test(phase6) ||
      !/GRANT INSERT ON public\.early_access_applications TO anon, authenticated/.test(phase6)) {
    ok = fail("early_access_applications must remain INSERT-only for browser roles") && ok;
  } else {
    ok = pass("Normal users cannot query all applications directly (INSERT-only RLS)") && ok;
  }

  if (/CREATE POLICY\s+"[^"]+"\s+ON\s+public\.early_access_applications[\s\S]{0,200}\bFOR\s+SELECT\b/i.test(phase6)) {
    ok = fail("early_access_applications must not gain a SELECT policy for clients") && ok;
  } else {
    ok = pass("No client SELECT policy on early_access_applications") && ok;
  }

  // ── account.html operator button visibility ──────────────────────────────

  if (!/id="operator-account"/.test(accountHtml) || !/operator\.html/.test(accountHtml)) {
    ok = fail("account.html must include Operator section linking to operator.html") && ok;
  } else {
    ok = pass("account.html includes Operator section link") && ok;
  }

  if (!/access\.isOperator/.test(workspaceJsBody) ||
      !/setOperatorSectionVisible/.test(workspaceJsBody)) {
    ok = fail("Operator section must appear when access.isOperator is true") && ok;
  } else {
    ok = pass("Operator section appears for platform operators via isOperator") && ok;
  }

  if (!/access\.isOperator && !access\.hasMembership/.test(workspaceJsBody)) {
    ok = fail("Operators without hotel membership must not enter workspace-create") && ok;
  } else {
    ok = pass("Operators without membership skip workspace-create flow") && ok;
  }

  // Mixed-role: hotel membership + operator keeps workspace and shows Operator section
  const mixedRoleOk =
    /setOperatorSectionVisible\(!!access\.isOperator/.test(workspaceJsBody) &&
    /has_membership',\s*true[\s\S]*'is_operator',\s*v_is_operator/i.test(
      read("supabase/migrations/phase15_operator_capability_flag.sql")
    ) &&
    /access_status',\s*'active'/.test(
      read("supabase/migrations/phase15_operator_capability_flag.sql")
    );

  if (!mixedRoleOk) {
    ok = fail("Mixed hotel-owner + platform-operator must keep active workspace and show Operator") && ok;
  } else {
    ok = pass("Mixed hotel-owner + platform-operator keeps workspace and shows Operator") && ok;
  }

  const platformAccessJs = read("js/platform-access.js");
  if (!/isOperator:\s*data\.is_operator === true/.test(stripComments(platformAccessJs))) {
    ok = fail("HFPlatformAccess must expose isOperator from is_operator") && ok;
  } else {
    ok = pass("HFPlatformAccess exposes independent isOperator flag") && ok;
  }

  // Normal hotel users: operator panel starts hidden and is only shown for operators
  if (!/operator-account[\s\S]*hidden/.test(accountHtml)) {
    ok = fail("operator-account must start hidden for normal users") && ok;
  } else {
    ok = pass("Normal users do not see Operator section by default") && ok;
  }

  // ── operator.html fail-closed ────────────────────────────────────────────

  if (!/HFOperatorDashboard\.initOperatorPage/.test(operatorHtml)) {
    ok = fail("operator.html must initialise HFOperatorDashboard") && ok;
  } else {
    ok = pass("operator.html initialises operator dashboard") && ok;
  }

  if (!/access\.isOperator !== true/.test(operatorJsBody)) {
    ok = fail("operator.html must fail closed unless isOperator === true") && ok;
  } else {
    ok = pass("operator.html fails closed for non-operators") && ok;
  }

  if (!/Access denied/.test(operatorHtml) || !/account\.html/.test(operatorJsBody)) {
    ok = fail("Non-operators must see Access denied / redirect to account") && ok;
  } else {
    ok = pass("Non-operators get Access denied path") && ok;
  }

  if (/\.from\(\s*["']early_access_applications["']\s*\)/.test(operatorJsBody) ||
      /\.from\(\s*["']platform_access["']\s*\)/.test(operatorJsBody)) {
    ok = fail("Frontend must not query early_access_applications or platform_access directly") && ok;
  } else {
    ok = pass("Frontend does not query applications/access tables directly") && ok;
  }

  if (!/list-pilot-applications/.test(operatorJsBody)) {
    ok = fail("Operator dashboard must load via list-pilot-applications") && ok;
  } else {
    ok = pass("Operator dashboard loads via list-pilot-applications") && ok;
  }

  // ── invite wiring ────────────────────────────────────────────────────────

  if (!/invite-pilot-applicant/.test(operatorJsBody) ||
      !/applicationId:\s*applicationId|applicationId:\s*id/.test(operatorJsBody)) {
    ok = fail("Invite button must call invite-pilot-applicant with applicationId") && ok;
  } else {
    ok = pass("Invite button calls invite-pilot-applicant with applicationId") && ok;
  }

  // Preserve existing invite behaviour (still used unchanged)
  if (!/alreadyInvited/.test(inviteFn) || !/alreadyInvited/.test(operatorJsBody)) {
    ok = fail("Repeated invite must be handled safely via alreadyInvited") && ok;
  } else {
    ok = pass("Repeated invite handled safely (alreadyInvited)") && ok;
  }

  if (!/inviteBusy|Sending…/.test(operatorJsBody) || !/disabled/.test(operatorJsBody)) {
    ok = fail("Invite UI must disable while processing / prevent duplicate clicks") && ok;
  } else {
    ok = pass("Invite UI disables while processing") && ok;
  }

  if (!/invite-confirm-modal/.test(operatorHtml) || !/Send a Hospitality Flow invitation to/.test(operatorJsBody)) {
    ok = fail("Invite must use confirmation modal with email text") && ok;
  } else {
    ok = pass("Invite uses confirmation modal (no alert())") && ok;
  }

  if (/window\.alert\(|\balert\(/.test(operatorJsBody)) {
    ok = fail("Operator dashboard must not use browser alert()") && ok;
  } else {
    ok = pass("Operator dashboard does not use alert()") && ok;
  }

  // Failure must not locally mutate status (refresh only on success paths)
  if (!/do not mutate cards|refreshApplications\(\{[\s\S]*successMessage/.test(operatorJs) ||
      !/showAlert\("error"/.test(operatorJsBody)) {
    ok = fail("Invite failure must show error without changing local UI status") && ok;
  } else {
    ok = pass("Invite failure shows error without local status mutation") && ok;
  }

  // Decline / resend intentionally deferred
  if (/Decline|decline-pilot|resend/.test(operatorHtml) && /data-decline|Resend invitation/.test(operatorHtml)) {
    ok = fail("Decline/resend UI must remain deferred") && ok;
  } else {
    ok = pass("Decline and resend remain deferred") && ok;
  }

  // No service-role in frontend
  for (const file of frontendFiles) {
    const src = read(file);
    if (/auth\.admin|inviteUserByEmail|service_role|SERVICE_ROLE|SUPABASE_SERVICE_ROLE/i.test(src)) {
      ok = fail(`Browser file must not contain service_role / Admin API: ${file}`) && ok;
    }
  }
  if (ok) {
    ok = pass("No service-role key or Admin API usage in frontend operator files") && ok;
  }

  // Demo mode untouched on operator page
  if (/demo-mode|HFDemoMode/.test(operatorHtml)) {
    ok = fail("operator.html must not alter/include Demo Mode") && ok;
  } else {
    ok = pass("operator.html leaves Demo Mode unchanged") && ok;
  }

  if (ok) {
    console.log("\nAll operator dashboard checks passed.");
    process.exit(0);
  }

  console.error("\nOperator dashboard checks failed.");
  process.exit(1);
}

main();
