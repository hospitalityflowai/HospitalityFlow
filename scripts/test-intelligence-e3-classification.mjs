/**
 * Phase E3 — Engine-owned operational classification + parity adapters.
 * Run: node scripts/test-intelligence-e3-classification.mjs
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

function assertEq(actual, expected, label) {
  assert(actual === expected, label + " (got " + JSON.stringify(actual) + ")");
}

console.log("\n=== Phase E3 Operational Classification ===\n");

assert(SI === HIE, "HospitalityIntelligenceEngine alias");
assert(typeof SI.classifyOperationalFact === "function", "classifyOperationalFact exported");
assert(typeof SI.compareClassificationParity === "function", "compareClassificationParity exported");
assert(Array.isArray(SI.CLASSIFICATION_INVENTORY) && SI.CLASSIFICATION_INVENTORY.length >= 6, "inventory present");

console.log("\n-- Canonical categories --");
const cats = SI.OPERATIONAL_CATEGORY;
[
  "urgent", "guest", "maintenance", "payment", "task", "information", "unknown"
].forEach(function (c) {
  assertEq(cats[c], c, "category constant " + c);
  assertEq(SI.normalizeOperationalCategory(c), c, "normalize " + c);
});

console.log("\n-- Unknown + legacy mappings --");
assertEq(SI.normalizeOperationalCategory("payments"), "payment", "payments → payment");
assertEq(SI.normalizeOperationalCategory("vip"), "guest", "vip → guest");
assertEq(SI.normalizeOperationalCategory("tasks"), "task", "tasks → task");
assertEq(SI.normalizeOperationalCategory("inventory"), "task", "inventory → task");
assertEq(SI.normalizeOperationalCategory("deliveries"), "task", "deliveries → task");
assertEq(SI.normalizeOperationalCategory("events"), "information", "events → information");
assertEq(SI.normalizeOperationalCategory("lostproperty"), "information", "lostproperty → information");
assertEq(SI.normalizeOperationalCategory("completed"), "information", "completed → information");
assertEq(SI.normalizeOperationalCategory("general"), "information", "general → information");
assertEq(SI.normalizeOperationalCategory("xyzzy-not-a-category"), "unknown", "bogus → unknown");
assertEq(SI.normalizeOperationalSubject("VIP Arrival"), "vip_arrival", "subject normalise");

console.log("\n-- classifyOperationalFact: every category --");
assertEq(
  SI.classifyOperationalFact({ subject: "critical" }, { section: "urgent" }).category,
  "urgent",
  "urgent via subject critical"
);
assertEq(
  SI.classifyOperationalFact({}, { section: "urgent", maintenancePriority: "Critical" }).category,
  "urgent",
  "urgent via context"
);
assertEq(
  SI.classifyOperationalFact({ subject: "vip_arrival" }).category,
  "guest",
  "guest via vip_arrival"
);
assertEq(
  SI.classifyOperationalFact({ subject: "guest_request" }, { isVip: true }).category,
  "guest",
  "guest via guest_request"
);
assertEq(
  SI.classifyOperationalFact({ subject: "maintenance" }).category,
  "maintenance",
  "maintenance subject"
);
assertEq(
  SI.classifyOperationalFact({ sourceType: "maintenance", subject: "" }).category,
  "maintenance",
  "maintenance sourceType"
);
assertEq(
  SI.classifyOperationalFact({ subject: "outstanding_balance" }).category,
  "payment",
  "payment outstanding_balance"
);
assertEq(
  SI.classifyOperationalFact({ subject: "twin_setup" }).category,
  "task",
  "task twin_setup"
);
assertEq(
  SI.classifyOperationalFact({ subject: "delivery" }).category,
  "task",
  "task delivery"
);
assertEq(
  SI.classifyOperationalFact({}, { section: "general" }).category,
  "information",
  "information via general section"
);
assertEq(
  SI.classifyOperationalFact({}, { section: "not_a_real_section" }).category,
  "unknown",
  "unknown via bogus section hint"
);

console.log("\n-- Traceability --");
const traced = SI.classifyOperationalFact(
  { id: "fact-42", subject: "outstanding_balance", confidence: "high" },
  { sourceFactId: "ignored-when-fact-has-id" }
);
assertEq(traced.sourceFactId, "fact-42", "sourceFactId from fact");
assertEq(traced.confidence, "high", "confidence preserved when present");
assertEq(traced.classificationSource, "fact_subject", "classificationSource set");
assert(traced.subject === "outstanding_balance", "subject preserved");

const noConf = SI.classifyOperationalFact({ subject: "maintenance" });
assertEq(noConf.confidence, "", "confidence omitted/empty when absent");

console.log("\n-- Batch classify --");
const batch = SI.classifyOperationalFacts([
  { subject: "maintenance" },
  { subject: "outstanding_balance" },
  { subject: "vip_arrival" }
]);
assertEq(batch.map(function (r) { return r.category; }).join(","), "maintenance,payment,guest", "batch categories");

console.log("\n-- Handover section adapters --");
assertEq(SI.handoverSectionToCategory("payments"), "payment", "section payments");
assertEq(SI.handoverSectionToCategory("vip"), "guest", "section vip");
assertEq(SI.categoryToHandoverSection("payment"), "payments", "category → payments");
assertEq(SI.categoryToHandoverSection("guest", "vip"), "vip", "prefer vip when guest");
assertEq(SI.categoryToHandoverSection("task", "inventory"), "inventory", "prefer inventory when task");
assertEq(SI.categoryToHandoverSection("information", "completed"), "completed", "prefer completed");

console.log("\n-- Writing subject → category --");
[
  ["maintenance", "maintenance"],
  ["outstanding_balance", "payment"],
  ["vip_arrival", "guest"],
  ["reservation_info", "guest"],
  ["guest_arrangement", "guest"],
  ["room_move", "guest"],
  ["late_checkout", "guest"],
  ["twin_setup", "task"],
  ["wake_up", "guest"],
  ["delivery", "task"],
  ["inventory", "task"]
].forEach(function (pair) {
  assertEq(SI.classifyOperationalFact({ subject: pair[0] }).category, pair[1], "writing subject " + pair[0]);
});

console.log("\n-- Mixed legacy + canonical facts --");
const mixed = SI.classifyOperationalFacts([
  { subject: "outstanding_balance", sectionHint: "payments" },
  { sourceType: "maintenance", category: "plumbing" },
  { subject: "follow_up", ownerDept: "Housekeeping" },
  { id: "c1", subject: "vip_arrival" }
]);
assertEq(mixed[0].category, "payment", "mixed payment");
assertEq(mixed[1].category, "maintenance", "mixed maintenance source");
assertEq(mixed[2].category, "task", "mixed follow_up housekeeping → task");
assertEq(mixed[3].category, "guest", "mixed vip");
assertEq(mixed[3].sourceFactId, "c1", "mixed id traceability");

console.log("\n-- Parity helper --");
const payEng = SI.classifyOperationalFact({ subject: "outstanding_balance" });
const payParity = SI.compareClassificationParity(payEng, "payments");
assert(payParity.match === true, "payment vs payments parity match");
assertEq(payParity.legacyCategory, "payment", "legacy category payment");

const vipParity = SI.compareClassificationParity(
  SI.classifyOperationalFact({ subject: "vip_arrival" }),
  "vip"
);
assert(vipParity.match === true, "guest vs vip parity match");

const mismatch = SI.compareClassificationParity(
  SI.classifyOperationalFact({ subject: "maintenance" }),
  "payments"
);
assert(mismatch.match === false, "maintenance vs payments mismatch recorded");
assertEq(mismatch.engineCategory, "maintenance", "mismatch engineCategory");
assertEq(mismatch.legacyCategory, "payment", "mismatch legacyCategory");

console.log("\n-- applyEngineClassificationToNote preserves section on mismatch --");
const mismatchNote = {
  original: "Room 101 balance outstanding",
  section: "payments",
  fact: { subject: "maintenance", id: "n1" },
  id: "n1"
};
SI.applyEngineClassificationToNote(mismatchNote, "payments");
assertEq(mismatchNote.section, "payments", "legacy section retained on mismatch");
assert(mismatchNote._classificationParity && mismatchNote._classificationParity.match === false, "parity mismatch stored");
assertEq(mismatchNote.operationalCategory, "payment", "operationalCategory follows legacy on mismatch");

const matchNote = {
  original: "VIP arriving",
  section: "vip",
  isVip: true,
  fact: { subject: "vip_arrival", id: "n2" },
  id: "n2"
};
SI.applyEngineClassificationToNote(matchNote, "vip");
assertEq(matchNote.section, "vip", "vip section preserved");
assert(matchNote._classificationParity.match === true, "parity match");
assertEq(matchNote.operationalCategory, "guest", "engine category attached on match");

console.log("\n-- Maintenance adapter classification --");
const maintFacts = SI.factsFromMaintenanceIssues([
  {
    id: "m-9",
    title: "AC broken",
    category: "HVAC",
    status: "open",
    priority: "high",
    includeInHandover: true,
    roomNumber: "412"
  }
]);
assert(maintFacts.length === 1, "one maintenance fact");
assert(
  maintFacts[0].metadata &&
    maintFacts[0].metadata.classification &&
    maintFacts[0].metadata.classification.category === "maintenance",
  "maintenance fact stamped classification.maintenance"
);
assertEq(
  maintFacts[0].metadata.maintenanceDomainCategory,
  "HVAC",
  "domain category not overwritten by operational category"
);
assertEq(
  SI.filterMaintenanceIssuesForHandover([
    { id: "a", includeInHandover: true, status: "open" },
    { id: "b", includeInHandover: true, status: "completed" },
    { id: "c", includeInHandover: false, status: "open" }
  ]).map(function (i) { return i.id; }).join(","),
  "a",
  "M4 filter unchanged"
);

console.log("\n-- Handover adapter stamps classification --");
const handFacts = SI.factsFromHandoverAnalyzedNotes([
  {
    id: "h1",
    original: "Room 118 card declined",
    section: "payments",
    fact: { subject: "outstanding_balance", status: "open" }
  }
]);
assert(
  handFacts[0].metadata.classification.category === "payment",
  "handover adapter classification payment"
);

console.log("\n-- Contract view includes classification --");
const contract = SI.toOperationalFactContract(handFacts[0]);
assert(contract.classification && contract.classification.category === "payment", "contract.classification");

console.log("\n-- Recommendation outcomes unchanged (subject routing) --");
const openMaintRec = SI.maintenanceIssueToNeutralFact({
  id: "m-rec",
  title: "AC not cooling",
  roomNumber: "412",
  status: "open",
  priority: "high",
  includeInHandover: true,
  assignedDepartment: "Maintenance",
  category: "HVAC"
});
const recResult = SI.analyzeFacts({
  facts: [openMaintRec],
  shiftCode: "PM",
  shiftDisplayName: "PM",
  departments: ["Reception", "Maintenance"],
  brainContext: { general: { hotelName: "Test" }, hotelKnowledge: {} }
});
assert(
  (recResult.recommendations || []).some(function (r) { return /412/i.test(r.text); }),
  "open maintenance still recommended (subject routing unchanged)"
);

console.log("\n-- Quiet-shift / lifecycle unchanged --");
assert(SI.isOperationalFactClosed({ status: "completed" }) === true, "lifecycle completed still closed");
assert(SI.hasActionableOpenFacts([{ status: "open" }]) === true, "lifecycle open actionable");
assert(
  SI.isQuietShiftPhraseLines(["Quiet shift", "Nothing to report"]) === true,
  "quiet phrase unchanged"
);
const qs = SI.evaluateQuietShiftState(
  ["Quiet shift"],
  [{ status: "open", subject: "maintenance" }]
);
assert(qs.phraseQuiet === true, "quiet-shift phraseQuiet");
assert(qs.suppressRecommendations === true, "quiet-shift suppress still phrase-based");
assert(qs.hasActionableOpenFacts === true, "quiet-shift factual open still reported");

console.log("\n-- Writing engine still extracts subjects (not final category owner) --");
assert(typeof AiWritingEngine.extractOperationalFact === "function" || typeof AiWritingEngine === "object", "writing engine loaded");

console.log("\n-- Pipeline classify wired --");
const pipe = SI.describeEnginePipeline();
assert(pipe.some(function (s) { return s.id === "classify" && s.status === "wired"; }), "classify stage wired");

console.log("\n=== Results: " + passed + " passed, " + failed + " failed ===\n");
if (failed > 0) process.exit(1);
