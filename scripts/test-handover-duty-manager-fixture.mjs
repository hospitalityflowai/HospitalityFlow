/**
 * Duty Manager fixture — engine owns ranking/status/alerts; writing formats only.
 * Run: node scripts/test-handover-duty-manager-fixture.mjs
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

/** Messy source notes from the visual review failure case. */
const SOURCE_NOTES = [
  "arr 12 / dep 9 / stay 31 / inhouse 68 / adults 57 / children 11 / sold 48 / avail 11 / occ 81%",
  "rm23 no hot water — guest extended co — maint aware follow am",
  "rm35 outstanding 120 card declined — collect b4 dep",
  "vip rm42 — quiet upper — champagne + welcome card still needed",
  "rm32 wake 0545 taxi 0620",
  "rm11 adapter £20 not posted — post or collect",
  "rm16 late co 1pm confirmed",
  "rm24 feather-free bedding — confirm prepared",
  "rm31 noise settled overnight — monitor if recurs",
  "mr lewis parcel stored — collect tmrw"
];

function makeAnalyzed(lines) {
  return lines.map(function (line, index) {
    var rooms = Engine.extractRoomNumbers(line);
    var isVip = /\bvip\b/i.test(line);
    var fact = Engine.extractOperationalFact(line, { rooms: rooms, isVip: isVip });
    var section = Engine.sectionFromFact(fact, "general");
    if (/arr\s+\d|dep\s+\d|stay\s+\d|occ\b|sold\b|avail\b|inhouse/i.test(line)) {
      section = "general";
    }
    return {
      original: line,
      rooms: rooms.length ? rooms : fact.rooms || [],
      section: section,
      isVip: isVip,
      isCarriedOver: false,
      isFollowUp: /follow\s*up|monitor|confirm|collect|post/i.test(line),
      maintenancePriority: section === "maintenance" || fact.subject === "maintenance" ? "High" : null,
      fact: fact,
      _neutralFactId: "dm-" + index
    };
  }).filter(function (note) {
    if (/^arr\s+\d/i.test(note.original)) return false;
    return note.fact && Engine.hasUsefulOperationalDetail
      ? Engine.hasUsefulOperationalDetail(note.fact)
      : true;
  });
}

function consolidate(analyzed) {
  return Engine.consolidateNotesByFacts
    ? Engine.consolidateNotesByFacts(analyzed)
    : analyzed;
}

console.log("\nDuty Manager fixture — engine ownership\n");

const analyzed = consolidate(makeAnalyzed(SOURCE_NOTES));
const entries = analyzed.map(function (n, i) {
  return {
    note: n,
    fact: n.fact,
    factId: n._neutralFactId || ("f-" + i),
    topic: n.section,
    section: n.section
  };
});

(function snapshotShorthand() {
  const snap = Shift.extractHotelSnapshot(SOURCE_NOTES[0]);
  assert(String(snap.arrivals) === "12", "snapshot arrivals 12");
  assert(String(snap.departures) === "9", "snapshot departures 9");
  assert(String(snap.stayovers) === "31", "snapshot stayovers 31");
  assert(String(snap.inHouse) === "68", "snapshot in-house 68");
  assert(String(snap.adults) === "57", "snapshot adults 57");
  assert(String(snap.children) === "11", "snapshot children 11");
  assert(String(snap.roomsSold) === "48", "snapshot rooms sold 48");
  assert(String(snap.roomsAvailable) === "11", "snapshot rooms available 11");
  assert(String(snap.occupancy) === "81", "snapshot occupancy 81");
  const timed = Shift.extractHotelSnapshot("late arr ~2345 rm16");
  assert(timed.arrivals == null, "arrival-time safeguard preserved");
})();

(function briefingPriorities() {
  const briefing = Engine.buildTodaysBriefing(analyzed);
  const text = (briefing.paragraphs || []).join("\n\n");
  assert((briefing.paragraphs || []).length >= 3, "briefing has multiple priorities");
  assert((briefing.paragraphs || []).length <= 5, "briefing max five blocks");
  assert(/Priority 1/i.test(text), "Priority 1 present");
  assert(/23/i.test(text) && /hot[\s-]*water/i.test(text), "Room 23 hot water surfaced");
  assert(/35/i.test(text) && (/120/i.test(text) || /declined|outstanding/i.test(text)),
    "Room 35 £120 / declined payment surfaced");
  assert(/42/i.test(text) && (/vip/i.test(text) || /champagne|welcome/i.test(text)), "VIP Room 42 surfaced");
  assert(/32/i.test(text) && (/05:45|0545|wake/i.test(text)), "Room 32 wake surfaced");
  assert(/11/i.test(text) && (/20|adapter/i.test(text)), "Room 11 adapter charge surfaced");

  const p1 = briefing.paragraphs[0] || "";
  assert(/23/i.test(p1) && /hot[\s-]*water/i.test(p1), "unresolved Room 23 hot water ranks first");
  const joined = briefing.paragraphs.join(" ");
  const hotPos = joined.search(/23.*hot[\s-]*water|hot[\s-]*water.*23/i);
  const vipPos = joined.search(/vip|42/i);
  const payPos = joined.search(/35|120/i);
  assert(hotPos >= 0 && (vipPos < 0 || hotPos < vipPos), "hot water ranks above VIP");
  assert(payPos >= 0 && (vipPos < 0 || payPos < vipPos), "imminent payment can outrank later VIP");
  assert(!/Rooms?\s+23,\s*16,\s*32/i.test(text), "briefing does not invent multi-room collapse");
})();

(function hotelStatusEvidence() {
  const status = Engine.buildHotelStatus(analyzed);
  const byKey = {};
  status.forEach(function (a) { byKey[a.key] = a; });
  assert(byKey.maintenance && byKey.maintenance.level !== "normal",
    "Maintenance is not Normal when unresolved");
  assert(/hot[\s-]*water|fault|follow-up/i.test(byKey.maintenance.summary),
    "Maintenance summary mentions unresolved fault");
  assert(byKey.guest_experience && byKey.guest_experience.level !== "normal",
    "Guest Experience attention/critical for hot water");
  assert(byKey.revenue && byKey.revenue.level === "critical",
    "Revenue critical for £120 declined payment");
  assert(/120|declined|outstanding/i.test(byKey.revenue.summary),
    "Revenue reflects £120 / declined evidence");
  assert(byKey.vip_readiness && byKey.vip_readiness.level === "attention",
    "VIP readiness attention for outstanding welcome setup");
  assert(/champagne|welcome|VIP/i.test(byKey.vip_readiness.summary),
    "VIP summary reflects welcome card/champagne");
  assert(byKey.reception_operations && byKey.reception_operations.level !== "normal",
    "Reception attention for timed/follow-up work");
})();

(function timedObjectAndAlerts() {
  const objects = Shift.groupIntoOperationalObjects(entries);
  const timed = objects.filter(function (o) {
    return o.type === "departure" || o.type === "wake_up" || o.type === "transport" || o.type === "timed";
  });
  assert(timed.some(function (o) {
    return (o.rooms || []).indexOf("32") !== -1 &&
      ((o.components || []).indexOf("wake_up") !== -1 || /wake|0545|05:45/i.test(JSON.stringify(o)));
  }), "wake-up and taxi remain one timed operational object for Room 32");

  const alerts = Shift.computeShiftAlertsFromObjects(entries);
  assert(alerts.maintenance >= 1, "Shift Alerts include maintenance");
  assert(alerts.payments >= 1, "Shift Alerts include payment");
  assert(alerts.timedActions >= 1 || alerts.events >= 1, "Shift Alerts include timed actions");
  assert(alerts.vip >= 1, "Shift Alerts include VIP");
})();

(function guestFollowUpNotMerged() {
  const guestNotes = analyzed.filter(function (n) {
    return n.section === "guest" || n.section === "vip" ||
      (n.fact && (n.fact.subject === "late_checkout" || n.fact.subject === "guest_request" ||
        n.fact.subject === "departure_followup" || n.fact.subject === "wake_up"));
  });
  const displays = guestNotes.map(function (n) {
    return Engine.renderOperationalFactDisplay(n.fact) || n.original;
  });
  const collapsed = displays.some(function (d) {
    return /Rooms?\s+23,\s*16,\s*32|Rooms?\s+23.*,\s*35/i.test(d);
  });
  assert(!collapsed, "Guest Follow-up does not merge unrelated rooms");

  const room23 = displays.find(function (d) { return /23/.test(d) && /hot|water|maint/i.test(d); }) ||
    analyzed.find(function (n) { return (n.rooms || []).indexOf("23") !== -1; });
  assert(!!room23, "Room 23 remains its own actionable object");

  const room16 = analyzed.find(function (n) {
    return (n.rooms || []).indexOf("16") !== -1 && n.fact && n.fact.subject === "late_checkout";
  });
  assert(!!room16, "Room 16 late checkout remains represented");
})();

(function allMeaningfulFactsRemain() {
  const blob = JSON.stringify(analyzed) + JSON.stringify(Engine.buildHandoverIntelligenceExperience(analyzed));
  assert(/23/.test(blob) && /hot\s*water|hot water/i.test(blob), "Room 23 hot water present");
  assert(/16/.test(blob) && /late/i.test(blob), "Room 16 late checkout present");
  assert(/32/.test(blob) && /wake|0545|05:45/i.test(blob), "Room 32 wake/taxi present");
  assert(/35/.test(blob) && /120|declined/i.test(blob), "Room 35 payment present");
  assert(/42/.test(blob) && /vip|champagne|welcome/i.test(blob), "VIP Room 42 present");
  assert(/24/.test(blob) && /feather/i.test(blob), "Room 24 feather-free present");
  assert(/11/.test(blob) && /adapter|20/i.test(blob), "Room 11 adapter present");
  assert(/31/.test(blob) && /noise|settled|monitor/i.test(blob), "Room 31 noise present");
  assert(/lewis|parcel/i.test(blob), "Mr Lewis parcel present");
})();

(function noInventedFacts() {
  const briefing = Engine.buildTodaysBriefing(analyzed);
  const status = Engine.buildHotelStatus(analyzed);
  const text = briefing.paragraphs.join(" ") + " " + status.map(function (s) { return s.summary; }).join(" ");
  assert(!/Room 99|£999|helicopter|invented/i.test(text), "no invented rooms/amounts");
  assert(!/Prepared and complete/i.test(text), "does not invent VIP completion");
})();

(function engineOwnsJudgement() {
  assert(typeof Shift.buildBriefingModel === "function", "engine exposes buildBriefingModel");
  assert(typeof Shift.buildHotelStatusModel === "function", "engine exposes buildHotelStatusModel");
  assert(typeof Shift.computeShiftAlertsFromObjects === "function", "engine exposes alert counting");
  const model = Shift.buildBriefingModel(entries);
  assert(model.priorities && model.priorities.length >= 3, "engine briefing model has multiple priorities");
  assert(model.priorities[0].impactScore <= model.priorities[model.priorities.length - 1].impactScore,
    "engine priorities sorted by impact");
})();

(function promotionDoesNotSuppressValidObjects() {
  const objects = Shift.groupIntoOperationalObjects(entries);
  const promotable = objects.filter(Shift.isPromotableOperationalObject);
  assert(promotable.some(function (o) { return o.type === "maintenance" || /23/.test(String(o.rooms)); }),
    "maintenance object is promotable");
  assert(promotable.some(function (o) { return o.type === "payment" || /35|11/.test(String(o.rooms)); }),
    "payment objects are promotable");
  assert(promotable.some(function (o) { return o.type === "vip"; }), "VIP object is promotable");
  assert(promotable.some(function (o) {
    return o.type === "departure" || o.type === "wake_up" || o.type === "transport";
  }), "timed/departure object is promotable");

  const recs = Shift.generateRecommendations({
    shiftCode: "Night",
    rawNotesText: SOURCE_NOTES.join("\n"),
    classified: { _analyzed: analyzed },
    departments: ["Reception", "Maintenance", "Housekeeping", "Duty Manager"],
    selectedDepartment: "Reception",
    hotelSnapshot: {},
    brainContext: null
  });
  const recText = recs.map(function (r) { return r.text; }).join(" || ");
  assert(recs.length >= 4, "recommendations promote multiple operational objects");
  assert(/23|hot/i.test(recText), "recommendations include hot-water / Room 23");
  assert(/35|120|outstanding|declined/i.test(recText), "recommendations include Room 35 payment");
  assert(/vip|42/i.test(recText), "recommendations include VIP");
  assert(/32|wake|05:45|0545|taxi|06:20/i.test(recText), "recommendations include timed wake/taxi");
})();

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
