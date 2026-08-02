/**
 * GI-2 — CandidateGuestKnowledge from GI-1 observations.
 * Run: node scripts/test-guest-intelligence-gi2-candidates.mjs
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
  var section = extras.section || "guest";
  if (/balance|payment|expedia|folio/i.test(line)) section = "payments";
  if (/wake|taxi/i.test(line)) section = "tasks";
  if (/vip/i.test(line)) section = "vip";
  var fact = AiWritingEngine.extractOperationalFact(line, { rooms: rooms, section: section, isVip: isVip });
  if (extras.reservationId) {
    fact.sourceText = (fact.sourceText || line) + " Booking " + extras.reservationId;
  }
  var note = {
    original: line + (extras.reservationId ? " Booking " + extras.reservationId : ""),
    rooms: rooms,
    section: section,
    isVip: isVip,
    fact: fact,
    _neutralFactId: extras.factId || ("f-" + (rooms[0] || "x")),
    _neutralSourceType: "handover"
  };
  return { fact: fact, note: note };
}

function observationsFromLines(lines, extras) {
  extras = extras || {};
  var pairs = lines.map(function (entry, i) {
    var line = typeof entry === "string" ? entry : entry.line;
    var opt = typeof entry === "string" ? {} : entry;
    return factPair(line, {
      factId: opt.factId || ("gi2-" + i),
      reservationId: opt.reservationId || extras.reservationId
    });
  });
  return GI.extractGuestObservations({
    facts: pairs.map(function (p) { return p.fact; }),
    analyzedNotes: pairs.map(function (p) { return p.note; }),
    workspaceId: extras.workspaceId != null ? extras.workspaceId : WS,
    reportId: extras.reportId || "rep-1",
    observedAt: extras.observedAt || "2026-08-02T16:00:00.000Z",
    isDemoData: !!extras.isDemoData
  });
}

function candidatesFromLines(lines, extras) {
  extras = extras || {};
  var obsResult = observationsFromLines(lines, extras);
  return GI.buildCandidateGuestKnowledge({
    observations: obsResult.observations,
    observationRejections: obsResult.rejections,
    workspaceId: extras.workspaceId != null ? extras.workspaceId : WS,
    observedAt: extras.observedAt || "2026-08-02T16:00:00.000Z",
    isDemoData: !!extras.isDemoData
  });
}

function proposedPrefs(cands) {
  return (cands || []).filter(function (c) {
    return c.lifecycleStatus === "proposed" || c.lifecycleStatus === "conflicting";
  });
}

console.log("\n=== GI-2 CandidateGuestKnowledge ===\n");

console.log("-- Contract surface --");
assert(typeof GI.buildCandidateGuestKnowledge === "function", "buildCandidateGuestKnowledge");
assert(GI.PHASE === "GI-2" || GI.PHASE === "GI-3", "PHASE GI-2 or GI-3");
assert(GI.KNOWLEDGE_TYPE.floor_preference === "floor_preference", "KNOWLEDGE_TYPE.floor_preference");
assert(GI.CANDIDATE_LIFECYCLE.proposed === "proposed", "lifecycle proposed");
assert(typeof GI.recommend !== "function", "no recommend API");

console.log("\n-- Scenario A: Single explicit preference --");
(function () {
  var r = candidatesFromLines([
    "Mrs Taylor in Room 42 prefers a high floor away from the lift."
  ]);
  var prefs = r.candidates.filter(function (c) {
    return c.knowledgeType === "floor_preference" || c.knowledgeType === "room_location_preference";
  });
  assert(prefs.length >= 1, "A. proposed floor preference candidate");
  var c = prefs[0];
  assert(c.lifecycleStatus === "proposed", "A. proposed (not confirmed)");
  assert(c.confirmed === false && c.preferencePromoted === false, "A. not confirmed");
  assert(c.evidenceCount === 1, "A. one evidence source");
  assert(c.confidence >= 0.55, "A. medium/high confidence");
  assert(c.persistent === false && c.temporary === true, "A. no persistence");
  assert(c.sourceObservationIds.length === 1 && c.sourceFactIds.length >= 1, "A. source-linked");
})();

console.log("\n-- Scenario B: Repeated preference --");
(function () {
  var obs1 = observationsFromLines(
    [{ line: "Mrs Taylor in Room 42 prefers a high floor.", factId: "stay-a-floor" }],
    { reportId: "rep-a", observedAt: "2026-07-01T10:00:00.000Z" }
  );
  var obs2 = observationsFromLines(
    [{ line: "Mrs Taylor in Room 42 requested a high floor again.", factId: "stay-b-floor" }],
    { reportId: "rep-b", observedAt: "2026-08-01T10:00:00.000Z" }
  );
  var r = GI.buildCandidateGuestKnowledge({
    observations: obs1.observations.concat(obs2.observations),
    observationRejections: [],
    workspaceId: WS,
    observedAt: "2026-08-01T10:00:00.000Z"
  });
  var floors = r.candidates.filter(function (c) {
    return c.knowledgeType === "floor_preference" && c.lifecycleStatus === "proposed";
  });
  assert(floors.length === 1, "B. one candidate");
  assert(floors[0].evidenceCount === 2, "B. evidenceCount 2");
  assert(floors[0].confidence >= 0.7, "B. higher confidence");
  assert(floors[0].confirmed === false, "B. proposed only");
  assert(floors[0].reasonCodes.indexOf("repeated_consistent_evidence") !== -1, "B. repeated evidence code");
})();

console.log("\n-- Scenario C: Room-only observation --");
(function () {
  var r = candidatesFromLines(["Room 24 requested feather-free bedding."]);
  var durable = r.candidates.filter(function (c) {
    return c.lifecycleStatus === "proposed" && c.knowledgeType === "bedding_preference";
  });
  assert(durable.length === 0, "C. no durable proposed bedding candidate");
  var insuff = r.candidates.filter(function (c) {
    return c.lifecycleStatus === "insufficient_evidence";
  });
  assert(insuff.length >= 1, "C. insufficient_evidence candidate or marker");
  assert(insuff[0].reasonCodes.indexOf("room_only_no_cross_stay") !== -1, "C. room-only no cross-stay");
})();

console.log("\n-- Scenario D: Contradiction --");
(function () {
  var obsHigh = observationsFromLines(
    [{ line: "Mrs Taylor in Room 42 prefers a high floor.", factId: "d-high" }],
    { reportId: "rep-d1" }
  );
  var obsGround = observationsFromLines(
    [{ line: "Mrs Taylor in Room 42 requested a ground floor room.", factId: "d-ground" }],
    { reportId: "rep-d2" }
  );
  obsGround.observations.forEach(function (o) {
    o.observationType = "floor_preference";
    o.value = o.value || {};
    o.value.preferredLocation = "ground_floor";
  });
  var r = GI.buildCandidateGuestKnowledge({
    observations: obsHigh.observations.concat(obsGround.observations),
    workspaceId: WS,
    observedAt: "2026-08-02T12:00:00.000Z"
  });
  var conflict = r.candidates.filter(function (c) {
    return c.lifecycleStatus === "conflicting" || c.contradictionState === "conflicting";
  });
  assert(conflict.length >= 1, "D. conflicting candidate");
  assert(conflict[0].evidenceCount >= 2 && conflict[0].sourceObservationIds.length >= 2,
    "D. both sources retained");
  var singleHigh = candidatesFromLines(["Mrs Taylor in Room 42 prefers a high floor."]);
  var baseConf = singleHigh.candidates[0] && singleHigh.candidates[0].confidence;
  assert(conflict[0].confidence < (baseConf || 0.9), "D. confidence reduced");
  assert(conflict[0].reasonCodes.indexOf("contradiction_no_overwrite") !== -1, "D. no overwrite");
})();

console.log("\n-- Scenario E: Accessibility need --");
(function () {
  var r = candidatesFromLines([
    "Mrs Khan in Room 18 requires a wheelchair-accessible room."
  ]);
  var acc = r.candidates.filter(function (c) {
    return c.knowledgeType === "accessibility_or_service_need";
  });
  assert(acc.length >= 1, "E. proposed sensitive candidate");
  assert(acc[0].lifecycleStatus === "proposed", "E. proposed");
  assert(acc[0].sensitivity === "sensitive", "E. sensitive");
  assert(acc[0].approvalRequirement === "staff_review", "E. staff_review_required");
  assert(acc[0].confirmed === false, "E. no auto-confirmation");
  assert(!/diagnos/i.test(JSON.stringify(acc[0].proposedValue)), "E. no diagnosis inference");
})();

console.log("\n-- Scenario F: Payment issue --");
(function () {
  var r = candidatesFromLines(["Mr Khan’s Expedia payment is pending."]);
  var prefLike = r.candidates.filter(function (c) {
    return /preference/i.test(c.knowledgeType) && c.lifecycleStatus === "proposed";
  });
  assert(prefLike.length === 0, "F. no preference candidate");
  var payReject = r.rejections.filter(function (x) {
    return x.reasonCode === "payment_not_guest_preference" || x.code === "never_candidate";
  });
  assert(payReject.length >= 1, "F. rejected_by_rule for payment");
  assert(!r.candidates.some(function (c) {
    return typeof c.riskScore === "number" || c.guestRisk != null;
  }), "F. never a negative guest score");
})();

console.log("\n-- Scenario G: Wake-up and taxi --");
(function () {
  var r = candidatesFromLines([
    "Room 36 wake-up 06:00 and taxi 06:40.",
    { line: "Room 36 wake-up 06:00 and taxi 06:40.", factId: "wake-2" }
  ]);
  var recurring = r.candidates.filter(function (c) {
    return c.knowledgeType === "recurring_service_pattern" && c.lifecycleStatus === "proposed";
  });
  assert(recurring.length === 0, "G. no one-stay / GI-2 wake-taxi candidate");
  assert(r.rejections.some(function (x) {
    return x.reasonCode === "one_stay_timed_service";
  }), "G. rejected as one_stay_timed_service");
})();

console.log("\n-- Scenario H: VIP occasion --");
(function () {
  var r = candidatesFromLines([
    "VIP Mrs Taylor arriving for anniversary; welcome card and champagne required."
  ]);
  var vip = r.candidates.filter(function (c) {
    return c.knowledgeType === "vip_or_recognition" &&
      (c.lifecycleStatus === "proposed" || c.lifecycleStatus === "insufficient_evidence");
  });
  assert(vip.length >= 1, "H. recognition candidate when explicit");
  assert(vip[0].retentionHint === "short_lived_recognition" ||
    vip[0].retentionHint.indexOf("temporary") !== -1, "H. short retention hint");
  assert(vip[0].preferencePromoted === false && vip[0].confirmed === false,
    "H. not permanent preference");
})();

console.log("\n-- Scenario I: Prohibited label --");
(function () {
  var r = candidatesFromLines(["Guest sounds pregnant / difficult / probably has anxiety."]);
  assert(r.candidates.filter(function (c) {
    return c.lifecycleStatus === "proposed";
  }).length === 0, "I. no proposed candidate");
  assert(r.rejections.some(function (x) {
    return x.lifecycleStatus === "prohibited" || x.code === "prohibited_no_candidate";
  }), "I. prohibited/rejected result");
  assert(!JSON.stringify(r).match(/pregnant|anxiety|difficult/i),
    "I. raw wording not retained");
})();

console.log("\n-- Scenario J: Namesakes --");
(function () {
  var r = candidatesFromLines([
    "Mr Smith in Room 12 requested a quiet room.",
    "Mr Smith in Room 28 requested a quiet room."
  ]);
  var locs = r.candidates.filter(function (c) {
    return (c.knowledgeType === "room_location_preference" || c.knowledgeType === "floor_preference") &&
      (c.lifecycleStatus === "proposed" || c.lifecycleStatus === "insufficient_evidence");
  });
  assert(locs.length >= 2, "J. separate candidates (no shared aggregate)");
  var rooms = locs.map(function (c) { return c.identityEvidence.room || c.identityEvidence.rooms[0]; });
  assert(rooms.indexOf("12") !== -1 && rooms.indexOf("28") !== -1, "J. different rooms remain separate");
})();

console.log("\n-- Proof requirements --");
(function () {
  var engine = SI.analyze({
    shiftCode: "PM",
    rawNotesText: "Mrs Taylor in Room 42 prefers a high floor.",
    classified: {
      _analyzed: [factPair("Mrs Taylor in Room 42 prefers a high floor.", { factId: "eng-1" }).note]
    },
    departments: DEPTS,
    workspaceId: WS,
    hotelSnapshot: {}
  });
  assert(Array.isArray(engine.guestCandidates), "1. analyze exposes guestCandidates");
  assert(engine.guestCandidates.length >= 1, "1b. candidates originate via engine from observations");
  assert(engine.guestCandidates.every(function (c) {
    return c.sourceObservationIds && c.sourceObservationIds.length &&
      c.sourceFactIds && c.sourceFactIds.length;
  }), "11. source references complete");
  assert(engine.guestCandidates.every(function (c) {
    return c.confirmed === false && c.lifecycleStatus !== "confirmed";
  }), "2. no candidate becomes confirmed knowledge");
  assert(engine.guestCandidates.every(function (c) {
    return c.persistent === false && c.temporary === true;
  }), "3. no persistence flags");
  assert(typeof GI.generateRecommendations !== "function", "12. no GI recommendation API");

  GI.clearDemoGiState();
  candidatesFromLines(["Mrs Taylor in Room 5 prefers a high floor."], {
    workspaceId: "demo-workspace",
    isDemoData: true
  });
  assert(GI.getLastDemoCandidates().length >= 1, "13. Demo candidates in session memory");
  GI.clearDemoGiState();
  assert(GI.getLastDemoCandidates().length === 0, "13b. reset clears Demo candidates");
  assert(GI.getLastDemoObservations().length === 0, "13c. reset clears Demo observations");
})();

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
