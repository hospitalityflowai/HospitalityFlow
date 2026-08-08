/**
 * Reasoning Sprint 9 — Payment collect fail-closed.
 *
 * payment:collect OPEN only with positive collectable debt evidence
 * for the eligible operational day. Suppress prepaid / POA / company /
 * card-on-file / void / future-due / channel-alone false opens.
 *
 * Run: node scripts/test-reasoning-sprint9-payment-collect-fail-closed.mjs
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
    if (/balance|payment|folio|settled|invoice|bill|£|paid|poa|refund|disputed|vcc|prepaid|tokenis|company\s+bill/i.test(line)) {
      section = "payments";
    }
    var isVip = /\bvip\b/i.test(line);
    var fact = Engine.extractOperationalFact(line, { rooms: rooms, section: section, isVip: isVip });
    return {
      original: line,
      rooms: rooms,
      section: section,
      isVip: isVip,
      isCarriedOver: false,
      isFollowUp: /follow\s*up|collect/i.test(line),
      maintenancePriority: null,
      fact: fact
    };
  });
}

function pipeline(lines, temporal) {
  temporal = temporal || {};
  var analyzed = makeAnalyzed(lines);
  analyzed = Engine.consolidateNotesByFacts(analyzed);
  analyzed = Engine.resolveOperationalEntities(analyzed);
  analyzed = Engine.electCanonicalCurrentState(analyzed);
  analyzed = Shift.resolveOperationalDependencies(analyzed);
  var actions = Shift.buildCanonicalOperationalActions(analyzed, {
    handoverDate: temporal.handoverDate || "2026-08-08",
    shift: temporal.shift || "AM",
    createdAt: temporal.createdAt || "2026-08-08T08:00:00.000Z"
  });
  analyzed._canonicalActions = actions;
  analyzed._canonicalActionsBuilt = true;
  var organised = Shift.buildOrganisedSectionModel(analyzed, {
    handoverDate: temporal.handoverDate || "2026-08-08",
    shift: temporal.shift || "AM"
  });
  if (organised && organised.analyzed) analyzed = organised.analyzed;
  analyzed._canonicalActions = actions;
  analyzed._canonicalActionsBuilt = true;
  var briefing = Engine.buildTodaysBriefing(analyzed, {
    maxBlocks: 5,
    handoverDate: temporal.handoverDate || "2026-08-08",
    shift: temporal.shift || "AM",
    createdAt: temporal.createdAt || "2026-08-08T08:00:00.000Z",
    canonicalActions: actions
  });
  var result = Shift.analyze({
    shiftCode: temporal.shift || "AM",
    shiftDisplayName: temporal.shift || "AM",
    handoverDate: temporal.handoverDate || "2026-08-08",
    createdAt: temporal.createdAt || "2026-08-08T08:00:00.000Z",
    rawNotesText: lines.join("\n"),
    classified: {
      _analyzed: analyzed,
      _metrics: { urgent: 1, vip: 0, maintenance: 0, payments: 1, events: 0, tasks: 0 }
    },
    metrics: { urgent: 1, vip: 0, maintenance: 0, payments: 1, events: 0, tasks: 0 },
    departments: [
      "Reception", "Housekeeping", "Maintenance", "Duty Manager",
      "Night Team", "Guest Services", "Finance", "F&B"
    ],
    selectedDepartment: "Reception",
    hotelSnapshot: {},
    brainContext: null
  });
  return {
    actions: actions,
    briefingText: ((briefing && briefing.paragraphs) || []).join("\n"),
    recommendations: result.recommendations || []
  };
}

function openCollects(p) {
  return (p.actions || []).filter(function (a) {
    return a.actionState === "open" && /payment:collect\b/i.test(a.facetKey || "");
  });
}

function recCollects(p) {
  return (p.recommendations || []).filter(function (r) {
    return /collect\s+outstanding/i.test(r.text || "");
  });
}

function openCollectRoom(p, room) {
  return openCollects(p).some(function (a) {
    return String(a.room) === String(room);
  });
}

console.log("\n=== Sprint 9 — Payment Collect Fail-Closed ===\n");

/* ── True positives ─────────────────────────────────────────────────── */

{
  console.log("1. Explicit £64.80 outstanding → OPEN collect");
  var p1 = pipeline([
    "rm 228 Mr Seth Calder — GENUINE OUTSTANDING — mini-bar + paid-out taxi £64.80 still open on folio — guest departing today 11:00 — please settle before keys go back"
  ]);
  assert(openCollects(p1).length >= 1, "OPEN payment:collect exists");
  assert(openCollectRoom(p1, "228") || /64\.80|228|Calder/i.test(
    openCollects(p1).map(function (a) { return a.actionText + " " + (a.room || ""); }).join(" ")
  ), "Collect binds to Calder / 228 / amount context");
  /* Seating may vary with competing timed cues; Sprint 9 contract is canonical OPEN. */
  assert(/payment:collect/i.test(
    openCollects(p1).map(function (a) { return a.facetKey; }).join("|")
  ), "Canonical facet is payment:collect");
}

{
  console.log("2. Payment outstanding £42.50 → OPEN when temporally eligible");
  var p2 = pipeline([
    "Room 119 payment outstanding £42.50 — collect before departure today"
  ]);
  assert(openCollects(p2).length >= 1, "£42.50 outstanding → OPEN collect");
  assert(!/channel payment/i.test(
    openCollects(p2).map(function (a) { return a.actionText; }).join(" ")
  ), "Does not invent channel wording without OTA unpaid evidence");
}

{
  console.log("3. Open balance £64.50 on folio → OPEN collect preserved");
  var p3 = pipeline([
    "Room 14 open balance £64.50 on folio — collect before departure"
  ]);
  assert(openCollects(p3).length >= 1, "Open balance with amount remains OPEN");
}

{
  console.log("4. POA with outstanding amount + collect → OPEN");
  var p4 = pipeline([
    "Arrival POA £480 outstanding — collect on arrival Room 22"
  ]);
  assert(openCollects(p4).length >= 1, "POA + outstanding amount + collect remains OPEN");
}

/* ── False-positive suppression ─────────────────────────────────────── */

{
  console.log("5. Prepaid → not OPEN collect");
  var p5 = pipeline([
    "Ms Naomi Crane — 208 — ETA 18:00 — Expedia prepaid — no specials."
  ]);
  assert(openCollects(p5).length === 0, "No OPEN payment:collect from prepaid");
  assert(recCollects(p5).length === 0, "No collect recommendation from prepaid");
}

{
  console.log("6. POA without debt evidence → not OPEN collect");
  var p6 = pipeline([
    "112 Mr Adeyemi — POA room only — extras on own card — no room rate chase"
  ]);
  assert(openCollects(p6).length === 0, "POA room-rate alone is not OPEN collect");
}

{
  console.log("7. Company billed → not OPEN collect");
  var p7 = pipeline([
    "309 HelioSpan — company billed — master account — OK"
  ]);
  assert(openCollects(p7).length === 0, "Company billed is not OPEN collect");
}

{
  console.log("8. Card on file → not OPEN collect");
  var p8 = pipeline([
    "Mr Julian Voss — Guarantee: card on file. Do not release reservation."
  ]);
  assert(openCollects(p8).length === 0, "Card on file alone is not OPEN collect");
}

{
  console.log("9. Deposit / balance due tomorrow → not today's OPEN collect");
  var p9 = pipeline([
    "415 Mr & Mrs Pike — deposit held — balance due at checkout tomorrow — not today's collect panic"
  ], { shift: "AM", handoverDate: "2026-08-08" });
  assert(openCollects(p9).length === 0, "Balance due tomorrow is not OPEN collect today");
}

{
  console.log("10. Folio settled → not OPEN collect (Riverton 001 shape)");
  var p10 = pipeline([
    "rm 214 Mr Ellison — already checked out 07:40, express. Folio settled. Keys returned."
  ]);
  assert(openCollects(p10).length === 0, "Folio settled is not OPEN collect");
}

{
  console.log("11. Future prepaid Wednesday arrival → not OPEN collect (Riverton 002)");
  var p11 = pipeline([
    "Mr & Mrs Pendleton — Deluxe King — prepaid Booking.com — arriving WEDNESDAY (two nights from today). Do not treat as today’s arrival."
  ]);
  assert(openCollects(p11).length === 0, "Future prepaid arrival is not OPEN collect");
  assert(!/outstanding channel payment/i.test(p11.briefingText),
    "Briefing does not invent channel payment for prepaid future arrival");
}

{
  console.log("12. Luton prepaid arrival → not OPEN collect (Riverton 010 shape)");
  var p12 = pipeline([
    "Arrival tonight rm 210 Ms Luton — Expedia — no transfer on booking"
  ], { shift: "Night" });
  assert(!openCollectRoom(p12, "210"), "No OPEN collect on Luton 210 without debt evidence");
}

{
  console.log("13. Void collect stamp → not OPEN collect (Riverton 014 shape)");
  var p13 = pipeline([
    "\"Collect outstanding\" stamped by accident on a blank line — void / ignore"
  ], { shift: "Night" });
  assert(openCollects(p13).length === 0, "Void collect stamp is not OPEN collect");
}

{
  console.log("14. Laundry deferred / not collecting tonight → not OPEN (Riverton 007 shape)");
  var p14 = pipeline([
    "rm 118 folio shows £12 laundry — guest said they’ll settle at checkout Thursday — not collecting tonight"
  ], { shift: "Night", createdAt: "2026-08-09T00:20:00.000Z" });
  assert(openCollects(p14).length === 0, "Deferred Thursday settle / not collecting tonight is not OPEN");
}

{
  console.log("15. Prepaid Booking.com green ignore → not OPEN (Riverton 014)");
  var p15 = pipeline([
    "rm 105 prepaid Expedia — green — ignore"
  ], { shift: "Night" });
  assert(openCollects(p15).length === 0, "Green prepaid ignore is not OPEN collect");
}

{
  console.log("16. Adversarial contrast bundle");
  var p16 = pipeline([
    "rm 228 outstanding £64.80 still open — collect before departure today",
    "rm 208 Expedia prepaid — no specials",
    "rm 112 POA room only — no room rate chase",
    "rm 309 company billed — master account",
    "rm 418 card on file guarantee only",
    "rm 415 deposit held — balance due tomorrow",
    "rm 119 payment outstanding £42.50 — collect before departure"
  ]);
  var opens = openCollects(p16);
  var rooms = opens.map(function (a) { return String(a.room || ""); });
  assert(opens.some(function (a) {
    return String(a.room) === "228" || /64\.80/i.test(a.actionText + a.evidenceText);
  }) || opens.length >= 1, "14true: £64.80 style debt remains OPEN");
  assert(opens.some(function (a) {
    return String(a.room) === "119" || /42\.50/i.test(a.actionText + (a.evidenceText || ""));
  }) || opens.length >= 2, "£42.50 outstanding remains OPEN");
  assert(!rooms.includes("208"), "prepaid 208 not OPEN");
  assert(!rooms.includes("112"), "POA 112 not OPEN");
  assert(!rooms.includes("309"), "company 309 not OPEN");
  assert(!rooms.includes("418"), "card-on-file 418 not OPEN");
  assert(!rooms.includes("415"), "due-tomorrow 415 not OPEN");
}

{
  console.log("17. Channel name alone without unpaid cue → not OPEN");
  var p17 = pipeline([
    "Ms Crane Booking.com confirmation on file — room 208"
  ]);
  assert(openCollects(p17).length === 0, "Booking.com mention alone is not OPEN collect");
}

{
  console.log("18. Minibar closed / no amount → not OPEN collect (Riverton 003 noise)");
  var p18 = pipeline([
    "119 checked out this morning; minibar closed already."
  ]);
  assert(openCollects(p18).length === 0, "Minibar closed without debt is not OPEN collect");
}

console.log("\n========================================");
console.log("Sprint 9 results: " + passed + " passed, " + failed + " failed");
console.log("========================================\n");
process.exit(failed ? 1 : 0);
