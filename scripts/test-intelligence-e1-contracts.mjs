/**
 * Phase E1 — Hospitality Intelligence Engine contracts & compatibility.
 * Run: node scripts/test-intelligence-e1-contracts.mjs
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
const HIE = context.window.HospitalityIntelligenceEngine;
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

console.log("\n=== Phase E1 Intelligence Contracts ===\n");

console.log("-- Engine alias & pipeline docs --");
assert(SI && HIE && SI === HIE, "HospitalityIntelligenceEngine aliases ShiftIntelligenceEngine");
assert(SI.CONTRACT_VERSION === "E1", "CONTRACT_VERSION is E1");
assert(SI.CANONICAL_STATUS.resolved === "resolved", "canonical status resolved");
assert(SI.CANONICAL_PRIORITY.critical === "critical", "canonical priority critical");
assert(SI.SOURCE_TYPE.maintenance === "maintenance", "source type maintenance");
assert(SI.SOURCE_TYPE.hotel_brain === "hotel_brain", "source type hotel_brain");
assert(SI.SOURCE_TYPE.guest === "guest", "source type guest reserved");
const pipeline = SI.describeEnginePipeline();
assert(Array.isArray(pipeline) && pipeline.length >= 7, "pipeline stages documented");
assert(pipeline.some(function (s) { return s.id === "recommend" && s.status === "wired"; }), "recommend stage wired");
assert(pipeline.some(function (s) { return s.id === "classify" && s.status === "partial"; }), "classify still partial");

console.log("\n-- Canonical status mapping --");
assert(SI.toCanonicalStatus("open") === "open", "open → open");
assert(SI.toCanonicalStatus("in_progress") === "in_progress", "in_progress → in_progress");
assert(SI.toCanonicalStatus("waiting_parts") === "in_progress", "waiting_parts → in_progress");
assert(SI.toCanonicalStatus("completed") === "resolved", "Maintenance completed → resolved");
assert(SI.toCanonicalStatus("done") === "resolved", "Handover done → resolved");
assert(SI.toCanonicalStatus("confirmed") === "resolved", "Handover confirmed → resolved");
assert(SI.toCanonicalStatus("complete") === "resolved", "complete → resolved");
assert(SI.toCanonicalStatus("cancelled") === "cancelled", "cancelled → cancelled");
assert(SI.toCanonicalStatus("canceled") === "cancelled", "canceled → cancelled");
assert(SI.toCanonicalStatus("requested") === "open", "requested → open");
assert(SI.toCanonicalStatus("") === "unknown", "empty → unknown");

console.log("\n-- Canonical priority mapping --");
assert(SI.toCanonicalPriority("critical") === "critical", "critical → critical");
assert(SI.toCanonicalPriority("urgent") === "critical", "urgent → critical");
assert(SI.toCanonicalPriority("Critical") === "critical", "Critical → critical");
assert(SI.toCanonicalPriority("high") === "high", "high → high");
assert(SI.toCanonicalPriority("medium") === "normal", "medium → normal");
assert(SI.toCanonicalPriority("normal") === "normal", "normal → normal");
assert(SI.toCanonicalPriority("low") === "low", "low → low");
assert(SI.toLegacyRecommendationPriority("critical") === "urgent", "canonical critical → legacy urgent");
assert(SI.toLegacyNeutralPriority("normal") === "medium", "canonical normal → neutral medium");

console.log("\n-- Room / source references --");
assert(SI.roomEntityReference("Room 24").id === "24", "Room 24 → id 24");
assert(SI.roomEntityReference("24").label === "Room 24", "24 → label Room 24");
assert(SI.roomEntityReference("room24").id === "24", "room24 → 24");
assert(SI.normalizeRoomNumber("Room 24") === SI.roomEntityReference("24").id, "room helper aligns with normalizeRoomNumber");
const src = SI.sourceReference("maintenance", "abc-1", "ws");
assert(src.sourceType === "maintenance" && src.sourceId === "abc-1" && src.identity === "maintenance:abc-1", "source reference");

console.log("\n-- Legacy recommendation adapt (no data loss) --");
const legacyRec = {
  id: "rec-1",
  text: "Follow up the reported maintenance issues in Room 305.",
  priority: "high",
  department: "Maintenance",
  status: "open",
  sourceFactIds: ["maint:305"],
  sourceTypes: ["maintenance"],
  reasonCode: "fact_rule",
  customKeep: "preserve-me"
};
const adapted = SI.adaptLegacyRecommendation(legacyRec);
assert(adapted.id === "rec-1", "rec id preserved");
assert(adapted.text === legacyRec.text, "rec text preserved");
assert(adapted.priority === "high", "legacy priority preserved");
assert(adapted.canonicalPriority === "high", "canonicalPriority added");
assert(adapted.department === "Maintenance", "department preserved");
assert(adapted.sourceFactIds && adapted.sourceFactIds[0] === "maint:305", "sourceFactIds preserved");
assert(adapted.reasonCode === "fact_rule", "reasonCode preserved");
assert(adapted.customKeep === "preserve-me", "unknown fields preserved");

console.log("\n-- OperationalFact contract view --");
const neutral = SI.maintenanceIssueToNeutralFact({
  id: "issue-9",
  title: "Leaking tap",
  description: "Basin tap",
  roomNumber: "12",
  status: "completed",
  priority: "medium",
  includeInHandover: true,
  assignedDepartment: "Maintenance",
  category: "plumbing"
});
const contractFact = SI.toOperationalFactContract(neutral);
assert(contractFact.canonicalStatus === "resolved", "completed issue → canonical resolved");
assert(contractFact.canonicalPriority === "normal", "medium → canonical normal");
assert(contractFact.room && contractFact.room.id === "12", "room EntityReference");
assert(contractFact.source && contractFact.source.sourceType === "maintenance", "source on contract fact");
assert(Array.isArray(contractFact.evidence), "evidence array present");

console.log("\n-- No user-visible behaviour change (legacy analyze path) --");
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
  "Room 22 VIP arrival tomorrow - twin setup requested\n" +
  "Room 14 open balance on folio\n" +
  "Room 305 shower pressure low - maintenance not yet informed";
const classified = {
  _analyzed: notes.split("\n").map(function (line) {
    const rooms = [];
    const m = line.match(/room\s+(\d+)/i);
    if (m) rooms.push(m[1]);
    let section = "general";
    if (/balance/i.test(line)) section = "payments";
    if (/maintenance|shower/i.test(line)) section = "maintenance";
    if (/vip/i.test(line)) section = "guest";
    return makeNote(line, section, rooms);
  })
};
const result = SI.analyze({
  shiftCode: "PM",
  shiftDisplayName: "PM",
  rawNotesText: notes,
  classified: classified,
  departments: ["Reception", "Housekeeping", "Maintenance"],
  brainContext: { general: { hotelName: "Test" }, hotelKnowledge: {} },
  hotelSnapshot: {}
});
const recs = result.recommendations || [];
assert(recs.some(function (r) { return /22/i.test(r.text); }), "VIP recommendation unchanged");
assert(recs.some(function (r) { return /14/i.test(r.text); }), "payment recommendation unchanged");
assert(recs.some(function (r) { return /305/i.test(r.text); }), "maintenance recommendation unchanged");
assert(SI.normalizePriority("medium") === "medium", "legacy normalizePriority unchanged");
assert(SI.normalizePriority("normal") === "medium", "legacy normal→medium unchanged");
assert(SI.isResolvedStatus("completed") === true, "legacy isResolvedStatus unchanged");

console.log("\n-- Guardrails --");
const handover = load("handover.html");
const maint = load("maintenance.html");
assert(!/HospitalityIntelligenceEngine\.analyze|toCanonicalStatus\(/i.test(handover), "handover UI not switched to E1 helpers yet");
assert(!/toCanonicalStatus|HospitalityIntelligenceEngine/i.test(maint), "maintenance UI unchanged");
const migrations = fs.readdirSync(path.join(ROOT, "supabase", "migrations"));
assert(!migrations.some(function (f) {
  return /(^|[_-])e1([_-]|$)|canonical_fact|operational_fact_table/i.test(f);
}), "no E1 migration");

console.log("\n=== Results: " + passed + " passed, " + failed + " failed ===\n");
if (failed) process.exit(1);
