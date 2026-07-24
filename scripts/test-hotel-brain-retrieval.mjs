/**
 * Hotel Brain retrieval precision + VIP enrichment smoke tests.
 * Run: node scripts/test-hotel-brain-retrieval.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;

function pass(msg) {
  passed += 1;
  console.log("  PASS  " + msg);
}

function fail(msg) {
  failed += 1;
  console.error("  FAIL  " + msg);
}

function assert(condition, msg) {
  if (condition) pass(msg);
  else fail(msg);
}

function loadScript(file, sandbox) {
  const code = fs.readFileSync(path.join(ROOT, file), "utf8");
  vm.runInNewContext(code, sandbox, { filename: file });
}

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  window: {},
  globalThis: {}
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;

loadScript("hotel-profile-zetter-sample.js", sandbox);
loadScript("hotel-profile-operational.js", sandbox);
loadScript("shift-intelligence-engine.js", sandbox);

const HPO = sandbox.HotelProfileOperational;
const SI = sandbox.ShiftIntelligenceEngine;

assert(HPO && typeof HPO.getShiftIntelligenceKnowledge === "function", "HotelProfileOperational loaded");
assert(SI && typeof SI.analyze === "function", "ShiftIntelligenceEngine loaded");

const sample = sandbox.HotelProfileZetterSample.buildSampleProfilePatch();
const profile = HPO.mergeSampleIntoProfile({}, sample);
const brainContext = {
  general: profile.general || {},
  hotelKnowledge: profile.hotelKnowledge || {},
  operationalKnowledge: profile.operationalKnowledge || null,
  roomFacilities: profile.roomFacilities || [],
  departments: profile.departments || [],
  supplies: profile.supplies || []
};

console.log("\nTrigger-based Operational Knowledge retrieval");
const quietOnly = HPO.getShiftIntelligenceKnowledge(brainContext, "am", "Guest prefers a quiet room away from street");
const quietKnowledge = (quietOnly.matchedActions || []).filter((a) => a.sourceType === "knowledge");
assert(
  !quietKnowledge.some((a) => /lost property|wake-up|no-show|expedia/i.test(a.title || "")),
  "quiet-room notes do not retrieve unrelated knowledge (lost property / wake-up / no-show)"
);

function entryTriggers(sourceId) {
  const entries = brainContext.operationalKnowledge.knowledgeEntries || [];
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].id === sourceId) return (entries[i].triggerKeywords || []).join(" ");
  }
  return "";
}
assert(
  quietKnowledge.every((a) => {
    const triggers = entryTriggers(a.sourceId).toLowerCase();
    return /quiet|room allocation|twin|accessible|interconnect|lift|ground|street|dark|bathtub|sofa|extra bed|regular|vip|arrival/i.test(triggers);
  }),
  "retrieved knowledge for quiet notes only matches related trigger sets"
);

const emptyNotes = HPO.getShiftIntelligenceKnowledge(brainContext, "night", "");
const emptyKnowledge = (emptyNotes.checklistItems || []).filter((i) => i.sourceType === "knowledge");
assert(emptyKnowledge.length === 0, "empty notes do not retrieve knowledge entries by shift alone");
const emptyWorkflow = (emptyNotes.checklistItems || []).filter((i) => i.sourceType === "workflow");
assert(emptyWorkflow.length > 0, "night workflow checklist still available without note keywords");

const vipNotes = HPO.getShiftIntelligenceKnowledge(
  brainContext,
  "pm",
  "VIP Mr Henderson arriving 14:00, champagne amenity"
);
const vipActions = vipNotes.matchedActions || [];
assert(vipActions.some((a) => /vip/i.test(a.title || "")), "VIP notes retrieve VIP operational knowledge");
assert(
  vipActions.some((a) => a.followUpInstruction && /welcome card|amenities|invoice/i.test(a.followUpInstruction)),
  "VIP knowledge exposes followUpInstruction as recommended action"
);
assert(
  vipActions.some((a) => /Hotel Brain|welcome card|Confirm VIP/i.test(a.actionText || "")),
  "action text prefers followUpInstruction wording"
);

console.log("\nRoom attribute reminders");
const quietReminders = HPO.getRoomAttributeReminders(brainContext, "Guest wants a quiet room");
assert(quietReminders.some((r) => /quiet/i.test(r.text)), "quiet request returns quiet-facing rooms");
assert(!quietReminders.some((r) => /bathtub|twin capable|sofa/i.test(r.text)), "quiet request does not dump unrelated room attributes");

const lgReminders = HPO.getRoomAttributeReminders(brainContext, "Guest asked for lower ground room");
assert(lgReminders.some((r) => /lower-ground|lower ground/i.test(r.text)), "lower ground request returns lower-ground options");

const liftReminders = HPO.getRoomAttributeReminders(brainContext, "Please allocate away from lift");
assert(liftReminders.some((r) => /away from the lift/i.test(r.text)), "away-from-lift request returns matching rooms");

const interconnectReminders = HPO.getRoomAttributeReminders(brainContext, "Family need interconnecting rooms");
assert(interconnectReminders.some((r) => /interconnecting|24\/25|34\/35/i.test(r.text)), "interconnect request lists pairs");

console.log("\nInventory guest-impact filter");
const supplyLines = HPO.summarizeGuestImpactingSupplies(profile.supplies);
assert(supplyLines.some((l) => /adapter/i.test(l)), "guest-impact inventory includes adapters");
assert(supplyLines.every((l) => !/stationery|pen|sticky|cartridge/i.test(l)), "stationery / cartridges excluded from AI inventory context");

console.log("\nVIP enrichment (facts preserved)");
const classified = {
  _analyzed: [
    {
      original: "VIP Mr Henderson arriving 14:00, champagne amenity, quiet room preference",
      section: "vip",
      isVip: true,
      rooms: []
    }
  ]
};
const analysis = SI.analyze({
  classified,
  rawNotesText: classified._analyzed[0].original,
  brainContext,
  shiftCode: "PM",
  shiftDisplayName: "PM",
  departments: ["Reception", "Front Office", "Duty Management"]
});
const vipRec = (analysis.recommendations || []).find((r) => /VIP/i.test(r.text));
assert(!!vipRec, "VIP recommendation generated");
assert(/champagne|quiet/i.test(vipRec.text), "VIP recommendation keeps shift-note facts");
assert(/Hotel Brain:|Hotel VIP rules:/i.test(vipRec.text), "VIP recommendation enriched from Hotel Brain");

const followRec = (analysis.recommendations || []).find((r) =>
  /Hotel Brain:.*Confirm VIP room allocation|Hotel VIP rules:/i.test(r.text)
);
assert(!!followRec, "VIP recommendation is enriched with Hotel Brain follow-up / VIP rules");
assert(
  (analysis.recommendations || []).filter((r) => /Confirm VIP room allocation/i.test(r.text)).length <= 1,
  "VIP follow-up is not duplicated as a separate recommendation"
);

console.log("\nResults: " + passed + " passed, " + failed + " failed");
if (failed > 0) process.exit(1);
