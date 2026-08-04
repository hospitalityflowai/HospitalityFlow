/**
 * Early Access status consistency — invite / workspace split-brain guards.
 * Run: node scripts/test-early-access-status-consistency.mjs
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
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/--.*$/gm, "");
}

function main() {
  let ok = true;

  const migration = read(
    "supabase/migrations/20260804120000_early_access_status_consistency.sql",
  );
  const inviteFn = read("supabase/functions/invite-pilot-applicant/index.ts");
  const docs = read("docs/OPERATOR_INVITE.md");
  const dashboard = read("js/operator-dashboard.js");
  const migrationBody = stripComments(migration);
  const inviteBody = stripComments(inviteFn);

  console.log("\nEarly Access status consistency\n");

  /* ---------- Migration: mark_pilot_applicant_invited ---------- */
  if (!/CREATE OR REPLACE FUNCTION public\.mark_pilot_applicant_invited/i.test(migration)) {
    ok = fail("Migration must replace mark_pilot_applicant_invited") && ok;
  } else {
    ok = pass("Migration replaces mark_pilot_applicant_invited") && ok;
  }

  if (!/founding_status = 'accepted'/i.test(migrationBody)) {
    ok = fail("mark_pilot_applicant_invited must set founding_status accepted") && ok;
  } else {
    ok = pass("mark sets founding_status accepted") && ok;
  }

  if (!/founding_status IS DISTINCT FROM 'declined'/i.test(migrationBody) &&
      !/founding_status = 'declined'/i.test(migrationBody)) {
    ok = fail("Migration must protect declined applications") && ok;
  } else {
    ok = pass("Declined applications are protected") && ok;
  }

  if (!/v_prev_status = 'active'/i.test(migrationBody) ||
      !/access_unchanged',\s*true/i.test(migrationBody)) {
    ok = fail("Active access must remain unchanged (never downgrade to invited)") && ok;
  } else {
    ok = pass("Active access is never downgraded to invited") && ok;
  }

  if (!/access_status IS DISTINCT FROM 'active'/i.test(migrationBody)) {
    ok = fail("Invited update must refuse to overwrite active rows") && ok;
  } else {
    ok = pass("Invited update skips active platform_access rows") && ok;
  }

  /* ---------- Migration: create_hotel_workspace safety net ---------- */
  if (!/CREATE OR REPLACE FUNCTION public\.create_hotel_workspace/i.test(migration)) {
    ok = fail("Migration must replace create_hotel_workspace") && ok;
  } else {
    ok = pass("Migration replaces create_hotel_workspace") && ok;
  }

  const createFnMatch = migrationBody.match(
    /CREATE OR REPLACE FUNCTION public\.create_hotel_workspace[\s\S]*?\$\$;/,
  );
  const createFn = createFnMatch ? createFnMatch[0] : "";

  if (!/access_status = 'active'/i.test(createFn)) {
    ok = fail("create_hotel_workspace must still set platform_access active") && ok;
  } else {
    ok = pass("create_hotel_workspace sets platform_access active") && ok;
  }

  if (!/early_access_application_id/i.test(createFn)) {
    ok = fail("Hotel creation must resolve linked early_access_application_id") && ok;
  } else {
    ok = pass("Hotel creation prefers linked early_access_application_id") && ok;
  }

  if (!/early_access_applications/i.test(createFn) ||
      !/founding_status = 'accepted'/i.test(createFn)) {
    ok = fail("Hotel creation must accept linked early_access application") && ok;
  } else {
    ok = pass("Hotel creation repairs Active + pending founding_status") && ok;
  }

  if (!/founding_status IS DISTINCT FROM 'declined'/i.test(createFn)) {
    ok = fail("Hotel creation must not change declined applications") && ok;
  } else {
    ok = pass("Hotel creation leaves declined applications unchanged") && ok;
  }

  if (!/User already belongs to a hotel workspace/i.test(createFn)) {
    ok = fail("Re-running create_hotel_workspace must still reject duplicate membership") && ok;
  } else {
    ok = pass("Duplicate hotel/membership creation remains blocked") && ok;
  }

  /* ---------- Invite function: already-invited reconcile ---------- */
  const invitedBlock = inviteBody.match(
    /access_status === ["']invited["'][\s\S]{0,1200}/,
  );
  const invitedSrc = invitedBlock ? invitedBlock[0] : "";

  if (!/mark_pilot_applicant_invited/.test(invitedSrc)) {
    ok = fail("Already-invited path must call mark_pilot_applicant_invited") && ok;
  } else {
    ok = pass("Already-invited path reconciles via mark_pilot_applicant_invited") && ok;
  }

  if (/No status change made/.test(inviteFn)) {
    ok = fail("Already-invited path must no longer skip reconciliation") && ok;
  } else {
    ok = pass("Already-invited path no longer skips status reconciliation") && ok;
  }

  if (!/alreadyInvited:\s*true/.test(invitedSrc) || !/statusUpdated:\s*true/.test(invitedSrc)) {
    ok = fail("Already-invited success response must report statusUpdated true") && ok;
  } else {
    ok = pass("Already-invited reconcile reports statusUpdated true") && ok;
  }

  /* Auth invite still precedes mark on the fresh-invite path */
  const inviteIdx = inviteBody.search(/inviteUserByEmail/);
  const afterInvite = inviteBody.slice(inviteIdx);
  if (inviteIdx === -1 || !/mark_pilot_applicant_invited/.test(afterInvite)) {
    ok = fail("Successful Auth invite path must still call mark_pilot_applicant_invited") && ok;
  } else {
    ok = pass("Normal invite path still marks invited after Auth invite") && ok;
  }

  /* Active path reconciles without inviting again */
  const activeBlock = inviteBody.match(
    /access_status === ["']active["'][\s\S]{0,1400}/,
  );
  const activeSrc = activeBlock ? activeBlock[0] : "";
  if (!/mark_pilot_applicant_invited/.test(activeSrc) || !/alreadyActive/.test(activeSrc)) {
    ok = fail("Active applicant path must reconcile founding_status and refuse new invite") && ok;
  } else {
    ok = pass("Active applicant path reconciles founding_status and refuses new invite") && ok;
  }

  /* ---------- Docs: manual recovery updates both fields ---------- */
  if (/manually set `platform_access\.access_status = 'invited'`/.test(docs) &&
      !/both status fields|update \*\*both\*\*/i.test(docs)) {
    ok = fail("Docs must not tell operators to update only platform_access") && ok;
  }

  if (!/founding_status = 'accepted'/i.test(docs) ||
      !/Leave platform_access\.access_status = 'active' unchanged/i.test(docs)) {
    ok = fail("Docs must document dual-field recovery and never-downgrade-active") && ok;
  } else {
    ok = pass("Docs require reconciling founding_status and access_status together") && ok;
  }

  if (!/Do \*\*not\*\* instruct or perform a recovery that updates only `platform_access/i.test(docs)) {
    ok = fail("Docs must explicitly forbid platform_access-only recovery") && ok;
  } else {
    ok = pass("Docs forbid platform_access-only recovery") && ok;
  }

  /* ---------- Dashboard display unchanged ---------- */
  if (!/function resolveDisplayStatus\(app\)/.test(dashboard) ||
      !/if \(access === "active"\) return "active"/.test(dashboard)) {
    ok = fail("Operator Dashboard display logic must remain present/unchanged") && ok;
  } else {
    ok = pass("Operator Dashboard display logic left unchanged") && ok;
  }

  /* ---------- Lifecycle contract summary (documentation assertions) ---------- */
  const lifecycleOk =
    /founding_status = accepted`? means the application was approved/i.test(docs) &&
    /access_status = invited`? means the invitation was issued/i.test(docs) &&
    /access_status = active`? means the hotel workspace is active/i.test(docs);

  if (!lifecycleOk) {
    ok = fail("Docs must preserve pending→accepted / invited→active status meanings") && ok;
  } else {
    ok = pass("Status lifecycle meanings preserved in docs") && ok;
  }

  if (ok) {
    console.log("\nAll early-access status consistency checks passed.");
    process.exit(0);
  }

  console.error("\nEarly-access status consistency checks failed.");
  process.exit(1);
}

main();
