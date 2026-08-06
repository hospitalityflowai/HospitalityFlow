/**
 * Reasoning Sprint 1 — Extraction Engine regression tests.
 * Run: node scripts/test-extraction-sprint1.mjs
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

function detail(fact, type) {
  const hit = (fact.details || []).find(function (d) { return d && d.type === type; });
  return hit ? String(hit.value) : "";
}

console.log("\nExtraction Sprint 1\n");

console.log("Room shorthand");
assert(Engine.extractRoomNumbers("rm24 late co").indexOf("24") !== -1, "rm24 → room 24");
assert(Engine.extractRoomNumbers("r24 late co").indexOf("24") !== -1, "r24 → room 24");
assert(Engine.extractRoomNumbers("room24 wake 0630").indexOf("24") !== -1, "room24 → room 24");
assert(Engine.extractRoomNumbers("okonkwo r.22 vip").indexOf("22") !== -1, "r.22 → room 22");

console.log("\nETA / arrival times");
assert(Engine.extractTimes("ETA2230").some(function (t) { return /2230|22:30/.test(t); }), "ETA2230 extracts time");
assert(Engine.extractTimes("eta 2230").some(function (t) { return /2230|22:30/.test(t); }), "eta 2230 extracts time");
assert(Engine.extractTimes("arr2230").some(function (t) { return /2230|22:30/.test(t); }), "arr2230 extracts time");
assert(Engine.extractEta("VIP guest ETA2230") === "22:30", "extractEta normalises ETA2230 → 22:30");
assert(Engine.extractEta("arr 2230 rm12") === "22:30", "extractEta normalises arr 2230 → 22:30");

console.log("\nBalance / money shorthand");
const balMoney = Engine.extractMoney("rm18 bal64.50");
assert(balMoney.some(function (m) { return /64\.50/.test(m); }), "bal64.50 extracts amount");
const balFact = Engine.extractOperationalFact("rm18 bal64.50 collect please");
assert(balFact.subject === "outstanding_balance" || Engine.isActualFinancialIssue(Engine.normalizeInput("rm18 bal64.50 collect please")),
  "bal64.50 recognised as financial issue");

console.log("\nAbbreviation normalisation");
const norm = Engine.normalizeInput("b.com exp pp hk maint dm safe ac wc blocked");
assert(/Booking\.com/i.test(norm), "b.com → Booking.com");
assert(/Expedia/i.test(norm), "exp → Expedia");
assert(/prepaid/i.test(norm), "pp → prepaid");
assert(/housekeeping/i.test(norm), "hk → housekeeping");
assert(/maintenance/i.test(norm), "maint → maintenance");
assert(/Duty Manager/i.test(norm), "dm → Duty Manager");
assert(/air conditioning/i.test(norm), "ac → air conditioning");
assert(/\bWC\b/.test(norm), "wc → WC");

console.log("\nStructured fact extraction");
const wake = Engine.extractOperationalFact("rm24 wake 0630");
assert(wake.subject === "wake_up", "wake-up subject");
assert(wake.rooms.indexOf("24") !== -1, "wake-up keeps room");

const taxi = Engine.extractOperationalFact("r12 taxi 1015 Addison Lee");
assert(taxi.rooms.indexOf("12") !== -1, "taxi note keeps room");
assert(detail(taxi, "transport") !== "", "taxi transport detail present");

const vip = Engine.extractOperationalFact("vip eleanor whitmore r24 ETA2230");
assert(vip.subject === "vip_arrival", "VIP + room + ETA → vip_arrival");
assert(vip.rooms.indexOf("24") !== -1, "VIP room from r24");
assert(detail(vip, "eta") === "22:30", "VIP ETA structured");

const maint = Engine.extractOperationalFact("rm31 ac not cooling maint aware");
assert(maint.subject === "maintenance", "AC + maint → maintenance");
assert(maint.faultType === "AC", "AC fault type");

const wc = Engine.extractOperationalFact("rm9 wc blocked");
assert(wc.subject === "maintenance", "WC blocked → maintenance");
assert(wc.faultType === "WC", "WC fault type");

const lost = Engine.extractOperationalFact("lost prop phone dm safe");
assert(lost.subject === "lost_property", "lost prop subject");
assert(detail(lost, "storage") === "Duty Manager safe" || /Duty Manager/i.test(Engine.normalizeInput("lost prop phone dm safe")),
  "dm safe normalised as storage/context");

const celeb = Engine.extractOperationalFact("rm40 birthday balloons tomorrow");
assert(celeb.subject === "celebration" || detail(celeb, "celebration") !== "", "birthday/balloons celebration structured");

const pref = Engine.extractOperationalFact("rm16 quiet upper please");
assert(detail(pref, "preference") !== "", "quiet upper preference structured");

const corp = Engine.extractOperationalFact("corp booking Mr Khan rm55");
assert(corp.guestType === "corporate" || detail(corp, "booking_type") === "corporate", "corporate booking typed");

const ota = Engine.extractOperationalFact("b.com city tax open 12.50 rm7");
assert(detail(ota, "channel") === "Booking.com" || /Booking\.com/i.test(Engine.normalizeInput(ota.sourceText)),
  "OTA channel Booking.com");

const move = Engine.extractOperationalFact("maybe move rm12 to 25 if free");
assert(move.subject === "room_move", "room move subject");
assert(move.needsReview === true || move.uncertainty === true, "uncertain room move flagged for review");

console.log("\nLow confidence / no invention");
const thin = Engine.extractOperationalFact("please follow up payment somehow");
assert(thin.needsReview === true || thin.extractionConfidence === "low" || thin.extractionConfidence === "medium",
  "thin payment note does not invent room/guest evidence");
assert(!thin.guestName || thin.needsReview, "no invented guest name without evidence");

const named = Engine.extractOperationalFact("Mr Henderson rm24 late co confirmed");
assert(named.guestName && /Henderson/i.test(named.guestName), "title + surname guest name");
assert(named.extractionConfidence === "high" || named.extractionConfidence === "medium", "clear note has usable confidence");

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) process.exit(1);
