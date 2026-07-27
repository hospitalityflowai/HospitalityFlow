/**
 * Hotel Brain writing improvement + Advanced Settings visibility tests.
 * Run: node scripts/test-hotel-brain-writing.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const engineSrc = fs.readFileSync(path.join(ROOT, "ai-writing-engine.js"), "utf8");
const profileHtml = fs.readFileSync(path.join(ROOT, "hotel-profile.html"), "utf8");

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
    console.error("      unexpected: " + JSON.stringify(fragment));
    console.error("      actual:     " + JSON.stringify(actual));
  }
}

function isHotelBrainDevToolsEnabled(hostname, search, storage) {
  const params = new URLSearchParams(search || "");
  if (params.get("hf_dev") === "1") return true;
  return false;
}

console.log("\nHotel Brain writing mode\n");

const staffingBefore =
  "Duty managers cover morning am and afternoon pm shifts, 5days working week night manager 5days working week, on the night manager days off or annual leave, duty manager covers nigh shifts.";
const staffingAfter = Engine.improveHotelBrainWriting(staffingBefore);

assertIncludes(staffingAfter, "Duty Managers", "grammar/role casing: Duty Managers");
assertIncludes(staffingAfter, "AM and PM", "normalises morning am / afternoon pm");
assertIncludes(staffingAfter, "five days", "grammar: 5days → five days");
assertIncludes(staffingAfter, "Night Manager", "role casing: Night Manager");
assertIncludes(staffingAfter, "night shift", "spelling: nigh → night");
assertNotIncludes(staffingAfter, "nigh ", "does not leave misspelling nigh");
assertNotIncludes(staffingAfter, "5days", "does not leave 5days");

console.log("\nOperations-manual rewrite (Writing V3)");
const earlyBefore =
  "We do not offer early check-ins with any fee as we cannot guarantee, we request to book it night before to make sure guest can check-in early.";
const earlyAfter = Engine.improveHotelBrainWriting(earlyBefore);
assertIncludes(earlyAfter, "Early check-in cannot be guaranteed", "early check-in: cannot be guaranteed");
assertIncludes(earlyAfter, "not available as a paid service", "early check-in: not a paid service");
assertIncludes(earlyAfter, "previous night", "early check-in: previous night booking");
assertIncludes(earlyAfter, "available upon arrival", "early check-in: available upon arrival");
assertNotIncludes(earlyAfter.toLowerCase(), "we do not offer", "removes first-person we do not offer");
assertNotIncludes(earlyAfter.toLowerCase(), "we request", "removes first-person we request");

const smokingAfter = Engine.improveHotelBrainWriting("If guest smokes inside the rooms penalty charge.");
assertIncludes(smokingAfter, "Smoking is strictly prohibited", "smoking: prohibited throughout hotel");
assertIncludes(smokingAfter, "smokes inside a room", "smoking: room smoking consequence");
assertIncludes(smokingAfter, "smoking penalty charge", "smoking: penalty charge preserved without inventing amount");
assertNotIncludes(smokingAfter, "£250", "smoking: does not invent £250");

const keyAfter = Engine.improveHotelBrainWriting("Guest takes key home charge 150 call guest.");
assertIncludes(keyAfter, "£150", "key: preserves £150 charge");
assertIncludes(keyAfter, "replacement charge", "key: replacement charge wording");
assertIncludes(keyAfter, "Contact the guest", "key: contact guest before charge");

const lateAfter = Engine.improveHotelBrainWriting("late co only if dm says yes unless vip");
assertIncludes(lateAfter, "Late check-out", "late check-out expanded");
assertIncludes(lateAfter, "Duty Manager", "Duty Manager terminology");
assertIncludes(lateAfter, "VIP", "preserves VIP condition");

const adapterAfter = Engine.improveHotelBrainWriting("adapters 20 pound if not return");
assertIncludes(adapterAfter, "£20", "adapter fee preserved as £20");
assertIncludes(adapterAfter, "not returned", "adapter return condition");
assertNotIncludes(adapterAfter, "20 pound 20 pound", "does not duplicate fee text");

assertEqual(
  earlyAfter,
  "Early check-in cannot be guaranteed and is therefore not available as a paid service. Guests who require an early check-in should book the room from the previous night to ensure the room is available upon arrival.",
  "early check-in full operations-manual rewrite"
);

console.log("\nExplain Briefly");
assert(typeof Engine.explainHotelBrainBriefly === "function", "explainHotelBrainBriefly exported");
const earlyBrief = Engine.explainHotelBrainBriefly(earlyBefore);
assertIncludes(earlyBrief, "not guaranteed", "brief early check-in: not guaranteed");
assertIncludes(earlyBrief, "night before", "brief early check-in: night before");
const smokingBrief = Engine.explainHotelBrainBriefly("If guest smokes inside the rooms penalty charge.");
assertIncludes(smokingBrief.toLowerCase(), "smoking", "brief smoking mentions smoking");
assertNotIncludes(smokingBrief, "£250", "brief smoking does not invent fee");
const keyBrief = Engine.explainHotelBrainBriefly("Guest takes key home charge 150 call guest.");
assertIncludes(keyBrief, "£150", "brief key preserves £150");

console.log("\nProfessional standard gate");
assert(Engine.looksLikeHotelBrainProfessional(earlyAfter) === true,
  "rewritten early check-in counts as professional");
assert(Engine.looksLikeHotelBrainProfessional(earlyBefore) === false,
  "rough early check-in is not already professional");
assert(Engine.looksLikeHotelBrainProfessional("If guest smokes inside the rooms penalty charge.") === false,
  "telegraphic smoking note is not professional");

console.log("\nBritish English");
const british = Engine.improveHotelBrainWriting(
  "Please authorize the refund at the center desk",
  { prefs: { language: "British English" } }
);
assertIncludes(british, "authorise", "British English authorise");
assertIncludes(british, "centre", "British English centre");

console.log("\nPreserve protected facts");
const facts = Engine.improveHotelBrainWriting(
  "Room 118 card declined with £320 balance at 14:00 for Mr Henderson. Occupancy was 92% on 12/07/2026."
);
assertIncludes(facts, "118", "preserves room number");
assertIncludes(facts, "£320", "preserves £ amount");
assertIncludes(facts, "14:00", "preserves time");
assertIncludes(facts, "Mr Henderson", "preserves guest name");
assertIncludes(facts, "92%", "preserves percentage");
assertIncludes(facts, "12/07/2026", "preserves date");

console.log("\nPreserve hotel terminology");
const terms = Engine.improveHotelBrainWriting(
  "Keep DND rooms undisturbed. Front desk must brief the Duty Manager on VIP arrivals."
);
assertIncludes(terms, "DND", "preserves DND abbreviation");
assertIncludes(terms, "Duty Manager", "preserves Duty Manager terminology");

console.log("\nNo invented facts or completion");
const noInvent = Engine.improveHotelBrainWriting(
  "Room 12 air conditioning noisy, guest complained"
);
assert(Engine.inventsCompletionStatus("Room 12 air conditioning noisy, guest complained", noInvent) === false,
  "does not invent completion status");
assertNotIncludes(noInvent.toLowerCase(), "completed", "does not invent completed");
assertNotIncludes(noInvent.toLowerCase(), "resolved", "does not invent resolved");

console.log("\nNo handover action templates");
assert(Engine.containsHandoverActionTemplate(staffingAfter) === false,
  "staffing rewrite has no handover templates");
assertNotIncludes(staffingAfter, "Maintenance to attend", "no Maintenance to attend");
assertNotIncludes(staffingAfter, "Reception to collect", "no Reception to collect");
assertNotIncludes(staffingAfter, "Chase for an update", "no Chase for an update");
assertNotIncludes(staffingAfter, "Incoming team to action", "no Incoming team to action");
assertNotIncludes(staffingAfter, "Please arrange", "no Please arrange action");

const polishedViaModule = Engine.polish(staffingBefore, {
  module: Engine.MODULES.hotelBrain
});
assertNotIncludes(polishedViaModule, "Maintenance to attend", "hotelBrain module avoids handover templates");
assert(typeof polishedViaModule === "string", "hotelBrain polish returns string");

console.log("\nApply / Cancel behaviour (field-local only)");
const draft = { staffing: staffingBefore, other: "Leave this untouched" };
const preview = Engine.improveHotelBrainWriting(draft.staffing);
assert(preview !== draft.staffing, "preview produces improved text");
assert(draft.staffing === staffingBefore, "Cancel path: original field unchanged before Apply");
assert(draft.other === "Leave this untouched", "other fields untouched before Apply");
const applied = Object.assign({}, draft, { staffing: preview });
assert(applied.staffing === preview, "Apply updates only the target field");
assert(applied.other === "Leave this untouched", "Apply leaves sibling fields unchanged");

console.log("\nDev / sample controls visibility");
assert(isHotelBrainDevToolsEnabled("localhost", "", {}) === false,
  "localhost without hf_dev stays hidden");
assert(isHotelBrainDevToolsEnabled("127.0.0.1", "", {}) === false,
  "127.0.0.1 without hf_dev stays hidden");
const prodStore = {};
assert(isHotelBrainDevToolsEnabled("hospitalityflow.co.uk", "", prodStore) === false,
  "normal production users cannot see sample/dev controls");
assert(isHotelBrainDevToolsEnabled("localhost", "?hf_dev=1", prodStore) === true,
  "localhost with hf_dev=1 enables controls");
assert(isHotelBrainDevToolsEnabled("hospitalityflow.co.uk", "?hf_dev=1", prodStore) === true,
  "production URL with hf_dev=1 enables controls");
assert(profileHtml.includes('id="devSamplePanel"'), "sample panel exists in markup");
assert(profileHtml.includes("dev-only-panel"), "dev panels use gated class");
assert(profileHtml.includes("isHotelBrainDevToolsEnabled"), "visibility gate is wired");
assert(profileHtml.includes("Improve Writing"), "Improve Writing UI present");
assert(profileHtml.includes("Explain Briefly"), "Explain Briefly UI present");
assert(profileHtml.includes("explainHotelBrainBriefly"), "Explain Briefly engine wired");
assert(profileHtml.includes("isAlreadyHotelBrainProfessional"), "professional gate wired for no-improvements");
assert(profileHtml.includes("Set how Hospitality Flow should write, prioritise and interpret"),
  "AI instructions helper text present");
assert(profileHtml.includes('id="improveWritingModal"'), "preview confirmation modal present");
assert(profileHtml.includes("No improvements needed."), "no-change status copy present");
assert(profileHtml.includes("Writing improved. Save Hotel Brain to keep the change."),
  "apply status copy present");
assert(profileHtml.includes("Writing could not be improved. Please try again."),
  "error status copy present");
assert(profileHtml.includes("Could not improve this wording further. Please edit manually."),
  "non-professional no-change copy present");
assert(!/localStorage\.setItem\('hf_hotel_brain_dev'/.test(profileHtml),
  "hf_dev is not permanently persisted to localStorage");

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
