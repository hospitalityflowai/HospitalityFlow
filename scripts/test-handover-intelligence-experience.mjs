/**
 * Handover Intelligence Experience Sprint 1 — briefing, hotel status, timeline.
 * Run: node scripts/test-handover-intelligence-experience.mjs
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

const FIXTURE_NOTES = [
  "pm → night — busy pls read",
  "24 ac broken maint aware fan guest",
  "vip eleanor whitmore due 11am quiet upper pls — rm42 if free",
  "champagne + welcome card — 15% corp rate on invoice",
  "okonkwo rm22 dep am — wake 0630 addison lee 1015",
  "minibar 42.50 still open — collect b4 checkout",
  "patel late arr ~2345 rm16 b.com prepaid — no mobile on file",
  "twin pls — move 12 or 25 if free",
  "shower drip rm31 hk reported medium",
  "lobby wc hand dryer dead — paper towels out — maint aware",
  "rm11 safe keypad intermittent — guest moved 21 — 11 on hold parts",
  "adapter 15 +16",
  "expedia room4 city tax 12.50",
  "henderson x4 interconnect 14+15 tmrw — bday balloons 15 @1500 fb informed",
  "late co rm21 chen approved 1pm",
  "arrivals left tonight: 2",
  "deps tmrw: 6",
  "no show davies rm5 b.com — hold till night confirms",
  "lost prop gold cufflink rm25 fraser — dm safe — email sent",
  "Room 16 – outstanding Booking.com payment"
];

function makeAnalyzed(lines) {
  return lines.map(function (line, index) {
    var rooms = Engine.extractRoomNumbers(line);
    var isVip = /\bvip\b/i.test(line);
    var fact = Engine.extractOperationalFact(line, { rooms: rooms, isVip: isVip });
    var section = Engine.sectionFromFact(fact, "general");
    if (/arrivals?\s+left|deps\s+tmrw|inhouse|rooms sold|occ\b|revpar/i.test(line)) {
      section = "general";
    }
    return {
      original: line,
      rooms: rooms.length ? rooms : fact.rooms || [],
      section: section,
      isVip: isVip,
      isCarriedOver: false,
      isFollowUp: /follow\s*up/i.test(line),
      maintenancePriority: section === "maintenance" ? "High" : null,
      fact: fact,
      _neutralFactId: "fix-" + index
    };
  }).filter(function (note) {
    return note.fact && Engine.hasUsefulOperationalDetail
      ? Engine.hasUsefulOperationalDetail(note.fact)
      : !/^(?:pm|arrivals? left|deps tmrw)/i.test(note.original);
  });
}

function consolidate(analyzed) {
  return Engine.consolidateNotesByFacts
    ? Engine.consolidateNotesByFacts(analyzed)
    : analyzed;
}

console.log("\nHandover Intelligence Experience Sprint 1\n");

(function timeNormalisation() {
  assert(Engine.normalizeTimelineTime("0630") === "06:30", "0630 → 06:30");
  assert(Engine.normalizeTimelineTime("1015") === "10:15", "1015 → 10:15");
  assert(Engine.normalizeTimelineTime("1500") === "15:00", "1500 → 15:00");
  assert(Engine.normalizeTimelineTime("11am") === "11:00", "11am → 11:00");
  assert(Engine.normalizeTimelineTime("1pm") === "13:00", "1pm → 13:00");
})();

(function classificationFixes() {
  const segments = Engine.splitSourceIntoFactSegments(
    "lobby wc hand dryer dead — paper towels out — maint aware"
  );
  assert(segments.length === 2, "dryer line splits supply away from fault+maint aware");
  assert(segments.some(function (s) { return /hand dryer|dryer dead/i.test(s) && /maint/i.test(s); }),
    "maint aware merges with dryer fault");
  assert(segments.some(function (s) { return /paper towels/i.test(s) && !/dryer/i.test(s); }),
    "paper towels is a separate supply segment");

  const room11 = Engine.splitSourceIntoFactSegments(
    "rm11 safe keypad intermittent — guest moved 21 — 11 on hold parts"
  );
  assert(room11.length === 1, "Room 11 safe + on hold parts merge into one fact segment");

  const wake = Engine.extractOperationalFact("okonkwo rm22 dep am — wake 0630 addison lee 1015");
  assert(wake.subject === "departure_followup" || wake.subject === "wake_up",
    "Room 22 wake/taxi classified as guest departure follow-up");
  assert(Engine.sectionFromFact(wake) === "guest", "Room 22 maps to guest section");

  const henderson = Engine.extractOperationalFact(
    "henderson x4 interconnect 14+15 tmrw — bday balloons 15 @1500 fb informed"
  );
  assert(henderson.subject === "interconnect", "Henderson interconnect subject");
  assert(Engine.sectionFromFact(henderson) === "guest", "Henderson maps to guest section");

  const lost = Engine.extractOperationalFact("lost prop gold cufflink rm25 fraser — dm safe — email sent");
  assert(lost.subject === "lost_property", "lost property subject");
  assert(Engine.sectionFromFact(lost) === "lostproperty", "lost property not maintenance");
  assert(lost.faultType !== "safe", "dm safe does not become maintenance fault type");

  const pay = Engine.extractOperationalFact("Room 16 – outstanding Booking.com payment");
  assert(/payment|balance|folio|charge/i.test(pay.subject || ""), "Booking.com outstanding → payment subject");
  assert(Engine.sectionFromFact(pay) === "payments", "Booking.com outstanding → payments section");

  const adapter = Engine.extractOperationalFact("adapter 15 +16");
  assert(adapter.subject === "inventory", "adapter note is inventory");
  assert((adapter.rooms || []).map(String).sort().join(",") === "15,16", "adapter keeps rooms 15 and 16");
  const adapterDisplay = Engine.rewriteNote("adapter 15 +16", { section: "inventory" });
  assert(/Adapters recorded for Rooms 15 and 16/i.test(adapterDisplay), "adapter display includes room context");

  const orphan = Engine.extractOperationalFact("maint aware");
  assert(!Engine.hasUsefulOperationalDetail(orphan), "orphan maint aware is not a useful standalone fact");
})();

(function relatedFactsMerged() {
  const analyzed = consolidate(makeAnalyzed([
    "rm11 safe keypad intermittent — guest moved 21 — 11 on hold parts",
    "Maintenance has been informed"
  ]));
  const maint = analyzed.filter(function (n) {
    return n.fact && n.fact.subject === "maintenance" && (n.fact.rooms || []).indexOf("11") !== -1;
  });
  assert(maint.length === 1, "Room 11 remains one maintenance fact after merge");
  const orphanMaint = analyzed.filter(function (n) {
    return /^(?:maint(?:enance)?\s+aware|maintenance has been informed)$/i.test(String(n.original || "").trim());
  });
  assert(orphanMaint.length === 0, "no duplicate Maintenance has been informed item");
})();

(function completedFactsExcluded() {
  const analyzed = makeAnalyzed([
    "24 ac broken maint aware fan guest",
    "Room 12 outstanding balance £20 settled"
  ]);
  analyzed[1].fact.status = "done";
  analyzed[1].section = "completed";
  const timeline = Engine.buildTodaysTimeline(analyzed);
  const text = JSON.stringify(timeline);
  assert(!/Room 12|£20|settled/i.test(text) || !/Collect.*Room 12/i.test(text),
    "completed payment excluded from timeline");
})();

(function briefingRanking() {
  const analyzed = consolidate(makeAnalyzed(FIXTURE_NOTES));
  const briefing = Engine.buildTodaysBriefing(analyzed);
  assert(briefing.paragraphs && briefing.paragraphs.length >= 1, "briefing has paragraphs");
  assert(briefing.paragraphs.length <= 4, "briefing max 4 sections");
  assert(typeof briefing.headline === "string", "briefing has headline");
  assert(Array.isArray(briefing.primaryFactIds), "briefing has primaryFactIds");
  assert(typeof briefing.generatedFromFactCount === "number", "briefing has generatedFromFactCount");
  const text = briefing.paragraphs.join("\n\n");
  assert(!/operational follow-ups remain/i.test(text), "avoids generic follow-ups remain");
  assert(!/outstanding action/i.test(text), "avoids outstanding action phrasing");
  assert(!/Good morning/i.test(text), "avoids greeting phrases");
  assert(!/Today's main priorities/i.test(text), "avoids filler Today's main priorities");
  assert(!/attention required/i.test(text), "avoids attention required filler");
  assert(/Priority 1\nPrepare VIP Eleanor Whitmore/i.test(text), "Priority 1 is action-first VIP line");
  assert(/Priority 2\nFollow up the unresolved AC fault in Room 24/i.test(text),
    "Priority 2 is action-first AC line");
  assert(/Before departures\nCollect/i.test(text) && /42\.50/i.test(text) && /12\.50/i.test(text),
    "Before departures collects concrete amounts");
  assert(/Reception\nConfirm the remaining two arrivals/i.test(text) && /14|15|Henderson/i.test(text),
    "Reception covers remaining arrivals and Henderson rooms");
})();

(function hotelStatusLevels() {
  const analyzed = consolidate(makeAnalyzed(FIXTURE_NOTES));
  const status = Engine.buildHotelStatus(analyzed);
  const byKey = {};
  status.forEach(function (a) { byKey[a.key] = a; });
  assert(status.length === 5, "five hotel status areas");
  assert(byKey.guest_experience && byKey.guest_experience.level === "critical",
    "Guest Experience critical");
  assert(byKey.vip_readiness && byKey.vip_readiness.level === "attention",
    "VIP Readiness attention");
  assert(byKey.maintenance && byKey.maintenance.level === "critical",
    "Maintenance critical");
  assert(byKey.revenue && byKey.revenue.level === "attention",
    "Revenue attention");
  assert(byKey.reception_operations && byKey.reception_operations.level === "attention",
    "Reception Operations attention");
  assert(/£55\.00|55\.00/.test(byKey.revenue.summary), "Revenue aggregates known amounts");
  assert(!/Prepared/i.test(byKey.vip_readiness.summary) || /requires/i.test(byKey.vip_readiness.summary),
    "VIP does not claim Prepared without completion");
})();

(function timelineSortingAndGrouping() {
  const analyzed = consolidate(makeAnalyzed(FIXTURE_NOTES));
  const timeline = Engine.buildTodaysTimeline(analyzed);
  assert(timeline.groups && timeline.groups.length, "timeline has groups");
  const scheduled = timeline.groups.find(function (g) { return g.key === "scheduled"; });
  assert(scheduled, "scheduled group exists");
  const times = (scheduled.items || []).map(function (i) { return i.time; }).filter(Boolean);
  const sorted = times.slice().sort();
  assert(JSON.stringify(times) === JSON.stringify(sorted), "scheduled times sorted chronologically");
  assert(scheduled.items.some(function (i) { return i.time === "06:30" && /wake/i.test(i.action); }),
    "06:30 wake-up present");
  assert(scheduled.items.some(function (i) { return i.time === "10:15" && /Addison Lee/i.test(i.action); }),
    "10:15 Addison Lee present");
  assert(scheduled.items.some(function (i) {
    return /Before 11:00|11:00/i.test(String(i.deadlineLabel || i.time || "")) && /Whitmore|VIP/i.test(i.action);
  }), "VIP before 11:00 present");

  const before = timeline.groups.find(function (g) { return g.key === "before_deadline"; });
  assert(before && before.items.some(function (i) { return /42\.50|minibar/i.test(i.action); }),
    "before departure includes minibar");
  assert(before && before.items.some(function (i) { return /12\.50|city tax/i.test(i.action); }),
    "before departure includes city tax");

  const during = timeline.groups.find(function (g) { return g.key === "during_shift"; });
  assert(during && during.items.some(function (i) { return /Room 24|AC/i.test(i.action); }),
    "during shift includes Room 24 AC");
  assert(during && during.items.some(function (i) { return /no-show|Room 5/i.test(i.action); }),
    "during shift includes no-show decision");

  const tomorrow = timeline.groups.find(function (g) { return g.key === "tomorrow"; });
  assert(tomorrow && tomorrow.items.some(function (i) { return /14|15|interconnect|Henderson/i.test(i.action); }),
    "tomorrow includes Henderson interconnect");

  const allActions = [];
  timeline.groups.forEach(function (g) {
    (g.items || []).forEach(function (i) { allActions.push(i.action); });
  });
  const uniq = {};
  let dup = false;
  allActions.forEach(function (a) {
    if (uniq[a]) dup = true;
    uniq[a] = true;
  });
  assert(!dup, "no duplicate actions inside timeline");

  const withIcons = [];
  timeline.groups.forEach(function (g) {
    (g.items || []).forEach(function (i) { withIcons.push(i); });
  });
  assert(withIcons.every(function (i) { return i.icon; }), "timeline items carry scan icons");
  assert(withIcons.some(function (i) { return i.icon === "⏰" && /wake/i.test(i.action); }),
    "wake-up uses clock icon");
  assert(withIcons.some(function (i) { return i.icon === "🚕" && /Addison Lee/i.test(i.action); }),
    "Addison Lee uses taxi icon");
  assert(withIcons.some(function (i) { return i.icon === "⭐" && /VIP|Whitmore/i.test(i.action); }),
    "VIP uses star icon");
  assert(withIcons.some(function (i) { return i.icon === "💰"; }), "payment deadline uses money icon");
  assert(withIcons.some(function (i) { return i.icon === "🔧"; }), "maintenance uses wrench icon");
})();

(function displayWordingPolish() {
  const dep = Engine.renderOperationalFactDisplay(
    Engine.extractOperationalFact("okonkwo rm22 dep am — wake 0630 addison lee 1015")
  );
  assert(/Room 22/.test(dep) && /Guest departing this morning/.test(dep),
    "departure follow-up uses clear Room + departure lines");
  assert(/Wake-up call scheduled for 06:30/.test(dep), "wake wording is expanded");
  assert(/Addison Lee booked for 10:15/.test(dep), "taxi wording is expanded");
  assert(!/wake0630|addison1015|dep am/i.test(dep), "departure display avoids shorthand");

  const move = Engine.renderOperationalFactDisplay(
    Engine.extractOperationalFact("twin pls — move 12 or 25 if free")
  );
  assert(/Guest requested a room move if available/i.test(move) || /twin/i.test(move),
    "room move / twin request uses professional wording");

  const ic = Engine.renderOperationalFactDisplay(
    Engine.extractOperationalFact(
      "henderson x4 interconnect 14+15 tmrw — bday balloons 15 @1500 fb informed"
    )
  );
  assert(/Henderson group arriving tomorrow/i.test(ic), "interconnect names group arrival");
  assert(/Reserve interconnecting Rooms 14 & 15/i.test(ic), "interconnect reserves rooms clearly");
  assert(/Birthday balloons requested in Room 15 at 15:00/i.test(ic), "balloon request expanded");
  assert(/F&B has been informed/i.test(ic), "F&B informed preserved");

  const busy = Engine.rewriteNote("pm → night — busy pls read", {});
  assert(/unusually high operational workload/i.test(busy), "busy note polished professionally");
  assert(!/busy pls read/i.test(busy), "busy shorthand removed from display");

  const hold = Engine.rewriteNote("no show davies rm5 b.com — hold till night confirms", {});
  assert(/Night Team confirms/i.test(hold) || /hold until Night/i.test(hold),
    "hold-till-night polished without inventing extra context");
})();

(function recommendationDutyManagerVoice() {
  const analyzed = consolidate(makeAnalyzed(FIXTURE_NOTES));
  const result = Shift.analyze({
    shiftCode: "NIGHT",
    shiftDisplayName: "Night",
    rawNotesText: FIXTURE_NOTES.join("\n"),
    classified: {
      _analyzed: analyzed,
      _metrics: { urgent: 1, vip: 1, maintenance: 3, payments: 2, events: 1, tasks: 1 }
    },
    metrics: { urgent: 1, vip: 1, maintenance: 3, payments: 2, events: 1, tasks: 1 },
    departments: ["Reception", "Housekeeping", "Maintenance", "Duty Manager"],
    selectedDepartment: "Reception",
    hotelSnapshot: {},
    brainContext: null
  });
  const recs = result.recommendations || [];
  const text = recs.map(function (r) { return r.text; }).join("\n");
  assert(recs.length > 0, "recommendations generated");
  assert(!/Hotel standards/i.test(text), "recommendations ban Hotel standards filler");
  assert(!/Action VIP notes this shift/i.test(text), "recommendations ban Action VIP notes");
  assert(!/Professional, warm, concise/i.test(text), "recommendations ban tone filler");
  assert(recs.some(function (r) {
    return /Review VIP requirements before/i.test(r.text) && /11:00/i.test(r.text);
  }), "VIP recommendation is a direct pre-arrival action");
  assert(recs.some(function (r) {
    return /Follow up.*Room 24.*AC/i.test(r.text) && /until resolved/i.test(r.text);
  }), "AC recommendation is follow-up until resolved");

  const bookingOnly = consolidate(makeAnalyzed(["Room 16 – outstanding Booking.com payment"]));
  const bookingRecs = (Shift.analyze({
    shiftCode: "AM",
    rawNotesText: "Room 16 – outstanding Booking.com payment",
    classified: { _analyzed: bookingOnly, _metrics: { urgent: 0, vip: 0, maintenance: 0, payments: 1, events: 0, tasks: 0 } },
    metrics: { urgent: 0, vip: 0, maintenance: 0, payments: 1, events: 0, tasks: 0 },
    departments: ["Reception"],
    selectedDepartment: "Reception",
    hotelSnapshot: {},
    brainContext: null
  }).recommendations || []);
  assert(bookingRecs.some(function (r) {
    return /Collect outstanding Booking\.com payment/i.test(r.text) && /Room 16/i.test(r.text);
  }), "Booking.com collection wording is Duty Manager style");

  const expediaOnly = consolidate(makeAnalyzed(["expedia room4 city tax 12.50"]));
  const expediaRecs = (Shift.analyze({
    shiftCode: "AM",
    rawNotesText: "expedia room4 city tax 12.50",
    classified: { _analyzed: expediaOnly, _metrics: { urgent: 0, vip: 0, maintenance: 0, payments: 1, events: 0, tasks: 0 } },
    metrics: { urgent: 0, vip: 0, maintenance: 0, payments: 1, events: 0, tasks: 0 },
    departments: ["Reception"],
    selectedDepartment: "Reception",
    hotelSnapshot: {},
    brainContext: null
  }).recommendations || []);
  assert(expediaRecs.some(function (r) {
    return /Collect outstanding Expedia city tax/i.test(r.text) && /Room 4/i.test(r.text);
  }), "Expedia city tax collection is action-first");
})();

(function demoProductionParity() {
  const analyzed = consolidate(makeAnalyzed(FIXTURE_NOTES));
  const a = Engine.buildHandoverIntelligenceExperience(analyzed);
  const b = Engine.buildHandoverIntelligenceExperience(analyzed);
  assert(JSON.stringify(a.briefing.paragraphs) === JSON.stringify(b.briefing.paragraphs),
    "experience pipeline is deterministic for same facts");
  assert(a.hotelStatus.length === b.hotelStatus.length, "status parity");
  assert(a.timeline.groups.length === b.timeline.groups.length, "timeline parity");

  const handoverHtml = fs.readFileSync(path.join(ROOT, "handover.html"), "utf8");
  assert(!/function\s+buildTodaysBriefing\s*\(/.test(handoverHtml),
    "handover.html has no duplicate briefing reasoner");
  assert(!/function\s+buildHotelStatus\s*\(/.test(handoverHtml),
    "handover.html has no duplicate hotel status reasoner");
  assert(!/function\s+buildTodaysTimeline\s*\(/.test(handoverHtml),
    "handover.html has no duplicate timeline reasoner");
  assert(/buildHandoverIntelligenceExperience/.test(handoverHtml),
    "handover.html renders shared engine experience");
  assert(/hotel-status-dot/.test(handoverHtml), "Hotel Status UI includes status dots");
  assert(/timeline-icon/.test(handoverHtml), "Timeline UI renders item icons");
  assert(/data-stat="guest"/.test(handoverHtml) && /Guest Follow-ups/.test(handoverHtml),
    "Guest Follow-ups glance card uses blue accent treatment");
  assert(/#c9a227/.test(handoverHtml) && /#2a9d8f/.test(handoverHtml),
    "VIP gold and Tasks teal accents present");

  const draftFn = fs.readFileSync(path.join(ROOT, "js/demo-sample-data.js"), "utf8");
  assert(/hasGeneratedOutput:\s*false/.test(draftFn) && /aiSummary:\s*""/.test(draftFn),
    "demo draft does not hardcode generated briefing output");
})();

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
