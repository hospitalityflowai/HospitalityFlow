/**
 * Controlled Zetter post-Sprint-4 rerun (TEST ONLY).
 * Same historical source_notes → current engines → CURRENT POST-SPRINT-4 OUTPUT.
 *
 * Pipeline mirrored from handover.html classifyNotes + ShiftIntelligenceEngine.analyze:
 *   extract facts → consolidate → Sprint3 entities → Sprint1 election
 *   → Sprint4 dependencies → organised model → briefing → recommendations
 *
 * Run: node testing/zetter-real-shifts/current-engine-rerun/run-current-engine-rerun.mjs
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const OUT_DIR = __dirname;
const CSV_PATH = path.join(
  ROOT,
  "testing/zetter-real-shifts/exports/zetter-real-shifts-001-005.csv"
);
const EXPECTED_HEAD = "c986991efcd29b87fe9a083515bb1d5be08d5794";

const MAPPING = [
  { shift: "001", id: "50c5f88f-56a8-4c04-9080-cccdc5340be6" },
  { shift: "002", id: "89a40e9f-594b-4287-8fa5-8bae551c841c" },
  { shift: "003", id: "b2217d2d-2fe7-4a67-aec4-c4bda98fb1d9" },
  { shift: "004", id: "7a6c925c-7beb-439f-b579-ff9839a66f83" },
  { shift: "005", id: "ffff255d-75a9-4842-8272-75116dfeff56" },
];

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function loadEngines() {
  const context = {
    window: {},
    globalThis: {},
    console,
    Date,
    Math,
    Object,
    Array,
    String,
    Number,
    parseInt,
    parseFloat,
    isNaN,
    RegExp,
  };
  context.global = context.window;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, "ai-writing-engine.js"), "utf8"),
    context
  );
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, "shift-intelligence-engine.js"), "utf8"),
    context
  );
  const Engine = context.window.AiWritingEngine;
  const Shift = context.window.ShiftIntelligenceEngine;
  if (!Engine || !Shift) throw new Error("Engines failed to load");
  return { Engine, Shift };
}

function parseCsvRecords(csvText) {
  // Minimal RFC4180-ish parser for this export
  const rows = [];
  let i = 0;
  let field = "";
  let row = [];
  let inQuotes = false;
  while (i < csvText.length) {
    const c = csvText[i];
    if (inQuotes) {
      if (c === '"') {
        if (csvText[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (c === "\r") {
      i += 1;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).filter((r) => r.some((cell) => String(cell || "").trim())).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] != null ? r[idx] : "";
    });
    return obj;
  });
}

function extractSourceFromShiftMd(md) {
  const full = md.match(
    /### Full recovered source_notes \(verbatim\)\r?\n([\s\S]*?)\r?\n### Hotel Snapshot/
  );
  if (full) return full[1].replace(/\r\n/g, "\n");
  const unstructured = md.match(
    /### Recovered source_notes \(unstructured\)\r?\n([\s\S]*?)\r?\n### Hotel Snapshot/
  );
  if (unstructured) return unstructured[1].replace(/\r\n/g, "\n");
  throw new Error("Could not extract source_notes from shift markdown");
}

function parseSnapshotFromMd(md) {
  const block = md.match(
    /### Hotel Snapshot\r?\n([\s\S]*?)\r?\n## Expected Current Truth/
  );
  if (!block) return {};
  const snap = {};
  const re = /^- ([^:]+):\s*(.*)$/gm;
  let m;
  while ((m = re.exec(block[1]))) {
    snap[m[1].trim()] = m[2];
  }
  return snap;
}

function splitSourceLines(source) {
  // Preserve every non-empty line; keep blank lines out of note array (handover filters empties)
  return source.split("\n").map((l) => l.replace(/\r$/, ""));
}

function makeAnalyzed(Engine, lines) {
  return lines
    .map(function (line, index) {
      if (!String(line).trim()) return null;
      var rooms = Engine.extractRoomNumbers(line);
      var isVip = /\bvip\b/i.test(line);
      var fact = Engine.extractOperationalFact(line, {
        rooms: rooms,
        isVip: isVip,
      });
      var section = Engine.sectionFromFact
        ? Engine.sectionFromFact(fact, "general")
        : "general";
      if (
        /arr\s+\d|dep\s+\d|stay\s+\d|occ\b|sold\b|avail\b|inhouse|adr\b/i.test(
          line
        )
      ) {
        /* snapshot-like lines stay general */
      }
      return {
        original: line,
        rooms: rooms.length ? rooms : (fact && fact.rooms) || [],
        section: section,
        isVip: isVip,
        isCarriedOver: false,
        isFollowUp: /follow\s*up|monitor|confirm|collect|post/i.test(line),
        maintenancePriority:
          section === "maintenance" ||
          (fact && fact.subject === "maintenance")
            ? "High"
            : null,
        fact: fact,
        _neutralFactId: "zetter-rerun-" + index,
        noteSource: "general",
      };
    })
    .filter(Boolean);
}

function summarizeNote(n) {
  if (!n) return null;
  return {
    original: n.original,
    section: n.section,
    rooms: n.rooms || [],
    isVip: !!n.isVip,
    actionability: n.actionability || null,
    blockedBy: n.blockedBy || null,
    entityId: n.entityId || (n.fact && n.fact.entityId) || null,
    canonicalName: n.canonicalName || (n.fact && n.fact.canonicalName) || null,
    currentRoom: n.currentRoom || (n.fact && n.fact.currentRoom) || null,
    resolutionState: n.resolutionState || (n.fact && n.fact.resolutionState) || null,
    operationalState: n.operationalState || (n.fact && n.fact.operationalState) || null,
    supersession: n.supersession || (n.fact && n.fact.supersession) || null,
    operationalPriority:
      n.operationalPriority || (n.fact && n.fact.operationalPriority) || null,
    factSubject: n.fact && n.fact.subject,
    factStatus: n.fact && n.fact.status,
  };
}

function organisedToPlain(model) {
  if (!model || !model.sections) return {};
  const out = {};
  Object.keys(model.sections).forEach((key) => {
    const items = model.sections[key] || [];
    out[key] = items.map((entry) => {
      const note = entry && entry.note ? entry.note : entry;
      const text =
        (note && (note.displayText || note.original || note.text)) ||
        (typeof entry === "string" ? entry : JSON.stringify(entry));
      return String(text);
    });
  });
  return out;
}

function runOne({ Engine, Shift, shift, record, sourceFromMd, head, ranAt }) {
  // CSV source_notes is the authoritative historical export (exact bytes from Supabase).
  // Shift markdown bodies match after trailing whitespace normalisation (population trim).
  const csvSource = (record.source_notes || "").replace(/\r\n/g, "\n");
  const mdSource = sourceFromMd.replace(/\r\n/g, "\n");
  const bodyMatch = csvSource.replace(/\s+$/, "") === mdSource.replace(/\s+$/, "");
  const exactMatch = csvSource === mdSource;
  const sourceInput = csvSource;
  const sourceHash = sha256(sourceInput);

  let hotelSnapshot = {};
  try {
    const metrics = JSON.parse(record.metrics || "{}");
    hotelSnapshot = metrics.hotelSnapshot || {};
  } catch (_) {
    hotelSnapshot = {};
  }

  const lines = splitSourceLines(sourceInput);
  let analyzed = makeAnalyzed(Engine, lines);
  analyzed = Engine.consolidateNotesByFacts
    ? Engine.consolidateNotesByFacts(analyzed)
    : analyzed;
  analyzed = Engine.resolveOperationalEntities(analyzed);
  analyzed = Engine.electCanonicalCurrentState(analyzed);
  analyzed = Shift.resolveOperationalDependencies(analyzed);

  const organised = Shift.buildOrganisedSectionModel
    ? Shift.buildOrganisedSectionModel(analyzed, {})
    : null;
  if (organised && organised.analyzed && organised.analyzed.length) {
    analyzed = organised.analyzed;
  }

  const briefing = Engine.buildTodaysBriefing
    ? Engine.buildTodaysBriefing(analyzed, { maxBlocks: 5 })
    : { paragraphs: [] };

  const metrics = {
    urgent: 0,
    vip: 0,
    maintenance: 0,
    payments: 0,
    events: 0,
    tasks: 0,
    display: {},
  };
  analyzed.forEach((n) => {
    const s = n.section || "general";
    if (metrics[s] != null) metrics[s] += 1;
  });

  const result = Shift.analyze({
    shiftCode: record.shift || "Night",
    shiftDisplayName: record.shift || "Night",
    rawNotesText: sourceInput,
    classified: {
      _analyzed: analyzed,
      _metrics: metrics,
      _sectionModel: organised,
    },
    metrics: metrics,
    departments: [
      "Reception",
      "Housekeeping",
      "Maintenance",
      "Duty Manager",
      "Night Team",
      "Guest Services",
      "Finance",
      "F&B",
    ],
    selectedDepartment: "Reception",
    hotelSnapshot: hotelSnapshot,
    brainContext: null,
  });

  const recommendations = result.recommendations || [];
  const dependencyEdges = analyzed._operationalDependencies || [];
  const briefingText = Array.isArray(briefing.paragraphs)
    ? briefing.paragraphs.join("\n\n")
    : String(briefing.text || briefing.summary || "");

  const payload = {
    label: "CURRENT POST-SPRINT-4 OUTPUT",
    shift: shift,
    recordId: record.id,
    gitCommit: head,
    expectedGitCommit: EXPECTED_HEAD,
    engineVersion: Shift.VERSION,
    contractVersion: Shift.CONTRACT_VERSION || null,
    ranAt: ranAt,
    pipeline: [
      "extractOperationalFact / sectionFromFact",
      "consolidateNotesByFacts",
      "resolveOperationalEntities (Sprint 3)",
      "electCanonicalCurrentState (Sprint 1)",
      "resolveOperationalDependencies (Sprint 4)",
      "buildOrganisedSectionModel",
      "buildTodaysBriefing",
      "ShiftIntelligenceEngine.analyze (priority + recommendations)",
    ],
    inputIntegrity: {
      inputAuthority: "CSV source_notes (Supabase export)",
      markdownBodyMatchesCsvIgnoringTrailingWhitespace: bodyMatch,
      markdownExactByteMatchCsv: exactMatch,
      trailingWhitespaceOnlyDiffVsMarkdown: bodyMatch && !exactMatch,
      sourceSha256: sourceHash,
      sourceLength: sourceInput.length,
      lineCount: lines.filter((l) => String(l).trim()).length,
      brainContext: null,
      hotelSnapshotKeys: Object.keys(hotelSnapshot),
    },
    exactSourceInput: sourceInput,
    hotelSnapshot: hotelSnapshot,
    aiSummaryBriefing: briefingText,
    briefingParagraphs: briefing.paragraphs || [],
    organisedHandover: organisedToPlain(organised),
    recommendations: recommendations.map((r) => ({
      id: r.id || null,
      text: r.text || "",
      priority: r.priority || null,
      department: r.department || null,
      status: r.status || null,
      reasonCodes: r.reasonCodes || r.reasons || null,
    })),
    reasoningMetadata: {
      noteCountAfterPipeline: analyzed.length,
      dependencyEdgeCount: Array.isArray(dependencyEdges)
        ? dependencyEdges.length
        : 0,
      dependencyEdges: Array.isArray(dependencyEdges)
        ? dependencyEdges.map((e) => ({
            dependencyId: e.dependencyId,
            fromObjectId: e.fromObjectId,
            toObjectId: e.toObjectId,
            relation: e.relation,
            dependencyState: e.dependencyState,
            evidenceStrength: e.evidenceStrength,
          }))
        : [],
      analyzeKeys: result && typeof result === "object" ? Object.keys(result) : [],
      quietShift: result.quietShift || result.quietShiftState || null,
    },
    noteEvidence: analyzed.map(summarizeNote),
  };

  return payload;
}

function toMarkdown(payload) {
  const lines = [];
  lines.push(`# Shift-${payload.shift} — CURRENT POST-SPRINT-4 OUTPUT`);
  lines.push("");
  lines.push("**Label:** CURRENT POST-SPRINT-4 OUTPUT");
  lines.push("");
  lines.push("Do **not** confuse with HISTORICAL HF OUTPUT in `../shift-" + payload.shift + ".md`.");
  lines.push("");
  lines.push("## Run metadata");
  lines.push(`- Shift: ${payload.shift}`);
  lines.push(`- Record id: ${payload.recordId}`);
  lines.push(`- Git commit: \`${payload.gitCommit}\``);
  lines.push(`- Engine version: ${payload.engineVersion}`);
  lines.push(`- Ran at: ${payload.ranAt}`);
  lines.push(`- brainContext: \`null\` (no Hotel Brain)`);
  lines.push(
    `- Input authority: ${payload.inputIntegrity.inputAuthority}`
  );
  lines.push(
    `- Markdown body matches CSV (ignore trailing WS): ${
      payload.inputIntegrity.markdownBodyMatchesCsvIgnoringTrailingWhitespace
        ? "YES"
        : "NO"
    }`
  );
  lines.push(
    `- Trailing-whitespace-only MD/CSV diff: ${
      payload.inputIntegrity.trailingWhitespaceOnlyDiffVsMarkdown ? "YES" : "NO"
    }`
  );
  lines.push(`- Source SHA-256: \`${payload.inputIntegrity.sourceSha256}\``);
  lines.push("");
  lines.push("## Pipeline");
  payload.pipeline.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  lines.push("");
  lines.push("## Exact source input");
  lines.push("");
  lines.push("```");
  lines.push(payload.exactSourceInput.replace(/\n$/, ""));
  lines.push("```");
  lines.push("");
  lines.push("## AI Summary / Briefing");
  lines.push("");
  lines.push(payload.aiSummaryBriefing || "_Empty_");
  lines.push("");
  lines.push("## Organised handover");
  lines.push("");
  const org = payload.organisedHandover || {};
  const keys = Object.keys(org);
  if (!keys.length) lines.push("_No organised sections_");
  keys.forEach((k) => {
    const items = org[k] || [];
    lines.push(`### ${k} (${items.length})`);
    if (!items.length) lines.push("_No items_");
    else items.forEach((t) => lines.push(`- ${t}`));
    lines.push("");
  });
  lines.push("## Recommendations");
  lines.push("");
  if (!payload.recommendations.length) {
    lines.push("_No recommendations generated (`[]`)._");
  } else {
    payload.recommendations.forEach((r, i) => {
      const meta = [];
      if (r.priority != null) meta.push(`priority: ${r.priority}`);
      if (r.department) meta.push(`owner: ${r.department}`);
      if (r.status) meta.push(`status: ${r.status}`);
      lines.push(
        `${i + 1}. ${r.text}${meta.length ? " _(" + meta.join(")_ _(") + ")_" : ""}`
      );
    });
  }
  lines.push("");
  lines.push("## Reasoning metadata (summary)");
  lines.push("");
  lines.push(
    `- Notes after pipeline: ${payload.reasoningMetadata.noteCountAfterPipeline}`
  );
  lines.push(
    `- Dependency edges: ${payload.reasoningMetadata.dependencyEdgeCount}`
  );
  lines.push("");
  lines.push("Full machine-readable dump: `shift-" + payload.shift + "-current.json`");
  lines.push("");
  return lines.join("\n");
}

function main() {
  const head = execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();
  if (head !== EXPECTED_HEAD) {
    throw new Error(
      "HEAD mismatch. Expected " + EXPECTED_HEAD + " got " + head
    );
  }

  const { Engine, Shift } = loadEngines();
  const csvText = fs.readFileSync(CSV_PATH, "utf8");
  const records = parseCsvRecords(csvText);
  const byId = Object.fromEntries(records.map((r) => [r.id, r]));
  const ranAt = new Date().toISOString();

  const summary = {
    label: "CURRENT POST-SPRINT-4 OUTPUT",
    gitCommit: head,
    engineVersion: Shift.VERSION,
    ranAt,
    shifts: [],
  };

  console.log("HEAD", head);
  console.log("Engine VERSION", Shift.VERSION);

  for (const { shift, id } of MAPPING) {
    const record = byId[id];
    if (!record) throw new Error("Missing CSV record " + id);
    const mdPath = path.join(
      ROOT,
      "testing/zetter-real-shifts/shift-" + shift + ".md"
    );
    const md = fs.readFileSync(mdPath, "utf8");
    const sourceFromMd = extractSourceFromShiftMd(md);
    // touch parseSnapshotFromMd so unused-import linters stay quiet if tree-shaken later
    parseSnapshotFromMd(md);

    const payload = runOne({
      Engine,
      Shift,
      shift,
      record,
      sourceFromMd,
      head,
      ranAt,
    });

    if (!payload.inputIntegrity.markdownBodyMatchesCsvIgnoringTrailingWhitespace) {
      throw new Error(
        "INPUT INTEGRITY FAIL shift-" +
          shift +
          ": markdown source body !== CSV source_notes (beyond trailing whitespace)"
      );
    }

    const jsonPath = path.join(OUT_DIR, "shift-" + shift + "-current.json");
    const mdOutPath = path.join(OUT_DIR, "shift-" + shift + "-current.md");
    fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");
    fs.writeFileSync(mdOutPath, toMarkdown(payload), "utf8");

    summary.shifts.push({
      shift,
      recordId: id,
      sourceSha256: payload.inputIntegrity.sourceSha256,
      markdownBodyMatchesCsvIgnoringTrailingWhitespace: true,
      trailingWhitespaceOnlyDiffVsMarkdown:
        payload.inputIntegrity.trailingWhitespaceOnlyDiffVsMarkdown,
      recommendationCount: payload.recommendations.length,
      noteCount: payload.reasoningMetadata.noteCountAfterPipeline,
      dependencyEdges: payload.reasoningMetadata.dependencyEdgeCount,
      briefingChars: (payload.aiSummaryBriefing || "").length,
      files: [
        "shift-" + shift + "-current.json",
        "shift-" + shift + "-current.md",
      ],
    });

    console.log(
      "OK shift-" +
        shift +
        " notes=" +
        payload.reasoningMetadata.noteCountAfterPipeline +
        " recs=" +
        payload.recommendations.length +
        " deps=" +
        payload.reasoningMetadata.dependencyEdgeCount
    );
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "RERUN_SUMMARY.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );
  console.log("\nWrote 5/5 CURRENT POST-SPRINT-4 results + RERUN_SUMMARY.json");
}

main();
