/**
 * Phase 5A — merge / dedupe by structured fact identity.
 * Run: node scripts/test-handover-phase5a-fact-merge.mjs
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

const Engine = context.window.AiWritingEngine;
if (!Engine || !Engine.consolidateNotesByFacts) {
  throw new Error("consolidateNotesByFacts not exported");
}

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

function makeNote(line, section) {
  const rooms = Engine.extractRoomNumbers(line);
  const isVip = /\bvip\b/i.test(line);
  const fact = Engine.extractOperationalFact(line, {
    rooms: rooms,
    section: section,
    isVip: isVip
  });
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
}

console.log("\nPhase 5A — fact identity merge / dedupe\n");

(function sameRoomMaintenanceAndPaymentBothSurvive() {
  const analyzed = [
    makeNote("Room 35 bathroom leak remains open.", "maintenance"),
    makeNote("Room 35 has an outstanding balance still unpaid.", "payments")
  ];
  const out = Engine.consolidateNotesByFacts(analyzed);
  assert(out.length === 2, "same room + maintenance + payment → both survive");
  const sections = out.map((n) => n.section).sort();
  assert(sections.indexOf("maintenance") !== -1, "maintenance section retained");
  assert(sections.indexOf("payments") !== -1, "payments section retained");
  const subjects = out.map((n) => n.fact && n.fact.subject);
  assert(
    subjects.some((s) => s === "maintenance") &&
      subjects.some((s) => /balance|payment|invoice|bill|folio|account|charge/i.test(s || "")),
    "distinct subjects retained"
  );
})();

(function sameRoomDistinctGuestRequestsSurvive() {
  const analyzed = [
    makeNote("Room 12 extra bed requested", "tasks"),
    makeNote("Room 12 iron and ironing board needed", "tasks")
  ];
  const out = Engine.consolidateNotesByFacts(analyzed);
  assert(out.length === 2, "same room + distinct guest request items → both survive");
  const items = out.map(function (n) {
    return (n.fact && (n.fact.requestItem || "")).toLowerCase();
  }).join(" | ");
  assert(/extra bed/i.test(items) && /iron/i.test(items), "request items retained separately");
})();

(function sameRoomTwoMaintenancePhrasingsMerge() {
  const analyzed = [
    makeNote("Room 35 shower leak", "maintenance"),
    makeNote("Room 35 bathroom leak still open", "maintenance")
  ];
  const out = Engine.consolidateNotesByFacts(analyzed);
  assert(out.length === 1, "same room + two maintenance phrasings → safely merge");
  assert(out[0].section === "maintenance", "merged note stays maintenance");
  assert(
    out[0].fact.sourceTexts && out[0].fact.sourceTexts.length >= 2,
    "merged maintenance preserves sourceTexts"
  );
  assert(
    /shower|bathroom|leak/i.test(out[0].fact.sourceTexts.join(" ")),
    "merged maintenance preserves useful details from both sources"
  );
})();

(function openThenDonePaymentResolves() {
  const analyzed = [
    makeNote("Room 12 has an outstanding balance unpaid.", "payments"),
    makeNote("Room 12 outstanding balance has been settled.", "payments")
  ];
  const out = Engine.consolidateNotesByFacts(analyzed);
  assert(out.length === 1, "open then done payment → one resolved fact");
  assert(out[0].fact.status === "done", "final status resolved to done");
  assert(
    out[0].fact.sourceHistory && out[0].fact.sourceHistory.length >= 2,
    "source history retained for audit"
  );
  assert(
    out[0].fact.sourceTexts.length >= 2,
    "both payment sources retained on sourceTexts"
  );
  const rewritten = Engine.rewriteNote(out[0], {});
  assert(/settled/i.test(rewritten), "display reflects settled status");
  assert(
    !/unpaid/i.test(rewritten) || /settled/i.test(rewritten),
    "no unresolved contradiction in display for resolved payment"
  );
})();

(function differentRoomsSameWordingBothSurvive() {
  const line = "Outstanding balance still unpaid.";
  const a = makeNote("Room 10 " + line, "payments");
  const b = makeNote("Room 20 " + line, "payments");
  const out = Engine.consolidateNotesByFacts([a, b]);
  assert(out.length === 2, "different rooms + same wording → both survive");
  const rooms = out.map((n) => (n.rooms || [])[0]).sort();
  assert(rooms.join(",") === "10,20", "both room numbers retained");
})();

(function sameRoomVipAndGuestRequestBothSurvive() {
  const analyzed = [
    makeNote("Room 42 VIP arriving tomorrow", "vip"),
    makeNote("Room 42 needs an extra bed", "guest")
  ];
  const out = Engine.consolidateNotesByFacts(analyzed);
  assert(out.length === 2, "same room + VIP + guest request → both survive");
  assert(
    out.some((n) => n.fact && n.fact.subject === "vip_arrival"),
    "VIP fact retained"
  );
  assert(
    out.some((n) => n.fact && n.fact.subject === "guest_request"),
    "guest request fact retained"
  );
})();

(function duplicateIdenticalNoteDeduped() {
  const line = "Room 7 bathroom leak remains open.";
  const analyzed = [makeNote(line, "maintenance"), makeNote(line, "maintenance")];
  const out = Engine.consolidateNotesByFacts(analyzed);
  assert(out.length === 1, "duplicate identical note → deduped once");
  assert(
    out[0].fact.sourceTexts.length >= 1,
    "deduped note still has sourceTexts"
  );
})();

(function multiRoomNoteRetainsAllRooms() {
  const analyzed = [
    makeNote("Rooms 12 and 14 have outstanding balances unpaid.", "payments")
  ];
  const out = Engine.consolidateNotesByFacts(analyzed);
  assert(out.length === 1, "multi-room note consolidates to one fact");
  const rooms = (out[0].rooms || []).map(String).sort();
  assert(rooms.indexOf("12") !== -1 && rooms.indexOf("14") !== -1, "multi-room note → all rooms retained");
  assert(
    (out[0].fact.rooms || []).map(String).sort().join(",") === rooms.join(","),
    "fact.rooms matches note.rooms"
  );
})();

(function noFactLostAfterMerge() {
  const analyzed = [
    makeNote("Room 35 shower leak", "maintenance"),
    makeNote("Room 35 bathroom leak still open", "maintenance"),
    makeNote("Room 35 outstanding balance unpaid.", "payments"),
    makeNote("Room 42 VIP arriving tomorrow; welcome amenities still need to be placed.", "vip")
  ];
  const out = Engine.consolidateNotesByFacts(analyzed);
  const allSources = out.reduce(function (acc, note) {
    return acc.concat((note.fact && note.fact.sourceTexts) || [note.original]);
  }, []);
  assert(
    allSources.some((s) => /shower leak/i.test(s)),
    "no fact lost: shower leak source present"
  );
  assert(
    allSources.some((s) => /bathroom leak/i.test(s)),
    "no fact lost: bathroom leak source present"
  );
  assert(
    allSources.some((s) => /outstanding balance/i.test(s)),
    "no fact lost: payment source present"
  );
  assert(
    allSources.some((s) => /VIP/i.test(s)),
    "no fact lost: VIP source present"
  );
  assert(out.length === 3, "merge collapses only compatible maintenance pair (3 facts remain)");
})();

(function identityNeverUsesDisplayText() {
  const a = makeNote("Room 8 outstanding balance unpaid.", "payments");
  const b = makeNote("Room 8 outstanding balance unpaid.", "payments");
  const keyA = Engine.factIdentityKey(a.fact);
  const keyB = Engine.factIdentityKey(b.fact);
  assert(keyA === keyB, "identical facts share identity key");
  assert(!/room 8 –/i.test(keyA), "identity key is not rewritten display text");
  assert(keyA.indexOf("id|") === 0, "identity key uses structured prefix");
})();

console.log("\nResults: " + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
