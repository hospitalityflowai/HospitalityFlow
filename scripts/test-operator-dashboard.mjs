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

  if (!/access\.isOperator && !access\.hasMembership/.test(workspaceJsBody) ||
      !/renderOperatorWithoutWorkspace/.test(workspaceJsBody)) {
    ok = fail("Operators without hotel membership must not enter ordinary workspace-create") && ok;
  } else {
    ok = pass("Operators without membership skip ordinary workspace-create flow") && ok;
  }

  // Mixed-role: hotel membership + operator keeps workspace and shows Operator section
  // (authoritative definition lives in the suspend-authoritative migration after Audit 2 Step 1).
  const accessRpcSql = [
    "supabase/migrations/20260802140000_platform_suspend_authoritative.sql",
    "supabase/migrations/phase15_operator_capability_flag.sql"
  ]
    .map((p) => {
      try {
        return read(p);
      } catch {
        return "";
      }
    })
    .join("\n");

  const mixedRoleOk =
    /setOperatorSectionVisible\(!!access\.isOperator/.test(workspaceJsBody) &&
    /has_membership',\s*true[\s\S]*'is_operator',\s*v_is_operator/i.test(accessRpcSql) &&
    /access_status',\s*'active'/.test(accessRpcSql);

  if (!mixedRoleOk) {
    ok = fail("Mixed hotel-owner + platform-operator must keep active workspace and show Operator") && ok;
  } else {
    ok = pass("Mixed hotel-owner + platform-operator keeps workspace and shows Operator") && ok;
  }

  if (!/Platform Operator/.test(accountHtml) || !/id="operator-pilot-lab-create"/.test(accountHtml)) {
    ok = fail("account.html must separate Platform Operator from Pilot Lab provision") && ok;
  } else {
    ok = pass("account.html separates Platform Operator and Pilot Lab provision") && ok;
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

  if (
    !/access\.isOperator !== true/.test(operatorJsBody) &&
    !/access\.reason === "SUSPENDED"/.test(operatorJsBody)
  ) {
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

  // ── Phase 3 minimal management UI ────────────────────────────────────────

  if (!/decline-pilot-applicant/.test(operatorJsBody) ||
      !/data-decline-id/.test(operatorJsBody) ||
      !/decline-confirm-modal/.test(operatorHtml)) {
    ok = fail("Pending/invited Decline must call decline-pilot-applicant via confirm modal") && ok;
  } else {
    ok = pass("Decline UI wired to decline-pilot-applicant") && ok;
  }

  if (!/decline-confirm-error/.test(operatorHtml) ||
      !/showDeclineModalError/.test(operatorJsBody) ||
      !/Keep modal open — page alerts sit under the overlay/.test(operatorJs) ||
      !/formatDeclineFailureMessage/.test(operatorJsBody)) {
    ok = fail("Decline errors must surface inside the confirm modal") && ok;
  } else {
    ok = pass("Decline errors surface inside the confirm modal") && ok;
  }

  if (!/DECLINE_FUNCTION[\s\S]*applicationId:\s*applicationId/.test(operatorJs) &&
      !/decline-pilot-applicant[\s\S]*applicationId:\s*applicationId/.test(operatorJsBody)) {
    ok = fail("Decline invoke payload must send applicationId") && ok;
  } else {
    ok = pass("Decline invoke payload uses applicationId") && ok;
  }

  if (!/declineApplication[\s\S]*Authorization:\s*["']Bearer ["']\s*\+\s*accessToken/.test(operatorJsBody) &&
      !/declineApplication[\s\S]*getSession[\s\S]*Authorization:\s*["']Bearer/.test(operatorJsBody)) {
    ok = fail("Decline invoke must include the signed-in operator JWT") && ok;
  } else {
    ok = pass("Decline invoke includes signed-in operator JWT") && ok;
  }

  if (!/eventsBound/.test(operatorJsBody) || !/if \(eventsBound\) return/.test(operatorJsBody)) {
    ok = fail("Operator dashboard must prevent duplicate event handler binding") && ok;
  } else {
    ok = pass("Duplicate event handlers prevented via eventsBound guard") && ok;
  }

  if (!/operator-dashboard\.js\?v=/.test(operatorHtml)) {
    ok = fail("operator.html must cache-bust operator-dashboard.js") && ok;
  } else {
    ok = pass("operator-dashboard.js is cache-busted in operator.html") && ok;
  }

  if (!/canDecline/.test(operatorJsBody) ||
      !/status === "pending" \|\| status === "invited"/.test(operatorJsBody)) {
    ok = fail("Decline must be limited to pending and invited applications") && ok;
  } else {
    ok = pass("Decline limited to pending and invited") && ok;
  }

  if (!/delete-pilot-applicant/.test(operatorJsBody) ||
      !/data-delete-id/.test(operatorJsBody) ||
      !/delete-confirm-modal/.test(operatorHtml) ||
      !/confirm:\s*["']DELETE["']/.test(operatorJsBody)) {
    ok = fail("Declined permanent delete must call delete-pilot-applicant with confirm DELETE") && ok;
  } else {
    ok = pass("Permanent delete UI wired to delete-pilot-applicant with typed DELETE") && ok;
  }

  if (!/delete-confirm-input/.test(operatorHtml) ||
      !/typed !== "DELETE"/.test(operatorJsBody)) {
    ok = fail("Delete confirm button must stay disabled until DELETE is typed") && ok;
  } else {
    ok = pass("Delete requires typed DELETE confirmation") && ok;
  }

  if (!/delete-confirm-error/.test(operatorHtml) ||
      !/showDeleteModalError/.test(operatorJsBody) ||
      !/Keep modal open and show the error here/.test(operatorJs)) {
    ok = fail("Delete errors must surface inside the confirm modal (not only under the overlay)") && ok;
  } else {
    ok = pass("Delete errors surface inside the confirm modal") && ok;
  }

  if (!/applicationId:\s*applicationId,\s*confirm:\s*["']DELETE["']/.test(operatorJsBody)) {
    ok = fail("Delete invoke payload must send applicationId and confirm DELETE") && ok;
  } else {
    ok = pass("Delete invoke payload uses applicationId + confirm DELETE") && ok;
  }

  if (!/Workspace active/.test(operatorJsBody) ||
      /Invitation not available \(active\)/.test(operatorJsBody)) {
    ok = fail("Active hotels must show Workspace active instead of invitation-unavailable copy") && ok;
  } else {
    ok = pass("Active hotels show Workspace active") && ok;
  }

  if (/resend-pilot-invite|data-resend|Resend Invite|restore-pilot-applicant|data-restore/.test(operatorJsBody) ||
      /resend-pilot-invite|Resend Invite|Restore to Pending/.test(operatorHtml)) {
    ok = fail("Resend and Restore UI must remain out of this Phase 3 minimal release") && ok;
  } else {
    ok = pass("Resend and Restore UI remain deferred") && ok;
  }

  if (!/declineBusy|deleteBusy|anyActionBusy|Declining…|Deleting…/.test(operatorJsBody)) {
    ok = fail("Decline/Delete UI must disable controls while requests are running") && ok;
  } else {
    ok = pass("Decline/Delete disable controls while running") && ok;
  }

  if (!/Application declined for/.test(operatorJsBody) ||
      !/permanently deleted/.test(operatorJsBody) ||
      !/refreshApplications\(\{[\s\S]*successMessage/.test(operatorJs)) {
    ok = fail("Decline/Delete success must refresh the application list") && ok;
  } else {
    ok = pass("Decline/Delete refresh list after success") && ok;
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

  // ── Pilot Lab provisioning UI on operator dashboard ──────────────────────

  if (!/id="operator-pilot-lab-card"/.test(operatorHtml) ||
      !/Internal Workspace/.test(operatorHtml) ||
      !/Hospitality Flow Pilot Lab/.test(operatorHtml) ||
      !/Create Pilot Lab/.test(operatorHtml) ||
      !/Open Pilot Lab/.test(operatorHtml) ||
      !/Pilot Lab Active/.test(operatorHtml)) {
    ok = fail("operator.html must include Internal Workspace Pilot Lab card UI") && ok;
  } else {
    ok = pass("operator.html includes Internal Workspace Pilot Lab card") && ok;
  }

  const pilotCardIdx = operatorHtml.indexOf('id="operator-pilot-lab-card"');
  const pendingIdx = operatorHtml.indexOf('id="operator-pending-list"');
  if (pilotCardIdx < 0 || pendingIdx < 0 || !(pilotCardIdx < pendingIdx)) {
    ok = fail("Pilot Lab card must appear above the applications list") && ok;
  } else {
    ok = pass("Pilot Lab card appears above applications list") && ok;
  }

  if (!/js\/workspace\.js/.test(operatorHtml)) {
    ok = fail("operator.html must load workspace.js for Pilot Lab provisioning") && ok;
  } else {
    ok = pass("operator.html loads workspace.js for Pilot Lab RPC") && ok;
  }

  if (!/loadPilotLabState/.test(operatorJsBody) ||
      !/createOperatorPilotLab/.test(operatorJsBody) ||
      !/isPilotLabWorkspace/.test(operatorJsBody) ||
      !/refreshOperatorState/.test(operatorJsBody)) {
    ok = fail("operator-dashboard.js must check/create Pilot Lab and reload state") && ok;
  } else {
    ok = pass("operator-dashboard.js provisions Pilot Lab and reloads state") && ok;
  }

  if (!/setPilotLabCreating/.test(operatorJsBody) ||
      !/operator-pilot-lab-spinner/.test(operatorHtml) ||
      !/Creating…/.test(operatorJsBody)) {
    ok = fail("Create Pilot Lab must disable button and show spinner/Creating state") && ok;
  } else {
    ok = pass("Create Pilot Lab disables button and shows creating state") && ok;
  }

  if (!/renderPilotLabState\("active"\)/.test(operatorJsBody) ||
      !/renderPilotLabState\("create"\)/.test(operatorJsBody) ||
      !/renderPilotLabState\("blocked"\)/.test(operatorJsBody)) {
    ok = fail("Pilot Lab UI must support create, active, and blocked states") && ok;
  } else {
    ok = pass("Pilot Lab UI supports create, active, and blocked states") && ok;
  }

  // Fail closed: never claim active when workspace module/status unknown
  if (!/Pilot Lab checks are unavailable|Could not verify Pilot Lab status/.test(operatorJsBody) ||
      !/never claim Pilot Lab is active/i.test(read("js/operator-dashboard.js"))) {
    ok = fail("Pilot Lab status must fail closed when unknown") && ok;
  } else {
    ok = pass("Pilot Lab status fails closed when unknown") && ok;
  }

  // Existing invite/list behaviour must remain
  if (!/list-pilot-applications/.test(operatorJsBody) ||
      !/invite-pilot-applicant/.test(operatorJsBody)) {
    ok = fail("Existing operator invite/list functionality must remain") && ok;
  } else {
    ok = pass("Existing operator invite/list functionality unchanged") && ok;
  }

  if (/setActiveWorkspace|switchWorkspace|multi-workspace/i.test(operatorJsBody)) {
    ok = fail("Operator Pilot Lab UI must not introduce multi-workspace switching") && ok;
  } else {
    ok = pass("No multi-workspace switcher on operator dashboard") && ok;
  }

  if (ok) {
    console.log("\nAll operator dashboard checks passed.");
    process.exit(0);
  }

  console.error("\nOperator dashboard checks failed.");
  process.exit(1);
}

main();
