/**
 * Offline tests for saved-handover test-evidence export helpers.
 * No network. No Supabase. No credentials required.
 *
 * Run: node scripts/test-export-test-handovers.mjs
 */
import fs from "fs";
import os from "os";
import path from "path";
import {
  EXPORT_COLUMNS,
  assertNoSecretsInText,
  buildManifest,
  buildRestFilterQuery,
  checkOverwriteAllowed,
  csvEscapeCell,
  hasNarrowingFilter,
  parseArgs,
  rowsToCsv,
  sha256Hex,
  summarizeRows,
  validateCliArgs,
  verifyRowsWorkspace
} from "./lib/export-test-handovers-lib.mjs";

let passed = 0;
let failed = 0;

function assert(cond, message) {
  if (cond) {
    passed += 1;
    console.log("  ✓ " + message);
  } else {
    failed += 1;
    console.error("  ✗ " + message);
  }
}

const WS = "4595e2c1-2920-4887-92d8-2159c035f661";
const ID1 = "50c5f88f-56a8-4c04-9080-cccdc5340be6";
const ID2 = "89a40e9f-594b-4287-8fa5-8bae551c841c";

console.log("\n=== export-test-handovers offline tests ===\n");

{
  console.log("1. Refuses missing workspace");
  const args = parseArgs(["--ids", ID1]);
  const errors = validateCliArgs(args);
  assert(errors.some((e) => /Missing required --workspace/i.test(e)),
    "Missing workspace rejected");
}

{
  console.log("2. Refuses workspace-only unrestricted query");
  const args = parseArgs(["--workspace", WS]);
  assert(!hasNarrowingFilter(args), "No narrowing filter detected");
  const errors = validateCliArgs(args);
  assert(errors.some((e) => /unrestricted workspace dump/i.test(e)),
    "Workspace-only dump refused");
}

{
  console.log("3. Accepts ids filter");
  const args = parseArgs(["--workspace", WS, "--ids", ID1 + "," + ID2, "--out", "x.csv"]);
  assert(hasNarrowingFilter(args), "ids counts as narrowing");
  assert(validateCliArgs(args).length === 0, "ids filter validates");
  const q = buildRestFilterQuery(args);
  assert(q.includes("workspace_id=eq." + WS), "query filters workspace");
  assert(q.includes("id=in.("), "query includes id in-filter");
  assert(q.includes("status=eq.saved"), "default status saved");
}

{
  console.log("4. Accepts date-range filter");
  const args = parseArgs([
    "--workspace", WS,
    "--from-created", "2026-08-01",
    "--to-created", "2026-08-10",
    "--hotel-label", "pilot-hotel"
  ]);
  assert(validateCliArgs(args).length === 0, "created range validates");
  const q = buildRestFilterQuery(args);
  assert(
    q.includes("created_at=gte." + encodeURIComponent("2026-08-01T00:00:00.000Z")),
    "from-created bound"
  );
  assert(
    q.includes("created_at=lte." + encodeURIComponent("2026-08-10T23:59:59.999Z")),
    "to-created inclusive EOD"
  );
}

{
  console.log("5. Dry-run writes nothing (CLI contract via resolve paths unused)");
  const args = parseArgs([
    "--workspace", WS,
    "--ids", ID1,
    "--dry-run"
  ]);
  assert(args.dryRun === true, "dry-run flag parsed");
  assert(validateCliArgs(args).length === 0, "dry-run does not require --out");
}

{
  console.log("6. Refuses overwrite without --force");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hf-export-"));
  const csvPath = path.join(tmp, "batch.csv");
  const manPath = path.join(tmp, "EXPORT_MANIFEST.json");
  fs.writeFileSync(csvPath, "id\n", "utf8");
  const blocked = checkOverwriteAllowed(csvPath, manPath, false, (p) => fs.existsSync(p));
  assert(!blocked.ok, "overwrite refused by default");
  const forced = checkOverwriteAllowed(csvPath, manPath, true, (p) => fs.existsSync(p));
  assert(forced.ok, "--force allows overwrite");
}

{
  console.log("7. JSON/CSV escaping works");
  const row = {
    id: ID1,
    workspace_id: WS,
    hotel_name: 'Pilot "Hotel"',
    created_at: "2026-08-04T06:02:36.430469+00",
    updated_at: "2026-08-04T06:02:36.430469+00",
    handover_date: "2026-08-04",
    shift: "Night",
    prepared_by: "Tester",
    source_notes: 'Line1\nLine2, with comma and "quotes"',
    generated_handover: { paragraphs: ["a", "b"] },
    metrics: { hotelSnapshot: { arrivals: 6 } },
    recommendation_state: [{ text: 'Collect "balance"' }],
    checklist_state: [],
    status: "saved"
  };
  assert(csvEscapeCell('a "b"').includes('""'), "quotes doubled");
  const csv = rowsToCsv([row], EXPORT_COLUMNS);
  assert(csv.startsWith(EXPORT_COLUMNS.join(",") + "\n"), "header columns exact");
  assert(csv.includes("Line1") && csv.includes("Line2"),
    "source_notes lines present");
  assert(/\nLine2/.test(csv), "newlines preserved inside CSV field");
  assert(csv.includes("paragraphs") && csv.includes("a") && csv.includes("b"),
    "json object serialized into CSV cell");
  assert(csv.includes('""'), "embedded quotes escaped as doubled quotes");
}

{
  console.log("8. Manifest SHA matches CSV bytes");
  const rows = [
    {
      id: ID1,
      workspace_id: WS,
      hotel_name: "Pilot Hotel",
      created_at: "2026-08-04T06:00:00Z",
      updated_at: "2026-08-04T06:00:00Z",
      handover_date: "2026-08-04",
      shift: "Night",
      prepared_by: "Mantas",
      source_notes: "hello",
      generated_handover: {},
      metrics: {},
      recommendation_state: [],
      checklist_state: [],
      status: "saved"
    }
  ];
  const csv = rowsToCsv(rows);
  const digest = sha256Hex(csv);
  const manifest = buildManifest({
    workspaceId: WS,
    hotelLabel: "pilot-hotel",
    summary: summarizeRows(rows),
    outputFilename: "pilot.csv",
    csvSha256: digest,
    gitHead: "abc",
    filters: { workspace: WS, ids: [ID1] }
  });
  assert(manifest.csv_sha256 === digest, "manifest sha equals csv sha");
  assert(manifest.record_count === 1, "manifest record count");
  assert(manifest.record_ids[0] === ID1, "manifest ids");
  assert(!JSON.stringify(manifest).includes("password"), "manifest has no password");
}

{
  console.log("9. Workspace mismatch aborts");
  const rows = [
    { id: ID1, workspace_id: WS },
    { id: ID2, workspace_id: "11111111-1111-4111-8111-111111111111" }
  ];
  const result = verifyRowsWorkspace(rows, WS);
  assert(!result.ok, "mismatch detected");
  assert(/ABORT/i.test(result.message), "abort message");
  assert(verifyRowsWorkspace([{ id: ID1, workspace_id: WS }], WS).ok,
    "matching workspace ok");
}

{
  console.log("10. Credentials never written to output");
  const csv = rowsToCsv([
    {
      id: ID1,
      workspace_id: WS,
      hotel_name: "Pilot",
      created_at: "t",
      updated_at: "t",
      handover_date: "2026-08-04",
      shift: "Night",
      prepared_by: "x",
      source_notes: "notes",
      generated_handover: {},
      metrics: {},
      recommendation_state: [],
      checklist_state: [],
      status: "saved"
    }
  ]);
  const check = assertNoSecretsInText(csv);
  assert(check.ok, "normal csv has no secrets");
  const bad = assertNoSecretsInText("TEST_EXPORT_PASSWORD=hunter2");
  assert(!bad.ok, "password assignment rejected");
  const service = assertNoSecretsInText("SUPABASE_SERVICE_ROLE=abc");
  assert(!service.ok, "service role marker rejected");
}

{
  console.log("11. Service-role env is not required by CLI validation");
  const src = fs.readFileSync(
    path.resolve("scripts/export-test-handovers.mjs"),
    "utf8"
  );
  assert(!/SERVICE_ROLE_KEY\s*\|\|/.test(src) ||
    /never read\/use them/i.test(src),
    "script documents non-use of service-role");
  assert(/TEST_EXPORT_EMAIL/.test(src) && /TEST_EXPORT_PASSWORD/.test(src),
    "member email/password auth required");
  assert(/SUPABASE_ANON_KEY/.test(src), "anon key required");
  assert(!/createClient\([^)]*SERVICE_ROLE/i.test(src),
    "no service-role client construction");
}

console.log("\n========================================");
console.log("export-test-handovers tests: " + passed + " passed, " + failed + " failed");
console.log("========================================\n");
process.exit(failed ? 1 : 0);
