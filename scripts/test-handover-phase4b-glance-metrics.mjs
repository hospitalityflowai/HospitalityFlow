/**
 * Phase 4B — Shift Glance / top badge metrics from structured facts.
 * Run: node scripts/test-handover-phase4b-glance-metrics.mjs
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
if (!Engine || !Engine.computeHandoverMetricsFromFacts) {
  throw new Error("computeHandoverMetricsFromFacts not exported");
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
    isFollowUp: /follow\s*up/i.test(line),
    fact: fact
  };
}

console.log("\nPhase 4B — Shift Glance metrics from facts\n");

(function settledPaymentPaymentIssuesZero() {
  const analyzed = [
    makeNote("Room 12 outstanding balance has been settled.", "payments")
  ];
  const metrics = Engine.computeHandoverMetricsFromFacts(analyzed);
  const cards = Engine.buildSummaryDetailCards(analyzed);
  assert(analyzed[0].fact.status === "done", "settled payment fact is done");
  assert(metrics.payments === 0, "settled payment → Payment Issues 0");
  assert(cards.payments.unresolvedCount === 0, "Finance card unresolved 0");
  assert(metrics.payments === cards.payments.unresolvedCount, "Payment Issues matches Finance card");
})();

(function openPaymentPaymentIssuesOne() {
  const analyzed = [
    makeNote("Room 8 has an outstanding balance still unpaid.", "payments")
  ];
  const metrics = Engine.computeHandoverMetricsFromFacts(analyzed);
  const cards = Engine.buildSummaryDetailCards(analyzed);
  assert(metrics.payments === 1, "open payment → Payment Issues 1");
  assert(cards.payments.unresolvedCount === 1, "Finance card unresolved 1");
  assert(metrics.payments === cards.payments.unresolvedCount, "open payment badges agree");
})();

(function confirmedWakeUpNotOutstanding() {
  const analyzed = [
    makeNote("Room 9 wake-up call booked for 06:30", "tasks")
  ];
  const metrics = Engine.computeHandoverMetricsFromFacts(analyzed);
  assert(analyzed[0].fact.status === "confirmed", "wake-up booked → confirmed");
  assert(metrics.tasks === 0, "confirmed wake-up → not Outstanding Tasks");
})();

(function confirmedLateCheckoutNotOutstanding() {
  const analyzed = [
    makeNote("Room 18 late checkout approved until 2pm", "guest")
  ];
  const metrics = Engine.computeHandoverMetricsFromFacts(analyzed);
  assert(analyzed[0].fact.status === "confirmed", "late checkout approved → confirmed");
  assert(metrics.tasks === 0, "confirmed late checkout → not Outstanding Tasks");
  assert(metrics.vip === 0, "confirmed late checkout does not count as VIP");
})();

(function requestedExtraBedOutstanding() {
  const analyzed = [
    makeNote("Room 5 needs an extra bed", "tasks")
  ];
  const metrics = Engine.computeHandoverMetricsFromFacts(analyzed);
  assert(analyzed[0].fact.status === "requested", "extra bed → requested");
  assert(metrics.tasks === 1, "requested extra bed → Outstanding Tasks 1");
})();

(function openMaintenanceOne() {
  const analyzed = [
    makeNote("Room 35 bathroom leak remains open.", "maintenance")
  ];
  const metrics = Engine.computeHandoverMetricsFromFacts(analyzed);
  const cards = Engine.buildSummaryDetailCards(analyzed);
  assert(metrics.maintenance === 1, "open maintenance → Maintenance 1");
  assert(cards.maintenance.unresolvedCount === 1, "Maintenance card unresolved 1");
  assert(metrics.maintenance === cards.maintenance.unresolvedCount, "maintenance badges agree");
})();

(function completedMaintenanceZero() {
  const analyzed = [
    makeNote("Room 35 bathroom leak fixed and completed.", "maintenance")
  ];
  const metrics = Engine.computeHandoverMetricsFromFacts(analyzed);
  const cards = Engine.buildSummaryDetailCards(analyzed);
  assert(analyzed[0].fact.status === "done", "completed maintenance fact is done");
  assert(metrics.maintenance === 0, "completed maintenance → Maintenance 0");
  assert(cards.maintenance.unresolvedCount === 0, "Maintenance card unresolved 0");
})();

(function vipPendingAmenities() {
  const analyzed = [
    makeNote(
      "Room 42 VIP arriving tomorrow; welcome amenities still need to be placed.",
      "vip"
    )
  ];
  const metrics = Engine.computeHandoverMetricsFromFacts(analyzed);
  const cards = Engine.buildSummaryDetailCards(analyzed);
  assert(metrics.vip === 1, "VIP with pending amenities → VIP Arrivals 1");
  assert(metrics.tasks === 1, "VIP with pending amenities → Outstanding Tasks 1");
  assert(cards.guest.unresolvedCount === 1, "guest detail card unresolved 1");
  assert(metrics.vip === cards.guest.unresolvedCount, "VIP badge matches guest card for VIP-only set");
})();

(function confirmedVipNoPrepNotOutstanding() {
  const analyzed = [
    makeNote("Room 50 VIP arrival confirmed for tonight.", "vip")
  ];
  const metrics = Engine.computeHandoverMetricsFromFacts(analyzed);
  assert(analyzed[0].fact.status === "confirmed", "VIP arrival confirmed → confirmed");
  assert(metrics.vip === 0, "fully confirmed VIP with no pending prep → VIP 0");
  assert(metrics.tasks === 0, "fully confirmed VIP does not inflate Outstanding Tasks");
})();

(function noContradictionsMixedSet() {
  const analyzed = [
    makeNote("Room 12 outstanding balance has been settled.", "payments"),
    makeNote("Room 8 has an outstanding balance still unpaid.", "payments"),
    makeNote("Room 35 bathroom leak remains open.", "maintenance"),
    makeNote("Room 9 wake-up call booked for 06:30", "tasks"),
    makeNote("Room 5 needs an extra bed", "tasks"),
    makeNote(
      "Room 42 VIP arriving tomorrow; welcome amenities still need to be placed.",
      "vip"
    )
  ];
  const metrics = Engine.computeHandoverMetricsFromFacts(analyzed);
  const cards = Engine.buildSummaryDetailCards(analyzed);

  assert(metrics.payments === 1, "mixed: Payment Issues 1 (only open)");
  assert(metrics.maintenance === 1, "mixed: Maintenance 1");
  assert(metrics.vip === 1, "mixed: VIP 1");
  assert(metrics.tasks === 2, "mixed: Outstanding = extra bed + VIP prep (wake-up excluded)");
  assert(metrics.payments === cards.payments.unresolvedCount, "mixed: payments agree with Finance card");
  assert(metrics.maintenance === cards.maintenance.unresolvedCount, "mixed: maintenance agree");
  assert(cards.guest.unresolvedCount >= metrics.vip, "mixed: guest card includes VIP unresolved");
  assert(cards.guest.unresolvedCount >= 1, "mixed: guest card shows unresolved follow-up");
})();

console.log("\nResults: " + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
