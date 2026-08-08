/**
 * Reasoning Sprint 7 — Canonical decision seating authority.
 * Briefing + Recommendations seat from Sprint 5/6 canonical actions.
 * Legacy paths are fill-only / wording enrich. Payment safety gate.
 * Run: node scripts/test-reasoning-sprint7-decision-seating.mjs
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
if (typeof Shift.selectDecisionSeats !== "function") {
  throw new Error("Sprint 7 selectDecisionSeats export missing");
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
    if (/maintenance|shower|broken|gas|inspect|engineer|safe/i.test(line)) section = "maintenance";
    if (/\bvip\b|champagne|flower|twin|Friends of Armi|fruit plate/i.test(line)) section = "vip";
    if (/iron|luggage|taxi|arrive|EA\s*\d|Heathrow|airport/i.test(line)) section = "guest";
    if (/late\s*(?:check|c\/?o)/i.test(line)) section = "guest";
    var fact = Engine.extractOperationalFact(line, {
      rooms: rooms,
      section: section,
      isVip: /\bvip\b|Friends of Armi/i.test(line)
    });
    return {
      original: line,
      rooms: rooms,
      section: section,
      isVip: /\bvip\b|Friends of Armi/i.test(line),
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
    handoverDate: temporal.handoverDate || "2026-08-04",
    shift: temporal.shift || "Night",
    createdAt: temporal.createdAt || "2026-08-04T22:00:00.000Z"
  });
  analyzed._canonicalActions = actions;
  var organised = Shift.buildOrganisedSectionModel(analyzed, {
    handoverDate: temporal.handoverDate || "2026-08-04",
    shift: temporal.shift || "Night"
  });
  if (organised && organised.analyzed) analyzed = organised.analyzed;
  /* Keep a single canonical action list for Briefing + Recommendations parity. */
  analyzed._canonicalActions = actions;
  analyzed._canonicalActionsBuilt = true;
  var briefing = Engine.buildTodaysBriefing(analyzed, {
    maxBlocks: 5,
    handoverDate: temporal.handoverDate || "2026-08-04",
    shift: temporal.shift || "Night",
    createdAt: temporal.createdAt || "2026-08-04T22:00:00.000Z",
    canonicalActions: actions
  });
  var result = Shift.analyze({
    shiftCode: temporal.shift || "Night",
    shiftDisplayName: temporal.shift || "Night",
    handoverDate: temporal.handoverDate || "2026-08-04",
    createdAt: temporal.createdAt || "2026-08-04T22:00:00.000Z",
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
    hotelSnapshot: { arrivals: 6, departures: 5 },
    brainContext: null
  });
  return {
    analyzed: analyzed,
    actions: actions,
    briefing: briefing,
    briefingText: ((briefing && briefing.paragraphs) || []).join("\n"),
    recommendations: result.recommendations || [],
    result: result
  };
}

function briefingHas(p, re) {
  return re.test(p.briefingText || "");
}

function recHas(p, re) {
  return (p.recommendations || []).some(function (r) { return re.test(r.text || ""); });
}

function openAction(p, facetRe) {
  return (p.actions || []).find(function (a) {
    return a.actionState === "open" && facetRe.test(a.facetKey || "");
  });
}

console.log("\n=== Sprint 7 — Canonical Decision Seating ===\n");

/* 1. 001-shaped: tokenise + Heathrow seat; Room 5 cannot displace */
{
  console.log("1. Tokenise + Heathrow seat; Room 5 cannot displace");
  var p1 = pipeline([
    "Room 22 important to fix the safe couldnt reset as it doesnt stop error had to take batteries out",
    "rm5 will be moving diff room to room on 06/08 but only",
    "room 51 cc not tokenised checking out today",
    "today taxi pick up arranged to etter marylebone",
    "Arr 11:25am",
    "London Heathrow",
    "August 4, 2026",
    "703-402-7609  Donna"
  ], {
    handoverDate: "2026-08-04",
    shift: "Night",
    createdAt: "2026-08-04T06:02:36.000Z"
  });
  var tok = openAction(p1, /payment:tokenise/);
  var air = openAction(p1, /timed:airport/);
  assert(!!tok && tok.priorityBand === "P1", "Room 51 tokenise is OPEN P1");
  assert(!!air && air.priorityBand === "P1", "Heathrow pickup is OPEN P1");
  assert(briefingHas(p1, /tokenis|guarantee/i), "Briefing seats tokenise");
  assert(briefingHas(p1, /airport|11:25|Heathrow|pickup/i), "Briefing seats Heathrow / 11:25");
  assert(recHas(p1, /tokenis|guarantee/i), "Recommendations include tokenise");
  assert(recHas(p1, /airport|11:25|pickup/i), "Recommendations include airport pickup");
  var b = p1.briefingText;
  var tokIdx = b.search(/tokenis|guarantee/i);
  var room5Idx = b.search(/Room 5|rm5|guest follow-up for Room 5/i);
  assert(tokIdx !== -1 && (room5Idx === -1 || tokIdx < room5Idx),
    "Tokenise appears before Room 5 legacy follow-up (or Room 5 absent)");
}

/* 2. 002-shaped: Room 33 false collect suppressed; Gill retained */
{
  console.log("2. Room 33 false collect suppressed; Gill retained");
  var p2 = pipeline([
    "Jonathan Bailey - rm 33 dep 07/08  / POA // 20%  off food and beverage (once per stay)",
    "VIP -Gill Beagent\trm 35 dep 06/08 \t- POA // Room and tax // Card on file guarantee only / From DD / VVIP-Place a bottle of champagne, fruits and flowers, chocolate (if we have), in the room.",
    "rm 33 late c/o at 12",
    "room 11 cc not tokenised as PDQ machine did not work again",
    "Glitch report - Polk, Jacqui TZM rm51 The guest called to report a smell of gas coming from the terrace vent at 22:35 pm The Duty Manager attended the room to investigate. As a precaution, the issue has been logged, and the Maintenance team will inspect the room and terrace vent tomorrow"
  ], {
    handoverDate: "2026-08-04",
    shift: "Night",
    createdAt: "2026-08-05T00:20:51.000Z"
  });
  assert(!recHas(p2, /Collect outstanding balance for Room 33/i),
    "No false Room 33 collect recommendation");
  assert(
    recHas(p2, /Gill Beagent|champagne|chocolates|flowers/i) ||
      !!openAction(p2, /amenity:prep/),
    "Gill amenity OPEN retained as action/rec"
  );
  assert(recHas(p2, /Gill Beagent|champagne/i), "Gill appears in recommendations");
  var rm11 = (p2.actions || []).find(function (a) {
    return /payment:tokenise/i.test(a.facetKey || "") && String(a.room) === "11";
  });
  assert(rm11 && rm11.actionState === "monitor", "Room 11 tokenise remains MONITOR (fail-closed)");
}

/* 3. 003-shaped: Room 12 seated; future flowers remain MONITOR */
{
  console.log("3. Room 12 seated; future flowers remain MONITOR");
  var p3 = pipeline([
    "Josh Piercey-Fisher\trm 51\tdep\t07/08/2026\t\tChampagne & truffles to be set up in the room - comp // 10th anniversary / The guest arranged flower delivery on 06.08.2026 morning. When the room's ready, please place the flower in the room.-An",
    "Hayden Landry\t\t2x rooms \t43 / 42\tdep -\t09/08/2026\t\tVIP / 1 of 2 rooms// Twin beds only for room 43  / breakfast added/",
    "rm 5 and 14 late check-outs todat @ 12",
    "room 12 pre reg still to arrive today"
  ], {
    handoverDate: "2026-08-05",
    shift: "Night",
    createdAt: "2026-08-06T05:37:12.000Z"
  });
  var arrival = openAction(p3, /timed:arrival_today/);
  assert(!!arrival && String(arrival.room) === "12", "Room 12 arrival OPEN");
  assert(
    briefingHas(p3, /Room 12|arrive today|still to arrive/i) ||
      recHas(p3, /Room 12|arrive today|still to arrive/i),
    "Room 12 seated in briefing or recommendations"
  );
  var flowers = (p3.actions || []).find(function (a) {
    return /amenity:flowers_future/i.test(a.facetKey || "");
  });
  assert(flowers && flowers.actionState === "monitor", "Flowers remain MONITOR");
  assert(!briefingHas(p3, /Prepare champagne \+ flowers/i),
    "Briefing does not re-merge flowers into tonight champagne prep");
  var late = (p3.actions || []).find(function (a) {
    return /timed:late_checkout/i.test(a.facetKey || "");
  });
  assert(!late || late.actionState === "unresolved",
    "Late checkout remains unresolved / fail-closed");
}

/* 4. 004-shaped: Jihyun near OPEN seated */
{
  console.log("4. Jihyun near-term OPEN seated");
  var p4 = pipeline([
    "JIHYUN AN\t\t\t2\t\t09/08/2026\t\tHi, We arrive with morning flight at Gatwick 10:20 am and would like to leave our luggage at the hotel around lunch if that is possible. Also on the 9th August after checking out, we would like to keep our luggage at the hotel and pick them up in the late evening around 10 pm / EA 11am // Please advice of the complimentary upgrade",
    "Mrs. Anne Molyneux\t\trm\t33 & 31\tdeparting\t09/08/2026\t\tIroning board and iron // room 33 set as TWIN",
    "22 late c/o @12"
  ], {
    handoverDate: "2026-08-07",
    shift: "Night",
    createdAt: "2026-08-07T05:14:01.000Z"
  });
  var jihyun = openAction(p4, /ea_luggage_near/);
  assert(!!jihyun, "Jihyun near-term EA/luggage OPEN exists");
  assert(
    briefingHas(p4, /early arrival|lunch luggage|luggage arrangements/i) ||
      recHas(p4, /early arrival|lunch luggage|luggage arrangements/i),
    "Jihyun near OPEN seated in briefing or recommendations"
  );
  var futureHold = (p4.actions || []).find(function (a) {
    return /luggage_future_hold/i.test(a.facetKey || "");
  });
  assert(futureHold && futureHold.actionState === "monitor",
    "Future luggage remains MONITOR");
}

/* 5. 005-shaped: Benjamin before iron; AM taxi covered */
{
  console.log("5. Benjamin before iron; AM taxi covered");
  var p5 = pipeline([
    "Benjamin James\t\trm\t51\t\t\t\tPOA / Friends of Armi please ensure guest is looked after. / Comp upgrade to the loft. / Place fruit plate in the room, comp drinks in the parlour, card under Armi's name for Ben and Sophie.",
    "Mme Brittany Stewart\t\trm\t14\t\t\tIroning board and iron / Charge £28 on guest's personal CC for breakfast (Fixed charges added)",
    "Taxi booked at am for room 5&15  and  they together. Also they will store their bags for 2 weeks."
  ], {
    handoverDate: "2026-08-07",
    shift: "Night",
    createdAt: "2026-08-08T05:29:27.000Z"
  });
  var ben = openAction(p5, /arrival_prep:high_touch/);
  var iron = openAction(p5, /guest_request:iron/);
  var taxi = openAction(p5, /timed:am_taxi/);
  assert(!!ben && ben.priorityBand === "P1", "Benjamin is OPEN P1");
  assert(!!iron && iron.priorityBand === "P2", "Iron is OPEN P2");
  assert(!!taxi, "AM taxi is OPEN");
  assert(briefingHas(p5, /Benjamin|fruit plate|Friends of Armi|loft/i),
    "Briefing seats Benjamin");
  var benIdx = p5.briefingText.search(/Benjamin|fruit plate|loft upgrade/i);
  var ironIdx = p5.briefingText.search(/iron/i);
  assert(benIdx !== -1 && (ironIdx === -1 || benIdx < ironIdx),
    "Benjamin appears before iron in briefing");
  assert(recHas(p5, /taxi|Rooms 5|room 5/i), "AM taxi covered in recommendations");
}

/* 6. Blocked actions remain blocked / non-do-now */
{
  console.log("6. Blocked / non-do-now states");
  var seats = Shift.selectDecisionSeats([
    {
      actionId: "a-open",
      actionState: "open",
      actionability: "actionable",
      priorityBand: "P1",
      priorityScore: 20,
      facetKey: "maintenance",
      actionText: "Follow up maintenance for Room 9",
      room: "9",
      currentStateEligible: true
    },
    {
      actionId: "a-blocked",
      actionState: "open",
      actionability: "blocked",
      priorityBand: "P1",
      priorityScore: 10,
      facetKey: "payment:tokenise",
      actionText: "Should not seat blocked",
      room: "8",
      currentStateEligible: true
    },
    {
      actionId: "a-unresolved",
      actionState: "unresolved",
      actionability: "unresolved",
      priorityBand: "P2",
      priorityScore: 40,
      facetKey: "timed:late_checkout",
      actionText: "Unresolved late check-out",
      room: "5",
      currentStateEligible: true
    },
    {
      actionId: "a-info",
      actionState: "information",
      priorityBand: "P3",
      priorityScore: 80,
      facetKey: "reservation_info",
      actionText: "Reservation info only",
      currentStateEligible: true
    }
  ], { surface: "briefing", maxN: 5, allowMonitorContinuity: true });
  var ids = (seats.seats || []).map(function (s) { return s.actionId; });
  assert(ids.indexOf("a-open") !== -1, "OPEN actionable seats");
  assert(ids.indexOf("a-blocked") === -1, "Blocked actionability does not seat");
  assert(ids.indexOf("a-unresolved") === -1, "UNRESOLVED does not seat as do-now");
  assert(ids.indexOf("a-info") === -1, "INFORMATION does not seat as do-now");
}

/* 7. MONITOR continuity only; never do-now chase */
{
  console.log("7. MONITOR continuity-only");
  var seats7 = Shift.selectDecisionSeats([
    {
      actionId: "m1",
      actionState: "monitor",
      actionability: "actionable",
      priorityBand: "P2",
      priorityScore: 55,
      facetKey: "maintenance:tomorrow_inspect",
      actionText: "Monitor Room 51 — maintenance inspection due tomorrow",
      room: "51",
      currentStateEligible: true
    },
    {
      actionId: "f1",
      actionState: "monitor",
      priorityBand: "P2",
      priorityScore: 50,
      facetKey: "amenity:flowers_future",
      actionText: "Monitor flower delivery tomorrow",
      room: "51",
      currentStateEligible: true
    }
  ], { surface: "briefing", maxN: 5, allowMonitorContinuity: true });
  assert((seats7.seats || []).some(function (s) {
    return s.actionId === "m1" && s.seatKind === "continuity";
  }), "Tomorrow maint MONITOR may seat as continuity");
  assert(!(seats7.seats || []).some(function (s) { return s.actionId === "f1"; }),
    "Future flowers MONITOR is not auto-seated as continuity");
}

/* 8. Briefing ↔ recommendation actionId parity for do-now seats */
{
  console.log("8. Canonical actionId parity across Briefing and Recommendations");
  var p8 = pipeline([
    "Room 22 important to fix the safe couldnt reset",
    "room 51 cc not tokenised checking out today",
    "Benjamin James\trm 51\tFriends of Armi / Place fruit plate in the room, comp drinks, card under Armi's name"
  ], {
    handoverDate: "2026-08-07",
    shift: "Night",
    createdAt: "2026-08-07T22:00:00.000Z"
  });
  var briefingIds = ((p8.briefing && p8.briefing.briefingModel &&
    p8.briefing.briefingModel.priorities) || [])
    .filter(function (s) { return s.canonicalSeed && s.seatKind !== "continuity"; })
    .map(function (s) { return s.canonicalActionId || s.objectId; })
    .filter(Boolean);
  var recIds = (p8.recommendations || [])
    .map(function (r) { return r.canonicalActionId || r.id; })
    .filter(Boolean);
  var missing = briefingIds.filter(function (id) { return recIds.indexOf(id) === -1; });
  assert(briefingIds.length > 0, "Briefing has canonical do-now seat ids");
  assert(missing.length === 0,
    "Every briefing do-now canonicalActionId appears in recommendations (" +
      missing.join(",") + ")");
}

/* 9. Payment gate unit */
{
  console.log("9. Payment safety gate");
  assert(
    !Shift.passesPaymentSafetyGate(
      "Collect outstanding balance for Room 33 before departure.",
      [],
      { sourceText: "rm 33 late c/o at 12", rooms: ["33"] },
      { original: "rm 33 late c/o at 12", rooms: ["33"] }
    ),
    "Late c/o alone fails payment gate"
  );
  assert(
    !Shift.passesPaymentSafetyGate(
      "Collect outstanding balance for Room 33 before departure.",
      [],
      { sourceText: "Jonathan Bailey - rm 33 dep 07/08 / POA", rooms: ["33"], subject: "reservation_info" },
      { original: "Jonathan Bailey - rm 33 dep 07/08 / POA" }
    ),
    "POA / reservation alone fails payment gate"
  );
  assert(
    Shift.passesPaymentSafetyGate(
      "Collect outstanding £120 balance for Room 8 before departure.",
      [],
      { sourceText: "Room 8 outstanding balance £120 still unpaid", rooms: ["8"] },
      { original: "Room 8 outstanding balance £120 still unpaid" }
    ),
    "Explicit outstanding balance evidence passes payment gate"
  );
}

console.log("\n=== Results: " + passed + " passed, " + failed + " failed ===\n");
if (failed) process.exit(1);
