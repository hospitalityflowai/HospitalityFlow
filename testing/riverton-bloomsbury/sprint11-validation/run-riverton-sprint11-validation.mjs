/**
 * Riverton Bloomsbury — Sprint 11 blocked-allocation validation (TEST ONLY).
 *
 * Re-runs approved scenario-001..020.md Original Input unchanged through the
 * current engines (post Sprint 11 blocked allocation / contradiction) into this folder.
 *
 * Does NOT overwrite sprint8-baseline-validation / sprint9-validation /
 * sprint10-validation artefacts or scenario files / Human Expected Truth.
 *
 * Run: node testing/riverton-bloomsbury/sprint11-validation/run-riverton-sprint11-validation.mjs
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

function parseExpectedTruth(md) {
  const truthBlock = extractSection(
    md,
    "## Human Expected Truth",
    /^## Actual HF Output/m
  );
  const facts = extractSection(
    truthBlock,
    "### Current operational facts",
    /^### Expected work states/m
  );
  const work = extractSection(
    truthBlock,
    "### Expected work states",
    /^### Must not infer/m
  );
  const mustNot = extractSection(
    truthBlock,
    "### Must not infer / invent",
    /^## /m
  );

  function bullets(sectionText) {
    return String(sectionText || "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("- "))
      .map((l) => l.replace(/^- /, "").trim());
  }

  function workBullets(label) {
    const re = new RegExp(
      "#### " + label + "\\r?\\n([\\s\\S]*?)(?=\\r?\\n#### |$)"
    );
    const m = work.match(re);
    return bullets(m ? m[1] : "");
  }

  return {
    currentOperationalFacts: bullets(facts),
    open: workBullets("OPEN"),
    monitor: workBullets("MONITOR"),
    information: workBullets("INFORMATION"),
    unresolved: workBullets("UNRESOLVED"),
    mustNotInfer: bullets(mustNot),
    rawTruthMarkdown: truthBlock,
  };
}

function parseScenario(id) {
  const file = path.join(SCENARIO_DIR, "scenario-" + id + ".md");
  const md = fs.readFileSync(file, "utf8");
  const inputBlock = extractSection(
    md,
    "## Original Input / Raw Source Notes",
    /^## Human Expected Truth/m
  );

  let sourceNotes = inputBlock;
  let hotelSnapshot = {};
  const snapIdx = inputBlock.search(/^### Hotel Snapshot\s*$/m);
  if (snapIdx >= 0) {
    sourceNotes = inputBlock.slice(0, snapIdx).trim();
    const snapBody = inputBlock.slice(snapIdx).replace(/^### Hotel Snapshot\s*/, "");
    hotelSnapshot = parseHotelSnapshot(snapBody);
  }

  const shiftRaw = metaValue(md, "Shift") || "AM";
  const shift = /night/i.test(shiftRaw)
    ? "Night"
    : /pm/i.test(shiftRaw)
      ? "PM"
      : "AM";

  // Stable fictional operational-day anchors (not tuned to pass).
  const handoverDate = "2026-08-08";
  const createdAtByShift = {
    AM: "2026-08-08T07:15:00.000Z",
    PM: "2026-08-08T15:45:00.000Z",
    Night: "2026-08-09T00:20:00.000Z",
  };

  return {
    id,
    file: "scenario-" + id + ".md",
    title: metaValue(md, "Title") || ("Scenario " + id),
    shift,
    operationalLoad: metaValue(md, "Operational load"),
    difficulty: metaValue(md, "Difficulty"),
    capability: metaValue(md, "Spec capability"),
    ambiguity: metaValue(md, "Ambiguity intentional"),
    departments: metaValue(md, "Departments"),
    handoverDate,
    createdAt: createdAtByShift[shift] || createdAtByShift.AM,
    sourceNotes: sourceNotes.replace(/\r\n/g, "\n"),
    hotelSnapshot,
    humanExpectedTruth: parseExpectedTruth(md),
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
        _neutralFactId: "riverton-baseline-" + index,
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
    ],
    selectedDepartment: "Reception",
    hotelSnapshot: scenario.hotelSnapshot,
    brainContext: null,
  });

  const recommendations = result.recommendations || [];
  const dependencyEdges = analyzed._operationalDependencies || [];
  const briefingText = Array.isArray(briefing.paragraphs)
    ? briefing.paragraphs.join("\n\n")
    : String(briefing.text || briefing.summary || "");

  const stateCounts = countByState(canonicalActions);

  return {
    label: "RIVERTON SPRINT 11 VALIDATION OUTPUT",
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
      "buildCanonicalOperationalActions (Sprint 5/6/8/10)",
      "buildOrganisedSectionModel",
      "buildTodaysBriefing (Sprint 8 decision seating)",
      "ShiftIntelligenceEngine.analyze (Sprint 8 recommendation seating)",
    ],
    scenarioMeta: {
      shift: scenario.shift,
      operationalLoad: scenario.operationalLoad,
      difficulty: scenario.difficulty,
      capability: scenario.capability,
      ambiguity: scenario.ambiguity,
      departments: scenario.departments,
      sourceFile: scenario.file,
    },
    humanExpectedTruth: scenario.humanExpectedTruth,
    canonicalActions: (canonicalActions || []).map((a) => ({
      actionId: a.actionId,
      actionState: a.actionState,
      actionType: a.actionType,
      facetKey: a.facetKey,
      room: a.room,
      entityId: a.entityId,
      canonicalName: a.canonicalName,
      actionText: a.actionText,
      priorityBand: a.priorityBand,
      priorityScore: a.priorityScore,
      temporalScope: a.temporalScope || "",
      serviceDate: a.serviceDate || "",
      deadlineHint: a.deadlineHint || "",
      relativeCue: a.relativeCue || "",
      temporalConfidence: a.temporalConfidence || "",
      temporalReasons: a.temporalReasons || [],
      evidenceText: (a.evidenceText || "").slice(0, 240),
    })),
    actionStateCounts: stateCounts,
    temporalAnchor: temporalOpts,
    inputIntegrity: {
      inputAuthority: "scenario-XXX.md Original Input / Raw Source Notes",
      sourceSha256: sourceHash,
      sourceLength: sourceInput.length,
      lineCount: lines.filter((l) => String(l).trim()).length,
      brainContext: null,
      hotelSnapshotKeys: Object.keys(scenario.hotelSnapshot || {}),
      humanExpectedTruthPreserved: true,
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
      },
    },
    noteEvidence: analyzed.map(summarizeNote),
    reviewPlaceholder: {
      status: "PENDING_HUMAN_REVIEW",
      note: "Blocked allocation / room-status contradiction is the Sprint 11 focus. Compare to frozen sprint10-validation/; do not overwrite S8-S10 or Human Expected Truth.",
    },
  };
}

function toMarkdown(payload) {
  const lines = [];
  lines.push(
    `# Scenario-${payload.scenarioId} â RIVERTON SPRINT 11 VALIDATION OUTPUT`
  );
  lines.push("");
  lines.push("**Label:** RIVERTON SPRINT 11 VALIDATION OUTPUT");
  lines.push("");
  lines.push(
    "Human Expected Truth authority remains in `../scenario-" +
      payload.scenarioId +
      ".md`. This file is engine output only."
  );
  lines.push("");
  lines.push("## Run metadata");
  lines.push(`- Scenario: ${payload.scenarioId} â ${payload.title}`);
  lines.push(`- Shift: ${payload.scenarioMeta.shift}`);
  lines.push(`- Load: ${payload.scenarioMeta.operationalLoad}`);
  lines.push(`- Difficulty: ${payload.scenarioMeta.difficulty}`);
  lines.push(`- Capability: ${payload.scenarioMeta.capability}`);
  lines.push(`- Git commit: \`${payload.gitCommit}\``);
  lines.push(`- Engine version: ${payload.engineVersion}`);
  lines.push(`- Ran at: ${payload.ranAt}`);
  lines.push(`- brainContext: \`null\``);
  lines.push(
    `- Source SHA-256: \`${payload.inputIntegrity.sourceSha256}\``
  );
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
  lines.push("## Canonical actions (Sprint 8 + temporal)");
  lines.push("");
  if (payload.temporalAnchor) {
    lines.push(
      `- Anchor: handover_date=${payload.temporalAnchor.handoverDate || ""}` +
        ` shift=${payload.temporalAnchor.shift || ""}` +
        ` created_at=${payload.temporalAnchor.createdAt || ""}`
    );
    lines.push(
      `- State counts: ${JSON.stringify(payload.actionStateCounts || {})}`
    );
    lines.push("");
  }
  const acts = payload.canonicalActions || [];
  if (!acts.length) lines.push("_No canonical actions_");
  else {
    acts.forEach((a) => {
      const tempBits = [a.temporalScope, a.serviceDate, a.deadlineHint]
        .filter(Boolean)
        .join("/");
      lines.push(
        `- **${a.actionState}** \`${a.facetKey}\` ${a.priorityBand || ""} â ${a.actionText}` +
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
        `${i + 1}. ${r.text}${
          meta.length ? " _(" + meta.join(", ") + ")_" : ""
        }`
      );
    });
  }
  lines.push("");
  lines.push("## Human Expected Truth (copied for side-by-side review)");
  lines.push("");
  lines.push("### OPEN expected");
  (payload.humanExpectedTruth.open || []).forEach((b) =>
    lines.push("- " + b)
  );
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
  lines.push("### Must not infer");
  (payload.humanExpectedTruth.mustNotInfer || []).forEach((b) =>
    lines.push("- " + b)
  );
  lines.push("");
  lines.push("## Reasoning metadata (summary)");
  lines.push("");
  lines.push(
    `- Notes after pipeline: ${payload.reasoningMetadata.noteCountAfterPipeline}`
  );
  lines.push(
    `- Dependency edges: ${payload.reasoningMetadata.dependencyEdgeCount}`
  );
  lines.push(`- Canonical actions: ${(payload.canonicalActions || []).length}`);
  lines.push(
    `- Quiet shift flag: ${JSON.stringify(
      payload.reasoningMetadata.quietShift
    )}`
  );
  lines.push("");
  lines.push(
    "Full machine-readable dump: `scenario-" +
      payload.scenarioId +
      "-sprint11.json`"
  );
  lines.push("");
  return lines.join("\n");
}

function main() {
  const head = execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();
  const { Engine, Shift } = loadEngines();
  const ranAt = new Date().toISOString();

  const summary = {
    label: "RIVERTON SPRINT 11 VALIDATION OUTPUT",
    gitCommit: head,
    engineVersion: Shift.VERSION,
    contractVersion: Shift.CONTRACT_VERSION || null,
    ranAt,
    hotel: "The Riverton Bloomsbury (fictional)",
    scenarios: [],
  };

  console.log("HEAD", head);
  console.log("Engine VERSION", Shift.VERSION);

  for (let n = 1; n <= 20; n++) {
    const id = String(n).padStart(3, "0");
    const scenario = parseScenario(id);
    const payload = runOne({ Engine, Shift, scenario, head, ranAt });

    const jsonPath = path.join(OUT_DIR, "scenario-" + id + "-sprint11.json");
    const mdOutPath = path.join(OUT_DIR, "scenario-" + id + "-sprint11.md");
    fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");
    fs.writeFileSync(mdOutPath, toMarkdown(payload), "utf8");

    summary.scenarios.push({
      scenarioId: id,
      title: scenario.title,
      shift: scenario.shift,
      load: scenario.operationalLoad,
      difficulty: scenario.difficulty,
      capability: scenario.capability,
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
        "scenario-" + id + "-sprint11.json",
        "scenario-" + id + "-sprint11.md",
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
    path.join(OUT_DIR, "RIVERTON_SPRINT11_SUMMARY.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );
  console.log(
    "\nWrote 20/20 RIVERTON SPRINT 11 validation results + RIVERTON_SPRINT11_SUMMARY.json"
  );
}

main();
