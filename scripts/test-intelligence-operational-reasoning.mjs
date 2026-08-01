/**
 * Hospitality Intelligence Engine — operational reasoning quality.
 * Shared by public demo and real hotel workspaces.
 * Run: node scripts/test-intelligence-operational-reasoning.mjs
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
    if (/balance|payment|folio|settled|invoice|bill/i.test(line)) section = "payments";
    if (/maintenance|shower|broken|ac |a\/c|leak|not cooling/i.test(line)) section = "maintenance";
    if (/vip/i.test(line)) section = "vip";
    if (/late check/i.test(line)) section = "guest";
    if (/wake-?up|wakeup|extra bed|pillow|towel|iron|adapter/i.test(line)) section = "tasks";
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

function analyze(notes, extras) {
  extras = extras || {};
  const analyzed = makeAnalyzed(notes);
  return Shift.analyze(Object.assign({
    shiftCode: "Night",
    shiftDisplayName: "Night",
    rawNotesText: notes.join("\n"),
    classified: {
      _analyzed: analyzed,
      _metrics: { urgent: 1, vip: 1, maintenance: 1, payments: 1, events: 0, tasks: 1 }
    },
    metrics: { urgent: 1, vip: 1, maintenance: 1, payments: 1, events: 0, tasks: 1 },
    departments: [
      "Reception",
      "Housekeeping",
      "Maintenance",
      "Duty Manager",
      "Night Team",
      "Guest Services",
      "Finance"
    ],
    selectedDepartment: "Reception",
    hotelSnapshot: extras.hotelSnapshot || { arrivals: 8, departures: 6 },
    brainContext: extras.brainContext || null
  }, extras));
}

console.log("\nIntelligence Engine — operational reasoning\n");

(function messyAcFactExtraction() {
  const fact = Engine.extractOperationalFact("24 ac broken maint aware fan guest", {
    section: "urgent"
  });
  assert(fact.subject === "maintenance", "messy AC note → maintenance subject");
  assert(fact.faultType === "AC" || /AC/i.test(String(fact.faultType)), "messy AC note extracts fault type");
  assert(fact.guestImpact === "high" || fact.guestImpact === "critical", "messy AC note marks guest impact");
  assert(fact.ownerDept === "Maintenance", "messy AC note owner is Maintenance");
})();

(function specificRecommendations() {
  const notes = [
    "24 ac broken maint aware fan guest",
    "Room 7 extra bed requested",
    "Room 14 open balance £42.50 on folio",
    "VIP Whitmore arriving 11:00 Room 42 quiet upper"
  ];
  const result = analyze(notes, {
    brainContext: {
      hotelKnowledge: {
        vipRules: "Confirm quiet upper-floor allocation and welcome amenities before arrival."
      },
      operationalKnowledge: { knowledgeEntries: [] },
      departments: [{ name: "Reception" }, { name: "Maintenance" }]
    }
  });
  const recs = result.recommendations || [];
  const text = recs.map(function (r) { return r.text; }).join(" || ");

  assert(!/arrange the guest request/i.test(text), "bans vague arrange-the-guest-request");
  assert(!/as recorded/i.test(text), "bans as-recorded recommendation phrasing");
  assert(recs.some(function (r) {
    return /24|Room 24/i.test(r.text) && /AC|maintenance/i.test(r.text);
  }), "AC recommendation is specific and action-first");
  assert(recs.some(function (r) {
    return /extra bed/i.test(r.text) && /Room 7/i.test(r.text);
  }), "guest request recommendation names item + room");
  assert(recs.some(function (r) {
    return /14/i.test(r.text) && /balance|collect|settle/i.test(r.text);
  }), "payment recommendation is action-first");
  assert(recs.some(function (r) {
    return /vip/i.test(r.text) && /Review VIP|Prepare VIP|arrival/i.test(r.text);
  }), "VIP recommendation is a direct operational action");
  assert(!/Hotel standards/i.test(text), "bans generic Hotel standards filler");
  assert(!/Action VIP notes this shift/i.test(text), "bans robotic Action VIP notes phrasing");
})();

(function omitThinGuestRequest() {
  const notes = ["Room 19 guest asked for something earlier"];
  const analyzed = makeAnalyzed(notes);
  analyzed[0].fact.subject = "guest_request";
  analyzed[0].fact.actionVerb = "arrange";
  analyzed[0].fact.requestItem = "";
  analyzed[0].fact.details = [];
  const recs = Shift.generateRecommendations({
    shiftCode: "PM",
    rawNotesText: notes.join("\n"),
    classified: { _analyzed: analyzed },
    departments: ["Reception", "Housekeeping"],
    selectedDepartment: "Reception",
    brainContext: null
  });
  assert(!recs.some(function (r) {
    return /arrange the guest request/i.test(r.text) || /as recorded/i.test(r.text);
  }), "thin guest_request facts produce no vague recommendation");
})();

(function checklistDedupeAgainstSpecificRecs() {
  const notes = [
    "VIP Whitmore arriving 11:00 Room 42",
    "Room 305 shower leak - maintenance informed"
  ];
  const result = analyze(notes, {
    hotelSnapshot: { arrivals: 5, departures: 3 }
  });
  const checklistText = (result.checklist || []).map(function (c) { return c.text; }).join(" | ");
  assert(!/VIP arrivals reviewed/i.test(checklistText), "generic VIP checklist suppressed when VIP rec exists");
  assert(!/Maintenance follow-ups reviewed/i.test(checklistText), "generic maintenance checklist suppressed when specific rec exists");
})();

(function classificationCarriesImpact() {
  const fact = Engine.extractOperationalFact("Room 24 AC not cooling. Guest given fan.");
  const classified = Shift.classifyOperationalFact(fact, { section: "maintenance" });
  assert(classified.category === "maintenance", "classification category maintenance");
  assert(classified.guestImpact === "high" || classified.guestImpact === "critical", "classification carries guestImpact");
  assert(classified.ownerDepartment === "Maintenance" || classified.department === "Maintenance",
    "classification carries owner department");
})();

(function shorthandResolvesOperationalMeaning() {
  const normalized = Engine.normalizeInput("b.com city tax £12 // arr 22:00 // maint aware // quiet upper");
  assert(/Booking\.com/i.test(normalized), "b.com → Booking.com");
  assert(/before|arrival|22:00/i.test(normalized) || /arrivals?/i.test(normalized), "arrival shorthand preserved/expanded");
  assert(/Maintenance has been informed/i.test(normalized), "maint aware → Maintenance has been informed");
  assert(/quiet upper-floor/i.test(normalized), "quiet upper → quiet upper-floor room");

  const rewritten = Engine.rewriteNote("24 ac broken maint aware fan guest", { section: "urgent" });
  assert(/AC not cooling/i.test(rewritten), "messy AC rewrite states the fault");
  assert(/Maintenance has been informed/i.test(rewritten), "messy AC rewrite expands maint aware");
  assert(/Follow up next shift/i.test(rewritten), "messy AC rewrite states next action");
})();

(function summaryPrioritisesOperationalRisk() {
  const notes = [
    "Room 7 extra bed requested",
    "24 ac broken maint aware fan guest",
    "Room 14 open balance £42.50 on folio",
    "VIP Whitmore arriving 11:00 Room 42 quiet upper"
  ];
  const analyzed = makeAnalyzed(notes);
  const summary = Engine.summarizeFromFacts(analyzed, { detail: "standard" });
  assert(summary.length > 0, "summary is produced");
  assert(/AC|maintenance|balance|VIP|payment|guest-impact|Priority/i.test(summary),
    "summary mentions operational risk or impact items");
  const acPos = summary.search(/AC|maintenance/i);
  const bedPos = summary.search(/extra bed/i);
  if (acPos >= 0 && bedPos >= 0) {
    assert(acPos < bedPos, "summary surfaces maintenance risk before lower-impact guest request");
  } else {
    assert(/Priority for the next shift|operational follow-up/i.test(summary),
      "summary prioritises risk topics for the next shift");
  }
})();

(function relatedFactsMergeIntoOneObject() {
  const facts = Engine.extractOperationalFacts
    ? Engine.extractOperationalFacts("VIP Whitmore arriving 11:00 Room 42 // quiet upper // champagne")
    : [Engine.extractOperationalFact("VIP Whitmore arriving 11:00 Room 42 // quiet upper // champagne")];
  assert(facts.length === 1, "related VIP fragments merge into one operational fact");
  const src = String((facts[0] && facts[0].sourceText) || "");
  assert(/Whitmore/i.test(src) && (/quiet|champagne/i.test(src) || facts[0].subject === "vip_arrival"),
    "merged VIP fact keeps guest and preference context");
})();

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
