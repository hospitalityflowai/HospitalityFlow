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

function assertNotIncludes(actual, fragment, label) {
  if (String(actual).indexOf(fragment) === -1) {
    passed += 1;
    console.log("  ✓ " + label);
  } else {
    failed += 1;
    console.error("  ✗ " + label);
    console.error("      unexpectedly found: " + JSON.stringify(fragment));
    console.error("      actual:   " + JSON.stringify(actual));
  }
}

function assertActionable(actual, label) {
  var hasDeptTo = /\b(?:Maintenance|Engineering|Housekeeping|Reception|Front Office|Duty Manager)\s+to\b/.test(actual);
  var hasImperative = /(?:^|[.;:]\s*)(?:Confirm|Advise|Arrange|Ensure|Update|Settle|Collect|Issue|Inspect|Chase|Contact|Review|Secure|Supply|Hold|Complete|Attend|Resolve|Escalate|Brief|Deliver|Post|Record|Offer|Adjust|Action this|Incoming team to)\b/.test(actual);
  assert(hasDeptTo || hasImperative, label + " includes a clear operational action");
}

function countFollowUpBoilerplate(text) {
  var matches = String(text).match(/\bPlease follow up\b/gi);
  return matches ? matches.length : 0;
}

function countPlease(text) {
  var matches = String(text).match(/\bPlease\b/g);
  return matches ? matches.length : 0;
}

console.log("\nAI Writing Engine v" + Engine.version + "\n");

console.log("Duty Manager operational rewrites");
assertEqual(
  Engine.rewriteNote("room 22 late c/o at noon"),
  "Room 22 – Late check-out has been confirmed until 12:00 PM. Advise Housekeeping; do not disturb the guest before the agreed departure time.",
  "late c/o at noon"
);
assertEqual(
  Engine.rewriteNote("room 31 wants extend stay speak morning"),
  "Room 31 – The guest has requested to extend their stay. Confirm availability with the guest in the morning and update the reservation if the extension is agreed.",
  "extend stay speak morning"
);
assertEqual(
  Engine.rewriteNote("room 1 moving to 51 upgrade paid 50 per extra per night"),
  "Room 1 – The guest has been relocated to Room 51. The upgrade is confirmed at an additional charge of £50 per night. Update the PMS with the new room allocation and post the upgrade charge.",
  "room move with paid upgrade"
);
assertEqual(
  Engine.rewriteNote("11 iron board with ireon"),
  "Room 11 – The guest has requested an iron and ironing board. Housekeeping to deliver to the room and confirm with the guest once provided.",
  "iron board with spelling fix"
);
assertEqual(
  Engine.rewriteNote("guest upset ac"),
  "The guest has reported an air-conditioning issue and is unhappy with the situation. Maintenance to attend and confirm with the guest once resolved.",
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

console.log("\nPriority 1 — follow-up polish");

/* 1. Note already containing an action — do not append another follow-up */
const withAction = Engine.rewriteNote(
  "Room 55 special request pending — Reception to call guest for collection"
);
assertIncludes(withAction, "Reception to call", "keeps existing Reception action");
assertNotIncludes(withAction, "Please follow up", "no Please follow up when action already present");
assertNotIncludes(withAction, "Incoming team to action", "does not append generic chase when action already present");
assert(
  countFollowUpBoilerplate(withAction) === 0,
  "zero Please-follow-up boilerplate when action already present"
);
assert(
  (withAction.match(/\b(?:Maintenance|Engineering|Housekeeping|Reception)\s+to\b/g) || []).length === 1,
  "exactly one department-to instruction when action already present"
);

/* 2. Note without an action — add exactly one direct instruction */
const withoutAction = Engine.rewriteNote("room 14 guest still waiting on extra towels");
assertActionable(withoutAction, "note without action");
assertNotIncludes(withoutAction, "Please follow up during this shift", "no generic during-this-shift boilerplate");
assert(
  countPlease(withoutAction) === 0,
  "note without action does not rely on Please boilerplate"
);

/* 3. Completed action — no further follow-up */
const completed = Engine.rewriteNote("Room 9 iron delivered and sorted", { section: "completed" });
assertIncludes(completed, "Room 9", "completed note keeps room");
assertNotIncludes(completed, "Please follow up", "completed note has no Please follow up");
assertNotIncludes(completed, "Incoming team to action", "completed note has no generic chase action");
assertNotIncludes(completed, "during this shift", "completed note has no during-this-shift boilerplate");
assert(
  !/\b(?:Maintenance|Engineering|Housekeeping|Reception)\s+to\b/.test(completed) &&
    !/(?:^|[.;:]\s*)(?:Confirm|Chase|Action this|Incoming team to)\b/.test(completed),
  "completed note does not receive a new follow-up instruction"
);

/* 4. Multiple notes do not all start or end with the same phrase */
const batch = [
  Engine.rewriteNote("room 22 late c/o at noon"),
  Engine.rewriteNote("room 31 wants extend stay speak morning"),
  Engine.rewriteNote("11 iron board with ireon"),
  Engine.rewriteNote("guest upset ac"),
  Engine.rewriteNote("Room 118 card declined, £320 balance on folio", { section: "payments" })
];
const openings = batch.map(function (text) {
  return text.replace(/^Room\s+\d+\s*[–—-]\s*/i, "").slice(0, 24);
});
const uniqueOpenings = new Set(openings);
assert(uniqueOpenings.size >= 4, "rewrites do not share one opening phrase");

const endings = batch.map(function (text) {
  var parts = text.replace(/\.$/, "").split(/[.!;]\s+/);
  return parts[parts.length - 1].trim().toLowerCase();
});
const uniqueEndings = new Set(endings);
assert(uniqueEndings.size >= 4, "rewrites do not share one closing phrase");
assert(
  batch.every(function (text) { return countFollowUpBoilerplate(text) === 0; }),
  "batch contains no Please-follow-up boilerplate"
);
assert(
  batch.every(function (text) { return countPlease(text) === 0; }),
  "batch does not lean on Please across every item"
);

/* 5. No factual details are invented */
const moneyNote = Engine.rewriteNote("Room 118 card declined, £320 balance on folio", { section: "payments" });
assertIncludes(moneyNote, "£320", "preserves monetary amount");
assertNotIncludes(moneyNote, "£120", "does not invent a different amount");
assertActionable(moneyNote, "payment note");

const named = Engine.rewriteNote("VIP Mr Henderson arriving 14:00", { section: "vip", isVip: true });
assertIncludes(named, "Mr Henderson", "preserves guest name");
assertIncludes(named, "14:00", "preserves arrival time");
assertNotIncludes(named, "champagne", "does not invent amenities");
assertActionable(named, "VIP note");

const lateFacts = Engine.rewriteNote("room 22 late c/o at noon");
assertIncludes(lateFacts, "12:00 PM", "preserves noon as departure time");
assertIncludes(lateFacts, "Room 22", "preserves room number");

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
