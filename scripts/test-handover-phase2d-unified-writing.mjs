/**
 * Phase 2D — Unify all writing output through rewriteNote.
 * Run: node scripts/test-handover-phase2d-unified-writing.mjs
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
if (!Engine || !Engine.buildSummaryDetailCards || !Engine.displayWritingForNote) {
  throw new Error("Phase 2D display-writing API not exported");
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
    fact: fact
  };
}

function normalizeSentence(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\.$/, "")
    .trim()
    .toLowerCase();
}

console.log("\nPhase 2D — unified display writing\n");

(function summaryCardsReuseRewriteNote() {
  const samples = [
    ["Outstanding balance in Room 12 is settled.", "payments", "payments"],
    ["Room 8 has an outstanding balance of £120 still unpaid.", "payments", "payments"],
    ["Room 35 bathroom leak remains open.", "maintenance", "maintenance"],
    ["Room 18 late checkout approved until 2pm", "guest", "guest"],
    ["Comp B&B Instagram deliverables Room 22", "guest", "guest"],
    ["Room 42 VIP arriving tomorrow; welcome amenities still need to be placed.", "vip", "guest"]
  ];

  samples.forEach(function ([line, section, bucket]) {
    const note = makeNote(line, section);
    const rewritten = Engine.rewriteNote(note);
    const cards = Engine.buildSummaryDetailCards([note]);
    const card = cards[bucket];
    assert(card && card.show, bucket + " card shows for: " + line.slice(0, 40));
    assert(
      normalizeSentence(card.sentence) === normalizeSentence(rewritten),
      bucket + " card sentence matches rewriteNote exactly"
    );
    assert(
      !/comp\s*b\s*&\s*b|instagram deliverables|welcome amenities still need/i.test(card.sentence) ||
        /comp\s*b\s*&\s*b|instagram deliverables|welcome amenities still need/i.test(rewritten),
      bucket + " card does not show raw Opera/parser fragments unless rewrite keeps them"
    );
  });
})();

(function displayWritingHelperMatchesRewrite() {
  const note = makeNote("Room 12 outstanding balance settled.", "payments");
  const viaHelper = Engine.displayWritingForNote(note, note.fact, {});
  const viaRewrite = Engine.rewriteNote(note);
  assert(
    normalizeSentence(viaHelper) === normalizeSentence(viaRewrite),
    "displayWritingForNote matches rewriteNote"
  );
})();

(function noRawSourceWhenRewriteImproves() {
  const note = makeNote(
    "Room 22 Comp bed and breakfast Instagram 2 grid posts 3-5 stories",
    "guest"
  );
  const rewritten = Engine.rewriteNote(note);
  const cards = Engine.buildSummaryDetailCards([note]);
  assert(cards.guest.show, "guest arrangement card shows");
  assert(
    normalizeSentence(cards.guest.sentence) === normalizeSentence(rewritten),
    "guest arrangement card matches rewrite"
  );
  if (/complimentary|bed-and-breakfast|instagram/i.test(rewritten)) {
    assert(
      /complimentary|bed-and-breakfast|instagram/i.test(cards.guest.sentence),
      "card keeps rewritten guest-arrangement wording"
    );
  }
  assert(
    !/^Room 22 – Comp bed and breakfast Instagram/i.test(cards.guest.sentence),
    "card does not paste raw source fragment as display text when rewrite improves it"
  );
})();

(function multiNoteCardsJoinRewrites() {
  const notes = [
    makeNote("Outstanding balance in Room 12 is settled.", "payments"),
    makeNote("Room 9 outstanding balance unpaid.", "payments")
  ];
  const cards = Engine.buildSummaryDetailCards(notes);
  const r0 = Engine.rewriteNote(notes[0]);
  const r1 = Engine.rewriteNote(notes[1]);
  assert(cards.payments.show, "mixed finance card shows");
  assert(
    normalizeSentence(cards.payments.sentence).indexOf(normalizeSentence(r0)) !== -1,
    "mixed finance includes first rewrite"
  );
  assert(
    normalizeSentence(cards.payments.sentence).indexOf(normalizeSentence(r1)) !== -1,
    "mixed finance includes second rewrite"
  );
})();

(function urgentAndEventsUseSamePipeline() {
  const urgent = makeNote("Room 7 AC not cooling — guest complaint", "urgent");
  const event = makeNote("Wedding reception in ballroom from 6pm", "events");
  const cards = Engine.buildSummaryDetailCards([urgent, event]);
  assert(cards.urgent.show, "urgent card shows");
  assert(cards.events.show, "events card shows");
  assert(
    normalizeSentence(cards.urgent.sentence) === normalizeSentence(Engine.rewriteNote(urgent)),
    "urgent card matches rewriteNote"
  );
  assert(
    normalizeSentence(cards.events.sentence) === normalizeSentence(Engine.rewriteNote(event)),
    "events card matches rewriteNote"
  );
})();

console.log("\nResults: " + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
