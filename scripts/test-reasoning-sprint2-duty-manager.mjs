/**
 * Reasoning Sprint 2 — Duty Manager thinking.
 * Actions not summaries; ownership; priority; merge; no vague noise.
 * Run: node scripts/test-reasoning-sprint2-duty-manager.mjs
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
    if (/balance|payment|folio|settled|invoice|bill|£/i.test(line)) section = "payments";
    if (/maintenance|shower|broken|ac |a\/c|leak|not cooling|wc|washroom|heating/i.test(line)) {
      section = "maintenance";
    }
    if (/vip/i.test(line)) section = "vip";
    if (/wake-?up|wakeup|extra bed|pillow|towel|iron|adapter|taxi/i.test(line)) section = "tasks";
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
  return Shift.analyze({
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
      "Finance",
      "F&B"
    ],
    selectedDepartment: "Reception",
    hotelSnapshot: { arrivals: 8, departures: 6 },
    brainContext: null
  });
}

console.log("\nReasoning Sprint 2 — Duty Manager thinking\n");

(function actionsNotSummaries() {
  const result = analyze([
    "24 ac broken maint aware fan guest",
    "Room 14 open balance £64.50 on folio",
    "Lobby WC out of order — maint informed"
  ]);
  const recs = result.recommendations || [];
  const text = recs.map(function (r) { return r.text; }).join(" || ");

  assert(recs.some(function (r) {
    return /Follow up with Maintenance regarding Room 24 AC/i.test(r.text) &&
      /in-house|unresolved/i.test(r.text);
  }), "AC becomes Maintenance action with guest-in-house why");
  assert(recs.some(function (r) {
    return /Collect outstanding £?64\.50 balance/i.test(r.text) && /before departure/i.test(r.text);
  }), "balance becomes collect action with amount + when");
  assert(recs.some(function (r) {
    return /lobby washroom/i.test(r.text) && /Maintenance/i.test(r.text) && /guest impact/i.test(r.text);
  }), "public WC becomes lobby washroom Maintenance action");
  assert(!/^(Room 24 AC broken|WC issue|Outstanding balance)\.?$/im.test(text),
    "does not rewrite notes as bare summaries");
})();

(function bansVagueRecommendations() {
  const result = analyze([
    "Room 19 guest asked for something earlier",
    "Please check issue",
    "Review original note for Room 8"
  ]);
  const text = (result.recommendations || []).map(function (r) { return r.text; }).join(" || ");
  assert(!/follow up guest request/i.test(text), "bans Follow up guest request");
  assert(!/check issue/i.test(text), "bans Check issue");
  assert(!/review original note/i.test(text), "bans Review original note");
})();

(function ownershipAlwaysPresent() {
  const result = analyze([
    "24 ac broken maint aware fan guest",
    "Room 7 extra bed requested",
    "Room 14 open balance £42.50 on folio",
    "VIP Isabella Rossi arriving 15:00 Room 42 champagne welcome card quiet upper"
  ]);
  const recs = result.recommendations || [];
  assert(recs.length > 0, "produces recommendations");
  assert(recs.every(function (r) {
    return r.department && String(r.department).trim().length > 0;
  }), "every recommendation has an owner department");
  assert(recs.some(function (r) { return /Maintenance/i.test(r.department); }), "AC owned by Maintenance");
  assert(recs.some(function (r) {
    return /extra bed/i.test(r.text) && /Housekeeping|Reception|Guest Services/i.test(r.department);
  }), "guest request has HK/Reception ownership");
})();

(function priorityLadder() {
  const notes = [
    "Room 7 extra bed requested",
    "VIP Whitmore arriving 11:00 Room 42 quiet upper",
    "Room 14 open balance £42.50 on folio — departs today",
    "24 ac broken maint aware fan guest",
    "Room 32 wake 0630 addison lee 1015"
  ];
  const analyzed = makeAnalyzed(notes);
  const ranked = Shift.rankByOperationalImpact(analyzed.map(function (n, i) {
    return { fact: n.fact, note: n, factId: "f-" + i, topic: n.section };
  }));
  assert(
    ranked[0].fact.subject === "maintenance" || /ac/i.test(ranked[0].fact.sourceText || ""),
    "guest safety/comfort AC ranks first"
  );
  const scores = ranked.map(function (e) { return Shift.scoreOperationalImpact(e).score; });
  const ac = scores[0];
  const timedIdx = ranked.findIndex(function (e) {
    return /wake|taxi|departure/i.test(String(e.fact.subject || "") + " " + (e.fact.sourceText || ""));
  });
  const vipIdx = ranked.findIndex(function (e) {
    return e.fact.subject === "vip_arrival" || /vip/i.test(e.fact.sourceText || "");
  });
  const payIdx = ranked.findIndex(function (e) {
    return /balance|payment/i.test(String(e.fact.subject || "") + " " + (e.fact.sourceText || ""));
  });
  assert(ac <= 16, "AC score is safety/guest-impact band");
  if (timedIdx >= 0 && vipIdx >= 0) {
    assert(scores[timedIdx] <= scores[vipIdx], "time-critical ranks at or above VIP");
  }
  if (payIdx >= 0 && vipIdx >= 0) {
    assert(scores[payIdx] <= scores[vipIdx], "revenue protection ranks at or above VIP");
  }
})();

(function mergeVipPrepBlock() {
  const notes = [
    "VIP Isabella Rossi arriving tomorrow Room 42",
    "champagne for Rossi VIP",
    "welcome card outstanding VIP Room 42",
    "quiet upper floor preferred for Rossi"
  ];
  const analyzed = makeAnalyzed(notes);
  const groups = Shift.groupIntoOperationalObjects(analyzed.map(function (n, i) {
    return { fact: n.fact, note: n, factId: "v-" + i };
  }));
  const vipGroups = groups.filter(function (g) { return g.type === "vip"; });
  assert(vipGroups.length === 1, "related VIP amenity notes merge into one object");
  const blob = JSON.stringify(vipGroups[0] || {});
  assert(/champagne/i.test(blob) && /welcome/i.test(blob), "merged VIP keeps champagne + welcome card");
  const result = analyze(notes);
  const vipRecs = (result.recommendations || []).filter(function (r) { return /vip/i.test(r.text); });
  assert(vipRecs.length <= 2, "VIP produces one logical preparation action (not amenity spam)");
  assert(vipRecs.some(function (r) {
    return /Isabella|Rossi|Room 42/i.test(r.text) &&
      (/champagne|welcome|quiet|Verify room allocation|Prepare VIP|Complete VIP/i.test(r.text));
  }), "VIP action keeps guest/room and prep context");
})();

(function informationalNoiseSuppressed() {
  const result = analyze([
    "Night was quiet after 1am",
    "Occupancy looked healthy",
    "Room 41 noise complaint. Apologised and quiet afterwards."
  ]);
  const recs = result.recommendations || [];
  assert(!recs.some(function (r) {
    return /quiet after|occupancy looked|noise complaint/i.test(r.text);
  }), "informational / resolved notes do not become recommendations");
})();

(function noDuplicateFamilyAcrossRecs() {
  const result = analyze([
    "24 ac broken maint aware fan guest",
    "Room 24 AC still broken — follow up maintenance",
    "Please chase Room 24 AC with maint"
  ]);
  const acRecs = (result.recommendations || []).filter(function (r) {
    return /24/i.test(r.text) && /AC|maint/i.test(r.text);
  });
  assert(acRecs.length === 1, "duplicate AC chases collapse to one recommendation");
})();

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
