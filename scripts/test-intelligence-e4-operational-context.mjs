/**
 * Phase E4.1 — Canonical OperationalContext enrichment.
 * Run: node scripts/test-intelligence-e4-operational-context.mjs
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

function inEnum(value, enumObj) {
  return Object.keys(enumObj).some(function (k) { return enumObj[k] === value; });
}

function factFrom(line, extras) {
  extras = extras || {};
  var rooms = AiWritingEngine.extractRoomNumbers(line);
  var isVip = /\bvip\b/i.test(line) || extras.isVip === true;
  var section = extras.section || "";
  if (!section) {
    if (/maintenance|ac |a\/c|not working|leak|broken/i.test(line)) section = "maintenance";
    else if (/balance|payment|declined|outstanding|folio/i.test(line)) section = "payments";
    else if (/vip/i.test(line)) section = "vip";
    else if (/late check/i.test(line)) section = "guest";
    else if (/complaint|noise/i.test(line)) section = "guest";
    else section = "general";
  }
  var fact = AiWritingEngine.extractOperationalFact(line, {
    rooms: rooms,
    section: section,
    isVip: isVip
  });
  var note = {
    original: line,
    rooms: rooms,
    section: section,
    isVip: isVip,
    fact: fact
  };
  return { fact: fact, note: note, line: line };
}

function ctxOf(line, extras) {
  var pair = factFrom(line, extras);
  return {
    pair: pair,
    ctx: SI.buildOperationalContext(pair.fact, {
      note: pair.note,
      section: pair.note.section,
      isVip: pair.note.isVip
    }),
    scored: SI.scoreOperationalImpact({ fact: pair.fact, note: pair.note })
  };
}

console.log("\n=== Phase E4.1 OperationalContext ===\n");

console.log("-- Contract surface --");
assert(typeof SI.buildOperationalContext === "function", "buildOperationalContext exported");
assert(typeof SI.createEmptyOperationalContext === "function", "createEmptyOperationalContext exported");
assert(SI.IMPACT_LEVEL.critical === "critical", "IMPACT_LEVEL.critical");
assert(SI.TIME_SENSITIVITY.imminent === "imminent", "TIME_SENSITIVITY.imminent");
assert(SI.URGENCY_LEVEL.high === "high", "URGENCY_LEVEL.high");
assert(SI.CONTEXT_STATUS.unresolved === "unresolved", "CONTEXT_STATUS.unresolved");
assert(SI.NEXT_ACTION_KIND.follow_up_until_resolved === "follow_up_until_resolved", "NEXT_ACTION_KIND follow-up");
assert(
  SI.ENGINE_PIPELINE.some(function (s) { return s.id === "enrich_context" && s.status === "wired"; }),
  "pipeline includes enrich_context"
);

console.log("\n-- Scenario A: guest-impacting maintenance --");
(function () {
  var r = ctxOf("Room 24 AC not working. Guest is in-house. Maintenance informed but unresolved.");
  var c = r.ctx;
  assertEq(c.guestImpact, "high", "A guestImpact high");
  assertEq(c.operationalRisk, "high", "A operationalRisk high");
  assert(
    c.timeSensitivity === "today" || c.timeSensitivity === "imminent",
    "A timeSensitivity today/imminent (got " + c.timeSensitivity + ")"
  );
  assert(c.departments.indexOf("Maintenance") !== -1, "A departments include Maintenance");
  assert(c.departments.indexOf("Reception") !== -1, "A departments include Reception");
  assertEq(c.currentStatus, "unresolved", "A currentStatus unresolved");
  assertEq(c.nextAction, "follow_up_until_resolved", "A nextAction follow_up_until_resolved");
  assertEq(c.confidenceLabel, "high", "A confidence high");
  assert(c.confidence >= 0.75, "A confidence numeric high");
  assert(c.reasoning.indexOf("guest_comfort_affected") !== -1, "A reason guest_comfort_affected");
  assert(c.reasoning.indexOf("maintenance_unresolved") !== -1, "A reason maintenance_unresolved");
})();

console.log("\n-- Scenario B: payment risk --");
(function () {
  var r = ctxOf("Room 35 has £120 outstanding. Card declined. Guest departs today.");
  var c = r.ctx;
  assert(
    c.revenueImpact === "high" || c.revenueImpact === "critical",
    "B revenueImpact high/critical (got " + c.revenueImpact + ")"
  );
  assertEq(c.timeSensitivity, "imminent", "B timeSensitivity imminent");
  assert(c.departments.indexOf("Reception") !== -1, "B departments include Reception");
  assert(c.departments.indexOf("Finance") !== -1, "B departments include Finance");
  assertEq(c.currentStatus, "unresolved", "B currentStatus unresolved");
  assertEq(c.nextAction, "collect_before_departure", "B nextAction collect_before_departure");
  assertEq(c.confidenceLabel, "high", "B confidence high");
  assert(c.reasoning.indexOf("declined_payment") !== -1, "B reason declined_payment");
  assert(c.category === "payment" || c.objectType === "payment", "B category/object payment");
})();

console.log("\n-- Scenario C: VIP preparation --");
(function () {
  var r = ctxOf("VIP Mrs Taylor arriving today in Room 42. Welcome card and champagne outstanding.");
  var c = r.ctx;
  assertEq(c.guestImpact, "high", "C guestImpact high");
  assertEq(c.timeSensitivity, "today", "C timeSensitivity today");
  assert(c.departments.indexOf("Reception") !== -1, "C departments include Reception");
  assert(
    c.departments.indexOf("Housekeeping") !== -1 || c.departments.indexOf("Food & Beverage") !== -1,
    "C dependencies include prep departments"
  );
  assertEq(c.currentStatus, "pending", "C currentStatus pending");
  assertEq(c.nextAction, "prepare_vip", "C nextAction prepare_vip");
  assert(
    c.reasoning.indexOf("vip_readiness") !== -1 || c.reasoning.indexOf("vip_affected") !== -1,
    "C reason includes VIP readiness"
  );
})();

console.log("\n-- Scenario D: confirmed low-risk late checkout --");
(function () {
  var r = ctxOf("Room 16 late checkout 13:00 confirmed.");
  var c = r.ctx;
  assert(
    c.guestImpact === "low" || c.guestImpact === "medium",
    "D guestImpact low/medium (got " + c.guestImpact + ")"
  );
  assertEq(c.timeSensitivity, "today", "D timeSensitivity today");
  assertEq(c.currentStatus, "confirmed", "D currentStatus confirmed");
  assert(c.departments.indexOf("Reception") !== -1, "D departments include Reception");
  assert(c.departments.indexOf("Housekeeping") !== -1, "D departments include Housekeeping");
  assert(
    c.operationalRisk === "low" || c.operationalRisk === "none" || c.operationalRisk === "medium",
    "D operationalRisk not critical"
  );
})();

console.log("\n-- Scenario E: resolved complaint --");
(function () {
  var r = ctxOf("Room 31 noise complaint. Apologised and quiet afterwards.");
  var c = r.ctx;
  assert(
    c.currentStatus === "completed" || c.currentStatus === "informational",
    "E completed/resolved status (got " + c.currentStatus + ")"
  );
  assert(
    c.operationalRisk === "low" || c.operationalRisk === "none",
    "E low current risk (got " + c.operationalRisk + ")"
  );
  assert(!c.nextAction || c.nextAction === "", "E no urgent next action");
  assert(c.urgency === "low", "E urgency low");
  assert(r.scored.score >= 80, "E retained as low-priority information");
})();

console.log("\n-- Scenario F: weak evidence --");
(function () {
  var r = ctxOf("Guest mentioned room.");
  var c = r.ctx;
  assertEq(c.confidenceLabel, "low", "F low confidence label");
  assert(c.confidence < 0.45, "F low confidence numeric");
  assert(!c.nextAction, "F no invented next action");
  assert(c.urgency === "low", "F no invented urgency");
  assert(
    c.category === "unknown" || c.category === "information",
    "F no invented high-impact category (got " + c.category + ")"
  );
  assert(c.reasoning.indexOf("weak_evidence") !== -1, "F reason weak_evidence");
  assert(c.guestImpact === "none" || c.guestImpact === "low", "F no invented guest impact");
})();

console.log("\n-- Controlled enums on every meaningful fact --");
(function () {
  var lines = [
    "Room 24 AC not working. Guest is in-house. Maintenance informed but unresolved.",
    "Room 35 has £120 outstanding. Card declined. Guest departs today.",
    "VIP Mrs Taylor arriving today in Room 42. Welcome card and champagne outstanding.",
    "Room 16 late checkout 13:00 confirmed.",
    "Room 31 noise complaint. Apologised and quiet afterwards."
  ];
  lines.forEach(function (line, i) {
    var c = ctxOf(line).ctx;
    assert(inEnum(c.guestImpact, SI.IMPACT_LEVEL), "enum guestImpact #" + i);
    assert(inEnum(c.revenueImpact, SI.IMPACT_LEVEL), "enum revenueImpact #" + i);
    assert(inEnum(c.operationalRisk, SI.IMPACT_LEVEL), "enum operationalRisk #" + i);
    assert(inEnum(c.timeSensitivity, SI.TIME_SENSITIVITY), "enum timeSensitivity #" + i);
    assert(inEnum(c.urgency, SI.URGENCY_LEVEL), "enum urgency #" + i);
    assert(inEnum(c.currentStatus, SI.CONTEXT_STATUS), "enum currentStatus #" + i);
    assert(inEnum(c.confidenceLabel, SI.CONFIDENCE_LABEL), "enum confidenceLabel #" + i);
    assert(typeof c.confidence === "number" && c.confidence >= 0 && c.confidence <= 1, "confidence 0–1 #" + i);
    assert(Array.isArray(c.reasoning), "reasoning array #" + i);
    assert(Array.isArray(c.departments), "departments array #" + i);
    assert(Array.isArray(c.dependencies), "dependencies array #" + i);
  });
})();

console.log("\n-- Ranking integration (single path) --");
(function () {
  var maint = ctxOf("Room 24 AC not working. Guest is in-house. Maintenance informed but unresolved.");
  var late = ctxOf("Room 16 late checkout 13:00 confirmed.");
  var vip = ctxOf("VIP Mrs Taylor arriving today in Room 42. Welcome card and champagne outstanding.");
  var pay = ctxOf("Room 35 has £120 outstanding. Card declined. Guest departs today.");
  var resolved = ctxOf("Room 31 noise complaint. Apologised and quiet afterwards.");

  assert(maint.scored.score < late.scored.score, "guest-impacting maintenance outranks confirmed late checkout");
  assert(maint.scored.score < vip.scored.score, "critical guest impact outranks VIP prep");
  assert(
    pay.scored.score <= 20,
    "declined payment before departure is high revenue risk score (got " + pay.scored.score + ")"
  );
  assert(resolved.scored.score >= 80, "resolved complaint remains low risk in ranking");
  assert(maint.scored.operationalContext && maint.scored.operationalContext.guestImpact === "high",
    "scoreOperationalImpact attaches OperationalContext");
  assert(
    maint.scored.reasons && maint.scored.reasons.length > 0,
    "engine can explain why a fact ranked highly"
  );
})();

console.log("\n-- Ownership: writing / UI do not calculate context --");
(function () {
  assert(typeof AiWritingEngine.buildOperationalContext !== "function",
    "AiWritingEngine does not export buildOperationalContext");
  var writingSrc = load("ai-writing-engine.js");
  assert(!/function\s+buildOperationalContext\s*\(/.test(writingSrc),
    "writing engine source has no buildOperationalContext implementation");
  assert(/Does NOT calculate OperationalContext/.test(writingSrc),
    "writing engine documents OperationalContext ownership");
  var handoverSrc = load("handover.html");
  assert(!/buildOperationalContext\s*\(/.test(handoverSrc),
    "handover.html does not call buildOperationalContext");
  assert(!/function\s+buildOperationalContext/.test(handoverSrc),
    "handover.html does not define buildOperationalContext");
})();

console.log("\n-- No invented actions on weak / resolved facts --");
(function () {
  var weak = ctxOf("Guest mentioned room.").ctx;
  var resolved = ctxOf("Room 31 noise complaint. Apologised and quiet afterwards.").ctx;
  assert(weak.nextAction === "" || weak.nextAction == null, "weak evidence: no nextAction");
  assert(resolved.nextAction === "" || resolved.nextAction == null, "resolved: no nextAction");
})();

console.log("\n-- Contract view includes operationalContext --");
(function () {
  var pair = factFrom("Room 24 AC not working. Guest is in-house. Maintenance informed but unresolved.");
  var contract = SI.toOperationalFactContract({
    id: "t1",
    sourceType: "handover",
    sourceId: "n1",
    subjectType: pair.fact.subject,
    status: pair.fact.status,
    priority: pair.fact.priority,
    room: pair.fact.rooms && pair.fact.rooms[0],
    sourceText: pair.line,
    guestImpact: pair.fact.guestImpact,
    metadata: { section: "maintenance" }
  });
  assert(contract.operationalContext && typeof contract.operationalContext === "object",
    "toOperationalFactContract exposes operationalContext");
  assert(contract.operationalContext.guestImpact === "high",
    "contract context guestImpact high");
})();

console.log("\n-- Context coverage (every meaningful fact) --");
(function () {
  var lines = [
    "Room 24 AC not working. Guest is in-house. Maintenance informed but unresolved.",
    "Room 35 has £120 outstanding. Card declined. Guest departs today.",
    "VIP Mrs Taylor arriving today in Room 42. Welcome card and champagne outstanding.",
    "Room 16 late checkout 13:00 confirmed.",
    "Room 31 noise complaint. Apologised and quiet afterwards.",
    "Guest mentioned room.",
    "Room 7 extra bed requested",
    "Room 9 wake-up call booked for 06:30"
  ];
  var missing = [];
  var weakDefaults = [];
  var entries = lines.map(function (line, i) {
    var pair = factFrom(line);
    var scored = SI.scoreOperationalImpact({ fact: pair.fact, note: pair.note, factId: "f-" + i });
    var ctx = scored.operationalContext || pair.fact.operationalContext;
    if (!ctx || typeof ctx !== "object") missing.push(line);
    else {
      try {
        JSON.stringify(ctx);
      } catch (e) {
        missing.push(line + " (not serializable)");
      }
      if (ctx.reasoning && ctx.reasoning.indexOf("weak_evidence") !== -1) weakDefaults.push(line);
    }
    return { fact: pair.fact, note: pair.note, factId: "f-" + i };
  });
  assertEq(missing.length, 0, "no facts missing OperationalContext");
  assertEq(lines.length, entries.length, "coverage denominator = fixture count");
  assert(entries.every(function (e) {
    return e.fact.operationalContext && typeof e.fact.operationalContext.confidence === "number";
  }), "every fact has numeric confidence on attached context");

  var groups = SI.groupIntoOperationalObjects(entries);
  assert(groups.length > 0, "operational objects grouped");
  var groupsMissing = groups.filter(function (g) { return !g.operationalContext; });
  assertEq(groupsMissing.length, 0, "every operational object inherits OperationalContext");
  assert(weakDefaults.length >= 1, "weak fixture classified as weak_evidence default");
  console.log("  INFO  meaningful facts: " + lines.length +
    ", with context: " + (lines.length - missing.length) +
    ", missing: " + missing.length +
    ", objects: " + groups.length +
    ", weak/default: " + weakDefaults.length);
})();

console.log("\n-- No presentation leakage --");
(function () {
  var samples = [
    "Room 24 AC not working. Guest is in-house. Maintenance informed but unresolved.",
    "Room 35 has £120 outstanding. Card declined. Guest departs today.",
    "VIP Mrs Taylor arriving today in Room 42. Welcome card and champagne outstanding."
  ];
  var leaked = [];
  samples.forEach(function (line) {
    var c = ctxOf(line).ctx;
    var blob = JSON.stringify(c);
    if (/<[^>]+>/.test(blob)) leaked.push("html:" + line);
    if (/Today.?s Briefing|Shift Glance|card title|emoji/i.test(blob)) leaked.push("ui:" + line);
    if (/Please chase|Follow up next shift|Review VIP notes/i.test(blob)) leaked.push("prose:" + line);
    if (/handoverSection|sectionTitle|render/i.test(blob)) leaked.push("render:" + line);
    (c.reasoning || []).forEach(function (code) {
      if (/\s/.test(code) || /[.!]/.test(code)) leaked.push("reason-prose:" + code);
    });
    if (c.nextAction && /\s/.test(c.nextAction)) leaked.push("action-prose:" + c.nextAction);
  });
  assertEq(leaked.length, 0, "OperationalContext has no HTML/UI/prose leakage");
})();

console.log("\n-- Confidence semantics (evidence quality, not severity) --");
(function () {
  var criticalThin = SI.buildOperationalContext(
    { subject: "", sourceText: "maybe critical?", guestImpact: "", status: "unknown" },
    { note: { original: "maybe critical?" } }
  );
  assert(criticalThin.confidence < 0.45, "thin evidence stays low confidence even if alarming language");
  assertEq(criticalThin.confidenceLabel, SI.confidenceLabelFromValue
    ? SI.confidenceLabelFromValue(criticalThin.confidence)
    : (criticalThin.confidence >= 0.75 ? "high" : criticalThin.confidence >= 0.45 ? "medium" : "low"),
    "confidenceLabel matches numeric derivation");

  var confirmed = ctxOf("Room 16 late checkout 13:00 confirmed.").ctx;
  assert(confirmed.confidence >= 0.75, "low-risk confirmed item can have high confidence");
  assertEq(confirmed.confidenceLabel, "high", "confirmed item confidenceLabel high");
  assert(
    confirmed.guestImpact === "low" || confirmed.guestImpact === "medium",
    "confirmed item remains low/medium guest impact"
  );

  var maint = ctxOf("Room 24 AC not working. Guest is in-house. Maintenance informed but unresolved.").ctx;
  assert(maint.guestImpact === "high" && maint.confidence >= 0.75,
    "high-severity with clear evidence → high confidence");

  var labelFromNum = function (n) {
    if (n >= 0.75) return "high";
    if (n >= 0.45) return "medium";
    return "low";
  };
  [criticalThin, confirmed, maint].forEach(function (c, i) {
    assertEq(c.confidenceLabel, labelFromNum(c.confidence),
      "label derived from numeric #" + i);
  });
})();

console.log("\n-- Single scoring authority path --");
(function () {
  var pair = factFrom("Room 24 AC not working. Guest is in-house. Maintenance informed but unresolved.");
  var scored = SI.scoreOperationalImpact({ fact: pair.fact, note: pair.note });
  assert(scored.operationalContext && scored.operationalContext.guestImpact === "high",
    "scoreOperationalImpact used buildOperationalContext");
  assert(typeof SI.scoreFromOperationalContext === "function", "scoreFromOperationalContext exported");
  var fromCtx = SI.scoreFromOperationalContext(scored.operationalContext, pair.fact, pair.note, "");
  assertEq(fromCtx.score, scored.score, "scoreFromOperationalContext matches scoreOperationalImpact band");

  var writingSrc = load("ai-writing-engine.js");
  var fallbackBlocks = writingSrc.match(/function (?:impactRank|briefingRank)\([\s\S]*?\n    \}/g) || [];
  assert(fallbackBlocks.length >= 2, "writing local rank fallbacks still present for unload-safe paths");
  assert(/ShiftIntelligenceEngine\.scoreOperationalImpact/.test(writingSrc),
    "writing delegates to engine scoreOperationalImpact when loaded");
  assert(!/function\s+buildOperationalContext/.test(writingSrc),
    "writing does not implement competing OperationalContext builder");
})();

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
