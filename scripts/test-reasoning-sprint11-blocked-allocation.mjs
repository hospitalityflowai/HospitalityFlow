/**
 * Reasoning Sprint 11 — Blocked allocation & room-status contradiction.
 *
 * When an arrival's assigned/system room is evidenced unavailable, OOO, or
 * operationally contradicted → OPEN allocation/clarification. Never invent a
 * replacement room. Soft/mitigated OOO remains MONITOR / non-OPEN chase.
 *
 * Pins: Riverton 004/006/018 shapes + Sprint 8 Helene/Andrew + Sprint 9/10.
 *
 * Run: node scripts/test-reasoning-sprint11-blocked-allocation.mjs
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
    if (/balance|payment|folio|settled|invoice|bill|£|paid|poa|refund|tokenis|prepaid/i.test(line)) {
      section = "payments";
    }
    if (/maintenance|ooo|leak|engineer|inspect|shower|carpet/i.test(line)) section = "maintenance";
    if (/\bvip\b|fruit|champagne|flower/i.test(line)) section = "vip";
    if (/luggage|allocate|arriv|accessible|taxi/i.test(line)) section = "guest";
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
      isFollowUp: /follow\s*up|monitor|clarify|collect/i.test(line),
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
    handoverDate: temporal.handoverDate || "2026-08-08",
    shift: temporal.shift || "PM",
    createdAt: temporal.createdAt || "2026-08-08T15:45:00.000Z"
  });
  analyzed._canonicalActions = actions;
  analyzed._canonicalActionsBuilt = true;
  var briefing = Engine.buildTodaysBriefing(analyzed, {
    maxBlocks: 5,
    handoverDate: temporal.handoverDate || "2026-08-08",
    shift: temporal.shift || "PM",
    createdAt: temporal.createdAt || "2026-08-08T15:45:00.000Z",
    canonicalActions: actions
  });
  return {
    analyzed: analyzed,
    actions: actions,
    briefing: briefing,
    briefingText: ((briefing && briefing.paragraphs) || []).join("\n")
  };
}

function openActions(actions) {
  return (actions || []).filter(function (a) {
    return a && a.actionState === "open";
  });
}

function openFacet(p, re) {
  return openActions(p.actions).find(function (a) {
    return re.test(a.facetKey || "");
  });
}

function openBlob(p) {
  return openActions(p.actions).map(function (a) {
    return (a.facetKey || "") + " :: " + (a.actionText || "");
  }).join("\n");
}

console.log("\n=== Sprint 11 — True positives (blocked / contradicted allocation) ===\n");

(function whitbyLg08() {
  console.log("TP1. Whitby Acc / LG08 occupied — OPEN allocation (Riverton 004)");
  var p = pipeline([
    "ACCESSIBLE / MOBILITY",
    "Mrs Lorna Whitby arriving this evening (booking RB-91002). Needs **Accessible King**. Currently showing allocated to **LG08** on the system.",
    "Problem: LG08 is still occupied by a stayover who extended last night (Mr Crowley — medical, DM approved extension). Crowley not leaving until tomorrow midday at earliest.",
    "Option B — Deluxe King near lift on floor 2 if she will accept non-accessible with staff assistance for luggage",
    "Daughter said she will “call back after 17:00” — **no confirmed choice yet**."
  ], { shift: "PM" });
  var alloc = openFacet(p, /allocation:blocked_assigned|allocation:opera_assign/);
  assert(!!alloc, "OPEN blocked/clarify allocation exists for Whitby");
  assert(/Whitby/i.test(alloc.canonicalName || alloc.actionText || ""), "Whitby retained");
  assert(/LG08/i.test(alloc.actionText || ""), "LG08 retained in action text");
  assert(!/\b516\b/.test(alloc.actionText || ""), "Does not invent Acc 516 as replacement");
  assert(!openFacet(p, /guest_request:luggage/), "Option B luggage is not OPEN");
  assert(!/no urgent guest-impacting priorities/i.test(p.briefingText),
    "Briefing is not empty quiet-shift when allocation conflict exists");
})();

(function yuenOoo() {
  console.log("TP2. Yuen allocated to OOO 218 — OPEN reallocate (Riverton 006)");
  var p = pipeline([
    "**Room 218 — OOO** — water leak under vanity. Soft comment: “hopefully back later today if drying ok” — **NOT a release**.",
    "**Room 220 — OOO** — carpet replacement. Do not sell.",
    "Arrival **Ms Yuen** originally allocated **218** for tonight — **cannot** go into 218 while OOO",
    "Temporary idea: move Yuen to **222** if clean — HK has not confirmed 222 status"
  ], { shift: "AM", createdAt: "2026-08-08T07:15:00.000Z" });
  var alloc = openFacet(p, /allocation:blocked_assigned/);
  assert(!!alloc, "OPEN allocation:blocked_assigned for Yuen");
  assert(/Yuen/i.test(alloc.canonicalName || alloc.actionText || ""), "Yuen retained");
  assert(/\b218\b/.test(alloc.actionText || "") || String(alloc.room) === "218",
    "Assigned 218 retained");
  assert(!/\b222\b/.test(alloc.actionText || ""), "Does not invent 222 as replacement");
  var softOoo = (p.actions || []).find(function (a) {
    return /218/.test(String(a.room || "") + " " + (a.actionText || "")) &&
      /ooo|maintenance/i.test(a.facetKey || "");
  });
  assert(softOoo && softOoo.actionState !== "open",
    "Soft OOO 218 engineering is not OPEN chase");
  assert(!/no urgent guest-impacting priorities/i.test(p.briefingText),
    "Briefing surfaces allocation conflict");
})();

(function quillConflict() {
  console.log("TP3. Quill / 315 status contradiction — OPEN clarify (Riverton 018)");
  var p = pipeline([
    "**Ms Renata Quill** — booking RB-66104 — due ~14:00 — system allocation **Room 315**",
    "Room rack print (07:55): **315 CHECKED OUT** — guest name on rack **Mr Paul Kemp** — checked out 07:20",
    "HK board (08:05): **315** still showing **stayover dirty** from night report",
    "Housekeeping WhatsApp 08:25: “315 empty when we opened door — taking as vacant dirty — starting clean”",
    "“Collect £120 Quill” — **no** — prepaid direct — zero balance due on arrival"
  ], { shift: "AM", createdAt: "2026-08-08T07:15:00.000Z" });
  var clarify = openFacet(p, /occupancy_conflict|allocation:blocked_assigned/);
  assert(!!clarify, "OPEN occupancy/allocation clarification for Quill");
  assert(/Quill/i.test(clarify.canonicalName || clarify.actionText || ""), "Quill retained");
  assert(String(clarify.room) === "315" || /\b315\b/.test(clarify.actionText || ""),
    "Room 315 retained");
  assert(!/move to Room|assign(?:ed)? to Room (?!315)|correct room is/i.test(clarify.actionText || ""),
    "Does not invent a different room");
  assert(!openActions(p.actions).some(function (a) {
    return /payment:collect/i.test(a.facetKey || "");
  }), "No false £120 OPEN collect");
  assert(!/no urgent guest-impacting priorities/i.test(p.briefingText),
    "Contradiction is not silent quiet-shift");
})();

console.log("\n=== Sprint 11 — False positives / pins ===\n");

(function noInventBalance() {
  console.log("FP1. Balance-availability alone → no OPEN allocation (Sprint 8)");
  var p = pipeline([
    "Guest Example\trm 18\tPlease advice of the complimentary upgrade to balance availability // From DD"
  ]);
  assert(!openFacet(p, /allocation:/), "No OPEN allocation from weak balance-availability");
})();

(function operaHelene() {
  console.log("FP2. Opera unable-to-allocate → OPEN (Sprint 8 Helene shape)");
  var p = pipeline([
    "Guest Example\tvip\trm32\tdep\t07/08/2026\t-\tRegular Guest / unable to allocate on Opera room 32 shows still svailable"
  ]);
  var alloc = openFacet(p, /allocation:opera_assign/);
  assert(!!alloc, "OPEN allocation:opera_assign preserved");
  assert(String(alloc.room) === "32", "Opera allocation retains Room 32");
})();

(function andrewClarify() {
  console.log("FP3. Andrew/rm2 checkout contradiction → OPEN clarify (Sprint 8)");
  var p = pipeline([
    "Andrew Example\t\trm\t2\t\t\t\t20% off food and beverage (once per stay)",
    "rooms 2 and 23 checked out."
  ], { handoverDate: "2026-08-07" });
  var clarify = openFacet(p, /occupancy_conflict/);
  assert(!!clarify, "OPEN occupancy_conflict clarify preserved");
  assert(String(clarify.room) === "2", "Clarify retains Room 2");
})();

(function softOooMonitor() {
  console.log("FP4. Soft hopefully / NOT a release OOO → MONITOR not OPEN maint");
  var p = pipeline([
    "Room 218 — OOO — water leak. Engineering: hopefully back later today — NOT a release. Do not mark sellable."
  ], { shift: "AM", createdAt: "2026-08-08T07:15:00.000Z" });
  var openMaint = openActions(p.actions).filter(function (a) {
    return /maintenance/i.test(a.facetKey || "");
  });
  assert(openMaint.length === 0, "Soft OOO alone does not OPEN maintenance chase");
  var mon = (p.actions || []).find(function (a) {
    return a.actionState === "monitor" && /218|ooo/i.test((a.actionText || "") + (a.facetKey || ""));
  });
  assert(!!mon, "Soft OOO retains MONITOR action");
})();

(function paymentPin() {
  console.log("FP5. Sprint 9 payment pin — prepaid not OPEN collect");
  var p = pipeline([
    "Ms Renata Quill due 14:00 Room 315 — prepaid direct — zero balance — ignore Collect £120 stamp"
  ], { shift: "AM" });
  assert(!openActions(p.actions).some(function (a) {
    return /payment:collect/i.test(a.facetKey || "");
  }), "Prepaid Quill stamp is not OPEN payment:collect");
})();

(function doneAmenityPin() {
  console.log("FP6. Sprint 10 DONE amenity pin — fruit DONE not OPEN prep");
  var p = pipeline([
    "VIP fruit basket for rm 509 (Ms Adler) — already placed — DONE"
  ], { shift: "PM" });
  assert(!openActions(p.actions).some(function (a) {
    return /amenity:prep/i.test(a.facetKey || "");
  }), "DONE fruit is not OPEN amenity:prep");
})();

console.log("\n=== Sprint 11 results: " + passed + " passed, " + failed + " failed ===\n");
if (failed) process.exit(1);
