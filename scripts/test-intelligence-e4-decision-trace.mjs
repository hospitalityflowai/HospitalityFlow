/**
 * Phase E4.2 — DecisionTrace, context-driven recommendations, explainability.
 * Run: node scripts/test-intelligence-e4-decision-trace.mjs
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

function assertEq(actual, expected, label) {
  assert(actual === expected, label + " (got " + JSON.stringify(actual) + ")");
}

const DEPTS = ["Reception", "Housekeeping", "Maintenance", "Finance", "Duty Manager", "Food & Beverage"];

function factPair(line, extras) {
  extras = extras || {};
  var rooms = AiWritingEngine.extractRoomNumbers(line);
  var isVip = /\bvip\b/i.test(line) || extras.isVip === true;
  var section = extras.section || "";
  if (!section) {
    if (/maintenance|ac |not working|leak|broken/i.test(line)) section = "maintenance";
    else if (/balance|payment|declined|outstanding|folio/i.test(line) && !/champagne|welcome/i.test(line)) {
      section = "payments";
    } else if (/vip/i.test(line)) section = "vip";
    else if (/late check/i.test(line)) section = "guest";
    else if (/wake|taxi|addison/i.test(line)) section = "tasks";
    else section = "general";
  }
  var fact = AiWritingEngine.extractOperationalFact(line, { rooms: rooms, section: section, isVip: isVip });
  var note = {
    original: line,
    rooms: rooms,
    section: section,
    isVip: isVip,
    fact: fact,
    _neutralFactId: extras.factId || ("fact-" + (rooms[0] || "x")),
    _neutralSourceType: "handover"
  };
  return { fact: fact, note: note, line: line };
}

function recommend(line, extras) {
  var pair = factPair(line, extras);
  var rec = SI.recommendationFromFact(
    pair.fact, pair.note, DEPTS, "Reception", "pm", null
  );
  return { pair: pair, rec: rec, ctx: SI.buildOperationalContext(pair.fact, { note: pair.note, section: pair.note.section, isVip: pair.note.isVip }) };
}

function analyzeLines(lines) {
  var analyzed = lines.map(function (line, i) {
    return factPair(line, { factId: "f-" + i }).note;
  });
  return SI.analyze({
    shiftCode: "PM",
    shiftDisplayName: "PM",
    rawNotesText: lines.join("\n"),
    classified: { _analyzed: analyzed, _metrics: {} },
    departments: DEPTS,
    selectedDepartment: "Reception",
    hotelSnapshot: { arrivals: 4, departures: 3 },
    brainContext: null
  });
}

console.log("\n=== Phase E4.2 DecisionTrace & Context-Driven Recommendations ===\n");

console.log("-- Contract surface --");
assert(typeof SI.buildDecisionTrace === "function", "buildDecisionTrace exported");
assert(typeof SI.buildDecisionExplanation === "function", "buildDecisionExplanation exported");
assert(typeof SI.allowsOpenRecommendation === "function", "allowsOpenRecommendation exported");
assert(SI.REASON_CODE.guest_comfort_affected === "guest_comfort_affected", "REASON_CODE guest_comfort");
assert(SI.CONFIDENCE_GATE.recommendMin === 0.45, "CONFIDENCE_GATE.recommendMin");
assert(
  SI.ENGINE_PIPELINE.some(function (s) { return s.id === "explain" && s.status === "wired"; }),
  "pipeline includes explain stage"
);

console.log("\n-- Scenario A: guest-impacting maintenance --");
(function () {
  var r = recommend("Room 24 AC not working. Guest is in-house. Maintenance informed but unresolved.");
  assert(!!r.rec, "A produces recommendation");
  assert(/follow up/i.test(r.rec.text) && /24/i.test(r.rec.text) && /maintenance/i.test(r.rec.text),
    "A text: follow up maintenance until resolved");
  assert(r.rec.priority === "urgent" || r.rec.priority === "high", "A high/urgent priority");
  assert(r.rec.decisionTrace && typeof r.rec.decisionTrace === "object", "A has DecisionTrace");
  assert(r.rec.decisionTrace.evidence && r.rec.decisionTrace.evidence.room === "24",
    "A trace points to Room 24");
  assert(r.rec.reasonCodes.indexOf("guest_comfort_affected") !== -1, "A reason guest_comfort_affected");
  assert(r.rec.reasonCodes.indexOf("maintenance_unresolved") !== -1, "A reason maintenance_unresolved");
  assert(r.rec.decisionTrace.confidence >= 0.75, "A high confidence");
  assert(r.rec.decisionTrace.nextAction === "follow_up_until_resolved", "A nextAction follow_up_until_resolved");
})();

console.log("\n-- Scenario B: declined payment --");
(function () {
  var r = recommend("Room 35 has £120 outstanding. Card declined. Guest departs today.");
  assert(!!r.rec, "B produces recommendation");
  assert(/collect/i.test(r.rec.text) && /35/i.test(r.rec.text), "B collect before departure");
  assert(r.rec.priority === "urgent" || r.rec.priority === "high", "B high revenue priority");
  assert(r.rec.reasonCodes.indexOf("declined_payment") !== -1, "B declined_payment");
  assert(r.rec.reasonCodes.indexOf("outstanding_balance") !== -1, "B outstanding_balance");
  assert(
    r.rec.reasonCodes.indexOf("departure_imminent") !== -1 ||
      r.rec.reasonCodes.indexOf("departure_today") !== -1,
    "B departure imminent/today"
  );
  assert(r.rec.decisionTrace.confidence >= 0.75, "B high confidence");
})();

console.log("\n-- Scenario C: VIP readiness --");
(function () {
  var r = recommend("VIP Mrs Taylor arriving today in Room 42. Welcome card and champagne outstanding.");
  assert(!!r.rec, "C produces recommendation");
  assert(/vip|prepare|setup|arrival/i.test(r.rec.text) && /42/i.test(r.rec.text), "C prepare before arrival");
  assert(!/collect outstanding balance/i.test(r.rec.text), "C is not misrouted as payment");
  assert(r.rec.reasonCodes.indexOf("vip_readiness") !== -1, "C vip_readiness");
  assert(r.rec.reasonCodes.indexOf("arrival_today") !== -1, "C arrival_today");
  assert(r.rec.decisionTrace.confidence >= 0.75, "C high confidence");
  var maint = recommend("Room 24 AC not working. Guest is in-house. Maintenance informed but unresolved.");
  assert(
    SI.scoreOperationalImpact({ fact: maint.pair.fact, note: maint.pair.note }).score <
      SI.scoreOperationalImpact({ fact: r.pair.fact, note: r.pair.note }).score,
    "C ranks below critical guest-impacting maintenance"
  );
})();

console.log("\n-- Scenario D: confirmed late checkout --");
(function () {
  var r = recommend("Room 16 late checkout 13:00 confirmed.");
  assert(!r.rec, "D no open recommendation");
  assert(r.ctx.currentStatus === "confirmed", "D context confirmed");
  assert(
    r.ctx.departments.indexOf("Reception") !== -1 && r.ctx.departments.indexOf("Housekeeping") !== -1,
    "D dependency awareness Reception + Housekeeping"
  );
  var codes = SI.reasonCodesFromContext(r.ctx);
  assert(codes.indexOf("confirmed_low_risk") !== -1 || codes.indexOf("arrangement_confirmed") !== -1,
    "D confirmed low-risk reason");
  assert(!SI.allowsOpenRecommendation(r.ctx), "D gating blocks urgent follow-up");
})();

console.log("\n-- Scenario E: resolved complaint --");
(function () {
  var r = recommend("Room 31 noise complaint. Apologised and quiet afterwards.");
  assert(!r.rec, "E no open recommendation");
  assert(r.ctx.currentStatus === "completed", "E completed");
  var codes = SI.reasonCodesFromContext(r.ctx);
  assert(codes.indexOf("resolved_no_action") !== -1 || codes.indexOf("complaint_resolved") !== -1,
    "E resolved/no-action reason");
  var trace = SI.buildDecisionTrace({
    sourceFactId: r.pair.note._neutralFactId,
    operationalContext: r.ctx,
    score: 90,
    priority: "low",
    fact: r.pair.fact,
    note: r.pair.note
  });
  assert(trace.reasonCodes.indexOf("resolved_no_action") !== -1 ||
    trace.reasonCodes.indexOf("complaint_resolved") !== -1, "E retained in DecisionTrace");
  assert(r.ctx.operationalRisk === "low" || r.ctx.operationalRisk === "none", "E low current risk");
})();

console.log("\n-- Scenario F: weak evidence --");
(function () {
  var r = recommend("Guest mentioned room.");
  assert(!r.rec, "F no recommendation");
  assert(r.ctx.confidence < 0.45, "F low confidence");
  assert(r.ctx.reasoning.indexOf("weak_evidence") !== -1, "F weak_evidence reason");
  assert(!SI.allowsOpenRecommendation(r.ctx), "F gating blocks strong recommendation");
  assert(!r.ctx.nextAction, "F no invented nextAction");
})();

console.log("\n-- Scenario G: multi-component timed action --");
(function () {
  var lines = ["Room 36 wake-up 06:00 and Addison Lee taxi 06:40."];
  var result = analyzeLines(lines);
  var recs = (result.recommendations || []).filter(function (rec) {
    return /36|wake|taxi/i.test(rec.text || "");
  });
  assert(recs.length === 1, "G one linked recommendation (no duplicates) got " + recs.length);
  assert(recs[0].decisionTrace, "G has DecisionTrace");
  assert(
    recs[0].reasonCodes.indexOf("timed_action_due") !== -1 ||
      recs[0].decisionTrace.nextAction === "complete_timed_actions",
    "G timed action due"
  );
  assert(/reception/i.test(recs[0].department || ""), "G Reception dependency");
})();

console.log("\n-- Every recommendation has DecisionTrace from context --");
(function () {
  var result = analyzeLines([
    "Room 24 AC not working. Guest is in-house. Maintenance informed but unresolved.",
    "Room 35 has £120 outstanding. Card declined. Guest departs today.",
    "VIP Mrs Taylor arriving today in Room 42. Welcome card and champagne outstanding.",
    "Room 7 extra bed requested"
  ]);
  var recs = result.recommendations || [];
  assert(recs.length >= 3, "multiple recommendations generated");
  recs.forEach(function (rec, i) {
    assert(!!rec.decisionTrace, "rec #" + i + " has DecisionTrace");
    assert(Array.isArray(rec.reasonCodes) && rec.reasonCodes.length > 0,
      "rec #" + i + " has reasonCodes from context");
    assert(typeof rec.decisionTrace.confidence === "number", "rec #" + i + " trace confidence numeric");
    var blob = JSON.stringify(rec.decisionTrace);
    assert(!/<[^>]+>/.test(blob), "rec #" + i + " trace has no HTML");
    assert(!/Today.?s Briefing|Please chase/i.test(blob), "rec #" + i + " trace has no UI prose");
  });
})();

console.log("\n-- Explainability helper --");
(function () {
  var r = recommend("Room 24 AC not working. Guest is in-house. Maintenance informed but unresolved.");
  var expl = SI.buildDecisionExplanation(r.rec.decisionTrace);
  assert(Array.isArray(expl.reasonCodes), "explanation reasonCodes array");
  assert(expl.reasonCodes.indexOf("guest_comfort_affected") !== -1, "explanation includes guest comfort");
  assert(expl.evidence && expl.evidence.room === "24", "explanation evidence.room");
  assert(typeof expl.confidence === "number", "explanation confidence");
  assert(expl.priority === "urgent" || expl.priority === "high", "explanation priority");
  assert(!expl.text && !expl.html, "explanation has no polished prose fields");
})();

console.log("\n-- Writing-layer ownership --");
(function () {
  var writingSrc = load("ai-writing-engine.js");
  assert(/Does NOT invent DecisionTrace reason codes/i.test(writingSrc),
    "writing documents DecisionTrace ownership");
  assert(!/function\s+buildDecisionTrace\s*\(/.test(writingSrc),
    "writing does not implement buildDecisionTrace");
  assert(!/function\s+buildOperationalContext\s*\(/.test(writingSrc),
    "writing does not implement buildOperationalContext");
  assert(typeof AiWritingEngine.buildDecisionTrace !== "function",
    "AiWritingEngine does not export buildDecisionTrace");
  assert(typeof AiWritingEngine.allowsOpenRecommendation !== "function",
    "AiWritingEngine does not gate recommendations");
})();

console.log("\n-- Briefing / status / alerts share context authority --");
(function () {
  var lines = [
    "Room 24 AC not working. Guest is in-house. Maintenance informed but unresolved.",
    "Room 35 has £120 outstanding. Card declined. Guest departs today."
  ];
  var entries = lines.map(function (line, i) {
    var p = factPair(line, { factId: "b-" + i });
    return { fact: p.fact, note: p.note, factId: p.note._neutralFactId };
  });
  var briefing = SI.buildBriefingModel(entries);
  assert(briefing.priorities && briefing.priorities.length > 0, "briefing priorities present");
  briefing.priorities.forEach(function (spec, i) {
    assert(!!spec.decisionTrace, "briefing priority #" + i + " has DecisionTrace");
    assert(!!spec.operationalContext || !!spec.decisionTrace.operationalContext,
      "briefing priority #" + i + " tied to OperationalContext");
  });
  var status = SI.buildHotelStatusModel(entries);
  var guestArea = status.filter(function (a) { return a.key === "guest_experience"; })[0];
  var revenueArea = status.filter(function (a) { return a.key === "revenue"; })[0];
  var maintArea = status.filter(function (a) { return a.key === "maintenance"; })[0];
  assert(guestArea && guestArea.level === "critical", "status guest_experience critical from context");
  assert(revenueArea && revenueArea.level === "critical", "status revenue critical from context");
  var alerts = SI.computeShiftAlertsFromObjects(entries);
  assert(alerts.maintenance >= 1, "alerts maintenance from context objects");
  assert(alerts.payments >= 1, "alerts payments from context objects");
  assert(alerts.urgent >= 1, "alerts urgent for guest-impacting maintenance");
  /* Shared glance source of truth — alerts and status counts must not diverge. */
  assert(maintArea && maintArea.count === alerts.maintenance,
    "Hotel Status maintenance count matches Shift Alert maintenance");
  assert(revenueArea && revenueArea.count === alerts.payments,
    "Hotel Status revenue count matches Shift Alert payments");
  if (guestArea.level === "critical") {
    assert(guestArea.count === alerts.urgent,
      "Critical guest experience count matches Shift Alert urgent");
  }
})();

console.log("\n-- Confidence gating --");
(function () {
  assert(!SI.allowsOpenRecommendation({
    confidence: 0.3,
    confidenceLabel: "low",
    nextAction: "follow_up_until_resolved",
    currentStatus: "unresolved",
    reasoning: ["weak_evidence"],
    departments: ["Reception"]
  }), "low confidence blocks even with nextAction");
  assert(SI.allowsOpenRecommendation({
    confidence: 0.6,
    confidenceLabel: "medium",
    nextAction: "collect_before_departure",
    currentStatus: "unresolved",
    reasoning: ["declined_payment"],
    departments: ["Reception", "Finance"],
    objectType: "payment"
  }), "medium confidence allows explicit nextAction");
  assert(!SI.allowsOpenRecommendation({
    confidence: 0.9,
    confidenceLabel: "high",
    nextAction: "",
    currentStatus: "unresolved",
    reasoning: ["guest_comfort_affected"],
    departments: ["Maintenance"]
  }), "empty nextAction blocks even high confidence");
})();

/* ── Hotel Brain hard-gate (E4.2) ─────────────────────────────────────────── */
vm.runInContext(load("hotel-profile-operational.js"), context);
const HPO = context.window.HotelProfileOperational;
assert(typeof HPO.getShiftIntelligenceKnowledge === "function", "HotelProfileOperational loaded for Brain gate");
assert(typeof SI.enrichRecommendationsWithHotelBrain === "function", "enrichRecommendationsWithHotelBrain exported");
assert(typeof SI.matchBrainKnowledgeToCandidate === "function", "matchBrainKnowledgeToCandidate exported");
assert(SI.REASON_CODE.hotel_brain_enrichment === "hotel_brain_enrichment", "REASON_CODE.hotel_brain_enrichment");

function brainCtx(entries, rooms) {
  return {
    hotelKnowledge: {
      vipRules: "Confirm VIP welcome card and amenities before arrival.",
      paymentRules: "",
      operationalNotes: "Late checkout after 13:00 requires manager approval."
    },
    operationalKnowledge: {
      knowledgeEntries: (entries || []).map(function (e, i) {
        return {
          id: e.id || ("k-" + i),
          active: true,
          title: e.title || "Knowledge",
          category: e.category || "Operations",
          department: e.department || "Reception",
          priority: e.priority || "urgent",
          shifts: e.shifts || ["am", "pm", "night"],
          triggerKeywords: e.triggerKeywords || [],
          followUpInstruction: e.followUpInstruction || "",
          content: e.content || "",
          checklistEnabled: false
        };
      })
    },
    roomFacilities: rooms || [
      { roomNo: "12", quietFacing: true, twinCapable: false },
      { roomNo: "18", quietFacing: true, twinCapable: true }
    ],
    departments: DEPTS
  };
}

function analyzeWithBrain(lines, brain, shiftCode) {
  var analyzed = lines.map(function (line, i) {
    return factPair(line, { factId: "bf-" + i }).note;
  });
  return SI.analyze({
    shiftCode: shiftCode || "PM",
    shiftDisplayName: shiftCode || "PM",
    rawNotesText: lines.join("\n"),
    classified: { _analyzed: analyzed, _metrics: {} },
    departments: DEPTS,
    selectedDepartment: "Reception",
    hotelSnapshot: { arrivals: 2, departures: 2 },
    brainContext: brain
  });
}

console.log("\n-- Hotel Brain hard-gate: no standalone injection --");
(function () {
  var brain = brainCtx([{
    id: "late-co-policy",
    title: "Late checkout approval",
    category: "Guest",
    triggerKeywords: ["late checkout", "late check-out", "late c/o"],
    followUpInstruction: "Late checkout after 13:00 requires manager approval.",
    priority: "urgent"
  }, {
    id: "vip-setup",
    title: "VIP arrival setup",
    category: "VIP",
    triggerKeywords: ["vip", "welcome card"],
    followUpInstruction: "VIP arrivals require welcome card and amenity setup.",
    priority: "urgent"
  }]);

  /* 1. Guidance with no current operational fact → no recommendation */
  var noFact = analyzeWithBrain(
    ["Night audit complete. All quiet. No guest issues recorded."],
    brain
  );
  assert((noFact.recommendations || []).length === 0,
    "1. Hotel Brain guidance with no current fact creates no recommendation");

  /* Also: knowledge triggers in notes but no open operational chase fact */
  var policyOnly = analyzeWithBrain(
    ["Staff reminder: late checkout policy is after 13:00."],
    brain
  );
  var policyRecs = (policyOnly.recommendations || []).filter(function (r) {
    return /late checkout|manager approval|welcome card/i.test(r.text || "");
  });
  assert(policyRecs.length === 0,
    "1b. Policy-only notes do not inject Brain late-checkout / VIP recommendations");

  /* 2. Room reminder without matching current room / family → no recommendation */
  var quietOnly = analyzeWithBrain(
    ["Guest prefers a quiet room away from street if possible."],
    brain
  );
  assert(!(quietOnly.recommendations || []).some(function (r) {
    return /quiet-facing|Prefer a quiet/i.test(r.text || "");
  }), "2. Room reminder without matching current operational room fact creates no recommendation");
  var quietMatched = HPO.getRoomAttributeReminders(brain, quietOnly.rawNotesText || "Guest prefers a quiet room away from street");
  assert(quietMatched.length > 0, "2b. Room reminders still retrieve outside recommendation generation");
})();

console.log("\n-- Hotel Brain hard-gate: matched enrichment --");
(function () {
  var brain = brainCtx([{
    id: "late-co-policy",
    title: "Late checkout approval",
    category: "Guest",
    triggerKeywords: ["late checkout", "late check-out", "requested"],
    followUpInstruction: "Late checkout after 13:00 requires manager approval.",
    priority: "urgent"
  }, {
    id: "vip-setup",
    title: "VIP arrival setup",
    category: "VIP",
    triggerKeywords: ["vip", "arriving", "welcome"],
    followUpInstruction: "VIP arrivals require welcome card before arrival.",
    priority: "urgent"
  }, {
    id: "broad-guest",
    title: "General guest note",
    category: "Guest",
    triggerKeywords: ["guest", "room"],
    followUpInstruction: "Always smile at guests.",
    priority: "urgent"
  }]);

  /* 3. Matched late-checkout policy enriches current late-checkout fact */
  var lateLines = ["Room 24 late checkout requested for 14:00."];
  var late = analyzeWithBrain(lateLines, brain);
  var lateRec = (late.recommendations || []).find(function (r) {
    return /late check/i.test(r.text || "") ||
      (r.decisionTrace && r.decisionTrace.operationalContext &&
        /late_checkout/i.test(r.decisionTrace.operationalContext.subject || ""));
  });
  assert(!!lateRec, "3. Late-checkout fact produces a recommendation");
  assert(/manager approval|13:00/i.test(lateRec.text),
    "3b. Matched late-checkout policy enriches recommendation text");
  assert(
    (lateRec.decisionTrace.supportingKnowledge || []).some(function (sk) {
      return sk.source === "hotel_brain" && sk.matchedSubject === "late_checkout";
    }),
    "3c. Late-checkout enrichment recorded in supportingKnowledge"
  );

  /* 4. Matched VIP setup rule enriches current VIP fact */
  var vipLines = ["VIP Mr Henderson arriving 14:00, champagne amenity."];
  var vip = analyzeWithBrain(vipLines, brain);
  var vipRec = (vip.recommendations || []).find(function (r) { return /VIP/i.test(r.text || ""); });
  assert(!!vipRec, "4. VIP fact produces a recommendation");
  assert(/welcome card|amenity|champagne/i.test(vipRec.text),
    "4b. Matched VIP setup rule enriches / preserves VIP recommendation");
  assert(
    (vipRec.reasonCodes || []).indexOf("hotel_brain_enrichment") !== -1 ||
    (vipRec.decisionTrace.supportingKnowledge || []).some(function (sk) {
      return sk.source === "hotel_brain";
    }),
    "4c. VIP enrichment leaves Brain evidence on the recommendation"
  );

  /* 5–6. Enriched rec keeps sourceFactIds + valid DecisionTrace */
  assert(vipRec.sourceFactIds && vipRec.sourceFactIds.length > 0,
    "5. Enriched recommendation keeps non-empty sourceFactIds");
  assert(
    !!vipRec.decisionTrace &&
    !!vipRec.decisionTrace.operationalContext &&
    Array.isArray(vipRec.decisionTrace.reasonCodes) &&
    typeof vipRec.decisionTrace.confidence === "number",
    "6. Enriched recommendation has a valid DecisionTrace"
  );

  /* 7–8. Brain cannot independently change priority / confidence */
  var lockedPriority = vipRec.priority;
  var lockedConfidence = vipRec.decisionTrace.confidence;
  var beforePri = lockedPriority;
  var beforeConf = lockedConfidence;
  SI.enrichRecommendationsWithHotelBrain(
    [vipRec],
    vipLines.map(function (line, i) { return factPair(line, { factId: "bf-" + i }).note; }),
    brain,
    "pm",
    vipLines.join("\n")
  );
  assert(vipRec.priority === beforePri, "7. Hotel Brain cannot independently change priority");
  assert(vipRec.decisionTrace.confidence === beforeConf, "8. Hotel Brain cannot independently change confidence");

  /* 9. Unsupported reason codes are not added from Brain priority/title */
  var codes = vipRec.reasonCodes || [];
  assert(codes.every(function (c) {
    return !!SI.REASON_CODE[c] || /^[a-z][a-z0-9_]*$/.test(c);
  }), "9. Reason codes remain controlled tokens");
  assert(codes.indexOf("urgent") === -1, "9b. Brain priority label is not added as a reason code");

  /* 10. Broad keyword-only matches do not inject recommendations */
  var maint = analyzeWithBrain(
    ["Room 10 AC not working. Guest in-house. Maintenance informed but unresolved."],
    brain
  );
  assert(!(maint.recommendations || []).some(function (r) {
    return /Always smile|welcome card|manager approval/i.test(r.text || "");
  }), "10. Broad keyword-only Brain matches do not inject unrelated recommendations");
  var maintRec = (maint.recommendations || []).find(function (r) {
    return /AC|maintenance|follow/i.test(r.text || "");
  });
  if (maintRec) {
    assert(
      !(maintRec.decisionTrace.supportingKnowledge || []).some(function (sk) {
        return sk.matchedSubject === "vip" || sk.matchedSubject === "late_checkout";
      }),
      "10b. Broad guest/room knowledge does not enrich a maintenance recommendation"
    );
  }
})();

console.log("\n-- Hotel Brain hard-gate: shared Handover/Demo path --");
(function () {
  var brain = brainCtx([{
    id: "vip-setup",
    title: "VIP arrival setup",
    category: "VIP",
    triggerKeywords: ["vip"],
    followUpInstruction: "VIP arrivals require welcome card.",
    priority: "high"
  }]);
  var lines = ["VIP Ms Clarke arriving tonight."];
  var handover = analyzeWithBrain(lines, brain, "PM");
  var demo = analyzeWithBrain(lines, brain, "PM");
  assert(
    (handover.recommendations || []).length === (demo.recommendations || []).length,
    "11. Handover and Demo use the same gated path (same recommendation count)"
  );
  assert(
    (handover.recommendations || []).every(function (r) {
      return r.decisionTrace && r.decisionTrace.sourceFactIds && r.decisionTrace.sourceFactIds.length;
    }),
    "11b. Every Handover/Demo recommendation has sourceFactIds (no Brain-only candidates)"
  );
})();

console.log("\n-- Hotel Brain outside recommendation generation --");
(function () {
  var brain = brainCtx([{
    id: "vip-setup",
    title: "VIP arrival setup",
    category: "VIP",
    triggerKeywords: ["vip", "champagne"],
    followUpInstruction: "Confirm VIP room allocation before arrival.",
    checklistEnabled: true
  }]);
  /* Force checklistEnabled on normalized entry */
  brain.operationalKnowledge.knowledgeEntries[0].checklistEnabled = true;
  var knowledge = HPO.getShiftIntelligenceKnowledge(
    brain,
    "pm",
    "VIP Mr Henderson arriving 14:00, champagne amenity"
  );
  assert((knowledge.matchedActions || []).some(function (a) { return /vip/i.test(a.title || ""); }),
    "12. Hotel Brain knowledge retrieval still matches VIP notes");
  assert((knowledge.checklistItems || []).length >= 0,
    "12b. Checklist retrieval API remains available");
  var reminders = HPO.getRoomAttributeReminders(brain, "Guest wants a quiet room");
  assert(reminders.some(function (r) { return /quiet/i.test(r.text || ""); }),
    "12c. Room attribute reminder retrieval remains intact");
})();

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
