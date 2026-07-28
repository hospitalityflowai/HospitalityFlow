/**
 * Maintenance M3 — workflow store / UI static checks.
 * Run: node scripts/test-maintenance-workflow.mjs
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
  const store = read("js/maintenance-store.js");
  const html = read("maintenance.html");
  const account = read("account.html");
  const phase15 = read("supabase/migrations/phase15_maintenance.sql");
  const handover = read("handover.html");

  const methods = [
    "addUpdate",
    "updateStatus",
    "updatePriority",
    "updateAssignment",
    "updateDueDate",
    "completeIssue",
    "reopenIssue",
    "setHandoverInclusion"
  ];
  methods.forEach((name) => {
    if (!new RegExp(name + "\\s*:\\s*" + name).test(store) && !new RegExp("function\\s+" + name + "\\s*\\(").test(store)) {
      ok = fail(`Missing workflow method ${name}`) && ok;
    } else {
      ok = pass(`Workflow method ${name} exists`) && ok;
    }
  });

  if (/workspace_id\s*:\s*payload|payload\.workspace|options\.workspaceId/i.test(store) &&
      /updateIssueWithTimeline[\s\S]{0,200}payload\.workspace/i.test(store)) {
    ok = fail("Workflow must not accept workspace ID from UI payloads") && ok;
  } else if (/delete rowPatch\.workspace_id|Never accept workspace_id from callers/i.test(store)) {
    ok = pass("Workspace ID is not accepted from UI payloads") && ok;
  } else {
    ok = fail("Workspace ID protection for workflow updates missing") && ok;
  }

  if (!/update_type:\s*"status_changed"|update_type:\s*"status_changed"/i.test(store)) {
    ok = fail("Status changes must create status_changed timeline entries") && ok;
  } else {
    ok = pass("Status changes create timeline entries") && ok;
  }

  if (!/update_type:\s*"priority_changed"/i.test(store)) {
    ok = fail("Priority changes must create priority_changed timeline entries") && ok;
  } else {
    ok = pass("Priority changes create timeline entries") && ok;
  }

  if (!/update_type:\s*"assignment_changed"/i.test(store)) {
    ok = fail("Assignment changes must create assignment_changed timeline entries") && ok;
  } else {
    ok = pass("Assignment changes create timeline entries") && ok;
  }

  if (!/BLANK_NOTE|normaliseNote/i.test(store)) {
    ok = fail("Notes must reject blank values") && ok;
  } else {
    ok = pass("Notes reject blank values") && ok;
  }

  if (!/RESOLUTION_REQUIRED|completeIssue/i.test(store) || !/resolution_notes/i.test(store)) {
    ok = fail("Completion must require resolution") && ok;
  } else {
    ok = pass("Completion requires resolution") && ok;
  }

  if (!/reopenIssue|REOPEN_NOTE_REQUIRED|update_type:\s*"reopened"/i.test(store)) {
    ok = fail("Reopen must be explicit") && ok;
  } else if (!/Mark Completed|Reopen Issue/i.test(html)) {
    ok = fail("Reopen/complete UI actions missing") && ok;
  } else {
    ok = pass("Reopen is explicit") && ok;
  }

  if (!/include_in_handover|setHandoverInclusion|included_in_handover|hidden_from_handover/i.test(store)) {
    ok = fail("Handover toggle support missing") && ok;
  } else {
    ok = pass("Handover toggle changes include_in_handover") && ok;
  }

  if (/HFMaintenanceStore|maintenance-store\.js/i.test(handover)) {
    ok = fail("No real Handover integration should be added") && ok;
  } else {
    ok = pass("No real Handover integration was added") && ok;
  }

  if (!/future handover integration/i.test(html)) {
    ok = fail("Handover toggle must not claim live handover import") && ok;
  } else {
    ok = pass("Handover toggle wording is future-integration safe") && ok;
  }

  if (!/filters\.status === "all"|includeCompleted|status !== "completed"/i.test(store + html)) {
    ok = fail("Completed issues should leave default unresolved view") && ok;
  } else {
    ok = pass("Completed issues disappear from default unresolved view") && ok;
  }

  if (!/renderMetrics\(\)/i.test(html) || !/afterWorkflowSuccess/i.test(html)) {
    ok = fail("Metrics should refresh after updates") && ok;
  } else {
    ok = pass("Metrics refresh after updates") && ok;
  }

  if (!/TIMELINE_CREATE_FAILED/i.test(store + html)) {
    ok = fail("Partial-success timeline failures must be handled") && ok;
  } else {
    ok = pass("Partial-success timeline failures are handled") && ok;
  }

  if (/from\(ISSUES_TABLE\)[\s\S]{0,120}\.delete\(/i.test(store)) {
    ok = fail("No DELETE behaviour should be added") && ok;
  } else {
    ok = pass("No DELETE behaviour was added") && ok;
  }

  if (!/href="maintenance\.html"/i.test(account)) {
    ok = fail("Account must link to maintenance.html") && ok;
  } else {
    ok = pass("Account links to maintenance.html") && ok;
  }

  if (!/AI Shift Handover[\s\S]*maintenance\.html[\s\S]*Hotel Brain/i.test(account)) {
    ok = fail("Account tool order should be Handover → Maintenance → Hotel Brain") && ok;
  } else {
    ok = pass("Account tool order includes Maintenance between Handover and Hotel Brain") && ok;
  }

  if (!/requireApprovedAccess/i.test(html) || !/js\/platform-access\.js/i.test(html)) {
    ok = fail("Existing auth/platform guards must remain") && ok;
  } else {
    ok = pass("Existing auth/platform guards remain") && ok;
  }

  if (/rewriteMaintenance|AiWritingEngine/i.test(html + store)) {
    ok = fail("No AI-writing functions should be added") && ok;
  } else {
    ok = pass("No AI-writing functions were added") && ok;
  }

  if (/guest_impact/i.test(phase15)) {
    ok = fail("Migration must not be modified with guest_impact") && ok;
  } else {
    ok = pass("No migration guest_impact modification") && ok;
  }

  // Ensure phase15 file still has core M1.1 delete denial (sanity that we didn't rewrite migration)
  if (!/No authenticated DELETE policy/i.test(phase15) && !/maintenance_issues_delete_member/i.test(phase15)) {
    ok = fail("phase15_maintenance.sql appears unexpectedly altered") && ok;
  } else {
    ok = pass("phase15_maintenance.sql retained") && ok;
  }

  if (/id="detail-status"[\s\S]{0,400}value="completed"/i.test(html)) {
    ok = fail("Completed should not appear as a normal status dropdown option") && ok;
  } else if (/detail-status/i.test(html) && /Mark Completed/i.test(html)) {
    ok = pass("Completed is not a normal status dropdown option") && ok;
  } else {
    ok = fail("Detail status control / complete action missing") && ok;
  }

  if (ok) {
    console.log("\nAll Maintenance M3 workflow checks passed.");
    process.exit(0);
  }
  console.error("\nMaintenance M3 workflow checks failed.");
  process.exit(1);
}

main();
