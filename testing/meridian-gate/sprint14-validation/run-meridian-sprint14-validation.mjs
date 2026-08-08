/**
 * Meridian Gate ? Sprint 14 timed guest-transport validation (TEST ONLY).
 *
 * Runs frozen scenario-001..020.md Original Input through the current engines
 * after Sprint 14 timed guest-transport honour and conflict clarification work.
 *
 * Does NOT modify scenario files, FREEZE_MANIFEST.json, or baseline-validation/.
 *
 * Run: node testing/meridian-gate/sprint14-validation/run-meridian-sprint14-validation.mjs
 *
 * Does NOT modify frozen scenarios, FREEZE_MANIFEST.json, or baseline-validation/.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const SCENARIO_DIR = path.resolve(__dirname, "..");
const OUT_DIR = __dirname;

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function sha256File(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function verifyFreezeManifest() {
  const manifestPath = path.join(SCENARIO_DIR, "FREEZE_MANIFEST.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const mismatches = [];
  for (const s of manifest.scenarios || []) {
    const filePath = path.join(SCENARIO_DIR, s.file);
    const hash = sha256File(filePath);
    if (hash !== s.sha256) {
      mismatches.push({ file: s.file, expected: s.sha256, actual: hash });
    }
  }
  if (mismatches.length) {
    console.error("FREEZE MANIFEST MISMATCH ? aborting Sprint 14 validation run");
    console.error(JSON.stringify(mismatches, null, 2));
    process.exit(2);
  }
  console.log(
    "Freeze verify: OK (" +
      (manifest.scenarios || []).length +
      " scenarios match FREEZE_MANIFEST.json)"
  );
  return manifest;
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

function metaValue(md, key) {
  const re = new RegExp("^\\- " + key + ":\\s*(.+)$", "im");
  const m = md.match(re);
  return m ? m[1].trim() : "";
}

function extractSection(md, startHeading, endHeadingRe) {
  const start = md.indexOf(startHeading);
  if (start < 0) return "";
  const after = md.slice(start + startHeading.length);
  const endMatch = after.search(endHeadingRe);
  return (endMatch < 0 ? after : after.slice(0, endMatch)).trim();
}

function bullets(sectionText) {
  return String(sectionText || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.replace(/^- /, "").trim());
}

function parseHotelSnapshot(block) {
  const snap = {};
  if (!block) return snap;
  const re = /^- ([^:]+):\s*(.*)$/gm;
  let m;
  while ((m = re.exec(block))) {
    snap[m[1].trim()] = m[2].trim();
  }
  return snap;
}

function headingBullets(truthBlock, heading) {
  const re = new RegExp(
    "### " + heading + "\\r?\\n([\\s\\S]*?)(?=\\r?\\n### |$)"
  );
  const m = truthBlock.match(re);
  return bullets(m ? m[1] : "");
}

function parseExpectedTruth(md) {
  /* Meridian scenarios end after HET (no ## Actual HF Output). Take to EOF. */
  const startHeading = "## Human Expected Current Truth";
  const start = md.indexOf(startHeading);
  const truthBlock =
    start >= 0 ? md.slice(start + startHeading.length).trim() : "";
  /* Meridian Phase B headings (not Riverton #### OPEN nesting). */
  const completed = headingBullets(
    truthBlock,
    "Explicit completed / resolved / superseded \\(must not reopen\\)"
  );
  const rationaleMatch = truthBlock.match(
    /### Short human rationale\r?\n([\s\S]*?)$/
  );
  return {
    currentOperationalFacts: headingBullets(truthBlock, "Current operational facts"),
    open: headingBullets(truthBlock, "Expected OPEN actions"),
    monitor: headingBullets(truthBlock, "Expected MONITOR items"),
    information: headingBullets(truthBlock, "Expected INFORMATION"),
    unresolved: headingBullets(
      truthBlock,
      "Expected UNRESOLVED / clarifications"
    ),
    completedMustNotReopen: completed,
    bindings: headingBullets(
      truthBlock,
      "Important entity / room / time bindings"
    ),
    mustNotInfer: headingBullets(truthBlock, "Must not invent"),
    rationale: rationaleMatch && rationaleMatch[1].trim()
      ? [rationaleMatch[1].trim()]
      : [],
    rawTruthMarkdown: truthBlock,
  };
}

function parseScenarioDate(md) {
  const raw = metaValue(md, "Date") || "";
  const m = raw.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "2026-09-15";
}

function parseScenario(id, freezeByFile) {
  const file = path.join(SCENARIO_DIR, "scenario-" + id + ".md");
  const md = fs.readFileSync(file, "utf8");
  const fileSha = sha256File(file);
  const freezeSha = freezeByFile["scenario-" + id + ".md"];
  if (freezeSha && freezeSha !== fileSha) {
    throw new Error("Freeze mismatch mid-parse for scenario-" + id);
  }

  const inputBlock = extractSection(
    md,
    "## Original Input / Raw Source Notes",
    /^## Human Expected Current Truth/m
  );

  let sourceNotes = inputBlock;
  let hotelSnapshot = {};
  const snapIdx = inputBlock.search(/^### Hotel Snapshot\s*$/m);
  if (snapIdx >= 0) {
    sourceNotes = inputBlock.slice(0, snapIdx).trim();
    const snapBody = inputBlock
      .slice(snapIdx)
      .replace(/^### Hotel Snapshot\s*/, "");
    hotelSnapshot = parseHotelSnapshot(snapBody);
  }

  const shiftRaw = metaValue(md, "Shift") || "AM";
  const shift = /night/i.test(shiftRaw)
    ? "Night"
    : /pm/i.test(shiftRaw)
      ? "PM"
      : "AM";

  const handoverDate = parseScenarioDate(md);
  const createdAtByShift = {
    AM: handoverDate + "T07:15:00.000Z",
    PM: handoverDate + "T15:45:00.000Z",
    Night: handoverDate + "T23:20:00.000Z",
  };

  return {
    id,
    file: "scenario-" + id + ".md",
    title: metaValue(md, "Title") || "Scenario " + id,
    shift,
    operationalLoad: metaValue(md, "Operational load"),
    ambiguity: metaValue(md, "Ambiguity intentional"),
    departments: metaValue(md, "Departments"),
    preparedBy: metaValue(md, "Prepared by"),
    handoverDate,
    createdAt: createdAtByShift[shift] || createdAtByShift.AM,
    sourceNotes: sourceNotes.replace(/\r\n/g, "\n"),
    hotelSnapshot,
    humanExpectedTruth: parseExpectedTruth(md),
    scenarioFileSha256: fileSha,
  };
}

function splitSourceLines(source) {
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
        _neutralFactId: "meridian-baseline-" + index,
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
    priorityBand:
      (n.operationalPriority && n.operationalPriority.priorityBand) ||
      (n.fact && n.fact.operationalPriority && n.fact.operationalPriority.priorityBand) ||
      null,
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

function countByState(actions) {
  const counts = {
    open: 0,
    monitor: 0,
    information: 0,
    unresolved: 0,
    blocked: 0,
    resolved: 0,
    other: 0,
  };
  (actions || []).forEach((a) => {
    const s = String(a.actionState || "").toLowerCase();
    if (counts[s] != null) counts[s] += 1;
    else counts.other += 1;
  });
  return counts;
}

function runOne({ Engine, Shift, scenario, head, ranAt }) {
  const sourceInput = scenario.sourceNotes;
  const sourceHash = sha256(sourceInput);
  const lines = splitSourceLines(sourceInput);
  let analyzed = makeAnalyzed(Engine, lines);
  analyzed = Engine.consolidateNotesByFacts
    ? Engine.consolidateNotesByFacts(analyzed)
    : analyzed;
  analyzed = Engine.resolveOperationalEntities(analyzed);
  analyzed = Engine.electCanonicalCurrentState(analyzed);
  analyzed = Shift.resolveOperationalDependencies(analyzed);

  const temporalOpts = {
    handoverDate: scenario.handoverDate,
    shift: scenario.shift,
    createdAt: scenario.createdAt,
  };

  const canonicalActions = Shift.buildCanonicalOperationalActions
    ? Shift.buildCanonicalOperationalActions(analyzed, temporalOpts)
    : [];

  const organised = Shift.buildOrganisedSectionModel
    ? Shift.buildOrganisedSectionModel(analyzed, temporalOpts)
    : null;
  if (organised && organised.analyzed && organised.analyzed.length) {
    analyzed = organised.analyzed;
  }
  analyzed._canonicalActions = canonicalActions;
  analyzed._canonicalActionsBuilt = true;

  const briefing = Engine.buildTodaysBriefing
    ? Engine.buildTodaysBriefing(
        analyzed,
        Object.assign({ maxBlocks: 5 }, temporalOpts, {
          canonicalActions: canonicalActions,
        })
      )
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
    shiftCode: scenario.shift,
    shiftDisplayName: scenario.shift,
    handoverDate: scenario.handoverDate,
    createdAt: scenario.createdAt,
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
      "Concierge",
      "Events",
      "Spa",
      "Shuttle",
      "Valet",
    ],
    selectedDepartment: "Reception",
    hotelSnapshot: scenario.hotelSnapshot,
    brainContext: null,
  });

  let decisionSeats = null;
  if (typeof Shift.selectDecisionSeats === "function") {
    try {
      decisionSeats = Shift.selectDecisionSeats(canonicalActions, {
        surface: "briefing",
        maxN: 5,
        allowMonitorContinuity: true,
      });
    } catch (e) {
      decisionSeats = { error: String(e && e.message ? e.message : e) };
    }
  }

  const recommendations = result.recommendations || [];
  const dependencyEdges = analyzed._operationalDependencies || [];
  const briefingText = Array.isArray(briefing.paragraphs)
    ? briefing.paragraphs.join("\n\n")
    : String(briefing.text || briefing.summary || "");

  return {
    label: "MERIDIAN GATE Sprint 14 timed-transport validation OUTPUT",
    scenarioId: scenario.id,
    title: scenario.title,
    recordId: null,
    gitCommit: head,
    engineVersion: Shift.VERSION,
    contractVersion: Shift.CONTRACT_VERSION || null,
    ranAt: ranAt,
    pipeline: [
      "extractOperationalFact / sectionFromFact",
      "consolidateNotesByFacts",
      "resolveOperationalEntities (Sprint 3)",
      "electCanonicalCurrentState (Sprint 1)",
      "resolveOperationalDependencies (Sprint 4)",
      "buildCanonicalOperationalActions (Sprint 5/6/8/9/10/11 ? current HEAD)",
      "buildOrganisedSectionModel",
      "buildTodaysBriefing (decision seating)",
      "ShiftIntelligenceEngine.analyze (recommendation seating)",
    ],
    scenarioMeta: {
      shift: scenario.shift,
      operationalLoad: scenario.operationalLoad,
      ambiguity: scenario.ambiguity,
      departments: scenario.departments,
      preparedBy: scenario.preparedBy,
      sourceFile: scenario.file,
      scenarioFileSha256: scenario.scenarioFileSha256,
    },
    humanExpectedTruth: scenario.humanExpectedTruth,
    canonicalActions: (canonicalActions || []).map((a) => ({
      actionId: a.actionId,
      actionState: a.actionState,
      actionType: a.actionType,
      facetKey: a.facetKey,
      room: a.room,
      rooms: a.rooms || [],
      entityId: a.entityId,
      canonicalName: a.canonicalName,
      actionText: a.actionText,
      priorityBand: a.priorityBand,
      priorityScore: a.priorityScore,
      priorityReasons: a.priorityReasons || [],
      temporalScope: a.temporalScope || "",
      serviceDate: a.serviceDate || "",
      deadlineHint: a.deadlineHint || "",
      relativeCue: a.relativeCue || "",
      temporalConfidence: a.temporalConfidence || "",
      temporalReasons: a.temporalReasons || [],
      evidenceText: (a.evidenceText || "").slice(0, 280),
    })),
    actionStateCounts: countByState(canonicalActions),
    temporalAnchor: temporalOpts,
    decisionSeats: decisionSeats,
    inputIntegrity: {
      inputAuthority: "scenario-XXX.md Original Input / Raw Source Notes",
      scenarioFileSha256: scenario.scenarioFileSha256,
      sourceSha256: sourceHash,
      sourceLength: sourceInput.length,
      lineCount: lines.filter((l) => String(l).trim()).length,
      brainContext: null,
      hotelSnapshotKeys: Object.keys(scenario.hotelSnapshot || {}),
      humanExpectedTruthPreserved: true,
      freezeStatus: "FROZEN BEFORE FIRST HF RUN",
    },
    exactSourceInput: sourceInput,
    hotelSnapshot: scenario.hotelSnapshot,
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
      decisionSeating: {
        briefingUsesCanonicalActions: true,
        recommendationsFromAnalyze: true,
        sharedCanonicalList: true,
        selectDecisionSeatsCaptured: !!decisionSeats,
      },
    },
    noteEvidence: analyzed.map(summarizeNote),
    reviewPlaceholder: {
      status: "PENDING_HUMAN_REVIEW",
      note: "Sprint 14 timed-transport validation only. Compare to frozen Human Expected Truth. Do not modify engine or scenarios.",
    },
  };
}

function toMarkdown(payload) {
  const lines = [];
  lines.push(
    `# Scenario-${payload.scenarioId} ? MERIDIAN GATE Sprint 14 timed-transport validation OUTPUT`
  );
  lines.push("");
  lines.push("**Label:** MERIDIAN GATE Sprint 14 timed-transport validation OUTPUT");
  lines.push("");
  lines.push(
    "Human Expected Truth authority remains in `../scenario-" +
      payload.scenarioId +
      ".md` (FROZEN BEFORE FIRST HF RUN). This file is engine output only."
  );
  lines.push("");
  lines.push("## Run metadata");
  lines.push(`- Scenario: ${payload.scenarioId} ? ${payload.title}`);
  lines.push(`- Shift: ${payload.scenarioMeta.shift}`);
  lines.push(`- Load: ${payload.scenarioMeta.operationalLoad}`);
  lines.push(`- Git commit (engine): \`${payload.gitCommit}\``);
  lines.push(`- Engine version: ${payload.engineVersion}`);
  lines.push(`- Ran at: ${payload.ranAt}`);
  lines.push(
    `- Scenario file SHA-256: \`${payload.inputIntegrity.scenarioFileSha256}\``
  );
  lines.push(
    `- Source input SHA-256: \`${payload.inputIntegrity.sourceSha256}\``
  );
  lines.push("");
  lines.push("## Canonical actions");
  lines.push("");
  lines.push(
    `- Anchor: handover_date=${payload.temporalAnchor.handoverDate || ""}` +
      ` shift=${payload.temporalAnchor.shift || ""}` +
      ` created_at=${payload.temporalAnchor.createdAt || ""}`
  );
  lines.push(`- State counts: ${JSON.stringify(payload.actionStateCounts || {})}`);
  lines.push("");
  const acts = payload.canonicalActions || [];
  if (!acts.length) lines.push("_No canonical actions_");
  else {
    acts.forEach((a) => {
      const tempBits = [a.temporalScope, a.serviceDate, a.deadlineHint]
        .filter(Boolean)
        .join("/");
      lines.push(
        `- **${a.actionState}** \`${a.facetKey}\` ${a.priorityBand || ""} ? ${a.actionText}` +
          (a.room ? ` _(room ${a.room})_` : "") +
          (a.canonicalName ? ` _(guest ${a.canonicalName})_` : "") +
          (tempBits ? ` _(temporal: ${tempBits})_` : "")
      );
    });
  }
  lines.push("");
  lines.push("## AI Summary / Briefing");
  lines.push("");
  lines.push(payload.aiSummaryBriefing || "_Empty_");
  lines.push("");
  lines.push("## Recommendations");
  lines.push("");
  if (!payload.recommendations.length) {
    lines.push("_No recommendations generated (`[]`)._");
  } else {
    payload.recommendations.forEach((r, i) => {
      lines.push(
        `${i + 1}. ${r.text}` +
          (r.priority != null ? ` _(priority: ${r.priority})_` : "")
      );
    });
  }
  lines.push("");
  lines.push("## Human Expected Truth (side-by-side)");
  lines.push("");
  lines.push("### OPEN expected");
  (payload.humanExpectedTruth.open || []).forEach((b) => lines.push("- " + b));
  lines.push("");
  lines.push("### MONITOR expected");
  (payload.humanExpectedTruth.monitor || []).forEach((b) =>
    lines.push("- " + b)
  );
  lines.push("");
  lines.push("### INFORMATION expected");
  (payload.humanExpectedTruth.information || []).forEach((b) =>
    lines.push("- " + b)
  );
  lines.push("");
  lines.push("### UNRESOLVED expected");
  (payload.humanExpectedTruth.unresolved || []).forEach((b) =>
    lines.push("- " + b)
  );
  lines.push("");
  lines.push("### Must not invent");
  (payload.humanExpectedTruth.mustNotInfer || []).forEach((b) =>
    lines.push("- " + b)
  );
  lines.push("");
  lines.push(
    "Full dump: `scenario-" + payload.scenarioId + "-sprint14.json`"
  );
  lines.push("");
  return lines.join("\n");
}

function main() {
  const manifest = verifyFreezeManifest();
  const freezeByFile = {};
  (manifest.scenarios || []).forEach((s) => {
    freezeByFile[s.file] = s.sha256;
  });

  const head = execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();
  const { Engine, Shift } = loadEngines();
  const ranAt = new Date().toISOString();

  const summary = {
    label: "MERIDIAN GATE Sprint 14 timed-transport validation SUMMARY",
    gitCommit: head,
    engineVersion: Shift.VERSION,
    contractVersion: Shift.CONTRACT_VERSION || null,
    ranAt,
    hotel: "The Meridian Gate Hotel & Spa (fictional)",
    freezeManifestLabel: manifest.label,
    freezeVerified: true,
    scenarios: [],
  };

  console.log("HEAD", head);
  console.log("Engine VERSION", Shift.VERSION);

  for (let n = 1; n <= 20; n++) {
    const id = String(n).padStart(3, "0");
    const scenario = parseScenario(id, freezeByFile);
    const payload = runOne({ Engine, Shift, scenario, head, ranAt });

    fs.writeFileSync(
      path.join(OUT_DIR, "scenario-" + id + "-sprint14.json"),
      JSON.stringify(payload, null, 2),
      "utf8"
    );
    fs.writeFileSync(
      path.join(OUT_DIR, "scenario-" + id + "-sprint14.md"),
      toMarkdown(payload),
      "utf8"
    );

    summary.scenarios.push({
      scenarioId: id,
      title: scenario.title,
      shift: scenario.shift,
      load: scenario.operationalLoad,
      scenarioFileSha256: scenario.scenarioFileSha256,
      sourceSha256: payload.inputIntegrity.sourceSha256,
      recommendationCount: payload.recommendations.length,
      noteCount: payload.reasoningMetadata.noteCountAfterPipeline,
      dependencyEdges: payload.reasoningMetadata.dependencyEdgeCount,
      canonicalActionCount: (payload.canonicalActions || []).length,
      actionStateCounts: payload.actionStateCounts,
      openPaymentCollectCount: (payload.canonicalActions || []).filter(
        (a) =>
          a.actionState === "open" && /payment:collect\b/i.test(a.facetKey || "")
      ).length,
      briefingChars: (payload.aiSummaryBriefing || "").length,
      quietShift: payload.reasoningMetadata.quietShift,
      files: [
        "scenario-" + id + "-sprint14.json",
        "scenario-" + id + "-sprint14.md",
      ],
    });

    console.log(
      "OK " +
        id +
        " notes=" +
        payload.reasoningMetadata.noteCountAfterPipeline +
        " acts=" +
        (payload.canonicalActions || []).length +
        " open=" +
        payload.actionStateCounts.open +
        " mon=" +
        payload.actionStateCounts.monitor +
        " info=" +
        payload.actionStateCounts.information +
        " unr=" +
        payload.actionStateCounts.unresolved +
        " recs=" +
        payload.recommendations.length
    );
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "MERIDIAN_SPRINT14_SUMMARY.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );
  console.log("\nWrote 20/20 Meridian Sprint 14 validation results + MERIDIAN_SPRINT14_SUMMARY.json");
}

main();
