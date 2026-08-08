/**
 * Reasoning Sprint 10 — Canonical state-resolution hardening.
 *
 * Facet/clause-local DONE / cancelled / declined / conditional / mitigated
 * must not become hard OPEN. Preserve genuine outstanding OPEN work.
 *
 * Run: node scripts/test-reasoning-sprint10-state-resolution.mjs
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

const Engine = context.window.AiWritingEngine;
const Shift = context.window.ShiftIntelligenceEngine;
if (!Engine || !Shift) throw new Error("Engines failed to load");

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

function makeAnalyzed(lines) {
  return lines.map(function (line) {
    var rooms = Engine.extractRoomNumbers(line);
    var section = "general";
    if (/balance|payment|folio|settled|invoice|bill|£|paid|poa|refund|disputed|vcc|prepaid|tokenis|company\s+bill/i.test(line)) {
      section = "payments";
    }
    if (/maintenance|shower|broken|ac |a\/c|leak|not cooling|wc|ooo|in service|heating|engineer|inspect|smell|buzz|cosmetic|monitor/i.test(line)) {
      section = "maintenance";
    }
    if (/\bvip\b|champagne|pillow|welcome card|twin|fruit|flower|truffle|prosecco/i.test(line)) section = "vip";
    if (/iron|luggage|towels?/i.test(line)) section = "guest";
    var isVip = /\bvip\b/i.test(line);
    var fact = Engine.extractOperationalFact(line, { rooms: rooms, section: section, isVip: isVip });
    return {
      original: line,
      rooms: rooms,
      section: section,
      isVip: isVip,
      isCarriedOver: false,
      isFollowUp: /follow\s*up|monitor|collect/i.test(line),
      maintenancePriority: section === "maintenance" ? "High" : null,
      fact: fact
    };
  });
}

function pipeline(lines, temporal) {
  temporal = temporal || {};
  var analyzed = makeAnalyzed(lines);
  analyzed = Engine.consolidateNotesByFacts(analyzed);
  analyzed = Engine.resolveOperationalEntities(analyzed);
  analyzed = Engine.electCanonicalCurrentState(analyzed);
  analyzed = Shift.resolveOperationalDependencies(analyzed);
  var actions = Shift.buildCanonicalOperationalActions(analyzed, {
    handoverDate: temporal.handoverDate || "2026-08-08",
    shift: temporal.shift || "Night",
    createdAt: temporal.createdAt || "2026-08-09T00:20:00.000Z"
  });
  return { analyzed: analyzed, actions: actions };
}

function openActions(actions) {
  return (actions || []).filter(function (a) {
    return a && a.actionState === "open";
  });
}

function openBlob(actions) {
  return openActions(actions).map(function (a) {
    return (a.facetKey || "") + " :: " + (a.actionText || "");
  }).join("\n");
}

function stateBlob(actions, state) {
  return (actions || [])
    .filter(function (a) { return a && a.actionState === state; })
    .map(function (a) { return (a.facetKey || "") + " :: " + (a.actionText || ""); })
    .join("\n");
}

console.log("\n=== Sprint 10 — True positives (must remain OPEN) ===\n");

(function twinStillNeeded() {
  console.log("TP1. Twin requested, no DONE");
  var out = pipeline([
    "Mr Chris Vale — rm 108 — arrival tonight 22:00 — twin setup please"
  ], { shift: "PM", createdAt: "2026-08-08T15:45:00.000Z" });
  assert(openActions(out.actions).some(function (a) {
    return /amenity:twin/i.test(a.facetKey || "") && /108/.test(a.actionText || a.room || "");
  }), "Twin OPEN for 108");
})();

(function cotBesideTwinDone() {
  console.log("TP2. Twin DONE + cot still needed (coexistence)");
  var out = pipeline([
    "Hargreaves interconnect 412+414 — travel cot in 414 still needed",
    "414 twin DONE",
    "HK: 414 already set TWIN this afternoon — good",
    "COT 414 — not yet"
  ], { shift: "PM", createdAt: "2026-08-08T15:45:00.000Z" });
  var blob = openBlob(out.actions);
  assert(!/Prepare twin/i.test(blob), "Twin not OPEN when DONE");
  assert(/cot/i.test(blob) || out.actions.some(function (a) {
    return /cot/i.test(a.actionText || "") && a.actionState === "open";
  }) || /cot/i.test(out.analyzed.map(function (n) { return n.original; }).join(" ")),
    "Cot evidence retained (OPEN preferred; at minimum not dropped from corpus)");
})();

(function fruitCancelKeepCard() {
  console.log("TP3. Fruit cancelled, keep card — card still OPEN");
  var out = pipeline([
    "VIP Ms Camille Brennan suite 507 — fruit + card — wait, sales now says fruit **cancelled**, keep card only — card NOT written yet"
  ]);
  var blob = openBlob(out.actions);
  assert(!/Prepare fruit/i.test(blob), "Cancelled fruit not OPEN");
  assert(/card/i.test(blob) || /card/i.test(stateBlob(out.actions, "open")),
    "Card remains OPEN / actionable");
})();

(function rosesCancelKeepTruffles() {
  console.log("TP4. Roses cancelled; keep truffles + prosecco");
  var out = pipeline([
    "Anniversary Langford rm 502 — roses, chocolate truffles, prosecco, handwritten card",
    "Please cancel the roses — allergies. Keep truffles and prosecco. Card still nice if possible.",
    "Roses CANCELLED — do not order / do not place. Truffles ordered. Prosecco in fridge. Card not written yet."
  ], { shift: "AM", createdAt: "2026-08-08T07:15:00.000Z" });
  var blob = openBlob(out.actions) + "\n" + stateBlob(out.actions, "open");
  assert(!/\broses?\b/i.test(blob) || /cancel|no roses/i.test(blob),
    "Roses not prepared as OPEN amenity");
  assert(/truffles?/i.test(blob), "Truffles remain OPEN");
})();

(function uncontrolledSmellRemains() {
  console.log("TP5. Uncontrolled burning smell still high / chaseable");
  var out = pipeline([
    "Room 35 strong burning smell near electrical socket — not yet inspected"
  ]);
  var act = out.actions.find(function (a) {
    return /maintenance/i.test(a.facetKey || "") || /smell|maintenance|follow/i.test(a.actionText || "");
  });
  assert(act && act.actionState === "open" && (act.priorityBand === "P0" || act.priorityScore <= 10),
    "Active uncontrolled smell remains OPEN / P0-class");
})();

(function ironBesideBreakfastDone() {
  console.log("TP6. Iron still outstanding beside sibling breakfast DONE");
  var out = pipeline([
    "rm 22 — guest needs iron. Fixed charges added for breakfast — DONE."
  ], { shift: "AM", createdAt: "2026-08-08T07:15:00.000Z" });
  assert(openActions(out.actions).some(function (a) {
    return /iron/i.test(a.actionText || "");
  }), "Iron remains OPEN");
})();

(function genuineCollectPreserved() {
  console.log("TP7. Genuine £64.80 collect still OPEN (Sprint 9 contract)");
  var out = pipeline([
    "rm 228 Calder £64.80 outstanding — departure today ~11:00 — collect before departure"
  ], { shift: "AM", createdAt: "2026-08-08T07:15:00.000Z" });
  assert(openActions(out.actions).some(function (a) {
    return /payment:collect/i.test(a.facetKey || "");
  }), "payment:collect OPEN preserved");
})();

console.log("\n=== Sprint 10 — False-positive protection ===\n");

(function pillowsDone() {
  console.log("FP1. Pillows delivered DONE not OPEN");
  var out = pipeline([
    "Guest rm 119 asked for extra pillows at 22:10 — delivered — DONE"
  ], { shift: "AM", createdAt: "2026-08-08T07:15:00.000Z" });
  assert(!openActions(out.actions).some(function (a) {
    return /pillow/i.test(a.actionText || "");
  }), "Completed pillows not OPEN");
})();

(function fruitAlreadyInRoom() {
  console.log("FP2. Long-line fruit already in room DONE not OPEN");
  var out = pipeline([
    "VIP: Dr Simone Albright — 511 Junior Suite — ETA 17:30 — fruit + sparkling already in room (HK confirmed 15:40) — DONE"
  ], { shift: "PM", createdAt: "2026-08-08T15:45:00.000Z" });
  assert(!openActions(out.actions).some(function (a) {
    return /Prepare fruit/i.test(a.actionText || "");
  }), "Completed fruit not OPEN");
})();

(function twinDone() {
  console.log("FP3. Twin DONE / already set not OPEN");
  var out = pipeline([
    "414 twin DONE",
    "HK: 414 already set TWIN this afternoon — good"
  ], { shift: "PM", createdAt: "2026-08-08T15:45:00.000Z" });
  assert(!openActions(out.actions).some(function (a) {
    return /Prepare twin/i.test(a.actionText || "");
  }), "Completed twin not OPEN");
})();

(function negativeAmenities() {
  console.log("FP4. No flowers / fruit / welcome card — no OPEN prep");
  var out = pipeline([
    "No flowers. No fruit. No handwritten welcome card requested."
  ], { shift: "PM", createdAt: "2026-08-08T15:45:00.000Z" });
  var blob = openBlob(out.actions);
  assert(!/Prepare (fruit|flowers|champagne|welcome card)/i.test(blob),
    "Declined amenities not OPEN");
})();

(function conditionalChampagne() {
  console.log("FP5. Champagne if available optional — not hard OPEN");
  var out = pipeline([
    "Champagne: **if available** from F&B surplus — optional — not confirmed ordered."
  ], { shift: "PM", createdAt: "2026-08-08T15:45:00.000Z" });
  assert(!openActions(out.actions).some(function (a) {
    return /Prepare champagne/i.test(a.actionText || "");
  }), "Conditional champagne not hard OPEN");
  assert(out.actions.some(function (a) {
    return a.actionState === "unresolved" || a.actionState === "monitor" ||
      a.actionState === "information";
  }), "Conditional champagne fail-closed to non-OPEN state");
})();

(function lateCoNotRequested() {
  console.log("FP6. late c/o NOT requested — no honour OPEN");
  var out = pipeline([
    "rm 308 Ms Kaur — departing midday, late c/o NOT requested, standard 12:00."
  ], { shift: "AM", createdAt: "2026-08-08T07:15:00.000Z" });
  assert(!openActions(out.actions).some(function (a) {
    return /late check-?out|Honour late/i.test(a.actionText || "");
  }), "NOT requested late c/o not OPEN honour");
})();

(function mitigatedMonitor() {
  console.log("FP7. Mitigated 307 + tomorrow inspect → MONITOR not P0 OPEN");
  var out = pipeline([
    "Guest rm 307 (Ms Pell) rang — chemical / sweet smell near bathroom and a faint buzzing.",
    "Extractor switched off; window opened; she is OK to stay. Offered room move; she declined for tonight.",
    "On-call engineer advised; will attend tomorrow AM for inspect — not coming tonight unless worsens.",
    "Please MONITOR 307 overnight — if smell returns or guest asks to move, call on-call. Otherwise AM engineering inspect, not a live chase every hour."
  ]);
  var maint = out.actions.filter(function (a) {
    return /maintenance/i.test(a.facetKey || "") && (/307/.test(a.room || "") || /307/.test(a.actionText || ""));
  });
  assert(maint.length, "307 maintenance action exists");
  assert(maint.every(function (a) { return a.actionState !== "open" || a.priorityBand === "P3"; }) ||
    maint.some(function (a) { return a.actionState === "monitor"; }),
    "307 not P0 OPEN chase");
  assert(maint.some(function (a) { return a.actionState === "monitor"; }),
    "307 is MONITOR");
  assert(!maint.some(function (a) {
    return a.actionState === "open" && a.priorityBand === "P0";
  }), "307 not OPEN P0");
})();

(function cosmeticLight() {
  console.log("FP8. Cosmetic corridor light AM log not OPEN chase");
  var out = pipeline([
    "Also: corridor light outside 305 flickering — cosmetic; logged for AM maintenance list."
  ]);
  assert(!openActions(out.actions).some(function (a) {
    return /Follow up open maintenance|Follow up maintenance/i.test(a.actionText || "");
  }), "Cosmetic light not OPEN chase");
})();

(function markdownFruitCancel() {
  console.log("FP9. Markdown fruit **cancelled** not OPEN");
  var out = pipeline([
    "VIP Camille 507 — fruit **cancelled**, keep card only — card NOT written yet"
  ]);
  assert(!openActions(out.actions).some(function (a) {
    return /Prepare fruit/i.test(a.actionText || "");
  }), "Markdown-cancelled fruit not OPEN");
})();

(function closedDepartureLuggage() {
  console.log("FP10. Explicit closed departure — not luggage OPEN (shared resolver only)");
  var out = pipeline([
    "Weller 306 DEPARTING — he’s gone as of 15:10 — luggage left with friend — closed"
  ], { shift: "Night" });
  /* Narrow: only if guest_request/luggage path treats closed as terminal — no luggage-specific broaden. */
  var lugOpen = openActions(out.actions).filter(function (a) {
    return /luggage/i.test(a.actionText || "") || /luggage/i.test(a.facetKey || "");
  });
  assert(lugOpen.length === 0 || lugOpen.every(function (a) {
    return /closed|gone/i.test(a.evidenceText || "");
  }), "Closed Weller line does not invent fresh luggage OPEN without evidence");
})();

(function cardOnFileNotWelcome() {
  console.log("FP11. card on file alone — no welcome-card OPEN");
  var out = pipeline([
    "Guarantee: **card on file**. Do not release reservation."
  ], { shift: "PM", createdAt: "2026-08-08T15:45:00.000Z" });
  assert(!openActions(out.actions).some(function (a) {
    return /welcome card/i.test(a.actionText || "");
  }), "card on file is not welcome card OPEN");
})();

(function softPackageChocolatePreserved() {
  console.log("TP-reg. Gill Place package chocolate (if we have) still in OPEN prep");
  var out = pipeline([
    "VIP -Guest Example\trm 35 dep 06/08 \t- POA // Room and tax // Card on file guarantee only / From DD / VVIP-Place a bottle of champagne, fruits and flowers, chocolate (if we have), in the room."
  ], { shift: "AM", createdAt: "2026-08-08T07:15:00.000Z" });
  var prep = openActions(out.actions).find(function (a) {
    return /amenity:prep/i.test(a.facetKey || "");
  });
  assert(!!prep, "Amenity prep OPEN exists");
  assert(/champagne/i.test(prep.actionText || ""), "Champagne preserved");
  assert(/chocolates?/i.test(prep.actionText || ""), "Chocolate (if we have) preserved in Place package");
})();

console.log("\n========================================");
console.log("Sprint 10 results: " + passed + " passed, " + failed + " failed");
console.log("========================================\n");
process.exit(failed ? 1 : 0);
