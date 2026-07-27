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

function assertActionable(actual, label) {
  assert(/\bPlease\b/.test(actual), label + " includes actionable Please…");
}

console.log("\nAI Writing Engine v" + Engine.version + "\n");

console.log("Duty Manager operational rewrites");
assertEqual(
  Engine.rewriteNote("room 22 late c/o at noon"),
  "Room 22 – Late check-out has been noted until 12:00 PM.",
  "late c/o at noon (noted, no invented actions)"
);
assertEqual(
  Engine.rewriteNote("room 31 wants extend stay speak morning"),
  "Room 31 – The guest has requested to extend their stay. Follow-up in the morning is noted.",
  "extend stay speak morning (no invented availability/reservation)"
);
assertEqual(
  Engine.rewriteNote("room 1 moving to 51 upgrade paid 50 per extra per night"),
  "Room 1 – Room move to Room 51 has been noted. The upgrade is recorded at an additional charge of £50 per night.",
  "room move with paid upgrade (no invented PMS action)"
);
assertEqual(
  Engine.rewriteNote("11 iron board with ireon"),
  "Room 11 – Iron and ironing board requested.",
  "iron board with spelling fix (no invented delivery)"
);
assertEqual(
  Engine.rewriteNote("guest upset ac"),
  "The guest has reported an air-conditioning issue and is unhappy with the situation.",
  "guest upset ac (no invented Maintenance chase)"
);

console.log("\nPhase 3B — remaining templates stay factual (no invented Please chase)");
[
  "room 31 wants extend stay speak morning",
  "11 iron board with ireon",
  "guest upset ac",
  "Room 12 AC not cooling.",
  "Room 9 DND."
].forEach(function (note) {
  const out = Engine.rewriteNote(note);
  assert(
    !/\bPlease\b/.test(out) || /\bfollow-up in the morning is noted\b/i.test(out),
    "no invented Please chase for: " + note
  );
});

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

console.log("\nSafety: preserve protected facts");
const moneyNote = Engine.rewriteNote("Room 118 card declined, £320 balance on folio", { section: "payments" });
assertIncludes(moneyNote, "£320", "preserves monetary amount");
assert(!/before departure|alternative payment/i.test(moneyNote), "payment note does not invent departure/alt method");
const named = Engine.rewriteNote("VIP Mr Henderson arriving 14:00", { section: "vip", isVip: true });
assertIncludes(named, "Mr Henderson", "preserves guest name");
assertIncludes(named, "14:00", "preserves arrival time");
assert(!/review the reservation|Housekeeping are briefed/i.test(named), "VIP note does not invent briefing");

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

console.log("\nPhase 1 structured facts — extraction");
(function () {
  const source = "Please follow up with maintenance on Room 205.";
  const fact = Engine.extractOperationalFact(source);
  assertEqual(fact.sourceText, source, "sourceText preserved unchanged");
  assert(fact.rooms.indexOf("205") !== -1, "extracts Room 205 into rooms[]");
  assertEqual(fact.actionVerb, "follow_up", "follow_up actionVerb");
  assertEqual(fact.actionTarget, "maintenance", "maintenance actionTarget");

  assert(
    Engine.classifyFactStatus("Room 12 is settled") !== "done",
    "bare room settled is not financial done"
  );
  assertEqual(
    Engine.classifyFactStatus("Outstanding balance Room 12 settled"),
    "done",
    "outstanding…settled → done"
  );
  assertEqual(
    Engine.classifyFactStatus("Room 12 balance is not settled"),
    "open",
    "balance not settled → open"
  );
  assert(
    Engine.classifyFactStatus("Room 12 is not settled") !== "open",
    "bare not settled without finance is not open financial"
  );
  assertEqual(Engine.classifyFactStatus("Guest wants to move to Room 51"), "requested", "wants to move → requested");
  assert(
    Engine.classifyFactStatus("Guests are settled in their rooms.") !== "done",
    "guests settled in rooms is not financial done"
  );
})();

console.log("\nPhase 1 structured facts — regression renders");
(function () {
  function assertNoFollowUpChase(text, label) {
    assert(
      !/\bplease\s+(?:settle|follow up|chase|arrange)\b/i.test(text) &&
        !/\bsettle the (?:account|balance)\b/i.test(text),
      label
    );
  }

  function assertNotVagueSettled(text, label) {
    const trimmed = String(text || "").trim();
    assert(
      !/^(?:Room\s+\d+[A-Za-z]?\s*[–—-]\s*)?(?:Not\s+)?Settled\.?$/i.test(trimmed),
      label
    );
  }

  const followUp = Engine.rewriteNote("Please follow up with maintenance on Room 205.");
  assertIncludes(followUp, "205", "follow-up retains Room 205");
  assert(!/\bon\.?\s*$/i.test(followUp.trim()), "follow-up must not end with dangling on.");
  assert(!/Please note:\s*is settled/i.test(followUp), "follow-up is not Please note fragment");
  assertIncludes(followUp, "Maintenance", "follow-up names Maintenance");

  const balanceSettled = Engine.rewriteNote("Outstanding balance in Room 12 has been settled.");
  assertIncludes(balanceSettled, "12", "balance settled retains Room 12");
  assertIncludes(balanceSettled, "outstanding balance", "balance settled names outstanding balance");
  assert(/\bsettled\b/i.test(balanceSettled), "balance settled preserves settled meaning");
  assertNoFollowUpChase(balanceSettled, "balance settled must not ask next shift to settle");
  assertNotVagueSettled(balanceSettled, "balance settled is not vague Settled.");

  const balanceSettledAlt = Engine.rewriteNote("Outstanding balance in Room 12 is settled.");
  assertIncludes(balanceSettledAlt, "12", "is settled retains Room 12");
  assertEqual(
    Engine.extractOperationalFact("Outstanding balance in Room 12 is settled.").status,
    "done",
    "is settled with balance → done"
  );
  assertNoFollowUpChase(balanceSettledAlt, "is settled with balance must not chase payment");

  const notSettled = Engine.rewriteNote("Room 12 balance is not settled.");
  assertIncludes(notSettled, "12", "balance not settled retains Room 12");
  assert(/\bunsettled\b/i.test(notSettled), "balance not settled remains open/unsettled");
  assertEqual(
    Engine.extractOperationalFact("Room 12 balance is not settled.").status,
    "open",
    "balance not settled fact status open"
  );
  assertNotVagueSettled(notSettled, "open balance is not vague Not settled.");

  const moveRequest = Engine.rewriteNote("Guest wants to move to Room 51.");
  assertIncludes(moveRequest, "51", "move request retains Room 51");
  assert(!/\bhas been relocated\b/i.test(moveRequest), "move request must not claim already moved");
  assert(!/\brelocated to\b/i.test(moveRequest), "move request must not say relocated to");
  assert(/\brequest(?:ed)?\b/i.test(moveRequest), "move request keeps request language");
})();

console.log("\nPhase 1 hardening — settled is not always financial");
(function () {
  function assertNotFinancialPaymentRewrite(text, label) {
    assert(
      !/\b(?:balance|payment|bill|invoice|folio|account|charge)\b/i.test(text),
      label
    );
  }

  function assertNotVagueSettled(text, label) {
    const trimmed = String(text || "").trim();
    assert(
      !/^(?:Room\s+\d+[A-Za-z]?\s*[–—-]\s*)?(?:Not\s+)?Settled\.?$/i.test(trimmed),
      label
    );
  }

  const allGuests = Engine.rewriteNote("All guests settled.");
  assert(/\bguests?\b/i.test(allGuests), "All guests settled preserves guest-status meaning");
  assertNotFinancialPaymentRewrite(allGuests, "All guests settled is not a payment rewrite");
  assertNotVagueSettled(allGuests, "All guests settled is not vague Settled.");

  const inRooms = Engine.rewriteNote("Guests are settled in their rooms.");
  assert(
    Engine.classifyFactStatus("Guests are settled in their rooms.") !== "done",
    "Guests are settled in their rooms is not classified financial done"
  );
  assertNotFinancialPaymentRewrite(inRooms, "settled in rooms is not a payment rewrite");
  assert(/\bsettled\b/i.test(inRooms) && /\brooms?\b/i.test(inRooms),
    "settled in rooms preserves original guest meaning");

  const guestSettled = Engine.rewriteNote("Room 12 guest is now settled.");
  assertIncludes(guestSettled, "12", "guest settled retains Room 12");
  assertNotFinancialPaymentRewrite(guestSettled, "Room 12 guest settled must not mention balance/payment");
  assert(/\bguest\b/i.test(guestSettled) && /\bsettled\b/i.test(guestSettled),
    "Room 12 guest settled preserves guest wording");
  assertNotVagueSettled(guestSettled, "guest settled is not Room 12 – Settled.");

  assertNotVagueSettled(Engine.rewriteNote("Room 12 is settled."), "Room 12 is settled is not vague Settled.");
  assertNotVagueSettled(Engine.rewriteNote("Room 12 is not settled."), "Room 12 is not settled is not vague Not settled.");
})();

console.log("\nPhase 1 — legacy fallback still used for unsupported notes");
(function () {
  const lateCo = Engine.rewriteNote("room 22 late c/o at noon");
  assertIncludes(lateCo, "Late check-out", "late check-out still uses legacy writer");
  assert(Engine.isPhase1SupportedFact(Engine.extractOperationalFact("room 22 late c/o at noon")) === false,
    "late check-out is not Phase 1 supported");
})();

console.log("\nPhase 3A — critical templates must not invent actions");
(function () {
  function assertNoInventedOps(text, source, label) {
    const out = String(text || "");
    const src = String(source || "").toLowerCase();
    const checks = [
      { re: /update\s+reception/i, key: "update reception" },
      { re: /contact\s+(?:the\s+)?guest/i, key: "contact guest" },
      { re: /room\s+is\s+safe/i, key: "room is safe" },
      { re: /update\s+(?:the\s+)?incoming\s+team/i, key: "update incoming team" }
    ];
    checks.forEach(function (c) {
      if (src.indexOf(c.key) !== -1) return;
      assert(!c.re.test(out), label + " must not invent `" + c.key + "`");
    });
  }

  const leakSrc = "Room 14 bathroom leak still open";
  const leak = Engine.rewriteNote(leakSrc, { section: "maintenance" });
  assertIncludes(leak, "14", "bathroom leak retains Room 14");
  assert(/\bleak\b/i.test(leak), "bathroom leak keeps leak meaning");
  assertNoInventedOps(leak, leakSrc, "bathroom leak");

  const noiseSrc = "Room 5 noise complaint";
  const noise = Engine.rewriteNote(noiseSrc, { section: "guest" });
  assertIncludes(noise, "5", "noise complaint retains Room 5");
  assert(/\bcomplaint\b/i.test(noise) && /\bnoise\b/i.test(noise), "noise complaint keeps meaning");
  assertNoInventedOps(noise, noiseSrc, "noise complaint");

  const moveReqSrc = "Guest wants to move to Room 51.";
  const moveReq = Engine.rewriteNote(moveReqSrc);
  assertIncludes(moveReq, "51", "room move request retains Room 51");
  assert(!/\bhas been relocated\b/i.test(moveReq), "room move request must not claim relocated");
  assertNoInventedOps(moveReq, moveReqSrc, "room move request");

  const lateSrc = "Room 22 late checkout until 2pm";
  const late = Engine.rewriteNote(lateSrc, { section: "guest" });
  assertIncludes(late, "22", "late checkout retains Room 22");
  assert(/\blate check-out\b/i.test(late), "late checkout keeps meaning");
  assert(!/\bhas been confirmed\b/i.test(late), "late checkout without approval language is not confirmed");
  assertNoInventedOps(late, lateSrc, "late checkout");

  const unmatchedSrc = "Room 19 corridor light flickering";
  const unmatched = Engine.rewriteNote(unmatchedSrc, { section: "general" });
  assertIncludes(unmatched, "19", "unmatched note retains Room 19");
  assert(/\bflickering\b/i.test(unmatched) || /\blight\b/i.test(unmatched),
    "unmatched note preserves factual meaning");
  assertNoInventedOps(unmatched, unmatchedSrc, "unmatched operational note");
  assert(!/Please note:/i.test(unmatched), "unmatched note must not use Please note salvage");
})();

console.log("\nPhase 3B — remaining legacy templates must not invent actions");
(function () {
  function assertNoUnsupportedActions(text, source, label) {
    const out = String(text || "");
    const src = String(source || "").toLowerCase();
    const banned = [
      { re: /contact\s+(?:the\s+)?guest/i, key: "contact the guest" },
      { re: /chase\s+maintenance/i, key: "chase Maintenance" },
      { re: /update\s+reception/i, key: "update Reception" },
      { re: /brief(?:ed)?\s+(?:reception\s+and\s+)?housekeeping|housekeeping\s+are\s+briefed/i, key: "brief Housekeeping" },
      { re: /confirm\s+with\s+the\s+guest/i, key: "confirm with the guest" },
      { re: /record\s+the\s+outcome/i, key: "record the outcome" },
      { re: /update\s+the\s+pms|pms\s+reflects/i, key: "update the PMS" },
      { re: /settle\s+(?:the\s+)?(?:account|balance)\s+before\s+departure|before\s+departure/i, key: "settle before departure" },
      { re: /arrange\s+delivery/i, key: "arrange delivery" },
      { re: /inventory\s+log/i, key: "update the inventory log" },
      { re: /secure\s+(?:the\s+)?(?:item|lost\s+property)/i, key: "secure lost property" },
      { re: /\bescalate\b/i, key: "escalate" },
      { re: /\bcompensation\b/i, key: "compensation" },
      { re: /\bescort\s+the\s+guest\b/i, key: "escort the guest" }
    ];
    banned.forEach(function (c) {
      if (src.indexOf(c.key.toLowerCase()) !== -1) return;
      /* allow "before departure" only when source mentions departure/checkout */
      if (c.key === "settle before departure" &&
          /departure|checkout|check-out|checking out/i.test(src)) {
        return;
      }
      assert(!c.re.test(out), label + " must not invent `" + c.key + "`");
    });
  }

  const acSrc = "Room 12 AC not cooling.";
  const ac = Engine.rewriteNote(acSrc, { section: "maintenance" });
  assertIncludes(ac, "12", "AC retains Room 12");
  assert(/\bair conditioning is not cooling\b/i.test(ac), "AC factual not-cooling status");
  assertNoUnsupportedActions(ac, acSrc, "AC issue");

  const extSrc = "Room 14 wants to extend for one night.";
  const ext = Engine.rewriteNote(extSrc);
  assertIncludes(ext, "14", "extend stay retains Room 14");
  assert(/\bone-night stay extension\b/i.test(ext), "extend stay one-night request");
  assertNoUnsupportedActions(ext, extSrc, "stay-extension request");

  const ironSrc = "Room 11 needs an iron and ironing board.";
  const iron = Engine.rewriteNote(ironSrc);
  assertIncludes(iron, "11", "iron retains Room 11");
  assert(/\biron and ironing board requested\b/i.test(iron), "iron request factual");
  assertNoUnsupportedActions(iron, ironSrc, "iron request");

  const vipSrc = "VIP Mr Henderson arriving at 14:00 in Room 22.";
  const vip = Engine.rewriteNote(vipSrc, { section: "vip", isVip: true });
  assertIncludes(vip, "22", "VIP retains Room 22");
  assertIncludes(vip, "Mr Henderson", "VIP preserves name");
  assertIncludes(vip, "14:00", "VIP preserves time");
  assertNoUnsupportedActions(vip, vipSrc, "VIP arrival with time");

  const balSrc = "Room 14 has an outstanding balance of £120.";
  const bal = Engine.rewriteNote(balSrc, { section: "payments" });
  assertIncludes(bal, "14", "balance retains Room 14");
  assertIncludes(bal, "£120", "balance preserves amount");
  assert(/\boutstanding balance\b/i.test(bal), "open balance factual");
  assertNoUnsupportedActions(bal, balSrc, "open balance with amount");

  const pkgSrc = "Package for Room 18 is held at Reception.";
  const pkg = Engine.rewriteNote(pkgSrc, { section: "deliveries" });
  assertIncludes(pkg, "18", "package retains Room 18");
  assert(/\bheld at Reception\b/i.test(pkg), "held package factual");
  assertNoUnsupportedActions(pkg, pkgSrc, "held package");

  const adapterSrc = "Room 7 has an adapter.";
  const adapter = Engine.rewriteNote(adapterSrc, { section: "inventory" });
  assertIncludes(adapter, "7", "adapter retains Room 7");
  assert(/\badapter issued\b/i.test(adapter), "adapter issued factual");
  assertNoUnsupportedActions(adapter, adapterSrc, "adapter issued");

  const dndSrc = "Room 9 DND.";
  const dnd = Engine.rewriteNote(dndSrc, { section: "tasks" });
  assertIncludes(dnd, "9", "DND retains Room 9");
  assert(/\bDo Not Disturb is active\b/i.test(dnd), "DND status factual");
  assertNoUnsupportedActions(dnd, dndSrc, "DND status");

  const lostSrc = "Watch found in Room 16.";
  const lost = Engine.rewriteNote(lostSrc, { section: "lostproperty" });
  assertIncludes(lost, "16", "lost property retains Room 16");
  assert(/\bwatch found\b/i.test(lost), "lost property found factual");
  assertNoUnsupportedActions(lost, lostSrc, "lost property found");
})();

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
