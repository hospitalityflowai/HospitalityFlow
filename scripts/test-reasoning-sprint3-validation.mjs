/**
 * Reasoning Sprint 3 — Intelligence & Validation (final pre-field testing).
 * Think / validate / confidence / relevance / consistency / cannot-miss briefing.
 * Run: node scripts/test-reasoning-sprint3-validation.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

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
  RegExp
};
context.global = context.window;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT, "ai-writing-engine.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(ROOT, "shift-intelligence-engine.js"), "utf8"), context);

const Engine = context.window.AiWritingEngine;
const Shift = context.window.ShiftIntelligenceEngine;
if (!Engine || !Shift) throw new Error("Engines failed to load");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log("  ✓ " + message);
  } else {
    failed += 1;
    console.error("  ✗ " + message);
  }
}

function makeAnalyzed(lines) {
  return lines.map(function (line) {
    var rooms = Engine.extractRoomNumbers(line);
    var section = "general";
    if (/balance|payment|folio|£/i.test(line)) section = "payments";
    if (/maintenance|shower|broken|ac |a\/c|leak|not cooling|heating|hot\s*water/i.test(line)) {
      section = "maintenance";
    }
    if (/vip/i.test(line)) section = "vip";
    if (/wake-?up|taxi|extra bed|adapter|twin|cot/i.test(line)) section = "tasks";
    var isVip = /\bvip\b/i.test(line);
    var fact = Engine.extractOperationalFact(line, { rooms: rooms, section: section, isVip: isVip });
    return {
      original: line,
      rooms: rooms,
      section: section,
      isVip: isVip,
      isCarriedOver: false,
      isFollowUp: /follow\s*up/i.test(line),
      maintenancePriority: section === "maintenance" ? "High" : null,
      fact: fact
    };
  });
}

function analyze(notes) {
  const analyzed = makeAnalyzed(notes);
  return {
    analyzed: analyzed,
    result: Shift.analyze({
      shiftCode: "Night",
      shiftDisplayName: "Night",
      rawNotesText: notes.join("\n"),
      classified: {
        _analyzed: analyzed,
        _metrics: { urgent: 1, vip: 1, maintenance: 1, payments: 1, events: 0, tasks: 1 }
      },
      metrics: { urgent: 1, vip: 1, maintenance: 1, payments: 1, events: 0, tasks: 1 },
      departments: [
        "Reception", "Housekeeping", "Maintenance", "Duty Manager",
        "Night Team", "Guest Services", "Finance", "F&B"
      ],
      selectedDepartment: "Reception",
      hotelSnapshot: { arrivals: 8, departures: 6 },
      brainContext: null
    })
  };
}

console.log("\nReasoning Sprint 3 — Intelligence & Validation\n");

(function exportsPresent() {
  assert(typeof Shift.applyFinalRecommendationQualityGate === "function", "exports final quality gate");
  assert(typeof Shift.applyExperienceConsistencyGate === "function", "exports experience consistency gate");
  assert(typeof Shift.wouldDutyManagerHandOver === "function", "exports DM handover test");
  assert(typeof Shift.briefingCannotMissSlot === "function", "exports briefing cannot-miss slot");
  assert(!!Shift.BRIEFING_CANNOT_MISS_SLOT, "exports BRIEFING_CANNOT_MISS_SLOT");
})();

(function suppressNoiseAndCompleted() {
  const { result } = analyze([
    "Night was quiet after 1am",
    "Occupancy looked healthy at 78%",
    "Room 41 noise complaint. Apologised and quiet afterwards.",
    "24 ac broken maint aware fan guest"
  ]);
  const recs = result.recommendations || [];
  assert(recs.some(function (r) { return /24/i.test(r.text) && /AC|Maint/i.test(r.text); }),
    "keeps actionable guest-impacting AC");
  assert(!recs.some(function (r) {
    return /quiet after|occupancy looked|noise complaint|apologis/i.test(r.text);
  }), "suppresses statistics, commentary, and completed noise");
})();

(function finalGateRejectsIncomplete() {
  const gated = Shift.applyFinalRecommendationQualityGate([
    { text: "Follow up guest request.", department: "Reception", priority: "normal" },
    { text: "Check issue.", department: "Reception", priority: "normal" },
    {
      text: "Follow up with Maintenance regarding Room 24 AC. Guest remains in-house and the issue is still unresolved.",
      department: "Maintenance",
      priority: "high",
      decisionTrace: { score: 10, confidence: 0.9, nextAction: "follow_up_until_resolved" }
    }
  ]);
  assert(gated.length === 1, "final gate keeps only complete DM-quality action");
  assert(/Room 24 AC/i.test(gated[0].text), "kept action preserves room + fault context");
})();

(function confidencePreferOmission() {
  const low = Shift.applyFinalRecommendationQualityGate([
    {
      text: "Arrange something for Room 9 this shift.",
      department: "Reception",
      priority: "normal",
      decisionTrace: {
        score: 80,
        confidence: 0.2,
        operationalContext: { confidenceLabel: "low", nextAction: "guest_follow_up", guestImpact: "none" }
      }
    }
  ]);
  assert(low.length === 0, "low confidence non-critical items are suppressed");
})();

(function cannotMissBriefingSlots() {
  const notes = [
    "Room 7 extra bed requested",
    "VIP Whitmore arriving 11:00 Room 42 champagne welcome card",
    "Room 14 open balance £120 card declined departs today",
    "24 ac broken maint aware fan guest",
    "Room 32 wake 0630 addison lee 1015",
    "Please reserve interconnecting rooms 14 & 15 for Henderson tomorrow"
  ];
  const analyzed = makeAnalyzed(notes);
  const entries = analyzed.map(function (n, i) {
    return { fact: n.fact, note: n, factId: "s3-" + i };
  });
  const model = Shift.buildBriefingModel(entries, { maxBlocks: 5 });
  const slots = (model.priorities || []).map(function (p) { return p.briefingSlot; });
  const text = (model.priorities || []).map(function (p) {
    return JSON.stringify(p.entities || {}) + " " + (p.actionKind || "");
  }).join(" || ");

  assert((model.priorities || []).length <= 5, "briefing stays within five cannot-miss blocks");
  assert(/follow_up_maintenance|AC|hot/i.test(text) || slots.indexOf("guest_risk") !== -1,
    "briefing includes biggest guest risk");
  assert(/collect_payment|amount|120/i.test(text) || slots.indexOf("revenue") !== -1,
    "briefing includes biggest revenue risk");
  assert(/prepare_vip|vip/i.test(text) || slots.indexOf("vip") !== -1,
    "briefing includes biggest VIP preparation");
  assert(/complete_timed|wake|taxi/i.test(text) || slots.indexOf("timed") !== -1,
    "briefing includes biggest timed action");
  assert(!/extra bed/i.test(text) || (model.priorities || []).length < 5,
    "soft guest request does not crowd cannot-miss briefing when higher risks exist");
})();

(function experienceConsistency() {
  const notes = [
    "24 ac broken maint aware fan guest",
    "Room 14 open balance £64.50 on folio",
    "VIP Isabella Rossi Room 42 champagne welcome card quiet upper",
    "Room 32 wake 0630 addison lee 1015"
  ];
  const analyzed = makeAnalyzed(notes);
  const experience = Engine.buildHandoverIntelligenceExperience(analyzed);
  assert(experience.briefing && experience.hotelStatus && experience.timeline,
    "experience returns briefing, status, timeline");
  const briefingText = (experience.briefing.paragraphs || []).join("\n");
  const statusText = (experience.hotelStatus || []).map(function (a) {
    return (a.level || "") + " " + (a.summary || "");
  }).join(" | ");
  assert(/AC|Maintenance|24/i.test(briefingText), "briefing surfaces guest-risk AC");
  assert(/critical|attention/i.test(statusText), "hotel status reflects unresolved operational pressure");
  assert(!/No unresolved guest-impacting issues/i.test(statusText) || /AC|24/i.test(briefingText),
    "status does not claim clear guest experience while AC is open");
})();

(function fewerHigherQualityRecs() {
  const { result } = analyze([
    "24 ac broken maint aware fan guest",
    "Room 24 AC still broken follow up maint",
    "Chase Room 24 AC please",
    "Room 14 open balance £64.50 on folio",
    "VIP Isabella Rossi Room 42 champagne",
    "welcome card for Rossi VIP",
    "quiet upper for Rossi",
    "Room 7 extra bed requested",
    "Night was quiet after 2am"
  ]);
  const recs = result.recommendations || [];
  assert(recs.length <= 6, "caps recommendations at higher-quality maximum");
  const ac = recs.filter(function (r) { return /24/i.test(r.text) && /AC|Maint/i.test(r.text); });
  assert(ac.length === 1, "duplicate AC objective merged to one recommendation");
  const vip = recs.filter(function (r) { return /vip/i.test(r.text); });
  assert(vip.length <= 1, "VIP amenity fragments merge to one objective");
  assert(recs.every(function (r) { return r.department; }), "every shipped rec has an owner");
  assert(recs.every(function (r) {
    return Shift.wouldDutyManagerHandOver(r);
  }), "every shipped rec passes Duty Manager handover test");
})();

(function contextPreserved() {
  const { result } = analyze([
    "Room 14 open balance £64.50 on folio — collect before departure",
    "VIP Mrs Taylor arriving Room 51 anniversary welcome card chocolates"
  ]);
  const text = (result.recommendations || []).map(function (r) { return r.text; }).join(" || ");
  assert(/64\.50|£64/i.test(text), "payment recommendation preserves amount");
  assert(/14/i.test(text), "payment recommendation preserves room");
  assert(/Taylor|51|VIP/i.test(text), "VIP recommendation preserves guest or room context");
})();

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
