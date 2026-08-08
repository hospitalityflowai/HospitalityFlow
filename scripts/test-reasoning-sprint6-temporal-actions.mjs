/**
 * Reasoning Sprint 6 — Temporal / today action eligibility.
 * Operational-day anchor + canonical actionState. Fail closed when ambiguous.
 * Run: node scripts/test-reasoning-sprint6-temporal-actions.mjs
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
if (typeof Shift.buildOperationalDayAnchor !== "function") {
  throw new Error("Sprint 6 temporal exports missing");
}

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
    if (/balance|payment|folio|settled|invoice|bill|£|paid|poa|refund|tokenis/i.test(line)) {
      section = "payments";
    }
    if (/maintenance|shower|broken|gas|inspect|engineer/i.test(line)) section = "maintenance";
    if (/\bvip\b|champagne|flower|twin/i.test(line)) section = "vip";
    if (/iron|luggage|taxi|arrive|EA\s*\d/i.test(line)) section = "guest";
    if (/late\s*(?:check|c\/?o)/i.test(line)) section = "guest";
    var fact = Engine.extractOperationalFact(line, {
      rooms: rooms,
      section: section,
      isVip: /\bvip\b/i.test(line)
    });
    return {
      original: line,
      rooms: rooms,
      section: section,
      isVip: /\bvip\b/i.test(line),
      isCarriedOver: false,
      isFollowUp: false,
      maintenancePriority: section === "maintenance" ? "High" : null,
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
    handoverDate: temporal.handoverDate || "2026-08-05",
    shift: temporal.shift || "Night",
    createdAt: temporal.createdAt || "2026-08-05T22:00:00.000Z"
  });
  var organised = Shift.buildOrganisedSectionModel(analyzed, {
    handoverDate: temporal.handoverDate || "2026-08-05",
    shift: temporal.shift || "Night"
  });
  if (organised && organised.analyzed) analyzed = organised.analyzed;
  var briefing = Engine.buildTodaysBriefing(analyzed, {
    maxBlocks: 6,
    handoverDate: temporal.handoverDate || "2026-08-05",
    shift: temporal.shift || "Night",
    canonicalActions: actions
  });
  var result = Shift.analyze({
    shiftCode: temporal.shift || "Night",
    shiftDisplayName: temporal.shift || "Night",
    handoverDate: temporal.handoverDate || "2026-08-05",
    createdAt: temporal.createdAt || "2026-08-05T22:00:00.000Z",
    rawNotesText: lines.join("\n"),
    classified: {
      _analyzed: analyzed,
      _metrics: { urgent: 1, vip: 1, maintenance: 1, payments: 1, events: 1, tasks: 1 }
    },
    metrics: { urgent: 1, vip: 1, maintenance: 1, payments: 1, events: 1, tasks: 1 },
    departments: [
      "Reception", "Housekeeping", "Maintenance", "Duty Manager",
      "Night Team", "Guest Services", "Finance", "F&B"
    ],
    selectedDepartment: "Reception",
    hotelSnapshot: { arrivals: 8, departures: 6 },
    brainContext: null
  });
  return {
    actions: actions,
    briefing: briefing,
    recommendations: result.recommendations || [],
    analyzed: analyzed
  };
}

function findAction(actions, pred) {
  return (actions || []).find(pred);
}

function briefingBlob(briefing) {
  if (!briefing) return "";
  if (Array.isArray(briefing.paragraphs)) return briefing.paragraphs.join("\n");
  return String(briefing.text || briefing.summary || JSON.stringify(briefing));
}

function recBlob(recs) {
  return (recs || []).map(function (r) { return r.text || ""; }).join("\n");
}

console.log("\n=== Sprint 6 — Temporal / today action eligibility ===\n");

{
  console.log("1. Checkout today + CC not tokenised → OPEN");
  var p = pipeline(["room 51 cc not tokenised checking out today"], {
    handoverDate: "2026-08-04",
    shift: "Night"
  });
  var tok = findAction(p.actions, function (a) {
    return /tokenis/i.test(a.facetKey + a.actionText);
  });
  assert(tok && tok.actionState === "open", "Tokenisation action OPEN");
  assert(tok && String(tok.room) === "51", "Tokenisation bound to Room 51");
  assert(/tokenis|guarantee/i.test(recBlob(p.recommendations)), "Recs include tokenisation");
}

{
  console.log("2. Airport pickup today + time → OPEN timed");
  var p2 = pipeline([
    "today taxi pick up arranged to Zetter",
    "Arr 11:25am",
    "London Heathrow",
    "August 4, 2026",
    "703-402-7609 Donna"
  ], { handoverDate: "2026-08-04", shift: "Night", createdAt: "2026-08-04T06:00:00.000Z" });
  var air = findAction(p2.actions, function (a) {
    return a.facetKey === "timed:airport" && a.actionState === "open";
  });
  assert(!!air, "Airport timed OPEN from clustered fragments");
  assert(/11:25|noted time|pickup/i.test(air.actionText), "Airport action carries time cue");
}

{
  console.log("3. Tomorrow inspection → MONITOR/FUTURE");
  var p3 = pipeline([
    "Room 51 gas smell. Duty Manager attended. Maintenance will inspect the room and terrace vent tomorrow."
  ], { handoverDate: "2026-08-04", shift: "Night" });
  var mon = findAction(p3.actions, function (a) {
    return /maintenance/i.test(a.facetKey) && a.actionState === "monitor";
  });
  assert(!!mon, "Tomorrow inspection is MONITOR");
  assert(!/before further guest impact/i.test(recBlob(p3.recommendations)),
    "No immediate danger-chase rec for tomorrow inspect");
  assert(/tomorrow|Monitor/i.test(mon.actionText + recBlob(p3.recommendations)),
    "Monitor wording present");
}

{
  console.log("4. Late checkout today @12 upcoming → OPEN");
  var p4 = pipeline(["rm 5 and 14 late check-outs today @12"], {
    handoverDate: "2026-08-05",
    shift: "AM",
    createdAt: "2026-08-05T08:00:00.000Z"
  });
  var lco = findAction(p4.actions, function (a) {
    return /late_checkout/i.test(a.facetKey);
  });
  assert(lco && lco.actionState === "open", "Late c/o OPEN when upcoming on AM shift");
}

{
  console.log("5. Late checkout clearly elapsed → not do-now");
  var p5 = pipeline(["Room 22 late c/o today @12"], {
    handoverDate: "2026-08-07",
    shift: "PM",
    createdAt: "2026-08-07T15:30:00.000Z"
  });
  var lco2 = findAction(p5.actions, function (a) {
    return /late_checkout/i.test(a.facetKey);
  });
  assert(lco2 && lco2.actionState !== "open", "Elapsed late c/o is not OPEN");
  assert(lco2 && (lco2.actionState === "information" || lco2.temporalScope === "past"),
    "Elapsed late c/o is information/past");
}

{
  console.log("6. Still to arrive today → OPEN");
  var p6 = pipeline(["room 12 pre reg still to arrive today"], {
    handoverDate: "2026-08-05",
    shift: "Night"
  });
  var arr = findAction(p6.actions, function (a) {
    return /arrival_today/i.test(a.facetKey);
  });
  assert(arr && arr.actionState === "open", "Arrival-today OPEN");
  assert(String(arr.room) === "12", "Arrival-today Room 12");
}

{
  console.log("7. Flowers tomorrow morning → FUTURE/MONITOR");
  var p7 = pipeline([
    "VIP Guest Example rm 51 — Champagne to set up. Flower delivery tomorrow morning when room ready."
  ], { handoverDate: "2026-08-05", shift: "Night" });
  var flowers = findAction(p7.actions, function (a) {
    return /flower/i.test(a.facetKey + a.actionText) && a.actionState === "monitor";
  });
  assert(!!flowers, "Future/tomorrow flowers MONITOR");
}

{
  console.log("8. EA 11am + luggage today → OPEN/timed");
  var p8 = pipeline([
    "=== TODAY'S ARRIVALS ===\nGUEST EXAMPLE\t\t2\t\t09/08/2026\t\tEA 11am // leave luggage around lunch if possible"
  ], { handoverDate: "2026-08-07", shift: "Night" });
  var ea = findAction(p8.actions, function (a) {
    return /ea_luggage_near|luggage_ea/i.test(a.facetKey) && a.actionState === "open";
  });
  assert(!!ea, "Near-term EA/lunch luggage OPEN");
}

{
  console.log("9. Explicit future post-checkout luggage → FUTURE");
  var p9 = pipeline([
    "GUEST EXAMPLE rm 2 — EA 11am. Also on the 9th August after checking out, keep luggage until 10 pm."
  ], { handoverDate: "2026-08-07", shift: "Night" });
  var fut = findAction(p9.actions, function (a) {
    return /luggage_future|future/i.test(a.facetKey) ||
      (a.actionState === "monitor" && /post-checkout luggage/i.test(a.actionText));
  });
  assert(!!fut, "Future luggage hold MONITOR/FUTURE");
  assert(fut.temporalScope === "future" || /future/i.test(fut.temporalScope + fut.actionText),
    "Future scope marked");
}

{
  console.log("10. AM taxi current window → timed action");
  var p10 = pipeline([
    "Taxi booked at am for room 5&15 and they together. Also they will store their bags for 2 weeks."
  ], { handoverDate: "2026-08-07", shift: "Night" });
  var taxi = findAction(p10.actions, function (a) {
    return /am_taxi/i.test(a.facetKey);
  });
  var bags = findAction(p10.actions, function (a) {
    return /bag_storage/i.test(a.facetKey);
  });
  assert(taxi && taxi.actionState === "open", "AM taxi OPEN on Night handover");
  assert(!!bags && bags.actionState !== "open", "2-week bags not same OPEN taxi action");
}

{
  console.log("11. Departure date ≠ arrival date");
  var p11 = pipeline([
    "=== TODAY'S ARRIVALS ===\nM. Phoebe Example\trm\t1\tdeparting\t08/08/2026\t\tPOA // card on file"
  ], { handoverDate: "2026-08-07", shift: "Night" });
  var badArrival = (p11.actions || []).some(function (a) {
    return /arrival_today/i.test(a.facetKey) && /Phoebe/i.test(a.canonicalName + a.actionText);
  });
  assert(!badArrival, "Departing guest under Arrivals is not arrival-today action");
}

{
  console.log("12. Arrivals heading cannot override explicit departing");
  var p12 = pipeline([
    "=== TODAY'S ARRIVALS ===\nAnne Example\trm 33 departing 09/08/2026 Ironing board and iron"
  ], { handoverDate: "2026-08-07", shift: "Night" });
  assert(!(p12.actions || []).some(function (a) {
    return a.actionState === "open" && /arriv/i.test(a.actionText) && /Anne/i.test(a.actionText);
  }), "Explicit departing does not become arrival OPEN");
}

{
  console.log("13–14. Night midnight crossing — ambiguous today @12 → unresolved");
  var p13 = pipeline(["rm 5 and 14 late check-outs today @12"], {
    handoverDate: "2026-08-05",
    shift: "Night",
    createdAt: "2026-08-06T05:30:00.000Z"
  });
  var amb = findAction(p13.actions, function (a) {
    return /late_checkout/i.test(a.facetKey);
  });
  assert(amb && (amb.actionState === "unresolved" || amb.temporalScope === "ambiguous"),
    "Ambiguous today @12 after midnight → unresolved/ambiguous");
}

{
  console.log("15. Temporal action keeps correct entity/room");
  var p15 = pipeline(["room 51 cc not tokenised checking out today"], {
    handoverDate: "2026-08-04",
    shift: "Night"
  });
  var t15 = findAction(p15.actions, function (a) { return /tokenis/i.test(a.facetKey); });
  assert(t15 && t15.room === "51", "Room binding retained on temporal OPEN");
}

{
  console.log("16. Superseded timed item excluded");
  var analyzed16 = makeAnalyzed(["Room 22 late check-out today @12"]);
  analyzed16 = Engine.resolveOperationalEntities(analyzed16);
  analyzed16 = Engine.electCanonicalCurrentState(analyzed16);
  analyzed16[0]._superseded = true;
  analyzed16[0].superseded = true;
  if (analyzed16[0].fact) {
    analyzed16[0].fact.superseded = true;
    analyzed16[0].fact.status = "done";
  }
  var acts16 = Shift.buildCanonicalOperationalActions(analyzed16, {
    handoverDate: "2026-08-05",
    shift: "AM",
    createdAt: "2026-08-05T08:00:00.000Z"
  });
  var openLate = (acts16 || []).filter(function (a) {
    return a.actionState === "open" && /late_checkout/i.test(a.facetKey);
  });
  assert(openLate.length === 0, "Superseded late c/o not OPEN");
}

{
  console.log("17. Blocked timed action remains blocked");
  var analyzed17 = makeAnalyzed(["room 33 cc not tokenised checking out today"]);
  analyzed17 = Engine.resolveOperationalEntities(analyzed17);
  analyzed17 = Engine.electCanonicalCurrentState(analyzed17);
  analyzed17[0].actionability = "blocked";
  analyzed17[0].blockedBy = ["dep:gate"];
  if (analyzed17[0].fact) {
    analyzed17[0].fact.actionability = "blocked";
    analyzed17[0].fact.blockedBy = ["dep:gate"];
  }
  var acts17 = Shift.buildCanonicalOperationalActions(analyzed17, {
    handoverDate: "2026-08-04",
    shift: "Night"
  });
  var blocked = findAction(acts17, function (a) { return /tokenis/i.test(a.facetKey); });
  assert(blocked && blocked.actionState === "blocked", "Blocked tokenise stays blocked");
}

{
  console.log("18. Sprint 5 canonical timing matches briefing/recommendations");
  var p18 = pipeline(["room 51 cc not tokenised checking out today"], {
    handoverDate: "2026-08-04",
    shift: "Night"
  });
  var a18 = findAction(p18.actions, function (a) {
    return a.actionState === "open" && /tokenis/i.test(a.facetKey);
  });
  var blob18 = briefingBlob(p18.briefing) + "\n" + recBlob(p18.recommendations);
  assert(a18 && /51/.test(blob18) && /tokenis|guarantee/i.test(blob18),
    "Briefing/recs consume same tokenisation temporal OPEN");
}

{
  console.log("19. No duplicate actions from date + section + time");
  var p19 = pipeline([
    "today taxi pick up arranged",
    "Arr 11:25am",
    "London Heathrow",
    "August 4, 2026"
  ], { handoverDate: "2026-08-04", shift: "Night" });
  var airs = (p19.actions || []).filter(function (a) {
    return a.facetKey === "timed:airport" && a.actionState === "open";
  });
  assert(airs.length === 1, "Single clustered airport OPEN (no duplicates)");
}

{
  console.log("20. Deterministic temporal result");
  var lines20 = ["room 51 cc not tokenised checking out today"];
  var opts20 = { handoverDate: "2026-08-04", shift: "Night", createdAt: "2026-08-04T06:00:00Z" };
  var a = pipeline(lines20, opts20);
  var b = pipeline(lines20, opts20);
  assert(JSON.stringify(a.actions.map(function (x) {
    return [x.facetKey, x.actionState, x.room, x.temporalScope];
  })) === JSON.stringify(b.actions.map(function (x) {
    return [x.facetKey, x.actionState, x.room, x.temporalScope];
  })), "Deterministic temporal actions");
}

console.log("\n========================================");
console.log("Sprint 6 results: " + passed + " passed, " + failed + " failed");
console.log("========================================\n");
process.exit(failed ? 1 : 0);
