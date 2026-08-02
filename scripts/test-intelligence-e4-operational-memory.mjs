/**
 * Phase E4.3 — Cross-shift OperationalMemory.
 * Run: node scripts/test-intelligence-e4-operational-memory.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function load(name) {
  return fs.readFileSync(path.join(ROOT, name), "utf8");
}

const context = {
  window: {},
  global: {},
  console,
  Date,
  Math,
  Object,
  Array,
  String,
  Number,
  parseFloat,
  parseInt,
  isNaN,
  RegExp,
  JSON
};
context.global = context.window;
vm.createContext(context);
vm.runInContext(load("ai-writing-engine.js"), context);
vm.runInContext(load("shift-intelligence-engine.js"), context);
vm.runInContext(load("js/demo-sample-data.js"), context);

const SI = context.window.ShiftIntelligenceEngine;
const AiWritingEngine = context.window.AiWritingEngine;
const DemoSample = context.window.HFDemoSampleData;

let passed = 0;
let failed = 0;

function assert(cond, label) {
  if (cond) {
    passed += 1;
    console.log("  PASS  " + label);
  } else {
    failed += 1;
    console.log("  FAIL  " + label);
  }
}

const DEPTS = ["Reception", "Housekeeping", "Maintenance", "Finance", "Duty Manager"];
const WS = "ws-hotel-a";
const NOW = "2026-08-02T16:00:00.000Z";

function factPair(line, extras) {
  extras = extras || {};
  var rooms = AiWritingEngine.extractRoomNumbers(line);
  var isVip = /\bvip\b/i.test(line) || extras.isVip === true;
  var section = extras.section || "";
  if (!section) {
    if (/maintenance|ac |not working|boiler|leak|fault/i.test(line)) section = "maintenance";
    else if (/balance|payment|declined|outstanding|folio|unpaid/i.test(line)) section = "payments";
    else if (/vip/i.test(line)) section = "vip";
    else if (/wake|taxi|addison/i.test(line)) section = "tasks";
    else if (/noise|complaint/i.test(line)) section = "guest";
    else section = "general";
  }
  var fact = AiWritingEngine.extractOperationalFact(line, { rooms: rooms, section: section, isVip: isVip });
  if (extras.status) fact.status = extras.status;
  var note = {
    original: line,
    rooms: rooms,
    section: section,
    isVip: isVip,
    fact: fact,
    _neutralFactId: extras.factId || ("fact-" + (rooms[0] || "x") + "-" + section),
    _neutralSourceType: extras.sourceType || "handover",
    sourceId: extras.sourceId || "",
    importedFromMaintenance: extras.sourceType === "maintenance"
  };
  return { fact: fact, note: note, line: line };
}

function priorEntry(reportId, lines, shiftCode, occurredAt, extras) {
  extras = extras || {};
  var when = occurredAt || "2026-08-01T10:00:00.000Z";
  return {
    reportId: reportId,
    workspaceId: extras.workspaceId != null ? extras.workspaceId : WS,
    shiftCode: shiftCode || "am",
    handoverDate: when.slice(0, 10),
    occurredAt: when,
    createdAt: extras.createdAt || when,
    updatedAt: extras.updatedAt || when,
    sourceNotes: Array.isArray(lines) ? lines.join("\n") : String(lines),
    status: extras.status || "saved",
    memorySource: "handover_history"
  };
}

function analyzeCurrent(lines, history, extras) {
  extras = extras || {};
  var analyzed = lines.map(function (line, i) {
    return factPair(line, Object.assign({ factId: "cur-" + i }, extras.factExtras || {})).note;
  });
  return SI.analyze({
    shiftCode: extras.shiftCode || "PM",
    shiftDisplayName: extras.shiftCode || "PM",
    rawNotesText: lines.join("\n"),
    classified: { _analyzed: analyzed, _metrics: {} },
    departments: DEPTS,
    selectedDepartment: "Reception",
    hotelSnapshot: { arrivals: 2, departures: 2 },
    workspaceId: extras.workspaceId != null ? extras.workspaceId : WS,
    priorShiftHistory: history || [],
    currentReportId: extras.currentReportId || "",
    memoryNow: extras.memoryNow || NOW,
    currentOccurredAt: extras.currentOccurredAt || NOW,
    brainContext: null
  });
}

function memoryForRoom(result, room) {
  return (result.operationalMemories || []).find(function (m) {
    return m.entityKeys && m.entityKeys.room === String(room);
  });
}

function recForRoom(result, room) {
  return (result.recommendations || []).find(function (r) {
    return new RegExp("Room\\s*" + room + "|\\b" + room + "\\b", "i").test(r.text || "") ||
      (r.decisionTrace && r.decisionTrace.evidence && r.decisionTrace.evidence.room === String(room));
  });
}

console.log("\n=== Phase E4.3 Cross-Shift OperationalMemory ===\n");

console.log("-- Contract surface --");
assert(typeof SI.buildOperationalMemories === "function", "buildOperationalMemories exported");
assert(typeof SI.extractPriorShiftEvidence === "function", "extractPriorShiftEvidence exported");
assert(typeof SI.matchContinuityEvidence === "function", "matchContinuityEvidence exported");
assert(SI.MEMORY_LIFECYCLE.continuing === "continuing", "MEMORY_LIFECYCLE.continuing");
assert(SI.RECURRENCE_STATE.repeated_cross_shift === "repeated_cross_shift", "RECURRENCE_STATE.repeated_cross_shift");
assert(SI.REASON_CODE.same_room_same_issue === "same_room_same_issue", "continuity reason codes");
assert(
  SI.ENGINE_PIPELINE.some(function (s) { return s.id === "memory" && s.status === "wired"; }),
  "pipeline memory stage wired"
);

console.log("\n-- Scenario A: Maintenance continuing --");
(function () {
  var history = [
    priorEntry("r-am", ["Room 24 AC not working. Maintenance informed."], "am", "2026-08-01T10:00:00.000Z")
  ];
  var result = analyzeCurrent(
    ["Room 24 AC still unresolved. Waiting for engineer."],
    history
  );
  var mem = memoryForRoom(result, "24");
  assert(!!mem, "A. memory created for Room 24");
  assert(mem.lifecycleStatus === "continuing", "A. lifecycle continuing");
  assert(mem.shiftCount === 2, "A. shiftCount 2");
  assert(
    (mem.continuityReasonCodes || []).indexOf("same_room_same_issue") !== -1,
    "A. same_room_same_issue"
  );
  assert(mem.recurrenceState === "repeated_cross_shift", "A. repeated_cross_shift");
  var recs = (result.recommendations || []).filter(function (r) {
    return /Room\s*24|AC/i.test(r.text || "");
  });
  assert(recs.length === 1, "A. one current recommendation for Room 24 AC");
  assert(
    recs[0].decisionTrace && recs[0].decisionTrace.memory &&
      recs[0].decisionTrace.memory.lifecycleStatus === "continuing",
    "A. DecisionTrace includes continuity memory"
  );
  assert(/previous shift/i.test(recs[0].text), "A. recommendation reflects unresolved continuity");
})();

console.log("\n-- Scenario B: Payment continuing --");
(function () {
  var history = [
    priorEntry("r-n1", ["Room 35 £120 outstanding. Card declined."], "night", "2026-08-01T02:00:00.000Z")
  ];
  var result = analyzeCurrent(
    ["Room 35 balance still unpaid. Guest departs today."],
    history,
    { shiftCode: "AM" }
  );
  var mem = memoryForRoom(result, "35");
  assert(!!mem, "B. payment memory for Room 35");
  assert(mem.lifecycleStatus === "continuing", "B. continuing");
  assert(
    (mem.continuityReasonCodes || []).indexOf("same_payment_open") !== -1,
    "B. same_payment_open"
  );
  assert(
    mem.latestContext &&
      (mem.latestContext.timeSensitivity === "imminent" ||
        mem.latestContext.timeSensitivity === "today" ||
        (mem.latestContext.reasoning || []).indexOf("departure_today") !== -1 ||
        (mem.latestContext.reasoning || []).indexOf("departure_affected") !== -1),
    "B. current context owns time/revenue risk"
  );
  var rec = recForRoom(result, "35");
  assert(!!rec, "B. one payment recommendation");
  assert(/collect|settle|balance|payment|depart/i.test(rec.text), "B. collect-before-departure wording");
  assert(
    (result.recommendations || []).filter(function (r) {
      return /Room\s*35|£120|120/i.test(r.text || "");
    }).length === 1,
    "B. single recommendation (no historical duplicate)"
  );
})();

console.log("\n-- Scenario C: Progressed issue --");
(function () {
  var history = [
    priorEntry("r-am", ["Supplier contacted for Room 18 boiler fault."], "am", "2026-08-01T09:00:00.000Z")
  ];
  var result = analyzeCurrent(
    ["Room 18 boiler fault. Supplier confirmed attendance tomorrow."],
    history
  );
  var mem = memoryForRoom(result, "18");
  assert(!!mem, "C. memory for Room 18");
  assert(mem.lifecycleStatus === "continuing", "C. continuing (not falsely resolved)");
  assert(mem.lifecycleStatus !== "resolved", "C. not resolved");
  assert(
    (mem.continuityReasonCodes || []).indexOf("status_progressed") !== -1 ||
      (mem.continuityReasonCodes || []).indexOf("same_room_same_issue") !== -1,
    "C. progressed or same-room continuity codes"
  );
  var rec = recForRoom(result, "18");
  assert(!!rec, "C. recommendation remains for open progressed issue");
})();

console.log("\n-- Scenario D: Resolved issue --");
(function () {
  var history = [
    priorEntry("r-am", ["Room 31 noise complaint unresolved."], "am", "2026-08-01T11:00:00.000Z")
  ];
  var result = analyzeCurrent(
    ["Room 31 noise complaint. Guest confirmed quiet after room move."],
    history
  );
  var mem = memoryForRoom(result, "31");
  assert(!!mem, "D. memory retained for Room 31");
  assert(mem.lifecycleStatus === "resolved", "D. memory resolved");
  assert(
    !(result.recommendations || []).some(function (r) {
      return /Room\s*31|noise/i.test(r.text || "") &&
        (!r.decisionTrace || !r.decisionTrace.operationalContext ||
          r.decisionTrace.operationalContext.currentStatus !== "completed");
    }) ||
    !(result.recommendations || []).some(function (r) {
      return /Room\s*31|noise/i.test(r.text || "");
    }),
    "D. no open recommendation for resolved complaint"
  );
})();

console.log("\n-- Scenario E: Reopened issue --");
(function () {
  var history = [
    priorEntry("r-d1", ["Room 22 AC resolved. Guest confirmed cooling restored."], "pm", "2026-08-01T16:00:00.000Z")
  ];
  var result = analyzeCurrent(
    ["Room 22 AC fault returned. Not cooling again. Guest in-house."],
    history,
    { shiftCode: "AM" }
  );
  var mem = memoryForRoom(result, "22");
  assert(!!mem, "E. memory for Room 22");
  assert(mem.lifecycleStatus === "reopened", "E. reopened");
  assert(
    (mem.continuityReasonCodes || []).indexOf("reopened_after_resolution") !== -1,
    "E. reopened_after_resolution"
  );
  var rec = recForRoom(result, "22");
  assert(!!rec, "E. current recommendation allowed");
  assert(/reopened/i.test(rec.text), "E. recommendation notes reopen");
})();

console.log("\n-- Scenario F: False-match prevention --");
(function () {
  var history = [
    priorEntry("r-am", ["Room 24 AC not working. Maintenance informed."], "am", "2026-08-01T10:00:00.000Z")
  ];
  var result = analyzeCurrent(
    ["Room 22 AC not working. Maintenance informed."],
    history
  );
  var mem22 = memoryForRoom(result, "22");
  var mem24 = memoryForRoom(result, "24");
  assert(!!mem22, "F. Room 22 has its own memory");
  assert(mem22.lifecycleStatus === "new" || mem22.shiftCount === 1, "F. Room 22 is new / first_seen");
  assert(
    !mem22.sourceReportIds || mem22.sourceReportIds.indexOf("r-am") === -1,
    "F. Room 22 not linked to Room 24 prior report"
  );
  assert(!mem24 || mem24.lifecycleStatus === "new" || !memoryForRoom(result, "24"),
    "F. no cross-room continuity claimed on current Room 22 pass");
  assert(
    !(result.recommendations || []).some(function (r) {
      return r.decisionTrace && r.decisionTrace.memory &&
        r.decisionTrace.memory.lifecycleStatus === "continuing" &&
        /Room\s*22/i.test(r.text || "");
    }),
    "F. Room 22 recommendation is not continuing from Room 24"
  );
})();

console.log("\n-- Scenario G: Weak generic notes --");
(function () {
  var history = [
    priorEntry("r-am", ["Waiting for supplier."], "am", "2026-08-01T10:00:00.000Z")
  ];
  var result = analyzeCurrent(["Supplier delayed."], history);
  var confident = (result.operationalMemories || []).filter(function (m) {
    return m.lifecycleStatus === "continuing" || m.lifecycleStatus === "escalated";
  });
  assert(confident.length === 0, "G. no confident continuity without entity evidence");
  var uncertainOrNew = (result.operationalMemories || []).every(function (m) {
    return m.lifecycleStatus === "uncertain" || m.lifecycleStatus === "new" || m.shiftCount === 1;
  });
  assert(uncertainOrNew, "G. uncertain or separate memories only");
})();

console.log("\n-- Scenario H: Timed service continuity --");
(function () {
  var history = [
    priorEntry(
      "r-night",
      ["Room 36 wake-up 06:00 and taxi 06:40 pending."],
      "night",
      "2026-08-01T23:00:00.000Z"
    )
  ];
  var result = analyzeCurrent(
    ["Room 36 wake-up 06:00 and taxi 06:40 completed."],
    history,
    { shiftCode: "AM" }
  );
  var mem = memoryForRoom(result, "36");
  assert(!!mem, "H. memory/object for Room 36");
  assert(mem.lifecycleStatus === "resolved", "H. resolved after completion");
  assert(
    !(result.recommendations || []).some(function (r) {
      return /Room\s*36|wake|taxi/i.test(r.text || "");
    }),
    "H. no duplicated open recommendation after completion"
  );
})();

console.log("\n-- Proof requirements --");
(function () {
  /* 1–3 covered above; reinforce */
  var strong = analyzeCurrent(
    ["Room 24 AC still unresolved."],
    [priorEntry("p1", ["Room 24 AC not working."], "am"), priorEntry("p2", ["Room 24 AC waiting for parts."], "pm")]
  );
  var m = memoryForRoom(strong, "24");
  assert(m && m.shiftCount >= 3, "1. strongly matched facts become one cross-shift memory (shiftCount≥3)");
  assert(m.lifecycleStatus === "escalated" || m.lifecycleStatus === "continuing",
    "5. multi-shift unresolved may escalate when impact supports");

  var crossWs = analyzeCurrent(
    ["Room 24 AC still unresolved."],
    [{
      reportId: "other-hotel",
      workspaceId: "ws-hotel-b",
      shiftCode: "am",
      occurredAt: "2026-08-01T10:00:00.000Z",
      sourceNotes: "Room 24 AC not working. Maintenance informed."
    }],
    { workspaceId: WS }
  );
  var mIso = memoryForRoom(crossWs, "24");
  assert(
    !mIso || mIso.shiftCount === 1 || (mIso.sourceReportIds || []).indexOf("other-hotel") === -1,
    "11. no cross-workspace history can be read"
  );

  /* Demo isolation */
  assert(typeof DemoSample.buildPriorShiftHistory === "function", "10. Demo sample history builder exists");
  var demoHist = DemoSample.buildPriorShiftHistory();
  assert(Array.isArray(demoHist) && demoHist.length >= 2, "10b. Demo prior history has sample shifts");
  assert(demoHist.every(function (h) { return h.isDemoData && h.memorySource === "demo"; }),
    "10c. Demo history marked isolated");
  assert(demoHist.every(function (h) { return h.workspaceId === "demo-workspace"; }),
    "10d. Demo history uses demo workspace id only");
})();

console.log("\n-- Current context owns impact --");
(function () {
  var history = [
    priorEntry("r-n", ["Room 35 £50 outstanding."], "night", "2026-08-01T02:00:00.000Z")
  ];
  var result = analyzeCurrent(
    ["Room 35 £50 still unpaid. Guest departs today. Card declined."],
    history,
    { shiftCode: "AM" }
  );
  var mem = memoryForRoom(result, "35");
  assert(!!mem && mem.latestContext, "4. latestContext present");
  assert(
    mem.latestContext.revenueImpact === "high" ||
      mem.latestContext.revenueImpact === "critical" ||
      (mem.latestContext.reasoning || []).indexOf("declined_payment") !== -1,
    "4b. current context owns revenue/risk signals"
  );
})();

console.log("\n-- Validation: ordering, window, duplicates, match safety --");
(function () {
  assert(SI.MEMORY_HISTORY_MAX_REPORTS === 6, "history max reports = 6");
  assert(SI.MEMORY_HISTORY_MAX_LOOKBACK_MS === 3 * 24 * 60 * 60 * 1000, "lookback 72h");

  /* Ordering: late-edited Night must not sort before AM on same day */
  var ordered = SI.preparePriorShiftHistory([
    priorEntry("night-late", ["Room 10 AC still open."], "night", "2026-08-01T23:00:00.000Z", {
      createdAt: "2026-08-02T08:00:00.000Z",
      updatedAt: "2026-08-02T09:00:00.000Z"
    }),
    priorEntry("am-early", ["Room 10 AC not working."], "am", "2026-08-01T10:00:00.000Z", {
      createdAt: "2026-08-01T11:00:00.000Z"
    }),
    priorEntry("pm-mid", ["Room 10 AC waiting for engineer."], "pm", "2026-08-01T18:00:00.000Z", {
      createdAt: "2026-08-01T19:00:00.000Z"
    })
  ], { workspaceId: WS, now: NOW });
  assert(ordered.length === 3, "ordering keeps same-day AM/PM/Night within window");
  assert(ordered[0].reportId === "am-early", "ordering first = AM");
  assert(ordered[1].reportId === "pm-mid", "ordering second = PM");
  assert(ordered[2].reportId === "night-late", "ordering third = Night despite later created_at");

  /* firstSeenAt / shiftCount use operational shifts */
  var cont = analyzeCurrent(
    ["Room 10 AC still unresolved."],
    [
      priorEntry("am-early", ["Room 10 AC not working."], "am", "2026-08-01T10:00:00.000Z"),
      priorEntry("pm-mid", ["Room 10 AC waiting for engineer."], "pm", "2026-08-01T18:00:00.000Z"),
      priorEntry("night-late", ["Room 10 AC still open."], "night", "2026-08-01T23:00:00.000Z")
    ]
  );
  var m10 = memoryForRoom(cont, "10");
  assert(m10 && m10.shiftCount === 4, "shiftCount = 3 prior shifts + current");
  assert(m10.firstSeenAt.indexOf("2026-08-01T10") === 0, "firstSeenAt = earliest operational prior");
  assert(m10.lastSeenAt === NOW, "lastSeenAt = current occurredAt");

  /* Duplicate report ids / copied notes collapse */
  var deduped = SI.preparePriorShiftHistory([
    priorEntry("dup", ["Room 9 AC not working."], "am", "2026-08-01T10:00:00.000Z"),
    priorEntry("dup", ["Room 9 AC not working."], "am", "2026-08-01T10:00:00.000Z"),
    priorEntry("dup-copy", ["Room 9 AC not working."], "am", "2026-08-01T10:00:00.000Z")
  ], { workspaceId: WS, now: NOW });
  assert(deduped.length === 1, "duplicate report id / copied same-shift notes collapse");

  /* Draft / empty / wrong workspace / current report excluded */
  var sanitized = SI.preparePriorShiftHistory([
    priorEntry("draft1", ["Room 8 AC not working."], "am", "2026-08-01T10:00:00.000Z", { status: "draft" }),
    priorEntry("empty1", [""], "am", "2026-08-01T10:00:00.000Z"),
    priorEntry("foreign", ["Room 8 AC not working."], "am", "2026-08-01T10:00:00.000Z", { workspaceId: "ws-other" }),
    priorEntry("current-edit", ["Room 8 AC not working."], "pm", "2026-08-01T18:00:00.000Z"),
    priorEntry("ok", ["Room 8 AC not working."], "am", "2026-08-01T10:00:00.000Z")
  ], { workspaceId: WS, now: NOW, currentReportId: "current-edit" });
  assert(sanitized.length === 1 && sanitized[0].reportId === "ok",
    "draft/empty/foreign/current-report excluded");

  /* Months-old resolved AC must not continue as one uninterrupted issue */
  var old = analyzeCurrent(
    ["Room 24 AC not working. Maintenance informed."],
    [priorEntry("old-ac", ["Room 24 AC resolved. Cooling restored."], "pm", "2026-05-01T18:00:00.000Z")]
  );
  var mOld = memoryForRoom(old, "24");
  assert(mOld && mOld.lifecycleStatus === "new" && mOld.shiftCount === 1,
    "months-old resolved AC is new, not continuing/reopened");

  /* Payment amount change — still same room payment continuity; current amount owns context */
  var pay = analyzeCurrent(
    ["Room 35 £200 still unpaid. Guest departs today."],
    [priorEntry("pay1", ["Room 35 £120 outstanding. Card declined."], "night", "2026-08-01T02:00:00.000Z")],
    { shiftCode: "AM" }
  );
  var mPay = memoryForRoom(pay, "35");
  assert(mPay && mPay.lifecycleStatus === "continuing", "payment continuity when amount changes");
  assert(mPay.entityKeys.amount === 200 || mPay.latestContext,
    "current amount/context retained on memory");

  /* Guest name collision without room → no confident match */
  var guestOnly = SI.matchContinuityEvidence(
    { room: "", guest: "Smith", family: "vip", amount: null, faultType: "", maintenanceIssueId: "" },
    { room: "", guest: "Smith", family: "vip", amount: null, faultType: "", maintenanceIssueId: "" },
    "VIP Smith still pending welcome card",
    false
  );
  assert(!guestOnly || !guestOnly.matched,
    "guest-name-only collision cannot create confident continuity");

  /* Same room different issue */
  var diffIssue = analyzeCurrent(
    ["Room 24 shower leaking. Maintenance informed."],
    [priorEntry("ac", ["Room 24 AC not working. Maintenance informed."], "am", "2026-08-01T10:00:00.000Z")]
  );
  var mShower = memoryForRoom(diffIssue, "24");
  assert(
    !mShower || mShower.lifecycleStatus === "new" ||
      (mShower.continuityReasonCodes || []).indexOf("same_room_same_issue") === -1 ||
      (mShower.entityKeys.faultType && /shower|leak/i.test(mShower.entityKeys.faultType)),
    "same room different issue stays separate when faults differ"
  );

  /* Trace coverage on memory-influenced rec */
  var traced = analyzeCurrent(
    ["Room 24 AC still unresolved."],
    [priorEntry("a1", ["Room 24 AC not working."], "am", "2026-08-01T10:00:00.000Z")]
  );
  var rec = recForRoom(traced, "24");
  assert(!!rec && !!rec.decisionTrace, "memory-influenced recommendation has DecisionTrace");
  assert(rec.sourceFactIds && rec.sourceFactIds.length > 0, "sourceFactIds point to current evidence");
  assert(
    rec.decisionTrace.memory &&
      Array.isArray(rec.decisionTrace.memory.sourceReportIds) &&
      rec.decisionTrace.memory.sourceReportIds.indexOf("a1") !== -1,
    "historical report ids retained separately on memory"
  );
  assert(
    !(traced.recommendations || []).some(function (r) {
      return !r.decisionTrace || !r.decisionTrace.sourceFactIds || !r.decisionTrace.sourceFactIds.length;
    }),
    "no history-only recommendation without current sourceFactIds"
  );

  /* History-only input cannot invent recommendations */
  var emptyCurrent = analyzeCurrent([], [
    priorEntry("hist", ["Room 24 AC not working."], "am", "2026-08-01T10:00:00.000Z")
  ]);
  assert((emptyCurrent.recommendations || []).length === 0, "history-only creates no recommendations");

  /* Performance bounds */
  var many = [];
  for (var i = 0; i < 20; i++) {
    many.push(priorEntry(
      "r" + i,
      ["Room " + (40 + i) + " AC not working. Maintenance informed."],
      i % 3 === 0 ? "am" : (i % 3 === 1 ? "pm" : "night"),
      "2026-08-0" + (i < 10 ? "1" : "1") + "T" + String(10 + (i % 8)).padStart(2, "0") + ":00:00.000Z"
    ));
  }
  var preparedMany = SI.preparePriorShiftHistory(many, { workspaceId: WS, now: NOW });
  assert(preparedMany.length <= SI.MEMORY_HISTORY_MAX_REPORTS, "report load bounded");
  var evidence = SI.extractPriorShiftEvidence(many, WS, { now: NOW });
  assert(evidence.length <= SI.MEMORY_HISTORY_MAX_EVIDENCE_TOTAL, "evidence extraction bounded");
})();

console.log("\n-- Validation: Demo isolation --");
(function () {
  var hist = DemoSample.buildPriorShiftHistory();
  assert(hist.every(function (h) { return h.workspaceId === "demo-workspace" && h.isDemoData; }),
    "Demo history workspace is demo-only");
  assert(hist.every(function (h) { return h.memorySource === "demo"; }),
    "Demo history memorySource=demo");
  /* Deterministic sample */
  var hist2 = DemoSample.buildPriorShiftHistory();
  assert(JSON.stringify(hist) === JSON.stringify(hist2), "Demo sample memory is deterministic");
})();

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
