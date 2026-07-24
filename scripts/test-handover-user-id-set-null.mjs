/**
 * Verify phase13 handover_reports.user_id ON DELETE SET NULL migration.
 * Run: node scripts/test-handover-user-id-set-null.mjs
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
  const migrationPath = "supabase/migrations/phase13_handover_reports_user_id_set_null.sql";
  const verifyPath = "scripts/verify-handover-user-id-fk.sql";
  const phase7Path = "supabase/migrations/phase7_handover_reports.sql";

  const migration = read(migrationPath);
  const verify = read(verifyPath);
  const phase7 = read(phase7Path);

  if (!/ALTER COLUMN user_id DROP NOT NULL/i.test(migration)) {
    ok = fail("Migration must make handover_reports.user_id nullable") && ok;
  } else {
    ok = pass("Migration makes user_id nullable") && ok;
  }

  if (!/DROP CONSTRAINT IF EXISTS handover_reports_user_id_fkey/i.test(migration)) {
    ok = fail("Migration must drop handover_reports_user_id_fkey if it exists") && ok;
  } else {
    ok = pass("Migration drops existing user_id foreign key") && ok;
  }

  if (
    !/ADD CONSTRAINT handover_reports_user_id_fkey/i.test(migration) ||
    !/REFERENCES auth\.users\(id\)/i.test(migration) ||
    !/ON DELETE SET NULL/i.test(migration)
  ) {
    ok = fail("Migration must recreate FK as REFERENCES auth.users(id) ON DELETE SET NULL") && ok;
  } else {
    ok = pass("Migration recreates FK with ON DELETE SET NULL") && ok;
  }

  if (/DROP TABLE|DELETE FROM\s+public\.handover_reports|TRUNCATE/i.test(migration)) {
    ok = fail("Migration must not delete handover report rows") && ok;
  } else {
    ok = pass("Migration does not delete handover reports") && ok;
  }

  if (
    /CREATE POLICY|DROP POLICY|ALTER POLICY|hotel_members|create_hotel_workspace|RLS/i.test(
      migration.replace(/^--.*$/gm, "")
    )
  ) {
    ok = fail("Migration must not change RLS, membership, or ownership") && ok;
  } else {
    ok = pass("Migration does not touch RLS, membership, or ownership") && ok;
  }

  if (!/hotel_members/i.test(verify) || !/delete_rule/i.test(verify)) {
    ok = fail("Verification SQL must audit hotel_members.user_id delete behaviour") && ok;
  } else {
    ok = pass("Verification SQL audits hotel_members.user_id FK") && ok;
  }

  if (!/handover_reports/i.test(verify) || !/SET NULL/i.test(verify)) {
    ok = fail("Verification SQL must confirm handover_reports ON DELETE SET NULL") && ok;
  } else {
    ok = pass("Verification SQL confirms handover_reports FK expectation") && ok;
  }

  if (!/user_id uuid NOT NULL REFERENCES auth\.users\(id\)/i.test(phase7)) {
    ok = fail("Baseline phase7 still expected to define NOT NULL user_id without ON DELETE") && ok;
  } else {
    ok = pass("Baseline phase7 documents pre-migration NOT NULL FK") && ok;
  }

  // Repo audit note: hotel_members base table/FK is not created in migrations.
  const allMigrations = fs
    .readdirSync(path.join(ROOT, "supabase/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .map((name) => read(path.join("supabase/migrations", name)))
    .join("\n");

  if (/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+public\.hotel_members/i.test(allMigrations)) {
    ok = fail("Unexpected CREATE TABLE hotel_members in migrations (audit assumption changed)") && ok;
  } else {
    ok = pass("Repo has no CREATE TABLE hotel_members — live FK must be audited via verify SQL") && ok;
  }

  if (/hotel_members[^;]*REFERENCES auth\.users\(id\)\s+ON DELETE/i.test(allMigrations)) {
    ok = fail("Repo unexpectedly defines hotel_members.user_id ON DELETE (report would be stale)") && ok;
  } else {
    ok = pass("Repo does not define hotel_members.user_id ON DELETE behaviour") && ok;
  }

  if (ok) {
    console.log("\nAll handover user_id SET NULL checks passed.");
    console.log("Next: run phase13 migration, then scripts/verify-handover-user-id-fk.sql in SQL Editor.");
    process.exit(0);
  }

  console.error("\nHandover user_id SET NULL checks failed.");
  process.exit(1);
}

main();
