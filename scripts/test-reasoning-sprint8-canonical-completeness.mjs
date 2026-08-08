/**
 * Reasoning Sprint 8 — Canonical action completeness.
 * Allocation / conflict clarification / bind-on-action / amenity fidelity.
 * Does not redesign Sprint 3 entity resolution, Sprint 6 temporal, or Sprint 7 seating.
 * Run: node scripts/test-reasoning-sprint8-canonical-completeness.mjs
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
if (typeof Shift.buildCanonicalOperationalActions !== "function") {
  throw new Error("buildCanonicalOperationalActions not exported");
}
if (typeof Shift.selectDecisionSeats !== "function") {
  throw new Error("selectDecisionSeats not exported");
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
    if (/\bvip\b|champagne|flower|twin|Friends of Armi|fruit plate|truffles/i.test(line)) {
      section = "vip";
    }
    if (/iron|luggage|taxi|arrive|EA\s*\d|Heathrow|airport|allocate|Opera/i.test(line)) {
      section = "guest";
    }
    if (/late\s*(?:check|c\/?o)|checked\s+out/i.test(line)) section = "guest";
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
  analyzed._canonicalActionsBuilt = true;
  var organised = Shift.buildOrganisedSectionModel(analyzed, {
    handoverDate: temporal.handoverDate || "2026-08-04",
    shift: temporal.shift || "Night"
  });
  if (organised && organised.analyzed) analyzed = organised.analyzed;
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

function openFacet(p, re) {
  return (p.actions || []).find(function (a) {
    return a.actionState === "open" && re.test(a.facetKey || "");
  });
}

function anyFacet(p, re) {
  return (p.actions || []).find(function (a) {
    return re.test(a.facetKey || "");
  });
}

console.log("\n=== Sprint 8 — Canonical Action Completeness ===\n");

/* 1. Named guest + room + unable to allocate in Opera → OPEN allocation */
{
  console.log("1. Opera unable-to-allocate → OPEN allocation with entity/room");
  var p1 = pipeline([
    "Guest Example\tvip\trm32\tdep\t07/08/2026\t-\tRegular Guest / unable to allocate on Opera room 32 shows still svailable"
  ]);
  var alloc = openFacet(p1, /allocation:opera_assign/);
  assert(!!alloc, "OPEN allocation:opera_assign exists");
  assert(String(alloc.room) === "32", "Allocation retains Room 32");
  assert(/Guest Example/i.test(alloc.canonicalName || ""), "Allocation retains guest name");
  assert(/Opera|allocation/i.test(alloc.actionText || ""), "Allocation action text is operational");
  assert(!/vip:no_active_amenity/i.test(
    (p1.actions || []).map(function (a) { return a.facetKey; }).join("|")
  ) || !!alloc, "Allocation is not solved only via VIP amenity awareness");
}

/* 2. Weak upgrade / balance availability must NOT invent OPEN allocation issue */
{
  console.log("2. Balance-availability wording alone → no OPEN allocation issue");
  var p2 = pipeline([
    "Guest Example\trm 18\tPlease advice of the complimentary upgrade to balance availability // From DD"
  ]);
  var badAlloc = openFacet(p2, /allocation:opera_assign/);
  assert(!badAlloc, "No invented OPEN opera_assign from weak wording");
  var infoBal = anyFacet(p2, /allocation:balance_availability/);
  assert(!infoBal || infoBal.actionState !== "open" ||
    /balance availability/i.test(infoBal.actionText || ""),
    "Balance availability remains non-problem information if present");
}

/* 3. Arrival/checkout contradiction → actionable clarification; not auto-resolved */
{
  console.log("3. Arrival/checkout room contradiction → OPEN clarify");
  var p3 = pipeline([
    "Andrew Example\t\trm\t2\t\t\t\t20% off food and beverage (once per stay)",
    "rooms 2 and 23 checked out."
  ], { handoverDate: "2026-08-07" });
  var clarify = openFacet(p3, /occupancy_conflict/);
  assert(!!clarify, "OPEN occupancy clarification exists");
  assert(String(clarify.room) === "2", "Clarify retains Room 2");
  assert(/Andrew Example/i.test(clarify.canonicalName || ""), "Clarify retains guest");
  assert(/confirm|clarify|conflict/i.test(clarify.actionText || ""),
    "Text asks staff to confirm — does not invent truth");
  assert(!/assign(?:ed)? to Room (?!2)|correct room is|move to Room/i.test(clarify.actionText || ""),
    "Contradiction is not automatically resolved");
}

/* 4. Clarification reaches Sprint 7 decision seats when appropriate */
{
  console.log("4. Clarification seats via Sprint 7 decision seating");
  var p4 = pipeline([
    "Andrew Example\t\trm\t2\t\t\t\t20% off food and beverage (once per stay)",
    "rooms 2 and 23 checked out."
  ], { handoverDate: "2026-08-07" });
  var seats = Shift.selectDecisionSeats(p4.actions, {
    surface: "briefing",
    maxN: 5,
    allowMonitorContinuity: true
  });
  var seated = (seats.seats || []).some(function (s) {
    return /occupancy_conflict/i.test(s.facetKey || "") ||
      /conflicting arrival|Confirm room assignment/i.test(s.text || "");
  });
  assert(seated, "Occupancy clarification is seated as do-now");
  assert(
    /Confirm room assignment|conflict/i.test(p4.briefingText || "") ||
      (p4.recommendations || []).some(function (r) {
        return /Confirm room assignment|conflict/i.test(r.text || "");
      }),
    "Clarification appears in briefing or recommendations"
  );
}

/* 5. EA/luggage with guest + room in same evidence → retain both */
{
  console.log("5. EA/luggage retains guest + room from same evidence");
  var p5 = pipeline([
    "JIHYUN EXAMPLE\t\t\t2\t\t09/08/2026\t\tHi, We arrive with morning flight at Gatwick 10:20 am and would like to leave our luggage at the hotel around lunch if that is possible. Also on the 9th August after checking out, we would like to keep our luggage / EA 11am // Please advice of the complimentary upgrade"
  ], {
    handoverDate: "2026-08-07",
    createdAt: "2026-08-07T05:14:01.000Z"
  });
  var near = openFacet(p5, /ea_luggage_near/);
  assert(!!near, "Near-term EA/luggage OPEN exists");
  assert(String(near.room) === "2", "EA/luggage retains Room 2");
  assert(/JIHYUN EXAMPLE/i.test(near.canonicalName || ""), "EA/luggage retains guest name");
}

/* 6. EA/luggage without safe room → room remains empty */
{
  console.log("6. EA/luggage without safe room → empty room");
  var p6 = pipeline([
    "Guest Traveler would like to leave luggage around lunch / EA 11am — no room assigned yet"
  ], {
    handoverDate: "2026-08-07",
    createdAt: "2026-08-07T05:14:01.000Z"
  });
  var near6 = openFacet(p6, /ea_luggage_near|luggage_ea/);
  assert(!!near6, "Luggage/EA action still generated");
  assert(!near6.room, "Room remains empty without safe room evidence");
}

/* 7. Fragmented airport pickup + safely associated contact/name */
{
  console.log("7. Fragmented airport retains contact/name");
  var p7 = pipeline([
    "today taxi pick up arranged to etter marylebone",
    "Arr 11:25am",
    "London Heathrow",
    "August 4, 2026",
    "703-402-7609  Donna",
    "703-402-3853 Peter"
  ], {
    handoverDate: "2026-08-04",
    createdAt: "2026-08-04T06:02:36.000Z"
  });
  var air = openFacet(p7, /timed:airport/);
  assert(!!air, "Timed airport OPEN exists");
  assert(/Donna|Peter/i.test(air.canonicalName || air.actionText || ""),
    "Airport action retains contact/name evidence");
}

/* 8. Airport fragment with no safe room → no invented room */
{
  console.log("8. Airport cluster does not invent a room");
  var p8 = pipeline([
    "today taxi pick up arranged to etter marylebone",
    "Arr 11:25am",
    "London Heathrow",
    "August 4, 2026",
    "703-402-7609  Donna",
    "703-402-3853 Peter"
  ], {
    handoverDate: "2026-08-04",
    createdAt: "2026-08-04T06:02:36.000Z"
  });
  var air8 = openFacet(p8, /timed:airport/);
  assert(!!air8, "Airport OPEN exists");
  assert(!air8.room, "No invented room on airport cluster");
}

/* 9. Champagne + fruit + flowers + chocolates preserved */
{
  console.log("9. Amenity package: champagne + fruit + flowers + chocolates");
  var p9 = pipeline([
    "VIP -Guest Example\trm 35 dep 06/08 \t- POA // Room and tax // Card on file guarantee only / From DD / VVIP-Place a bottle of champagne, fruits and flowers, chocolate (if we have), in the room."
  ]);
  var prep = openFacet(p9, /amenity:prep/);
  assert(!!prep, "Amenity prep OPEN exists");
  assert(/champagne/i.test(prep.actionText || ""), "Champagne preserved");
  assert(/fruit/i.test(prep.actionText || ""), "Fruit preserved");
  assert(/flowers?/i.test(prep.actionText || ""), "Flowers preserved");
  assert(/chocolates?/i.test(prep.actionText || ""), "Chocolates preserved");
}

/* 10. Explicit truffles preserved */
{
  console.log("10. Explicit truffles preserved");
  var p10 = pipeline([
    "Josh Example\trm 51\tdep\t07/08/2026\t\tChampagne & truffles to be set up in the room - comp // 10th anniversary"
  ], { handoverDate: "2026-08-05" });
  var prep10 = openFacet(p10, /amenity:prep/);
  assert(!!prep10, "Amenity prep OPEN exists for truffles case");
  assert(/truffles?/i.test(prep10.actionText || ""), "Truffles preserved");
  assert(/champagne/i.test(prep10.actionText || ""), "Champagne preserved with truffles");
}

/* 11. card on file → NOT welcome card */
{
  console.log("11. card on file is not welcome card");
  var p11 = pipeline([
    "Guest Example\trm 35\tPOA // Card on file guarantee only / champagne in the room"
  ]);
  var blob11 = (p11.actions || []).map(function (a) { return a.actionText; }).join("\n");
  assert(!/welcome card/i.test(blob11), "No welcome card invented from card on file");
}

/* 12. generic complimentary upgrade → NOT loft unless loft evidenced */
{
  console.log("12. generic upgrade is not loft");
  var p12 = pipeline([
    "Guest Example\trm 18\tPlease advice of the complimentary upgrade to balance availability // From DD"
  ]);
  var blob12 = (p12.actions || []).map(function (a) { return a.actionText; }).join("\n") +
    "\n" + (p12.briefingText || "");
  assert(!/loft/i.test(blob12), "No loft invented from generic upgrade");
}

/* 13. amenities belonging to separate guests → never merge */
{
  console.log("13. Separate-guest amenities never merge");
  var p13 = pipeline([
    "Guest Alpha\trm 51\tChampagne & truffles - comp",
    "Guest Beta\trm 12\tPOA only — no amenities"
  ]);
  var betaActs = (p13.actions || []).filter(function (a) {
    return String(a.room) === "12" || /Guest Beta/i.test(a.canonicalName || "");
  });
  var betaBlob = betaActs.map(function (a) { return a.actionText; }).join("\n");
  assert(!/Champagne|truffles/i.test(betaBlob), "Beta does not inherit Alpha amenities");
  var alphaPrep = (p13.actions || []).find(function (a) {
    return a.actionState === "open" && /amenity:prep/i.test(a.facetKey || "") &&
      (String(a.room) === "51" || /Guest Alpha/i.test(a.canonicalName || ""));
  });
  assert(!!alphaPrep && /champagne|truffles/i.test(alphaPrep.actionText || ""),
    "Alpha amenities remain on Alpha");
}

/* 14. Sprint 1 superseded facts → cannot generate current OPEN action */
{
  console.log("14. Superseded facts cannot stay OPEN");
  var p14 = pipeline([
    "Room 22 shower leaking — engineer attending",
    "Room 22 shower fixed / in service"
  ]);
  var openLeak = (p14.actions || []).filter(function (a) {
    return a.actionState === "open" && /leak|shower/i.test(a.evidenceText || "") &&
      !/in service|fixed/i.test(a.evidenceText || "");
  });
  assert(openLeak.length === 0, "Superseded leak does not remain OPEN");
}

/* 15. Sprint 4 BLOCKED remains blocked */
{
  console.log("15. BLOCKED remains blocked / non-do-now");
  var seats15 = Shift.selectDecisionSeats([
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
      facetKey: "allocation:opera_assign",
      actionText: "Should not seat blocked allocation",
      room: "8",
      currentStateEligible: true
    }
  ], { surface: "briefing", maxN: 5 });
  assert((seats15.seats || []).some(function (s) { return s.actionId === "a-open"; }),
    "Actionable OPEN still seats");
  assert(!(seats15.seats || []).some(function (s) { return s.actionId === "a-blocked"; }),
    "Blocked action is not seated as do-now");
}

/* 16. Sprint 6 future/monitor not promoted to OPEN */
{
  console.log("16. Future/monitor luggage remains MONITOR");
  var p16 = pipeline([
    "JIHYUN EXAMPLE\t\t\t2\t\t09/08/2026\t\tleave luggage around lunch / EA 11am. Also on the 9th August after checking out, keep luggage until 10 pm"
  ], {
    handoverDate: "2026-08-07",
    createdAt: "2026-08-07T05:14:01.000Z"
  });
  var future = anyFacet(p16, /luggage_future_hold/);
  assert(!!future && future.actionState === "monitor",
    "Future luggage hold remains MONITOR");
  assert(future.actionState !== "open", "Future hold not promoted to OPEN");
}

/* 17. Sprint 7 stronger canonical seats not displaced by weak legacy fill */
{
  console.log("17. Stronger canonical seats beat weak legacy fill");
  var p17 = pipeline([
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
  var tok = openFacet(p17, /payment:tokenise/);
  var air17 = openFacet(p17, /timed:airport/);
  assert(!!tok && !!air17, "Tokenise + airport OPEN exist");
  var b = p17.briefingText || "";
  var tokIdx = b.search(/tokenis|guarantee/i);
  var room5Idx = b.search(/Room 5|rm5|guest follow-up for Room 5/i);
  assert(tokIdx !== -1 && (room5Idx === -1 || tokIdx < room5Idx),
    "Tokenise seats before weak Room 5 fill (or Room 5 absent)");
}

/* 18. no unsupported payment collect */
{
  console.log("18. No unsupported payment collect");
  var p18 = pipeline([
    "Jonathan Bailey - rm 33 dep 07/08  / POA // 20%  off food and beverage (once per stay)",
    "rm 33 late c/o at 12"
  ], {
    handoverDate: "2026-08-04",
    createdAt: "2026-08-05T00:20:51.000Z"
  });
  assert(!(p18.recommendations || []).some(function (r) {
    return /Collect outstanding balance for Room 33/i.test(r.text || "");
  }), "No false Room 33 collect recommendation");
  assert(!(p18.actions || []).some(function (a) {
    return a.actionState === "open" && /payment:collect/i.test(a.facetKey || "") &&
      String(a.room) === "33";
  }), "No OPEN payment:collect for Room 33 without evidence");
}

/* 19. deterministic output */
{
  console.log("19. Deterministic canonical action output");
  var lines19 = [
    "Guest Example\tvip\trm32\tdep\t07/08/2026\t-\tRegular Guest / unable to allocate on Opera room 32 shows still svailable",
    "VIP -Guest Example\trm 35\tVVIP-Place a bottle of champagne, fruits and flowers, chocolate (if we have), in the room."
  ];
  var a = pipeline(lines19).actions.map(function (x) {
    return [x.actionId, x.facetKey, x.actionState, x.actionText, x.room].join("|");
  }).join("\n");
  var b19 = pipeline(lines19).actions.map(function (x) {
    return [x.actionId, x.facetKey, x.actionState, x.actionText, x.room].join("|");
  }).join("\n");
  assert(a === b19, "Repeated builds are identical");
}

/* Extra: Room 11 tokenise remains MONITOR (fail-closed preserved) */
{
  console.log("Extra. Room 11 tokenise MONITOR preserved");
  var px = pipeline([
    "room 11 cc not tokenised as PDQ machine did not work again"
  ], {
    handoverDate: "2026-08-04",
    createdAt: "2026-08-05T00:20:51.000Z"
  });
  var rm11 = (px.actions || []).find(function (a) {
    return /payment:tokenise/i.test(a.facetKey || "") && String(a.room) === "11";
  });
  assert(rm11 && rm11.actionState === "monitor",
    "Room 11 tokenise remains MONITOR");
}

console.log("\n========================================");
console.log("Sprint 8 results: " + passed + " passed, " + failed + " failed");
console.log("========================================\n");
process.exit(failed ? 1 : 0);
