/**
 * Phase 4A — AI Summary detail cards from structured facts.
 * Run: node scripts/test-handover-phase4a-summary-cards.mjs
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
if (!Engine || !Engine.buildSummaryDetailCards) {
  throw new Error("buildSummaryDetailCards not exported");
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

console.log("\nPhase 4A — summary detail cards from facts\n");

(function settledPaymentCompletedInFinanceCard() {
  const analyzed = [
    makeNote("Outstanding balance in Room 12 is settled.", "payments")
  ];
  const cards = Engine.buildSummaryDetailCards(analyzed);
  const finance = cards.payments;
  const rewritten = Engine.rewriteNote(analyzed[0]);
  assert(finance.show === true, "settled payment still shows Finance card");
  assert(finance.completedCount === 1, "settled payment counted as completed");
  assert(finance.unresolvedCount === 0, "settled payment excluded from unresolved card count");
  assert(/Room 12/i.test(finance.sentence), "Finance card mentions Room 12");
  assert(/settled/i.test(finance.sentence), "Finance card describes settled");
  assert(
    finance.sentence.replace(/\.$/, "") === rewritten.replace(/\.$/, ""),
    "Finance card reuses rewriteNote display text"
  );
  assert(
    !/requiring settlement before departure/i.test(finance.sentence),
    "no legacy phrase requiring settlement before departure for completed fact"
  );
  assert(
    !/requires settlement/i.test(finance.sentence),
    "completed Finance card does not say requires settlement"
  );
  assert(
    Engine.mapFactStatusToItemStatus(analyzed[0].fact.status) === "done",
    "item status remains Completed for settled payment"
  );
})();

(function openPaymentRemainsUnresolved() {
  const analyzed = [
    makeNote("Room 8 has an outstanding balance of £120 still unpaid.", "payments")
  ];
  const cards = Engine.buildSummaryDetailCards(analyzed);
  const finance = cards.payments;
  const rewritten = Engine.rewriteNote(analyzed[0]);
  assert(finance.unresolvedCount === 1, "open payment remains unresolved in card count");
  assert(finance.completedCount === 0, "open payment is not completed");
  assert(/Room 8/i.test(finance.sentence), "open payment mentions room");
  assert(
    finance.sentence.replace(/\.$/, "") === rewritten.replace(/\.$/, ""),
    "open payment card reuses rewriteNote"
  );
  assert(/outstanding|remains|account|unpaid/i.test(finance.sentence), "open payment described as outstanding");
  assert(
    !/requiring settlement before departure/i.test(finance.sentence),
    "open payment does not use legacy departure phrase either (fact wording)"
  );
  assert(analyzed[0].fact.status !== "done", "open payment fact.status is not done");
})();

(function vipAmenitiesDetailPreserved() {
  const analyzed = [
    makeNote(
      "Room 42 VIP arriving tomorrow; welcome amenities still need to be placed.",
      "vip"
    )
  ];
  const cards = Engine.buildSummaryDetailCards(analyzed);
  const guest = cards.guest;
  const rewritten = Engine.rewriteNote(analyzed[0]);
  assert(guest.show === true, "VIP note shows guest card");
  assert(/Room 42/i.test(guest.sentence), "VIP room preserved");
  assert(
    guest.sentence.replace(/\.$/, "") === rewritten.replace(/\.$/, ""),
    "VIP card reuses rewriteNote (not raw amenities fragment)"
  );
  assert(
    !/Guest arrivals are scheduled and have been noted/i.test(guest.sentence),
    "VIP not replaced with generic arrivals template"
  );
})();

(function maintenanceOpenStatusPreserved() {
  const analyzed = [
    makeNote("Room 35 bathroom leak remains open.", "maintenance")
  ];
  const cards = Engine.buildSummaryDetailCards(analyzed);
  const maint = cards.maintenance;
  const rewritten = Engine.rewriteNote(analyzed[0]);
  assert(maint.unresolvedCount === 1, "open maintenance counted unresolved");
  assert(/Room 35/i.test(maint.sentence), "maintenance room preserved");
  assert(/leak/i.test(maint.sentence), "leak detail preserved");
  assert(
    maint.sentence.replace(/\.$/, "") === rewritten.replace(/\.$/, ""),
    "maintenance card reuses rewriteNote"
  );
  assert(/open|unresolved|leak/i.test(maint.sentence), "maintenance open status preserved");
  assert(
    !/update Reception|contact guest|room is safe/i.test(maint.sentence),
    "no unsupported maintenance actions invented"
  );
})();

(function confirmedItemsDoNotBecomePending() {
  const analyzed = [
    makeNote("Room 18 late checkout approved until 2pm", "guest")
  ];
  const cards = Engine.buildSummaryDetailCards(analyzed);
  const guest = cards.guest;
  const rewritten = Engine.rewriteNote(analyzed[0]);
  assert(analyzed[0].fact.status === "confirmed", "late checkout fact is confirmed");
  assert(
    Engine.mapFactStatusToItemStatus(analyzed[0].fact.status) === "confirmed",
    "item status is Confirmed not Pending"
  );
  assert(guest.unresolvedCount === 0, "confirmed item not in unresolved count");
  assert(guest.confirmedCount === 1, "confirmed item tracked as confirmed");
  assert(
    guest.sentence.replace(/\.$/, "") === rewritten.replace(/\.$/, ""),
    "confirmed late checkout card reuses rewriteNote"
  );
  assert(/confirm/i.test(guest.sentence), "card language says confirmed");
  assert(!/\bpending\b/i.test(guest.sentence), "confirmed item does not become pending in card text");
})();

(function mixedSettledAndOpenFinance() {
  const analyzed = [
    makeNote("Outstanding balance in Room 12 is settled.", "payments"),
    makeNote("Room 9 outstanding balance unpaid.", "payments")
  ];
  const cards = Engine.buildSummaryDetailCards(analyzed);
  assert(cards.payments.unresolvedCount === 1, "mixed finance: only open counted unresolved");
  assert(cards.payments.completedCount === 1, "mixed finance: settled counted completed");
  assert(/settled/i.test(cards.payments.sentence), "mixed finance mentions settled");
  assert(/Room 9|outstanding|unpaid|account/i.test(cards.payments.sentence), "mixed finance mentions open item");
})();

(function housekeepingConciseFacts() {
  const analyzed = [
    makeNote("Room 5 needs extra towels", "tasks"),
    makeNote("Minibar restock completed for Room 8", "inventory")
  ];
  const cards = Engine.buildSummaryDetailCards(analyzed);
  assert(cards.tasks.show === true, "housekeeping card shows");
  assert(cards.tasks.unresolvedCount >= 1, "open housekeeping counted");
  assert(cards.tasks.completedCount >= 1 || /complet/i.test(cards.tasks.sentence),
    "completed inventory reflected");
  assert(
    cards.tasks.sentence.indexOf(Engine.rewriteNote(analyzed[0]).replace(/\.$/, "")) !== -1 ||
      /towel/i.test(cards.tasks.sentence),
    "housekeeping card uses rewritten towel note"
  );
})();

console.log("\nResults: " + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
