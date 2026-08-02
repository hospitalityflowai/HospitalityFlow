/**
 * GI-1 — Read-only GuestObservation extraction.
 * Run: node scripts/test-guest-intelligence-gi1-observations.mjs
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
vm.runInContext(load("guest-intelligence.js"), context);

const SI = context.window.ShiftIntelligenceEngine;
const GI = context.window.GuestIntelligence;
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

const WS = "ws-hotel-a";
const DEPTS = ["Reception", "Housekeeping", "Maintenance", "Finance"];

function factPair(line, extras) {
  extras = extras || {};
  var rooms = AiWritingEngine.extractRoomNumbers(line);
  var isVip = /\bvip\b/i.test(line) || extras.isVip === true;
  var section = extras.section || "";
  if (!section) {
    if (/maintenance|ac |not working|leak|fault/i.test(line)) section = "maintenance";
    else if (/balance|payment|declined|outstanding|expedia|folio/i.test(line)) section = "payments";
    else if (/vip/i.test(line)) section = "vip";
    else if (/wake|taxi|addison/i.test(line)) section = "tasks";
    else if (/noise|complaint|apologis|apologiz/i.test(line)) section = "guest";
    else if (/feather|floor|lift|accessible|wheelchair|bedding|twin/i.test(line)) section = "guest";
    else section = "guest";
  }
  var fact = AiWritingEngine.extractOperationalFact(line, { rooms: rooms, section: section, isVip: isVip });
  var note = {
    original: line,
    rooms: rooms,
    section: section,
    isVip: isVip,
    fact: fact,
    _neutralFactId: extras.factId || ("f-" + (rooms[0] || "x") + "-" + section),
    _neutralSourceType: "handover"
  };
  return { fact: fact, note: note, line: line };
}

function extractFromLines(lines, extras) {
  extras = extras || {};
  var pairs = lines.map(function (line, i) {
    return factPair(line, { factId: "gi-" + i });
  });
  return GI.extractGuestObservations({
    facts: pairs.map(function (p) { return p.fact; }),
    analyzedNotes: pairs.map(function (p) { return p.note; }),
    workspaceId: extras.workspaceId != null ? extras.workspaceId : WS,
    reportId: extras.reportId || "rep-1",
    observedAt: extras.observedAt || "2026-08-02T16:00:00.000Z",
    isDemoData: !!extras.isDemoData,
    memories: extras.memories || []
  });
}

function analyzeWithGi(lines) {
  var analyzed = lines.map(function (line, i) {
    return factPair(line, { factId: "an-" + i }).note;
  });
  return SI.analyze({
    shiftCode: "PM",
    rawNotesText: lines.join("\n"),
    classified: { _analyzed: analyzed },
    departments: DEPTS,
    workspaceId: WS,
    hotelSnapshot: {}
  });
}

console.log("\n=== GI-1 GuestObservation Extraction ===\n");

console.log("-- Contract surface --");
assert(!!GI && typeof GI.extractGuestObservations === "function", "GuestIntelligence.extractGuestObservations");
assert(GI.PHASE === "GI-2" || GI.PHASE === "GI-1", "PHASE GI-1 or GI-2");
assert(typeof GI.extractGuestObservations === "function", "GI-1 extract still present");
assert(GI.OBSERVATION_TYPE.floor_preference === "floor_preference", "OBSERVATION_TYPE.floor_preference");
assert(GI.MATCH_STRENGTH.probable === "probable", "MATCH_STRENGTH.probable");

console.log("\n-- Scenario A: Explicit room preference --");
(function () {
  var r = extractFromLines([
    "Mrs Taylor in Room 42 prefers a high floor away from the lift."
  ]);
  assert(r.observations.length === 1, "A. one guest observation");
  var o = r.observations[0];
  assert(
    o.observationType === "floor_preference" || o.observationType === "location_preference",
    "A. floor/location preference type"
  );
  assert(o.guestMatchStrength === "probable" || o.guestMatchStrength === "strong",
    "A. probable/high identity evidence");
  assert(o.status === "explicit_current_request" || o.status === "observed_once",
    "A. explicit_current_request or observed_once");
  assert(o.confidence >= 0.75, "A. high confidence");
  assert(o.temporary === true && o.persistent === false && o.preferencePromoted === false,
    "A. temporary only — not preference/profile");
  assert(o.sourceFactIds && o.sourceFactIds.length > 0, "A. source-linked");
})();

console.log("\n-- Scenario B: Room-only bedding --");
(function () {
  var r = extractFromLines(["Room 24 requested feather-free bedding."]);
  assert(r.observations.length === 1, "B. one bedding observation");
  var o = r.observations[0];
  assert(o.observationType === "bedding_preference", "B. bedding_preference");
  assert(o.guestMatchStrength === "uncertain", "B. room-only uncertain identity");
  assert(!o.guestName || o.guestIdentityEvidence.guestName === "", "B. no durable guest name required");
  assert(o.persistent === false && o.preferencePromoted === false, "B. no durable guest identity / preference");
  assert(o.confidence >= 0.45 && o.confidence < 0.85, "B. medium confidence band");
})();

console.log("\n-- Scenario C: Complaint and recovery --");
(function () {
  var r = extractFromLines([
    "Room 31 reported corridor noise. Apologised and quiet afterwards."
  ]);
  assert(r.observations.length >= 1, "C. observation present");
  var o = r.observations[0];
  assert(
    o.observationType === "service_recovery" || o.observationType === "complaint",
    "C. complaint/service_recovery"
  );
  assert(o.status === "resolved", "C. resolved");
  assert(o.sourceFactIds.length > 0, "C. source-linked");
  var analyzed = analyzeWithGi([
    "Room 31 reported corridor noise. Apologised and quiet afterwards."
  ]);
  assert(
    !(analyzed.recommendations || []).some(function (rec) {
      return /Room\s*31|noise/i.test(rec.text || "");
    }),
    "C. no open recommendation from resolved complaint"
  );
})();

console.log("\n-- Scenario D: Payment issue --");
(function () {
  var r = extractFromLines(["Mr Khan’s Expedia payment is pending."]);
  assert(r.observations.length === 1, "D. temporary payment observation");
  var o = r.observations[0];
  assert(o.observationType === "payment_issue", "D. payment_issue");
  assert(o.sensitivity === "sensitive", "D. sensitive");
  assert(o.approvalRequirement === "staff_review", "D. staff_review");
  assert(o.preferencePromoted === false && o.persistent === false,
    "D. must not become permanent negative label");
})();

console.log("\n-- Scenario E: Accessibility/service need --");
(function () {
  var r = extractFromLines(["Guest requires a wheelchair-accessible room."]);
  assert(r.observations.length === 1, "E. observation emitted");
  var o = r.observations[0];
  assert(o.observationType === "accessibility_or_service_need", "E. accessibility type");
  assert(o.sensitivity === "sensitive", "E. sensitive");
  assert(o.approvalRequirement === "staff_review", "E. staff_review");
  assert(o.persistent === false, "E. no durable knowledge yet");
  assert(!/diagnos|disability\s+type/i.test(JSON.stringify(o.value)), "E. no diagnosis inference");
})();

console.log("\n-- Scenario F: Prohibited inference --");
(function () {
  var r = extractFromLines(["Guest sounds pregnant / difficult / probably has anxiety."]);
  assert(r.observations.length === 0, "F. no normal GuestObservation");
  assert(r.rejections.length >= 1, "F. prohibited/never_store rejection");
  assert(r.rejections[0].approvalRequirement === "never_store", "F. never_store");
  assert(r.rejections[0].retainedContent === false, "F. sensitive text not retained");
  assert(!JSON.stringify(r.rejections).match(/pregnant|anxiety|difficult/i),
    "F. rejection payload omits sensitive wording");
})();

console.log("\n-- Scenario G: Generic note --");
(function () {
  var r = extractFromLines(["Busy night, all guests in."]);
  assert(r.observations.length === 0, "G. no observation");
})();

console.log("\n-- Scenario H: Wake-up and taxi --");
(function () {
  var r = extractFromLines(["Room 36 wake-up 06:00 and taxi 06:40."]);
  assert(r.observations.length === 1, "H. one linked temporary observation");
  var o = r.observations[0];
  assert(o.observationType === "wakeup_or_transport", "H. wakeup_or_transport");
  assert(o.value.components && o.value.components.indexOf("wake_up") !== -1, "H. wake component");
  assert(o.value.components.indexOf("transport") !== -1, "H. taxi/transport component");
  assert(o.persistent === false, "H. current-stay only");
})();

console.log("\n-- Scenario I: VIP occasion --");
(function () {
  var r = extractFromLines([
    "VIP Mrs Taylor arriving for anniversary; welcome card and champagne required."
  ]);
  assert(r.observations.length >= 1, "I. observation present");
  var types = r.observations.map(function (o) { return o.observationType; });
  assert(
    types.indexOf("occasion") !== -1 || types.indexOf("vip_or_recognition") !== -1 ||
      types.indexOf("amenity_preference") !== -1,
    "I. VIP/occasion/amenity observation"
  );
  assert(r.observations.every(function (o) {
    return o.sourceFactIds.length > 0 && o.persistent === false && o.preferencePromoted === false;
  }), "I. source-linked current-stay, no permanent preference");
})();

console.log("\n-- Scenario J: Namesake safety --");
(function () {
  var r = extractFromLines([
    "Mr Smith in Room 12 requested a quiet room.",
    "Mr Smith in Room 28 requested late checkout."
  ]);
  assert(r.observations.length >= 2, "J. separate temporary observations");
  var rooms = r.observations.map(function (o) { return o.room; }).sort();
  assert(rooms.indexOf("12") !== -1 && rooms.indexOf("28") !== -1, "J. different rooms remain separate");
  assert(r.observations.every(function (o) { return !o.guestId; }), "J. no identity merge / no guestId");
})();

console.log("\n-- Proof requirements --");
(function () {
  var engineResult = analyzeWithGi([
    "Mrs Taylor in Room 42 prefers a high floor."
  ]);
  assert(Array.isArray(engineResult.guestObservations), "1. analyze exposes guestObservations");
  assert(engineResult.guestObservations.length >= 1, "1b. observations originate via engine path");
  assert(engineResult.guestObservations.every(function (o) {
    return o.sourceFactIds && o.sourceFactIds.length && o.persistent === false;
  }), "2. no permanent guest profile fields");
  assert(engineResult.guestObservations.every(function (o) {
    return o.preferencePromoted === false;
  }), "3. no preference promotion");

  var giOnly = GI.extractGuestObservations;
  assert(typeof giOnly === "function", "12. GI-1 does not export recommend");
  assert(typeof GI.recommend !== "function" && typeof GI.generateRecommendations !== "function",
    "12b. no recommendation API on GuestIntelligence");

  GI.clearDemoObservations();
  extractFromLines(["Room 5 requested twin beds."], { workspaceId: "demo-workspace", isDemoData: true });
  assert(GI.getLastDemoObservations().length >= 1, "13. Demo observations held in session memory");
  GI.clearDemoObservations();
  assert(GI.getLastDemoObservations().length === 0, "13b. reset/clear removes Demo observations");
})();

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
