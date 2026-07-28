/**
 * Maintenance M2 / M2.1 — static UI / store regression checks.
 * Run: node scripts/test-maintenance-ui.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
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

  if (!exists("maintenance.html")) {
    ok = fail("maintenance.html must exist") && ok;
  } else {
    ok = pass("maintenance.html exists") && ok;
  }

  if (!exists("js/maintenance-store.js")) {
    ok = fail("js/maintenance-store.js must exist") && ok;
  } else {
    ok = pass("js/maintenance-store.js exists") && ok;
  }

  const html = read("maintenance.html");
  const store = read("js/maintenance-store.js");

  if (!/js\/maintenance-store\.js/.test(html)) {
    ok = fail("maintenance.html must load maintenance-store.js") && ok;
  } else {
    ok = pass("maintenance-store.js is loaded") && ok;
  }

  if (!/js\/auth\.js/.test(html) || !/js\/platform-access\.js/.test(html) || !/js\/workspace\.js/.test(html)) {
    ok = fail("Auth, platform-access and workspace scripts must be present") && ok;
  } else {
    ok = pass("Auth and workspace scripts present") && ok;
  }

  if (!/requireApprovedAccess/.test(html)) {
    ok = fail("Platform access guard must be present") && ok;
  } else {
    ok = pass("Platform access guard present") && ok;
  }

  ["Open Issues", "High Priority", "In Progress", "Completed Today"].forEach((label) => {
    if (!html.includes(label)) {
      ok = fail(`Missing metric label: ${label}`) && ok;
    }
  });
  ok = pass("Four required metric labels exist") && ok;

  [
    "Location type",
    "Room number",
    "Area",
    "Issue title",
    "Description",
    "Category",
    "Priority",
    "Assigned department",
    "Due date",
    "Reported by",
    "Include in next handover"
  ].forEach((label) => {
    if (!html.includes(label)) {
      ok = fail(`Missing report field label: ${label}`) && ok;
    }
  });
  ok = pass("Report Issue field labels present") && ok;

  if (!/<textarea id="field-description"[^>]*required/i.test(html)) {
    ok = fail("Description field must be required") && ok;
  } else {
    ok = pass("Description is required") && ok;
  }

  if (!/includeCompleted|status !== "completed"|All unresolved/i.test(store + html)) {
    ok = fail("Completed issues must be hidden by default") && ok;
  } else {
    ok = pass("Completed issues hidden by default") && ok;
  }

  if (!/Maintenance service unavailable/i.test(html)) {
    ok = fail("Maintenance service unavailable wording must exist") && ok;
  } else {
    ok = pass("Maintenance service unavailable wording exists") && ok;
  }

  if (!/We couldn’t connect to your hotel maintenance workspace\.|We couldn't connect to your hotel maintenance workspace\./i.test(html)) {
    ok = fail("Cloud-unavailable supporting copy missing") && ok;
  } else {
    ok = pass("Cloud-unavailable supporting copy present") && ok;
  }

  if (!/No maintenance issues reported/i.test(html) ||
      !/New issues reported by your hotel team will appear here/i.test(html)) {
    ok = fail("Successful-empty wording must exist separately") && ok;
  } else {
    ok = pass("Successful-empty wording exists separately") && ok;
  }

  if (!/We couldn’t load maintenance issues|We couldn't load maintenance issues/i.test(html) ||
      !/Check your connection and try again/i.test(html)) {
    ok = fail("Load-error state wording missing") && ok;
  } else {
    ok = pass("Load-error state wording present") && ok;
  }

  if (!/pageState\.loading \|\| pageState\.loadError/i.test(html) ||
      !/setMetricsLoading/i.test(html)) {
    ok = fail("Failed load must keep metrics as placeholders, not false zeroes") && ok;
  } else {
    ok = pass("Failed load metrics do not present false zeroes") && ok;
  }

  if (!/!pageState\.loadError/i.test(html)) {
    ok = fail("Empty success state must require !loadError") && ok;
  } else {
    ok = pass("Empty success state gated behind successful load") && ok;
  }

  if (!/setReportCloudNotice|report-cloud-notice/i.test(html) ||
      !/openReport[\s\S]{0,400}setReportCloudNotice/i.test(html)) {
    ok = fail("Report drawer must remain inspectable while cloud unavailable") && ok;
  } else {
    ok = pass("Report drawer remains inspectable while cloud unavailable") && ok;
  }

  if (!/cannot be saved until the service reconnects/i.test(html) ||
      !/if \(!store\.isCloudAvailable\(\)\)/i.test(html)) {
    ok = fail("Submission must remain blocked while cloud unavailable") && ok;
  } else {
    ok = pass("Submission remains blocked while cloud unavailable") && ok;
  }

  if (/guest_impact|Guest impact|guestImpact/i.test(html + store)) {
    ok = fail("guest_impact must not be added in M2") && ok;
  } else {
    ok = pass("No guest-impact field added") && ok;
  }

  if (/HFMaintenanceStore|maintenance-store\.js/i.test(read("handover.html"))) {
    ok = fail("Handover integration must not exist in M2") && ok;
  } else {
    ok = pass("No handover integration in M2") && ok;
  }

  if (/AiWritingEngine|rewriteMaintenance|ai-writing-engine/i.test(html)) {
    ok = fail("AI writing must not be integrated in M2") && ok;
  } else {
    ok = pass("No AI-writing integration") && ok;
  }

  if (/Mark completed|Change status|Add progress update|Reopen issue/i.test(html)) {
    ok = fail("No M3 edit controls should be added") && ok;
  } else if (/Workflow updates will be available in the next phase/i.test(html)) {
    ok = pass("No M3 edit controls; read-only phase note present") && ok;
  } else {
    ok = fail("Read-only details phase note missing") && ok;
  }

  if (/from\(ISSUES_TABLE\)[\s\S]{0,120}\.delete\(/i.test(store)) {
    ok = fail("Store must not implement client DELETE") && ok;
  } else {
    ok = pass("No client DELETE behaviour in store") && ok;
  }

  const mappings = [
    ["in_progress", "In Progress"],
    ["waiting_parts", "Waiting for Parts"],
    ["waiting_contractor", "Waiting for Contractor"],
    ["it_technology", "IT & Technology"],
    ["guest_room", "Guest Room"],
    ["back_of_house", "Back of House"]
  ];
  mappings.forEach(([raw, label]) => {
    if (!store.includes(raw) || !store.includes(label)) {
      ok = fail(`Missing enum mapping ${raw} → ${label}`) && ok;
    }
  });
  ok = pass("Required human-readable enum mappings exist") && ok;

  if (!/update_type:\s*"created"/i.test(store)) {
    ok = fail("createIssue must insert created timeline row") && ok;
  } else {
    ok = pass("Created timeline row is part of createIssue") && ok;
  }

  if (!/TIMELINE_CREATE_FAILED/i.test(store)) {
    ok = fail("Partial-success timeline failure must be handled") && ok;
  } else {
    ok = pass("Partial-success timeline failure handled") && ok;
  }

  const account = read("account.html");
  if (/maintenance\.html/i.test(account)) {
    ok = fail("account.html must not be modified for Maintenance link in M2") && ok;
  } else {
    ok = pass("account.html unchanged for Maintenance navigation") && ok;
  }

  const phase15 = read("supabase/migrations/phase15_maintenance.sql");
  if (/guest_impact/i.test(phase15)) {
    ok = fail("phase15 migration must not gain guest_impact in M2") && ok;
  } else {
    ok = pass("phase15 migration not extended with guest_impact") && ok;
  }

  if (!/Hotel Operations/i.test(html) || !/>Maintenance</i.test(html) || !/Report Issue/i.test(html)) {
    ok = fail("Page header content incomplete") && ok;
  } else {
    ok = pass("Page header content present") && ok;
  }

  if (!/role="dialog"|aria-modal="true"|aria-live/i.test(html)) {
    ok = fail("Accessibility attributes for drawers/live regions missing") && ok;
  } else {
    ok = pass("Drawer and live-region accessibility attributes present") && ok;
  }

  if (ok) {
    console.log("\nAll Maintenance M2 UI checks passed.");
    process.exit(0);
  }
  console.error("\nMaintenance M2 UI checks failed.");
  process.exit(1);
}

main();
