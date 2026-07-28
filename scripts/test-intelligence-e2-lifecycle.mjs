/**
 * Phase E2 — Canonical lifecycle, metrics helpers, shared quiet/room normalisation.
 * Run: node scripts/test-intelligence-e2-lifecycle.mjs
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
vm.runInContext(load("hotel-profile-operational.js"), context);
vm.runInContext(load("shift-intelligence-engine.js"), context);

const SI = context.window.ShiftIntelligenceEngine;
const AiWritingEngine = context.window.AiWritingEngine;

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

console.log("\n=== Phase E2 Lifecycle & Normalisation ===\n");

console.log("-- Canonical closed values --");
[
  "resolved", "completed", "complete", "done", "closed", "confirmed", "cancelled", "canceled"
].forEach(function (status) {
  assert(SI.isOperationalFactClosed({ status: status }) === true, "closed: " + status);
});

console.log("\n-- Open / in-progress values --");
["open", "pending", "requested", "in_progress", "waiting_parts", "waiting_contractor", "follow_up"].forEach(function (status) {
  assert(SI.isOperationalFactOpen({ status: status }) === true, "open: " + status);
  assert(SI.isOperationalFactClosed({ status: status }) === false, "not closed: " + status);
});

console.log("\n-- Maintenance completed --");
assert(SI.getCanonicalStatus({ status: "completed" }) === "resolved", "completed → resolved");
assert(SI.isOperationalFactClosed({ status: "completed", completedAt: "2026-07-28" }) === true, "completedAt issue closed");
assert(SI.filterMaintenanceIssuesForHandover([
  { id: "1", includeInHandover: true, status: "completed" },
  { id: "2", includeInHandover: true, status: "open" }
]).map(function (i) { return i.id; }).join(",") === "2", "M4 filter still excludes completed");

console.log("\n-- Handover done / confirmed --");
assert(SI.isOperationalFactClosed({ status: "done" }) === true, "done closed");
assert(SI.isOperationalFactClosed({ status: "confirmed" }) === true, "confirmed closed");
assert(AiWritingEngine.isFactClosed({ status: "done" }) === true, "Writing isFactClosed delegates done");
assert(AiWritingEngine.isFactClosed({ status: "confirmed" }) === true, "Writing isFactClosed delegates confirmed");
assert(AiWritingEngine.isFactUnresolved({ status: "open" }) === true, "Writing unresolved open");
assert(AiWritingEngine.isFactUnresolved({ status: "done" }) === false, "Writing unresolved done=false");

console.log("\n-- Unknown / missing --");
assert(SI.getCanonicalStatus({}) === "unknown", "missing status → unknown");
assert(SI.getCanonicalStatus(null) === "unknown", "null → unknown");
assert(SI.isOperationalFactClosed({}) === false, "unknown not closed");
assert(SI.isOperationalFactOpen({}) === true, "unknown is actionable/open");
assert(SI.isOperationalFactClosed(null) === false, "null not closed");
assert(SI.isOperationalFactOpen(null) === true, "null treated open (Writing parity)");

console.log("\n-- Mixed canonical + legacy --");
const mixed = [
  { status: "open" },
  { status: "done" },
  { status: "completed" },
  { status: "in_progress" },
  { canonicalStatus: "resolved" },
  { isResolved: true },
  { status: "requested" }
];
assert(SI.filterOpenFacts(mixed).length === 3, "open filter count (open, in_progress, requested)");
assert(SI.filterResolvedFacts(mixed).length === 4, "resolved filter count");
const counts = SI.countFactsByLifecycle(mixed);
assert(counts.actionable === 3 && counts.total === 7, "lifecycle counts");
assert(SI.hasActionableOpenFacts(mixed) === true, "has actionable");
assert(SI.hasActionableOpenFacts([{ status: "done" }, { status: "completed" }]) === false, "no actionable when all closed");

console.log("\n-- Room reference normalisation --");
assert(SI.normalizeRoomNumber("Room 24") === "24", "Room 24");
assert(SI.roomEntityReference("room24").id === "24", "entity room24");
assert(
  AiWritingEngine.extractRoomNumbers("Please check room 12A and Room 15").join(",") === "12A,15",
  "Writing extract uses shared normaliser when engine present"
);

console.log("\n-- Quiet-shift phrase behaviour unchanged --");
assert(SI.isQuietShiftPhraseLines([]) === true, "empty lines quiet");
assert(SI.isQuietShiftPhraseLines(["Quiet shift", "Nothing to report"]) === true, "quiet phrases");
assert(SI.isQuietShiftPhraseLines(["Room 12 balance outstanding"]) === false, "action note not quiet");
const quietEval = SI.evaluateQuietShiftState(
  ["Quiet shift"],
  [{ status: "done" }]
);
assert(quietEval.phraseQuiet === true, "phrase quiet");
assert(quietEval.suppressRecommendations === true, "suppress still phrase-based");
assert(quietEval.hasActionableOpenFacts === false, "factual actionable false");

const resultQuiet = SI.analyze({
  rawNotesText: "Quiet shift\nNothing to report",
  classified: { _analyzed: [] },
  departments: ["Reception"],
  brainContext: { general: {}, hotelKnowledge: {} }
});
assert((resultQuiet.recommendations || []).length === 0, "quiet shift still suppresses recommendations");
assert(resultQuiet.signals.isQuietShift === true, "signals.isQuietShift unchanged");

console.log("\n-- Recommendations still skip closed facts --");
const openMaint = SI.maintenanceIssueToNeutralFact({
  id: "m1",
  title: "Shower pressure low",
  roomNumber: "305",
  status: "open",
  priority: "high",
  includeInHandover: true,
  assignedDepartment: "Maintenance",
  category: "plumbing"
});
const closedMaint = SI.maintenanceIssueToNeutralFact({
  id: "m2",
  title: "Fixed tap",
  roomNumber: "10",
  status: "completed",
  priority: "low",
  includeInHandover: true,
  completedAt: "2026-07-28T10:00:00.000Z"
});
const recResult = SI.analyzeFacts({
  facts: [openMaint, closedMaint],
  shiftCode: "PM",
  shiftDisplayName: "PM",
  departments: ["Reception", "Maintenance"],
  brainContext: { general: { hotelName: "Test" }, hotelKnowledge: {} }
});
assert(
  (recResult.recommendations || []).some(function (r) { return /305/i.test(r.text); }),
  "open maintenance still recommended"
);
assert(
  !(recResult.recommendations || []).some(function (r) { return /Room 10|room 10/i.test(r.text); }),
  "completed maintenance not recommended"
);

console.log("\n-- Legacy Handover analyze parity smoke --");
function makeNote(text, section, rooms) {
  return {
    original: text,
    section: section,
    rooms: rooms || [],
    isVip: /vip/i.test(text),
    maintenancePriority: section === "maintenance" ? "High" : null,
    fact: AiWritingEngine.extractOperationalFact(text, {
      rooms: rooms || [],
      section: section,
      isVip: /vip/i.test(text)
    })
  };
}
const notes =
  "Room 22 VIP arrival tomorrow\n" +
  "Room 14 open balance on folio\n" +
  "Room 305 shower pressure low - maintenance not yet informed";
const classified = {
  _analyzed: notes.split("\n").map(function (line) {
    const rooms = [];
    const m = line.match(/room\s+(\d+)/i);
    if (m) rooms.push(m[1]);
    let section = "general";
    if (/balance/i.test(line)) section = "payments";
    if (/shower|maintenance/i.test(line)) section = "maintenance";
    if (/vip/i.test(line)) section = "guest";
    return makeNote(line, section, rooms);
  })
};
const legacy = SI.analyze({
  shiftCode: "PM",
  shiftDisplayName: "PM",
  rawNotesText: notes,
  classified: classified,
  departments: ["Reception", "Housekeeping", "Maintenance"],
  brainContext: { general: { hotelName: "Test" }, hotelKnowledge: {} }
});
const texts = (legacy.recommendations || []).map(function (r) { return r.text; }).join(" | ");
assert(/22/i.test(texts) && /14/i.test(texts) && /305/i.test(texts), "legacy recommendation set unchanged");

console.log("\n-- Guardrails --");
const handover = load("handover.html");
assert(/isOperationalFactClosed/.test(handover), "handover uses shared closure helper");
assert(/isQuietShiftPhraseLines/.test(handover), "handover quiet-shift delegates to engine");
assert(/preferred shared path is HotelProfileOperational\.buildHotelBrainContext/.test(handover), "Brain fallback documented");
assert(/Prose closure heuristics remain Handover-local/.test(handover), "prose closure retained + documented");

console.log("\n=== Results: " + passed + " passed, " + failed + " failed ===\n");
if (failed) process.exit(1);
