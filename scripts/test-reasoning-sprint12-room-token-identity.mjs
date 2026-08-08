/**
 * Reasoning Sprint 12 — Generic operational room-token identity & binding.
 *
 * Prefixed IDs (M124, CX07, MS03, MA02, TR-2, LG08) and numeric rooms must
 * survive as stable atomic identifiers. Never collapse CX07→7 / M124→124.
 * Never invent rooms from booking codes. Preserve r24→24 and Room 315.
 *
 * Run: node scripts/test-reasoning-sprint12-room-token-identity.mjs
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

function roomsOf(text) {
  return Engine.extractRoomNumbers(text);
}

function pipeline(lines, temporal) {
  temporal = temporal || {};
  var analyzed = lines.map(function (line) {
    var rooms = Engine.extractRoomNumbers(line);
    var fact = Engine.extractOperationalFact(line, { rooms: rooms, isVip: /\bvip\b/i.test(line) });
    return {
      original: line,
      rooms: rooms.length ? rooms : (fact && fact.rooms) || [],
      section: "general",
      isVip: /\bvip\b/i.test(line),
      isCarriedOver: false,
      isFollowUp: false,
      maintenancePriority: null,
      fact: fact
    };
  });
  analyzed = Engine.consolidateNotesByFacts(analyzed);
  analyzed = Engine.resolveOperationalEntities(analyzed);
  analyzed = Engine.electCanonicalCurrentState(analyzed);
  analyzed = Shift.resolveOperationalDependencies(analyzed);
  var actions = Shift.buildCanonicalOperationalActions(analyzed, {
    handoverDate: temporal.handoverDate || "2026-09-15",
    shift: temporal.shift || "AM",
    createdAt: temporal.createdAt || "2026-09-15T07:15:00.000Z"
  });
  return { analyzed: analyzed, actions: actions };
}

console.log("\n=== Sprint 12 — Extraction / normalize identity ===\n");

(function extractIdentity() {
  console.log("1. Prefixed atomic IDs preserved");
  assert(roomsOf("M124").indexOf("M124") !== -1, "M124 extracted");
  assert(roomsOf("CX07").indexOf("CX07") !== -1, "CX07 extracted");
  assert(roomsOf("MS03").indexOf("MS03") !== -1, "MS03 extracted");
  assert(roomsOf("MA02").indexOf("MA02") !== -1, "MA02 extracted");
  assert(roomsOf("TR-2").indexOf("TR-2") !== -1, "TR-2 extracted");
  assert(roomsOf("LG08").indexOf("LG08") !== -1, "LG08 extracted");
  assert(Shift.normalizeRoomNumber("CX07") === "CX07", "normalize CX07 stays CX07");
  assert(Shift.normalizeRoomNumber("M124") === "M124", "normalize M124 stays M124");
  assert(Shift.normalizeRoomNumber("TR-2") === "TR-2", "normalize TR-2 stays TR-2");
  assert(Shift.normalizeRoomNumber("LG08") === "LG08", "normalize LG08 stays LG08");
})();

(function noCollapse() {
  console.log("2. Never collapse prefix away");
  assert(Shift.normalizeRoomNumber("CX07") !== "7", "CX07 not collapsed to 7");
  assert(Shift.normalizeRoomNumber("M124") !== "124", "M124 not collapsed to 124");
  assert(roomsOf("TR-2").indexOf("2") === -1, "TR-2 does not also invent bare room 2");
})();

(function numericLegacy() {
  console.log("3. Numeric + r24 legacy preserved");
  assert(roomsOf("Room 315").indexOf("315") !== -1, "Room 315 → 315");
  assert(roomsOf("rm 32").indexOf("32") !== -1, "rm 32 → 32");
  assert(roomsOf("r24").indexOf("24") !== -1, "r24 → 24");
  assert(roomsOf("r24").indexOf("R24") === -1, "r24 does not invent R24 token");
  assert(Shift.normalizeRoomNumber("315") === "315", "normalize 315");
})();

(function noInventBooking() {
  console.log("4. Booking codes are not rooms");
  assert(roomsOf("booking MG-55201").length === 0, "MG-55201 not a room");
  assert(roomsOf("RB-91002").length === 0, "RB-91002 not a room");
})();

(function rangesAndPairs() {
  console.log("5. Ranges and interconnect pairs");
  var r = roomsOf("holds M210–M215 quiet wing");
  assert(r.indexOf("M210") !== -1 && r.indexOf("M215") !== -1, "M210–M215 range ends");
  var p = roomsOf("need interconnect M114 + M115");
  assert(p.indexOf("M114") !== -1 && p.indexOf("M115") !== -1, "M114+M115 interconnect pair");
})();

console.log("\n=== Sprint 12 — Binding into Sprint 11 allocation paths ===\n");

(function patelBlocked() {
  console.log("6. Prefixed blocked assignment → OPEN (Patel / M212 shape)");
  var out = pipeline([
    "SkyLink holds M210–M215 quiet wing tonight — contractual — do not sell.",
    "Leisure arrival Mr Patel was showing system allocation M212 — he cannot stay on M212."
  ]);
  var alloc = (out.actions || []).find(function (a) {
    return a.actionState === "open" && /allocation:blocked_assigned/i.test(a.facetKey || "");
  });
  assert(!!alloc, "OPEN allocation:blocked_assigned exists");
  assert(String(alloc.room) === "M212", "Action binds Room M212");
  assert(/M212/.test(alloc.actionText || ""), "Action text retains M212");
  assert(!/\bCX\d+\b/.test(alloc.actionText || ""), "Does not invent CX replacement");
})();

(function cxContradiction() {
  console.log("7. CX07 contradiction → OPEN clarify (Talbot shape)");
  var out = pipeline([
    "Ms Renée Talbot due ~15:00 — system allocation CX07",
    "Night report: CX07 stayover dirty — guest Mr Coles",
    "HK: CX07 empty — taking vacant dirty — starting clean",
    "PMS: Coles checked out 07:05 express"
  ]);
  var clarify = (out.actions || []).find(function (a) {
    return a.actionState === "open" && /occupancy_conflict/i.test(a.facetKey || "");
  });
  assert(!!clarify, "OPEN occupancy_conflict clarify exists");
  assert(String(clarify.room) === "CX07", "Clarify binds CX07");
  assert(!/\bM\d+\b/.test(clarify.actionText || "") || /CX07/.test(clarify.actionText || ""),
    "Does not invent a Main numeric room as solution");
})();

(function lg08Pin() {
  console.log("8. LG08 Riverton-shaped pin still binds");
  var out = pipeline([
    "Mrs Lorna Whitby arriving this evening. Currently showing allocated to LG08 on the system.",
    "Problem: LG08 is still occupied by a stayover who extended last night."
  ], { shift: "PM" });
  var alloc = (out.actions || []).find(function (a) {
    return a.actionState === "open" && /allocation:blocked_assigned/i.test(a.facetKey || "");
  });
  assert(!!alloc, "LG08 blocked allocation OPEN");
  assert(/LG08/i.test(String(alloc.room || "") + (alloc.actionText || "")), "LG08 retained");
})();

(function numericOperaPin() {
  console.log("9. Numeric Opera unable-to-allocate still OPEN (Sprint 8)");
  var out = pipeline([
    "Guest Example\tvip\trm32\tdep\t07/08/2026\t-\tRegular Guest / unable to allocate on Opera room 32 shows still svailable"
  ]);
  var alloc = (out.actions || []).find(function (a) {
    return a.actionState === "open" && /allocation:opera_assign/i.test(a.facetKey || "");
  });
  assert(!!alloc, "OPEN allocation:opera_assign");
  assert(
    String(alloc.room) === "32" ||
      (Array.isArray(alloc.rooms) && alloc.rooms.indexOf("32") !== -1),
    "Numeric room 32 retained (not RM32 false prefix)"
  );
  assert(String(alloc.room) !== "RM32", "rm32 shorthand is not RM32 token");
})();

(function trNotTwo() {
  console.log("10. TR-2 is not room 2");
  var rooms = roomsOf("allocated to TR-2 treatment room");
  assert(rooms.indexOf("TR-2") !== -1, "TR-2 present");
  assert(rooms.indexOf("2") === -1, "bare 2 absent");
})();

console.log("\n=== Sprint 12 results: " + passed + " passed, " + failed + " failed ===\n");
if (failed) process.exit(1);
