/**
 * Export saved handovers from Supabase for frozen test evidence.
 *
 * Auth: anon key + workspace-member email/password (RLS enforced).
 * Never uses service-role. Never modifies app/save/reasoning behaviour.
 *
 * Run:
 *   node scripts/export-test-handovers.mjs --workspace <uuid> --ids <...> --dry-run
 *   node scripts/export-test-handovers.mjs --workspace <uuid> --ids <...> --hotel-label pilot-hotel --out testing/pilot-hotel/exports/....csv
 *
 * Env: copy .env.test-export.example → .env.test-export (gitignored)
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import {
  EXPORT_COLUMNS,
  assertNoSecretsInText,
  buildManifest,
  buildRestFilterQuery,
  checkOverwriteAllowed,
  filtersForManifest,
  helpText,
  loadEnvFileText,
  parseArgs,
  resolveOutputPaths,
  rowsToCsv,
  sha256Hex,
  summarizeRows,
  validateCliArgs,
  verifyRowsWorkspace
} from "./lib/export-test-handovers-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadLocalEnv() {
  const candidates = [
    path.join(ROOT, ".env.test-export"),
    path.join(ROOT, ".env.test-export.local"),
    path.join(ROOT, ".env.local")
  ];
  let env = { ...process.env };
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    env = loadEnvFileText(fs.readFileSync(filePath, "utf8"), env);
  }
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

function requireAuthEnv() {
  const url = String(process.env.SUPABASE_URL || "").trim();
  const anon = String(process.env.SUPABASE_ANON_KEY || "").trim();
  const email = String(process.env.TEST_EXPORT_EMAIL || "").trim();
  const password = String(process.env.TEST_EXPORT_PASSWORD || "").trim();

  /* Never read SUPABASE_SERVICE_ROLE_KEY / HF_RLS_TEST_SERVICE_ROLE_KEY. */
  if (!url || !/^https:\/\//i.test(url)) {
    throw new Error("SUPABASE_URL must be set to an https:// Supabase project URL.");
  }
  if (!anon) {
    throw new Error("SUPABASE_ANON_KEY must be set (anon/publishable key only).");
  }
  if (!email || !password) {
    throw new Error(
      "TEST_EXPORT_EMAIL and TEST_EXPORT_PASSWORD must be set for member sign-in."
    );
  }
  if (/service_role/i.test(anon)) {
    throw new Error("SUPABASE_ANON_KEY looks like a service-role key. Refusing to run.");
  }
  return { url: url.replace(/\/$/, ""), anon, email, password };
}

async function signInMember({ url, anon, email, password }) {
  const res = await fetch(url + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: {
      apikey: anon,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.error_description || body.msg || body.error || res.statusText;
    throw new Error("Member sign-in failed: " + msg);
  }
  if (!body.access_token) {
    throw new Error("Member sign-in failed: no access_token returned.");
  }
  return body.access_token;
}

async function fetchHandovers({ url, anon, accessToken, args }) {
  const query = buildRestFilterQuery(args);
  const res = await fetch(url + "/rest/v1/handover_reports?" + query, {
    method: "GET",
    headers: {
      apikey: anon,
      Authorization: "Bearer " + accessToken,
      Accept: "application/json",
      Prefer: "count=exact"
    }
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : [];
  } catch {
    throw new Error("Supabase returned non-JSON response (" + res.status + ").");
  }
  if (!res.ok) {
    const msg =
      (data && (data.message || data.error_description || data.hint)) ||
      text ||
      res.statusText;
    throw new Error("Query failed (" + res.status + "): " + msg);
  }
  if (!Array.isArray(data)) {
    throw new Error("Unexpected response shape: expected an array of rows.");
  }
  return data;
}

function gitHeadSafe() {
  try {
    return execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();
  } catch {
    return null;
  }
}

function printDryRun(rows, workspaceId) {
  const summary = summarizeRows(rows);
  console.log("DRY RUN — no files written");
  console.log("workspace_id: " + workspaceId);
  console.log("record_count: " + summary.recordCount);
  console.log("hotel_name(s): " + (summary.hotelNames.join(", ") || "(none)"));
  console.log(
    "created_at range: " +
      (summary.createdAtMin || "?") +
      " → " +
      (summary.createdAtMax || "?")
  );
  console.log(
    "handover_date range: " +
      (summary.handoverDateMin || "?") +
      " → " +
      (summary.handoverDateMax || "?")
  );
  console.log("");
  console.log(
    ["id", "created_at", "handover_date", "shift", "prepared_by", "hotel_name"].join(
      "\t"
    )
  );
  rows.forEach(function (row) {
    console.log(
      [
        row.id || "",
        row.created_at || "",
        row.handover_date || "",
        row.shift || "",
        row.prepared_by || "",
        row.hotel_name || ""
      ].join("\t")
    );
  });
}

function printPreWriteSummary(summary, workspaceId) {
  console.log("Export summary (before write)");
  console.log("  workspace_id: " + workspaceId);
  console.log("  hotel_name(s): " + (summary.hotelNames.join(", ") || "(none)"));
  console.log("  record_count: " + summary.recordCount);
  console.log(
    "  created_at: " +
      (summary.createdAtMin || "?") +
      " → " +
      (summary.createdAtMax || "?")
  );
  console.log(
    "  handover_date: " +
      (summary.handoverDateMin || "?") +
      " → " +
      (summary.handoverDateMax || "?")
  );
}

async function main() {
  loadLocalEnv();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(helpText());
    process.exit(0);
  }

  const errors = validateCliArgs(args);
  if (errors.length) {
    console.error(errors.join("\n"));
    console.error("\nUse --help for usage.");
    process.exit(1);
  }

  const auth = requireAuthEnv();
  const accessToken = await signInMember(auth);
  const rows = await fetchHandovers({
    url: auth.url,
    anon: auth.anon,
    accessToken,
    args
  });

  const verify = verifyRowsWorkspace(rows, args.workspace);
  if (!verify.ok) {
    console.error(verify.message);
    process.exit(1);
  }

  const summary = summarizeRows(rows);

  if (args.dryRun) {
    printDryRun(rows, args.workspace);
    process.exit(0);
  }

  if (!rows.length) {
    console.error("No rows matched filters. Nothing written.");
    process.exit(1);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const { csvPath, manifestPath } = resolveOutputPaths(args, ROOT, stamp);
  const overwrite = checkOverwriteAllowed(
    csvPath,
    manifestPath,
    args.force,
    (p) => fs.existsSync(p)
  );
  if (!overwrite.ok) {
    console.error(overwrite.message);
    process.exit(1);
  }

  printPreWriteSummary(summary, args.workspace);

  const csv = rowsToCsv(rows, EXPORT_COLUMNS);
  const secretCheck = assertNoSecretsInText(csv);
  if (!secretCheck.ok) {
    console.error(secretCheck.message);
    process.exit(1);
  }

  const csvSha = sha256Hex(csv);
  const manifest = buildManifest({
    exportedAt: new Date().toISOString(),
    workspaceId: args.workspace,
    hotelLabel: args.hotelLabel || null,
    summary,
    outputFilename: path.basename(csvPath),
    csvSha256: csvSha,
    gitHead: gitHeadSafe(),
    filters: filtersForManifest(args)
  });
  const manifestText = JSON.stringify(manifest, null, 2) + "\n";
  const manifestSecretCheck = assertNoSecretsInText(manifestText);
  if (!manifestSecretCheck.ok) {
    console.error(manifestSecretCheck.message);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(csvPath), { recursive: true });
  fs.writeFileSync(csvPath, csv, "utf8");
  fs.writeFileSync(manifestPath, manifestText, "utf8");

  console.log("Wrote CSV: " + csvPath);
  console.log("Wrote manifest: " + manifestPath);
  console.log("CSV SHA-256: " + csvSha);
  console.log("Records: " + summary.recordCount);
}

main().catch(function (err) {
  console.error(err && err.message ? err.message : String(err));
  process.exit(1);
});
