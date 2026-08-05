/**
 * Hotel Brain notes-first simplification + Guest Intelligence regressions.
 * Run: node scripts/test-hotel-brain-notes-simplify.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log("  ✓ " + msg);
  } else {
    failed += 1;
    console.error("  ✗ " + msg);
  }
}

const profileHtml = read("hotel-profile.html");
const knowledgeJs = read("hotel-profile-knowledge.js");
const operationalJs = read("hotel-profile-operational.js");
const demoJs = read("js/demo-sample-data.js");
const storeJs = read("js/hotel-brain-store.js");

console.log("\n1. UI copy and structure");
assert(profileHtml.includes("Guest Intelligence"), "Guest Intelligence label present");
assert(profileHtml.includes("Hotel Intelligence"), "Hotel Intelligence label present");
assert(profileHtml.includes("hk-guest-intelligence-panel"), "Guest Intelligence panel prominence class present");
assert(
  profileHtml.includes("intelligence-layers") || profileHtml.includes("brain-pillars"),
  "intelligence layers / pillars explainer present"
);
assert(profileHtml.includes("Hotel Intelligence"), "Hotel Intelligence pillar present");
assert(profileHtml.includes("AI Shift Handover"), "AI Shift Handover pillar present");
assert(!/data-hk-panel="guest"[\s\S]{0,200}Guest Knowledge/.test(profileHtml), "Guest Knowledge visible label removed");
assert(profileHtml.includes("Booking Channels"), "Booking Channels heading present");
assert(/id="operations"[^>]*\bhidden\b/.test(profileHtml), "Daily Trackers remain hidden");
assert(/data-settings-group="extended"[^>]*\bhidden\b/.test(profileHtml), "Extended hotel details removed from Settings UX");
assert(profileHtml.includes("More details"), "General More details present");
assert(profileHtml.includes("grows over time"), "living-memory onboarding copy present");

console.log("\n2. Policy + OTA notes model");
assert(knowledgeJs.includes("POLICY_NOTES_GROUPS"), "grouped policy notes model present");
assert(knowledgeJs.includes("cancellationsNoShows"), "cancellations/no-shows notes key present");
assert(knowledgeJs.includes("preAuthorisations"), "pre-authorisations notes key present");
assert(knowledgeJs.includes("buildOtaChannelNotes"), "OTA notes migration helper present");
assert(knowledgeJs.includes("migrateOtaChannelsToNotes"), "OTA channel notes migration present");
assert(knowledgeJs.includes("type: 'other'"), "Other Channels booking type present");
assert(knowledgeJs.includes("data-f=\"notes\""), "booking channel notes field rendered");

console.log("\n3. Migration safety (idempotent, no overwrite)");
assert(knowledgeJs.includes("fillIfEmpty"), "fill-if-empty migration helper present");
assert(knowledgeJs.includes("expandPoliciesNotes"), "policy notes expansion present");
assert(knowledgeJs.includes("without overwriting") || knowledgeJs.includes("fillIfEmpty"), "non-overwrite migration helper present");

console.log("\n4. AI context");
assert(operationalJs.includes("Guest Intelligence"), "AI context labels Guest Intelligence");
assert(operationalJs.includes("never invent preferences") || operationalJs.includes("Never invent guest preferences"), "guest preference safety guidance present");
assert(operationalJs.includes("channel.notes") || operationalJs.includes("notes:"), "OTA notes read into AI context");
assert(operationalJs.includes("Check-in and Check-out"), "fine-grained policy notes in AI context");

console.log("\n5. Demo parity + isolation");
assert(demoJs.includes('notes: "Virtual cards activate after 05:00'), "demo Booking.com notes present");
assert(demoJs.includes("cancellationsNoShows"), "demo fine-grained policies present");
assert(demoJs.includes("guestKnowledge"), "demo Guest Intelligence data present");
assert(demoJs.includes("isDemoData: true") || demoJs.includes("isDemoData"), "demo pack marked as demo data");
assert(storeJs.includes("cancellationsNoShows"), "empty store includes new policy note keys");

console.log("\n6. Runtime migration smoke");
const context = {
  window: {},
  console,
  Date,
  JSON,
  Object,
  Array,
  String,
  Math,
  Error,
  document: {
    getElementById: function () { return null; },
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; },
    createElement: function () {
      return {
        className: "",
        innerHTML: "",
        style: {},
        setAttribute: function () {},
        appendChild: function () {},
        querySelector: function () { return null; },
        querySelectorAll: function () { return []; },
        addEventListener: function () {}
      };
    }
  },
  CustomEvent: function () {}
};
vm.createContext(context);
vm.runInContext(knowledgeJs, context);
const HPK = context.window.HotelProfileKnowledge;
assert(!!HPK, "HotelProfileKnowledge loaded");

const existing = {
  policiesNotes: {
    checkInOut: "Keep my custom check-in note.",
    paymentsOta: "Legacy payments note.",
    guestPolicies: "",
    otherNotes: ""
  },
  policiesStructured: {
    guest: {
      cancellation: { title: "Cancellation", instructions: "24 hours before arrival.", summary: "" }
    },
    payment: {
      deposit: { title: "Deposits", instructions: "First night deposit.", summary: "" }
    },
    operational: {},
    custom: {}
  },
  otaChannels: [
    {
      type: "bookingCom",
      label: "Booking.com",
      paymentModel: "Virtual card",
      virtualCardActivation: "After 05:00 on arrival day",
      specialInstructions: "Check breakfast after modifications."
    }
  ]
};

const migrated = HPK.migrateToV3(JSON.parse(JSON.stringify(existing)));
assert(
  migrated.policiesNotes.checkInOut === "Keep my custom check-in note.",
  "migration does not overwrite existing check-in notes"
);
assert(
  !!String(migrated.policiesNotes.cancellationsNoShows || "").trim() ||
    !!String(migrated.policiesNotes.otherGuestPolicies || "").trim(),
  "structured cancellation migrates into notes when empty"
);
assert(
  !!String(migrated.policiesNotes.deposits || migrated.policiesNotes.otherPaymentNotes || "").trim(),
  "structured deposit/payment migrates into notes when empty"
);
const again = HPK.migrateToV3(JSON.parse(JSON.stringify(migrated)));
assert(
  again.policiesNotes.checkInOut === "Keep my custom check-in note.",
  "migration is idempotent for user notes"
);
assert(
  String(migrated.otaChannels[0].notes || "").indexOf("After 05:00") !== -1,
  "OTA structured fields migrate into notes"
);
const otaAgain = HPK.migrateOtaChannelsToNotes(migrated.otaChannels);
assert(
  otaAgain[0].notes === migrated.otaChannels[0].notes,
  "OTA notes migration does not rewrite existing notes"
);

console.log("\n─── Results ───");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed) process.exit(1);
