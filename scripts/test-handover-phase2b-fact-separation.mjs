/**
 * Phase 2B — fact separation, Opera rewriting, classification, summary, recommendations.
 * Run: node scripts/test-handover-phase2b-fact-separation.mjs
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
vm.runInContext(fs.readFileSync(path.join(ROOT, "hotel-profile-operational.js"), "utf8"), context);

const Engine = context.window.AiWritingEngine;
const Shift = context.window.ShiftIntelligenceEngine;
const Ops = context.window.HotelProfileOperational;

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

console.log("\nPhase 2B — fact separation & operational rewriting\n");

const COMBINED =
  "Room 31 wants maybe move to 4th floor not confirmed yet. Simon Ringer 24 29/07/2026 POA // Room and tax Inc Breakfast // Card on file guarantee only / Regular guest.";

(function room31AndSimonSeparate() {
  const segments = Engine.splitSourceIntoFactSegments(COMBINED);
  assert(segments.length >= 2, "Room 31 and Simon Ringer become separate segments");
  const facts = Engine.extractOperationalFacts(COMBINED);
  assert(facts.length >= 2, "Room 31 and Simon Ringer become separate facts");
  const move = facts.find((f) => f.subject === "room_move" || /Room 31/i.test(f.sourceText));
  const simon = facts.find((f) => /Simon Ringer/i.test(f.sourceText) || /Simon Ringer/i.test(f.guestName || ""));
  assert(!!move, "Room 31 move fact present");
  assert(!!simon, "Simon Ringer fact present");
  assert(
    String((move && move.rooms[0]) || "") !== String((simon && simon.rooms[0]) || ""),
    "facts keep distinct rooms"
  );
})();

(function room31RetainsQualifiers() {
  const facts = Engine.extractOperationalFacts(
    "Room 31 wants maybe move to 4th floor not confirmed yet."
  );
  const fact = facts[0];
  assert(fact.rooms.indexOf("31") !== -1, "Room 31 retained");
  assert(/fourth floor/i.test(fact.preferredLocation || ""), "fourth floor retained");
  assert(
    fact.uncertainty === true || /not confirmed|possible/i.test(fact.confirmationStatus || ""),
    "possible / not confirmed retained"
  );
  const display = Engine.renderOperationalFactDisplay(fact);
  assert(/Room 31/i.test(display), "display keeps Room 31");
  assert(/fourth floor/i.test(display), "display keeps fourth floor");
  assert(/not yet confirmed|may request/i.test(display), "display preserves uncertainty");
  assert(!/Invoice remains open/i.test(display), "no invented invoice on room move");
})();

(function simonRetainsOperaDetails() {
  const src =
    "Simon Ringer 24 29/07/2026 POA // Room and tax Inc Breakfast // Card on file guarantee only / Regular guest.";
  const facts = Engine.extractOperationalFacts(src);
  const fact = facts[0];
  assert(/Simon Ringer/i.test(fact.guestName || ""), "Simon Ringer name retained");
  assert(fact.rooms.indexOf("24") !== -1, "Room 24 retained");
  assert(/29\/07\/2026/.test(fact.arrivalDate || ""), "29/07/2026 retained");
  assert(/payment on arrival/i.test(fact.paymentMethod || ""), "POA retained");
  assert(/breakfast/i.test(fact.package || ""), "breakfast included retained");
  assert(/guarantee/i.test(fact.guarantee || ""), "card guarantee retained");
  assert(/regular guest/i.test(fact.guestType || ""), "regular guest retained");
  assert(fact.status === "confirmed", "Simon reservation is confirmed informational");
  assert(!Engine.isFactUnresolved(fact), "confirmed informational fact is not unresolved");
  const display = Engine.rewriteNote({ original: src, rooms: fact.rooms, fact: fact, section: "vip" }, {});
  assert(/Room 24/i.test(display), "Opera rewrite keeps Room 24");
  assert(/Simon Ringer/i.test(display), "Opera rewrite keeps guest name");
  assert(/29 July/i.test(display), "Opera rewrite formats date");
  assert(/Payment on arrival/i.test(display), "Opera rewrite keeps POA");
  assert(/breakfast/i.test(display), "Opera rewrite keeps breakfast");
  assert(/guarantee/i.test(display), "Opera rewrite keeps guarantee");
  assert(/Regular guest/i.test(display), "Opera rewrite keeps regular guest");
})();

(function theoNotFinance() {
  const src =
    "Théo Sanchez Room 51 1 Instagram Grid Post, 2–3 Instagram Stories Comp Bed and Breakfast.";
  const fact = Engine.extractOperationalFact(src, {});
  assert(fact.subject === "guest_arrangement", "Théo Sanchez subject is guest_arrangement");
  assert(fact.subject !== "payment" && fact.subject !== "outstanding_balance", "not a payment subject");
  assert(!Engine.isActualFinancialIssue(src), "Théo note is not an actual financial issue");
  const display = Engine.renderOperationalFactDisplay(fact) || Engine.rewriteNote({ original: src, fact: fact, rooms: fact.rooms }, {});
  assert(!/Finance|outstanding balance|invoice/i.test(display), "Théo display is not Finance wording");
  assert(/Room 51/i.test(display), "Théo display keeps Room 51");
  assert(/Instagram/i.test(display), "Théo display keeps deliverables");
})();

(function maintenanceKeepsRooms() {
  const src = "Maintenance to follow up 51, 42, and 16.";
  const fact = Engine.extractOperationalFact(src, { section: "maintenance" });
  assert(fact.rooms.indexOf("51") !== -1, "maintenance keeps Room 51");
  assert(fact.rooms.indexOf("42") !== -1, "maintenance keeps Room 42");
  assert(fact.rooms.indexOf("16") !== -1, "maintenance keeps Room 16");
  const display = Engine.renderOperationalFactDisplay(fact) || Engine.rewriteNote({ original: src, fact: fact, rooms: fact.rooms, section: "maintenance" }, {});
  assert(/51/.test(display) && /42/.test(display) && /16/.test(display), "maintenance display keeps all rooms");
  assert(!/^Maintenance\.?$/i.test(display.trim()), "no bare Maintenance placeholder");
})();

(function twinSetupRecommendation() {
  const src = "Skander Malcolm, John 33 29/07/2026 King bed to be set as twin bed.";
  const fact = Engine.extractOperationalFact(src, {});
  assert(fact.rooms.indexOf("33") !== -1, "twin setup keeps Room 33");
  assert(fact.subject === "twin_setup", "twin_setup subject");
  const note = {
    original: src,
    rooms: fact.rooms,
    section: "tasks",
    isVip: false,
    fact: fact
  };
  const texts = Shift.generateRecommendations({
    classified: { _analyzed: [note], tasks: [{ text: Engine.rewriteNote(note, {}), fact: fact }] },
    analyzedNotes: [note],
    rawNotesText: src,
    departments: ["Housekeeping", "Reception", "Maintenance"],
    brainContext: {
      roomFacilities: [
        { roomNo: "2", twinCapable: true },
        { roomNo: "23", twinCapable: true },
        { roomNo: "25", twinCapable: true },
        { roomNo: "33", twinCapable: true },
        { roomNo: "35", twinCapable: true },
        { roomNo: "43", twinCapable: true }
      ]
    }
  }).map((r) => r.text).join(" | ");
  assert(/Room 33/i.test(texts) && /twin/i.test(texts), "Room 33 recommendation says configure as twins");
  assert(
    !/Hotel Brain options:\s*2,\s*23,\s*25,\s*33,\s*35,\s*43/i.test(texts),
    "no recommendation lists all twin-capable Hotel Brain rooms"
  );
  assert(!/Inspect open fault/i.test(texts), "no Inspect open fault placeholder");
})();

(function noGenericPlaceholders() {
  const samples = [
    "Room 31 wants maybe move to 4th floor not confirmed yet.",
    "Simon Ringer 24 29/07/2026 POA // Room and tax Inc Breakfast // Card on file guarantee only / Regular guest.",
    "Maintenance to follow up 51, 42, and 16.",
    "Skander Malcolm, John 33 29/07/2026 King bed to be set as twin bed."
  ];
  samples.forEach(function (src) {
    const display = Engine.rewriteNote({ original: src, rooms: Engine.extractRoomNumbers(src) }, {});
    assert(!!display && display.length > 15, "display has useful content for: " + src.slice(0, 40));
    assert(!/VIP guest is noted for this shift/i.test(display), "no VIP placeholder");
    assert(!/^Maintenance\.?$/i.test(display.trim()), "no Maintenance. placeholder");
    assert(!/Guest requires follow-up/i.test(display), "no generic guest follow-up");
    assert(!/Inspect open fault/i.test(display), "no Inspect open fault in display");
  });
})();

(function summaryDoesNotInventFinance() {
  const notes = Engine.extractOperationalFacts(COMBINED).concat(
    Engine.extractOperationalFacts("Maintenance to follow up 51, 42, and 16."),
    Engine.extractOperationalFacts("Skander Malcolm, John 33 29/07/2026 King bed to be set as twin bed.")
  ).map(function (fact) {
    return {
      original: fact.sourceText,
      rooms: fact.rooms,
      section: Engine.sectionFromFact(fact, "guest"),
      isVip: fact.subject === "reservation_info",
      fact: fact
    };
  });
  const summary = Engine.summarizeFromFacts(notes, { prefs: { detail: "standard" } });
  assert(!/invoice/i.test(summary), "AI Summary does not invent invoices");
  assert(!/outstanding balance/i.test(summary), "AI Summary does not invent outstanding balances");
  assert(!/^Maintenance\.?$/m.test(summary), "AI Summary is not bare Maintenance.");
  assert(!/VIP guest is noted/i.test(summary), "AI Summary has no VIP placeholder");
  assert(/31|33|51|42|16/i.test(summary), "AI Summary mentions concrete rooms when useful");
})();

(function confirmedInfoNotUnresolved() {
  const fact = Engine.extractOperationalFact(
    "Simon Ringer 24 29/07/2026 POA // Room and tax Inc Breakfast // Card on file guarantee only / Regular guest."
  );
  assert(fact.status === "confirmed", "Simon status confirmed");
  assert(!Engine.isFactUnresolved(fact), "confirmed informational facts do not count as unresolved follow-ups");
})();

(function hotelBrainSkipsWhenAssignedRoomOk() {
  const reminders = Ops.getRoomAttributeReminders(
    {
      roomFacilities: [
        { roomNo: "2", twinCapable: true },
        { roomNo: "33", twinCapable: true },
        { roomNo: "43", twinCapable: true }
      ]
    },
    "Skander Malcolm, John 33 29/07/2026 King bed to be set as twin bed."
  );
  const joined = reminders.map((r) => r.text).join(" | ");
  assert(
    !/Hotel Brain options:\s*2,\s*33,\s*43/i.test(joined),
    "Hotel Brain does not list all twin rooms when Room 33 already assigned"
  );
})();

console.log("\nResults: " + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
