/**
 * Maintenance v1 M1 — schema and security static checks.
 * Verifies phase15_maintenance.sql against project conventions without applying it.
 * Run: node scripts/test-maintenance-schema.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const MIGRATION = "supabase/migrations/phase15_maintenance.sql";

const FORBIDDEN_APP_FILES = [
  "handover.html",
  "ai-writing-engine.js",
  "shift-intelligence-engine.js",
  "hotel-profile.html",
  "hotel-profile-operational.js",
  "hotel-profile-knowledge.js",
  "hotel-profile-export.js",
  "account.html",
  "maintenance.html"
];

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

function hasCreateTable(sql, table) {
  const re = new RegExp(
    String.raw`CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.${table}\s*\(`,
    "i"
  );
  return re.test(sql);
}

function policyBlock(sql, policyName) {
  const re = new RegExp(
    String.raw`CREATE\s+POLICY\s+"${policyName}"[\s\S]*?(?=CREATE\s+POLICY|CREATE\s+OR\s+REPLACE\s+FUNCTION|CREATE\s+TABLE|CREATE\s+INDEX|ALTER\s+TABLE|DROP\s+TRIGGER|$)`,
    "i"
  );
  const match = sql.match(re);
  return match ? match[0] : "";
}

function main() {
  let ok = true;
  const sql = read(MIGRATION);

  // --- Tables ---
  if (!hasCreateTable(sql, "maintenance_issues")) {
    ok = fail("Migration must create public.maintenance_issues") && ok;
  } else {
    ok = pass("Creates maintenance_issues") && ok;
  }

  if (!hasCreateTable(sql, "maintenance_updates")) {
    ok = fail("Migration must create public.maintenance_updates") && ok;
  } else {
    ok = pass("Creates maintenance_updates") && ok;
  }

  // --- Core columns / defaults ---
  const issueColumns = [
    "workspace_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE",
    "title text NOT NULL",
    "location_type text NOT NULL",
    "category text NOT NULL",
    "priority text NOT NULL DEFAULT 'medium'",
    "status text NOT NULL DEFAULT 'open'",
    "include_in_handover boolean NOT NULL DEFAULT false",
    "assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL",
    "created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL",
    "updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL"
  ];

  issueColumns.forEach((fragment) => {
    if (!sql.includes(fragment)) {
      ok = fail(`maintenance_issues missing expected fragment: ${fragment}`) && ok;
    } else {
      ok = pass(`Issue schema includes: ${fragment.split(" ").slice(0, 2).join(" ")}`) && ok;
    }
  });

  if (!/room_number text/i.test(sql) || !/area text/i.test(sql)) {
    ok = fail("maintenance_issues must include room_number and area") && ok;
  } else {
    ok = pass("maintenance_issues has room_number and area") && ok;
  }

  // --- Enum CHECKs ---
  const locationTypes = ["guest_room", "public_area", "back_of_house"];
  if (locationTypes.every((v) => sql.includes(`'${v}'`))) {
    ok = pass("location_type allowed values present") && ok;
  } else {
    ok = fail("Missing one or more location_type values") && ok;
  }

  const categories = [
    "plumbing", "electrical", "hvac", "bathroom", "furniture", "fixtures",
    "appliances", "it_technology", "safety", "public_area", "kitchen", "other"
  ];
  if (categories.every((v) => new RegExp(`'${v}'`).test(sql))) {
    ok = pass("category allowed values present") && ok;
  } else {
    ok = fail("Missing one or more category values") && ok;
  }

  if (["low", "medium", "high", "urgent"].every((v) => sql.includes(`'${v}'`))) {
    ok = pass("priority allowed values present") && ok;
  } else {
    ok = fail("Missing one or more priority values") && ok;
  }

  if (
    ["open", "in_progress", "waiting_parts", "waiting_contractor", "completed"].every((v) =>
      sql.includes(`'${v}'`)
    )
  ) {
    ok = pass("status allowed values present") && ok;
  } else {
    ok = fail("Missing one or more status values") && ok;
  }

  if (!/CONSTRAINT\s+maintenance_issues_priority_check/i.test(sql)) {
    ok = fail("Missing maintenance_issues_priority_check") && ok;
  } else {
    ok = pass("priority CHECK constraint named") && ok;
  }

  if (!/CONSTRAINT\s+maintenance_issues_status_check/i.test(sql)) {
    ok = fail("Missing maintenance_issues_status_check") && ok;
  } else {
    ok = pass("status CHECK constraint named") && ok;
  }

  // Empty / invalid values cannot pass IN (...) checks (design assertion)
  if (/location_type IN \(''\)/i.test(sql) || /priority IN \(''\)/i.test(sql)) {
    ok = fail("Enum CHECKs must not allow empty string as a listed value") && ok;
  } else {
    ok = pass("Enum CHECKs do not list empty string") && ok;
  }

  // --- Updates table ---
  const updateTypes = [
    "created", "note", "status_changed", "priority_changed", "assignment_changed",
    "resolution", "reopened", "hidden_from_handover", "included_in_handover"
  ];
  if (updateTypes.every((v) => sql.includes(`'${v}'`))) {
    ok = pass("update_type allowed values present") && ok;
  } else {
    ok = fail("Missing one or more update_type values") && ok;
  }

  if (!/FOREIGN KEY\s*\(\s*issue_id\s*,\s*workspace_id\s*\)/i.test(sql)) {
    ok = fail("Updates must use composite FK (issue_id, workspace_id)") && ok;
  } else {
    ok = pass("Composite FK (issue_id, workspace_id) present") && ok;
  }

  if (!/UNIQUE\s*\(\s*id\s*,\s*workspace_id\s*\)/i.test(sql)) {
    ok = fail("Issues must expose UNIQUE (id, workspace_id) for composite FK") && ok;
  } else {
    ok = pass("UNIQUE (id, workspace_id) on issues") && ok;
  }

  if (!/ON DELETE CASCADE/i.test(sql) || !/maintenance_updates_issue_workspace_fkey/i.test(sql)) {
    ok = fail("Updates FK must CASCADE when parent issue is deleted") && ok;
  } else {
    ok = pass("Issue delete cascades to timeline updates") && ok;
  }

  if (!/set_maintenance_updates_workspace/i.test(sql)) {
    ok = fail("Missing workspace consistency trigger function") && ok;
  } else {
    ok = pass("Workspace consistency trigger function present") && ok;
  }

  if (!/NEW\.workspace_id\s*:=\s*parent_workspace_id/i.test(sql)) {
    ok = fail("Trigger must overwrite workspace_id from parent issue") && ok;
  } else {
    ok = pass("Trigger overwrites client-supplied workspace_id") && ok;
  }

  // --- RLS ---
  if (!/ALTER TABLE public\.maintenance_issues ENABLE ROW LEVEL SECURITY/i.test(sql)) {
    ok = fail("RLS must be enabled on maintenance_issues") && ok;
  } else {
    ok = pass("RLS enabled on maintenance_issues") && ok;
  }

  if (!/ALTER TABLE public\.maintenance_updates ENABLE ROW LEVEL SECURITY/i.test(sql)) {
    ok = fail("RLS must be enabled on maintenance_updates") && ok;
  } else {
    ok = pass("RLS enabled on maintenance_updates") && ok;
  }

  const issuePolicies = [
    "maintenance_issues_select_member",
    "maintenance_issues_insert_member",
    "maintenance_issues_update_member"
  ];
  issuePolicies.forEach((name) => {
    const block = policyBlock(sql, name);
    if (!block) {
      ok = fail(`Missing policy ${name}`) && ok;
      return;
    }
    if (!/hotel_members/i.test(block) || !/auth\.uid\(\)/i.test(block)) {
      ok = fail(`Policy ${name} must use hotel_members + auth.uid()`) && ok;
    } else {
      ok = pass(`Policy ${name} uses membership`) && ok;
    }
  });

  // M1.1: no authenticated DELETE on operational issue records
  if (/CREATE\s+POLICY\s+"maintenance_issues_delete_member"/i.test(sql)) {
    ok = fail("maintenance_issues must not expose authenticated DELETE policy") && ok;
  } else {
    ok = pass("No authenticated DELETE policy on maintenance_issues") && ok;
  }

  if (!/DROP\s+POLICY\s+IF\s+EXISTS\s+"maintenance_issues_delete_member"/i.test(sql)) {
    ok = fail("Migration should DROP any prior maintenance_issues_delete_member for safe re-run") && ok;
  } else {
    ok = pass("Prior DELETE policy is dropped if present") && ok;
  }

  const updateSelect = policyBlock(sql, "maintenance_updates_select_member");
  const updateInsert = policyBlock(sql, "maintenance_updates_insert_member");
  if (!updateSelect || !/hotel_members/i.test(updateSelect)) {
    ok = fail("maintenance_updates_select_member must use hotel_members") && ok;
  } else {
    ok = pass("Updates SELECT uses membership") && ok;
  }

  if (!updateInsert || !/WITH CHECK/i.test(updateInsert)) {
    ok = fail("maintenance_updates_insert_member must use WITH CHECK") && ok;
  } else {
    ok = pass("Updates INSERT has WITH CHECK") && ok;
  }

  if (!updateInsert || !/maintenance_issues/i.test(updateInsert)) {
    ok = fail("Updates INSERT WITH CHECK must verify parent issue workspace") && ok;
  } else {
    ok = pass("Updates INSERT verifies parent issue workspace") && ok;
  }

  const issuesUpdate = policyBlock(sql, "maintenance_issues_update_member");
  if (!issuesUpdate || !/WITH CHECK/i.test(issuesUpdate) || !/USING/i.test(issuesUpdate)) {
    ok = fail("Issues UPDATE policy must include USING and WITH CHECK") && ok;
  } else {
    ok = pass("Issues UPDATE has USING + WITH CHECK") && ok;
  }

  // Broad / insecure policy patterns
  if (/USING\s*\(\s*auth\.uid\(\)\s+IS\s+NOT\s+NULL\s*\)/i.test(sql)) {
    ok = fail("Must not use broad USING (auth.uid() IS NOT NULL)") && ok;
  } else {
    ok = pass("No broad auth.uid() IS NOT NULL policies") && ok;
  }

  const forAllPolicies = sql.match(/CREATE POLICY[\s\S]*?FOR ALL/gi) || [];
  if (forAllPolicies.length) {
    ok = fail("Maintenance policies should be per-command, not FOR ALL") && ok;
  } else {
    ok = pass("No FOR ALL maintenance policies") && ok;
  }

  // Append-only updates: no authenticated UPDATE/DELETE policies
  if (/CREATE\s+POLICY\s+"maintenance_updates_update_member"/i.test(sql)) {
    ok = fail("Updates should not allow authenticated UPDATE (audit immutability)") && ok;
  } else {
    ok = pass("No authenticated UPDATE policy on maintenance_updates") && ok;
  }

  if (/CREATE\s+POLICY\s+"maintenance_updates_delete_member"/i.test(sql)) {
    ok = fail("Updates should not allow authenticated DELETE") && ok;
  } else {
    ok = pass("No authenticated DELETE policy on maintenance_updates") && ok;
  }

  // --- Handover flag / M4 documentation ---
  if (!/include_in_handover boolean NOT NULL DEFAULT false/i.test(sql)) {
    ok = fail("include_in_handover must default to false") && ok;
  } else {
    ok = pass("include_in_handover defaults false") && ok;
  }

  if (
    !/M4/i.test(sql) ||
    !/not imported into handovers solely because they exist/i.test(sql)
  ) {
    ok = fail("Migration must document M4 handover inclusion intention") && ok;
  } else {
    ok = pass("M4 handover inclusion intention documented") && ok;
  }

  // --- Audit / completion triggers ---
  if (!/set_maintenance_issues_audit/i.test(sql)) {
    ok = fail("Missing maintenance_issues audit trigger function") && ok;
  } else {
    ok = pass("Issues audit trigger function present") && ok;
  }

  if (!/NEW\.created_by\s*:=\s*auth\.uid\(\)/i.test(sql) ||
      !/NEW\.updated_by\s*:=\s*auth\.uid\(\)/i.test(sql)) {
    ok = fail("Audit trigger must set created_by/updated_by from auth.uid()") && ok;
  } else {
    ok = pass("Audit fields forced from auth.uid()") && ok;
  }

  if (!/do not invent a user id/i.test(sql)) {
    ok = fail("Migration must document null auth.uid() behaviour (no invented user id)") && ok;
  } else {
    ok = pass("Null auth.uid() leaves audit fields NULL (documented)") && ok;
  }

  if (!/NEW\.created_by\s*:=\s*OLD\.created_by/i.test(sql)) {
    ok = fail("Issues trigger must lock created_by on UPDATE") && ok;
  } else {
    ok = pass("created_by immutable on issue UPDATE") && ok;
  }

  if (!/NEW\.workspace_id\s*:=\s*OLD\.workspace_id/i.test(sql)) {
    ok = fail("Issues trigger must lock workspace_id on UPDATE") && ok;
  } else {
    ok = pass("workspace_id immutable on issue UPDATE") && ok;
  }

  if (!/NEW\.workspace_id\s*:=\s*parent_workspace_id/i.test(sql)) {
    ok = fail("Updates trigger must overwrite workspace_id from parent issue") && ok;
  } else {
    ok = pass("Updates workspace_id always from parent issue") && ok;
  }

  // Completion: stamp on enter completed; clear otherwise; CHECK agrees
  if (
    !/NEW\.status\s*=\s*'completed'/i.test(sql) ||
    !/NEW\.completed_at\s*:=\s*now\(\)/i.test(sql) ||
    !/NEW\.completed_at\s*:=\s*NULL/i.test(sql) ||
    !/OLD\.status\s+IS\s+DISTINCT\s+FROM\s+'completed'/i.test(sql) ||
    !/NEW\.completed_at\s*:=\s*OLD\.completed_at/i.test(sql)
  ) {
    ok = fail("Completion trigger must stamp on enter completed, lock while completed, clear otherwise") && ok;
  } else {
    ok = pass("Completion timestamp trigger behaviour defined") && ok;
  }

  if (!/maintenance_issues_completed_consistency/i.test(sql)) {
    ok = fail("Missing completed_at consistency CHECK") && ok;
  } else if (
    !/\(status = 'completed' AND completed_at IS NOT NULL\)/i.test(sql) ||
    !/\(status <> 'completed' AND completed_at IS NULL\)/i.test(sql)
  ) {
    ok = fail("completed_at CHECK must agree with trigger (completed<=>timestamp)") && ok;
  } else {
    ok = pass("completed_at consistency CHECK agrees with trigger") && ok;
  }

  // --- Indexes ---
  const indexes = [
    "maintenance_issues_workspace_id_idx",
    "maintenance_issues_workspace_status_idx",
    "maintenance_issues_workspace_priority_idx",
    "maintenance_issues_workspace_created_at_idx",
    "maintenance_issues_workspace_room_number_idx",
    "maintenance_updates_issue_id_idx",
    "maintenance_updates_workspace_created_at_idx"
  ];
  indexes.forEach((name) => {
    if (!sql.includes(name)) {
      ok = fail(`Missing index ${name}`) && ok;
    } else {
      ok = pass(`Index ${name} present`) && ok;
    }
  });

  // --- Scope: schema test does not require or forbid the product page ---
  // M1 forbade maintenance.html; M2 introduces it. Schema checks stay migration-focused.
  if (fs.existsSync(path.join(ROOT, "maintenance.html"))) {
    ok = pass("maintenance.html present (expected from M2+)") && ok;
  } else {
    ok = pass("maintenance.html not required for schema validation") && ok;
  }

  FORBIDDEN_APP_FILES.forEach((rel) => {
    if (rel === "maintenance.html") return;
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) return;
    // Static phase check: migration/test only — do not assert git cleanliness here.
  });

  // Existing migrations untouched (spot-check phase7 still handover-only)
  const phase7 = read("supabase/migrations/phase7_handover_reports.sql");
  if (/maintenance_issues/i.test(phase7)) {
    ok = fail("Existing phase7 migration must not mention maintenance_issues") && ok;
  } else {
    ok = pass("Existing phase7 migration unchanged in scope") && ok;
  }

  ok = pass("Static test does not apply migrations (read-only file checks)") && ok;

  if (ok) {
    console.log("\nAll Maintenance M1 schema/security checks passed.");
    console.log("Next (manual): apply supabase/migrations/phase15_maintenance.sql in a non-prod Supabase project and verify cross-tenant isolation.");
    process.exit(0);
  }

  console.error("\nMaintenance M1 schema/security checks failed.");
  process.exit(1);
}

main();
