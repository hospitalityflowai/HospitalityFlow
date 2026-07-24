/**
 * AI Writing Engine coverage tests.
 * Run: node scripts/test-ai-writing-engine.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const engineSrc = fs.readFileSync(path.join(ROOT, "ai-writing-engine.js"), "utf8");

const context = {
  window: {},
  globalThis: {},
  console,
  Date,
  Math,
  Object,
  Array,
  String,
  parseInt,
  parseFloat,
  isNaN,
  RegExp
};
context.global = context.window;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(engineSrc, context);

const Engine = context.window.AiWritingEngine || context.globalThis.AiWritingEngine;
if (!Engine) throw new Error("AiWritingEngine failed to load");

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

function assertEqual(actual, expected, label) {
  if (actual === expected) {
    passed += 1;
    console.log("  ✓ " + label);
  } else {
    failed += 1;
    console.error("  ✗ " + label);
    console.error("      expected: " + JSON.stringify(expected));
    console.error("      actual:   " + JSON.stringify(actual));
  }
}

function assertIncludes(actual, fragment, label) {
  if (String(actual).indexOf(fragment) !== -1) {
    passed += 1;
    console.log("  ✓ " + label);
  } else {
    failed += 1;
    console.error("  ✗ " + label);
    console.error("      missing:  " + JSON.stringify(fragment));
    console.error("      actual:   " + JSON.stringify(actual));
  }
}

function assertActionable(actual, label) {
  assert(/\bPlease\b/.test(actual), label + " includes actionable Please…");
}

console.log("\nAI Writing Engine v" + Engine.version + "\n");

console.log("Duty Manager operational rewrites");
assertEqual(
  Engine.rewriteNote("room 22 late c/o at noon"),
  "Room 22 – Late check-out has been confirmed until 12:00 PM. Please advise Housekeeping and ensure the guest is not disturbed before the agreed departure time.",
  "late c/o at noon"
);
assertEqual(
  Engine.rewriteNote("room 31 wants extend stay speak morning"),
  "Room 31 – The guest has requested to extend their stay. Please follow up with the guest in the morning, confirm availability, and update the reservation if the extension is agreed.",
  "extend stay speak morning"
);
assertEqual(
  Engine.rewriteNote("room 1 moving to 51 upgrade paid 50 per extra per night"),
  "Room 1 – The guest has been relocated to Room 51. The upgrade is confirmed at an additional charge of £50 per night. Please ensure the PMS reflects the new room allocation and that the upgrade charge has been posted.",
  "room move with paid upgrade"
);
assertEqual(
  Engine.rewriteNote("11 iron board with ireon"),
  "Room 11 – The guest has requested an iron and ironing board. Please arrange delivery to the room and confirm with the guest once provided.",
  "iron board with spelling fix"
);
assertEqual(
  Engine.rewriteNote("guest upset ac"),
  "The guest has reported an air-conditioning issue and is unhappy with the situation. Please arrange for Maintenance to attend, follow up with the guest to confirm the issue has been resolved, and record the outcome.",
  "guest upset ac"
);

console.log("\nActionable Duty Manager voice");
[
  "room 22 late c/o at noon",
  "room 31 wants extend stay speak morning",
  "11 iron board with ireon",
  "guest upset ac"
].forEach(function (note) {
  assertActionable(Engine.rewriteNote(note), note);
});

console.log("\nPolicy / knowledge rewrites");
assertEqual(
  Engine.rewritePolicy("late co only if manager say yes unless vip"),
  "Late check-outs require Duty Manager approval unless arranged for a VIP guest or otherwise authorised.",
  "late co policy"
);
assertEqual(
  Engine.rewritePolicy("adapters 20 pound if not return"),
  "A £20 replacement charge applies if a loan adapter is not returned.",
  "adapter replacement charge"
);

console.log("\nIntelligent shift summary");
const summaryNotes = [
  { original: "room 31 wants extend stay speak morning", section: "guest", rooms: ["31"] },
  { original: "room 22 late c/o at noon", section: "guest", rooms: ["22"] },
  { original: "room 1 moving to 51 upgrade paid 50 per extra per night", section: "guest", rooms: ["1"] },
  { original: "11 iron board with ireon", section: "inventory", rooms: ["11"] }
];
const summary = Engine.summarizeHandover({ analyzed: summaryNotes });
assertIncludes(summary, "No critical operational issues", "summary opens with no critical issues");
assertIncludes(summary, "Four follow-up items remain", "summary counts four follow-ups");
assertIncludes(summary, "guest extension request", "summary mentions extension");
assertIncludes(summary, "late check-out", "summary mentions late check-out");
assertIncludes(summary, "room move", "summary mentions room move");
assertIncludes(summary, "inventory request", "summary mentions inventory");

console.log("\nSafety: preserve protected facts");
const moneyNote = Engine.rewriteNote("Room 118 card declined, £320 balance on folio", { section: "payments" });
assertIncludes(moneyNote, "£320", "preserves monetary amount");
assertActionable(moneyNote, "payment note");
const named = Engine.rewriteNote("VIP Mr Henderson arriving 14:00", { section: "vip", isVip: true });
assertIncludes(named, "Mr Henderson", "preserves guest name");
assertIncludes(named, "14:00", "preserves arrival time");
assertActionable(named, "VIP note");

console.log("\nShared polish + preferences");
const polished = Engine.polish("Please authorize the refund at the center", {
  module: Engine.MODULES.sop,
  prefs: { language: "British English" }
});
assertIncludes(polished, "authorise", "British English authorise");
assertIncludes(polished, "centre", "British English centre");

console.log("\nModule surface");
assert(typeof Engine.rewrite === "function", "rewrite()");
assert(typeof Engine.rewriteNote === "function", "rewriteNote()");
assert(typeof Engine.rewritePolicy === "function", "rewritePolicy()");
assert(typeof Engine.rewriteKnowledge === "function", "rewriteKnowledge()");
assert(typeof Engine.polish === "function", "polish()");
assert(typeof Engine.summarizeHandover === "function", "summarizeHandover()");
assert(Engine.MODULES.handover === "handover", "MODULES.handover");
assert(Engine.MODULES.policy === "policy", "MODULES.policy");

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
