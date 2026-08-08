/**
 * Pure helpers for saved-handover test-evidence export.
 * No network. No credentials. Safe to unit-test offline.
 */
import crypto from "crypto";
import path from "path";

export const EXPORT_TOOL_VERSION = "1.0.0";

export const EXPORT_COLUMNS = Object.freeze([
  "id",
  "workspace_id",
  "hotel_name",
  "created_at",
  "updated_at",
  "handover_date",
  "shift",
  "prepared_by",
  "source_notes",
  "generated_handover",
  "metrics",
  "recommendation_state",
  "checklist_state",
  "status"
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_RE.test(String(value || "").trim());
}

export function loadEnvFileText(text, env = {}) {
  const out = { ...env };
  for (const line of String(text || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (out[key] == null || out[key] === "") out[key] = value;
  }
  return out;
}

export function parseArgs(argv) {
  const args = {
    workspace: "",
    ids: [],
    fromCreated: "",
    toCreated: "",
    handoverDateFrom: "",
    handoverDateTo: "",
    status: "saved",
    hotelLabel: "",
    out: "",
    dryRun: false,
    force: false,
    help: false
  };

  const raw = Array.isArray(argv) ? argv.slice() : [];
  for (let i = 0; i < raw.length; i += 1) {
    const token = raw[i];
    const next = () => {
      i += 1;
      return raw[i];
    };
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "--force") {
      args.force = true;
      continue;
    }
    if (token === "--workspace") {
      args.workspace = String(next() || "").trim();
      continue;
    }
    if (token === "--ids") {
      const value = String(next() || "");
      args.ids = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      continue;
    }
    if (token === "--from-created") {
      args.fromCreated = String(next() || "").trim();
      continue;
    }
    if (token === "--to-created") {
      args.toCreated = String(next() || "").trim();
      continue;
    }
    if (token === "--handover-date-from") {
      args.handoverDateFrom = String(next() || "").trim();
      continue;
    }
    if (token === "--handover-date-to") {
      args.handoverDateTo = String(next() || "").trim();
      continue;
    }
    if (token === "--status") {
      args.status = String(next() || "saved").trim() || "saved";
      continue;
    }
    if (token === "--hotel-label") {
      args.hotelLabel = String(next() || "").trim();
      continue;
    }
    if (token === "--out") {
      args.out = String(next() || "").trim();
      continue;
    }
    throw new Error("Unknown argument: " + token);
  }
  return args;
}

export function hasNarrowingFilter(args) {
  if (!args) return false;
  if (Array.isArray(args.ids) && args.ids.length > 0) return true;
  if (args.fromCreated || args.toCreated) return true;
  if (args.handoverDateFrom || args.handoverDateTo) return true;
  return false;
}

export function validateCliArgs(args) {
  const errors = [];
  if (!args || !args.workspace) {
    errors.push("Missing required --workspace <uuid>.");
  } else if (!isUuid(args.workspace)) {
    errors.push("--workspace must be a UUID.");
  }
  if (!hasNarrowingFilter(args)) {
    errors.push(
      "Refusing unrestricted workspace dump. Provide at least one of: --ids, --from-created/--to-created, or --handover-date-from/--handover-date-to."
    );
  }
  if (Array.isArray(args.ids)) {
    args.ids.forEach(function (id) {
      if (!isUuid(id)) errors.push("Invalid id in --ids: " + id);
    });
  }
  if (args.status && !/^(saved|draft)$/.test(args.status)) {
    errors.push('--status must be "saved" or "draft".');
  }
  if (!args.dryRun && !args.out && !args.hotelLabel) {
    errors.push("Provide --out <path> or --hotel-label <slug> for output path.");
  }
  if (args.hotelLabel && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(args.hotelLabel)) {
    errors.push(
      "--hotel-label must be a simple slug (letters, numbers, hyphens)."
    );
  }
  return errors;
}

/** Convert date-only to inclusive ISO bounds for created_at filters. */
export function normalizeCreatedBound(value, endOfDay) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return endOfDay
      ? raw + "T23:59:59.999Z"
      : raw + "T00:00:00.000Z";
  }
  return raw;
}

export function buildRestFilterQuery(args) {
  const parts = [];
  parts.push("workspace_id=eq." + encodeURIComponent(args.workspace));
  parts.push("status=eq." + encodeURIComponent(args.status || "saved"));
  if (args.ids && args.ids.length) {
    parts.push("id=in.(" + args.ids.map(encodeURIComponent).join(",") + ")");
  }
  const fromCreated = normalizeCreatedBound(args.fromCreated, false);
  const toCreated = normalizeCreatedBound(args.toCreated, true);
  if (fromCreated) {
    parts.push("created_at=gte." + encodeURIComponent(fromCreated));
  }
  if (toCreated) {
    parts.push("created_at=lte." + encodeURIComponent(toCreated));
  }
  if (args.handoverDateFrom) {
    parts.push(
      "handover_date=gte." + encodeURIComponent(args.handoverDateFrom)
    );
  }
  if (args.handoverDateTo) {
    parts.push("handover_date=lte." + encodeURIComponent(args.handoverDateTo));
  }
  parts.push("select=" + EXPORT_COLUMNS.join(","));
  parts.push("order=created_at.asc");
  return parts.join("&");
}

export function verifyRowsWorkspace(rows, workspaceId) {
  const expected = String(workspaceId || "");
  const bad = (rows || []).filter(function (row) {
    return String(row && row.workspace_id || "") !== expected;
  });
  if (bad.length) {
    return {
      ok: false,
      message:
        "ABORT: " +
        bad.length +
        " row(s) have workspace_id different from --workspace. No files written."
    };
  }
  return { ok: true, message: "" };
}

export function csvEscapeCell(value) {
  if (value == null) return "";
  let text;
  if (typeof value === "object") {
    text = JSON.stringify(value);
  } else {
    text = String(value);
  }
  if (/[",\n\r]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

export function rowsToCsv(rows, columns = EXPORT_COLUMNS) {
  const lines = [];
  lines.push(columns.join(","));
  (rows || []).forEach(function (row) {
    lines.push(
      columns
        .map(function (col) {
          return csvEscapeCell(row ? row[col] : "");
        })
        .join(",")
    );
  });
  return lines.join("\n") + "\n";
}

export function sha256Hex(text) {
  return crypto.createHash("sha256").update(String(text || ""), "utf8").digest("hex");
}

export function summarizeRows(rows) {
  const list = rows || [];
  const created = list
    .map((r) => r && r.created_at)
    .filter(Boolean)
    .sort();
  const handoverDates = list
    .map((r) => r && r.handover_date)
    .filter(Boolean)
    .sort();
  const hotels = Array.from(
    new Set(list.map((r) => r && r.hotel_name).filter(Boolean))
  );
  return {
    recordCount: list.length,
    hotelNames: hotels,
    createdAtMin: created[0] || null,
    createdAtMax: created[created.length - 1] || null,
    handoverDateMin: handoverDates[0] || null,
    handoverDateMax: handoverDates[handoverDates.length - 1] || null,
    ids: list.map((r) => r && r.id).filter(Boolean)
  };
}

export function buildManifest(options) {
  const opts = options || {};
  const summary = opts.summary || summarizeRows(opts.rows || []);
  return {
    exported_at: opts.exportedAt || new Date().toISOString(),
    export_tool: "scripts/export-test-handovers.mjs",
    export_tool_version: EXPORT_TOOL_VERSION,
    git_head: opts.gitHead || null,
    workspace_id: opts.workspaceId || "",
    hotel_label: opts.hotelLabel || null,
    record_count: summary.recordCount,
    record_ids: summary.ids,
    created_at_range: {
      min: summary.createdAtMin,
      max: summary.createdAtMax
    },
    handover_date_range: {
      min: summary.handoverDateMin,
      max: summary.handoverDateMax
    },
    hotel_names: summary.hotelNames,
    output_filename: opts.outputFilename || "",
    csv_sha256: opts.csvSha256 || "",
    filters: opts.filters || {},
    notes:
      "Frozen test evidence export. Credentials are never written to this file."
  };
}

export function assertNoSecretsInText(text) {
  const s = String(text || "");
  const forbidden = [
    /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}\./, // JWT-ish
    /service_role/i,
    /TEST_EXPORT_PASSWORD\s*=/,
    /SUPABASE_SERVICE_ROLE/
  ];
  for (const re of forbidden) {
    if (re.test(s)) {
      return { ok: false, message: "Secret-like content detected in export output." };
    }
  }
  return { ok: true, message: "" };
}

export function defaultOutputPath(repoRoot, hotelLabel, stamp) {
  const label = String(hotelLabel || "export").trim();
  const ts = stamp || new Date().toISOString().slice(0, 10);
  return path.join(
    repoRoot,
    "testing",
    label,
    "exports",
    label + "-export-" + ts + ".csv"
  );
}

export function manifestPathForCsv(csvPath) {
  const dir = path.dirname(csvPath);
  return path.join(dir, "EXPORT_MANIFEST.json");
}

export function resolveOutputPaths(args, repoRoot, stamp) {
  const csvPath = args.out
    ? path.resolve(args.out)
    : defaultOutputPath(repoRoot, args.hotelLabel, stamp);
  return {
    csvPath,
    manifestPath: manifestPathForCsv(csvPath)
  };
}

export function checkOverwriteAllowed(csvPath, manifestPath, force, existsFn) {
  const exists = typeof existsFn === "function" ? existsFn : () => false;
  const conflicts = [];
  if (exists(csvPath)) conflicts.push(csvPath);
  if (exists(manifestPath)) conflicts.push(manifestPath);
  if (!conflicts.length) return { ok: true, conflicts: [] };
  if (force) return { ok: true, conflicts };
  return {
    ok: false,
    conflicts,
    message:
      "Refusing to overwrite existing export file(s). Use --force to overwrite intentionally, or choose a new --out path.\n" +
      conflicts.map((p) => "  - " + p).join("\n")
  };
}

export function filtersForManifest(args) {
  return {
    workspace: args.workspace,
    ids: args.ids || [],
    from_created: args.fromCreated || null,
    to_created: args.toCreated || null,
    handover_date_from: args.handoverDateFrom || null,
    handover_date_to: args.handoverDateTo || null,
    status: args.status || "saved",
    hotel_label: args.hotelLabel || null,
    dry_run: !!args.dryRun,
    force: !!args.force
  };
}

export function helpText() {
  return `
export-test-handovers — freeze saved handovers from Supabase for testing

Usage:
  node scripts/export-test-handovers.mjs --workspace <uuid> (--ids ... | created/date filters) [options]

Required:
  --workspace <uuid>

Narrowing (at least one required):
  --ids <id1,id2,...>
  --from-created <date|datetime>
  --to-created <date|datetime>
  --handover-date-from <YYYY-MM-DD>
  --handover-date-to <YYYY-MM-DD>

Options:
  --status saved|draft          (default: saved)
  --hotel-label <slug>          used for default output path / manifest
  --out <path.csv>              explicit CSV output path
  --dry-run                     list metadata only; write nothing
  --force                       allow overwrite of existing CSV/manifest
  --help

Auth env (local, gitignored .env.test-export):
  SUPABASE_URL
  SUPABASE_ANON_KEY
  TEST_EXPORT_EMAIL
  TEST_EXPORT_PASSWORD

Never uses service-role. RLS + membership remains the security boundary.
`.trim();
}
