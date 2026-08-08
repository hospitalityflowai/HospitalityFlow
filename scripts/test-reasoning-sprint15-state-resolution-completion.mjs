/**
 * Reasoning Sprint 15 — Soft/mitigated maintenance MONITOR + DONE amenity non-reopen.
 *
 * Soft/mitigated/deferred maint → MONITOR (not hard OPEN).
 * Explicitly DONE amenity must not reopen as OPEN (facet-local).
 * Genuine uncontrolled maint and outstanding amenities remain OPEN.
 *
 * Run: node scripts/test-reasoning-sprint15-state-resolution-completion.mjs
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
  RegExp,
};
context.global = context.window;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT, "ai-writing-engine.js"), "utf8"), context);
vm.runInContext(
  fs.readFileSync(path.join(ROOT, "shift-intelligence-engine.js"), "utf8"),
  context
);

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
  return lines.map(function (line, index) {
    var rooms = Engine.extractRoomNumbers(line);
    var fact = Engine.extractOperationalFact(line, {
      rooms: rooms,
      isVip: /\bvip\b/i.test(line),
    });
    return {
      original: line,
      rooms: rooms.length ? rooms : (fact && fact.rooms) || [],
      section: Engine.sectionFromFact
        ? Engine.sectionFromFact(fact, "general")
        : "general",
      isVip: /\bvip\b/i.test(line),
      isCarriedOver: false,
      isFollowUp: /monitor|follow|clarify/i.test(line),
      maintenancePriority: null,
      fact: fact,
      _neutralFactId: "s15-" + index,
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
    handoverDate: temporal.handoverDate || "2026-09-10",
    shift: temporal.shift || "Night",
    createdAt: temporal.createdAt || "2026-09-10T23:20:00.000Z",
  });
  return { analyzed: analyzed, actions: actions };
}

function ofState(actions, state, facetRe) {
  return (actions || []).filter(function (a) {
    return (
      a &&
      a.actionState === state &&
      (!facetRe || facetRe.test(a.facetKey || "") || facetRe.test(a.actionText || ""))
    );
  });
}

console.log("\n=== Sprint 15 — Soft mitigated drain → MONITOR (003 shape) ===\n");
(function () {
  var r = pipeline(
    [
      "MAINTENANCE",
      "CX12 — guest reported slow basin drain. Porter plungered; guest \u201Cok for tonight\u201D. Eng soft note: \u201Clook tomorrow AM if still slow — **not a release issue**, room stayable\u201D. Please **monitor**, don\u2019t wake eng unless worsens / floods.",
      "M108 Mr Dudley — company billed — folio shows £0 guest due.",
    ],
    {
      handoverDate: "2026-09-10",
      shift: "Night",
      createdAt: "2026-09-10T23:20:00.000Z",
    }
  );
  var mon = ofState(r.actions, "monitor", /maintenance/i);
  assert(
    mon.some(function (a) {
      return a.room === "CX12";
    }),
    "CX12 soft drain is MONITOR (curly apostrophe paste)"
  );
  assert(
    !ofState(r.actions, "open", /maintenance/i).length,
    "No OPEN maintenance from mitigated CX12 / heading"
  );
  assert(
    !ofState(r.actions, "open").some(function (a) {
      return /wake/i.test(a.actionText || "");
    }),
    "Don't-wake-eng does not invent wake OPEN"
  );
})();

console.log("\n=== Sprint 15 — DONE iron must not reopen (005 shape) ===\n");
(function () {
  var r = pipeline(
    [
      "Mrs Linden is a day spa member — no confirmed overnight booking yet.",
      "M203 iron delivered — DONE.",
    ],
    {
      handoverDate: "2026-09-12",
      shift: "PM",
      createdAt: "2026-09-12T15:45:00.000Z",
    }
  );
  assert(
    !ofState(r.actions, "open").some(function (a) {
      return /iron/i.test(a.facetKey || "") || /iron/i.test(a.actionText || "");
    }),
    "DONE iron is not OPEN"
  );
  assert(
    ofState(r.actions, "resolved").some(function (a) {
      return /iron/i.test(a.facetKey || "") && (a.room === "M203" || /M203/.test(a.actionText || ""));
    }),
    "DONE iron recorded as resolved completion"
  );
})();

console.log("\n=== Sprint 15 — Soft extractor MONITOR (014 shape) ===\n");
(function () {
  var r = pipeline(
    [
      "Night — payments + one real maint.",
      "MAINTENANCE",
      "M311 — bathroom extractor noisy. Guest ok overnight with window open; eng tomorrow — MONITOR.",
      "M124 Mr Calder — open folio balance £64.80 (restaurant) — please collect tonight.",
    ],
    {
      handoverDate: "2026-09-19",
      shift: "Night",
      createdAt: "2026-09-19T23:20:00.000Z",
    }
  );
  assert(
    ofState(r.actions, "monitor", /maintenance/i).some(function (a) {
      return a.room === "M311";
    }),
    "M311 soft extractor is MONITOR"
  );
  assert(
    !ofState(r.actions, "open", /maintenance/i).length,
    "No OPEN maintenance scaffold / M311 chase"
  );
  assert(
    ofState(r.actions, "open", /payment:collect/).some(function (a) {
      return a.room === "M124";
    }),
    "Calder £64.80 collect preserved OPEN"
  );
})();

console.log("\n=== Sprint 15 — Genuine uncontrolled remains OPEN ===\n");
(function () {
  var r = pipeline(
    [
      "Room 214 — active flooding from shower leak — guest cannot stay — move now. Eng on the way.",
    ],
    {
      handoverDate: "2026-09-10",
      shift: "Night",
      createdAt: "2026-09-10T23:20:00.000Z",
    }
  );
  assert(
    ofState(r.actions, "open", /maintenance/i).some(function (a) {
      return String(a.room) === "214" || /214/.test(a.actionText || "");
    }),
    "Uncontrolled flooding stays OPEN"
  );
})();

console.log("\n=== Sprint 15 — Facet-local keep outstanding iron ===\n");
(function () {
  var r = pipeline(
    [
      "rm 22 — guest needs iron. Fixed charges added for breakfast — DONE.",
    ],
    {
      handoverDate: "2026-08-08",
      shift: "AM",
      createdAt: "2026-08-08T07:15:00.000Z",
    }
  );
  assert(
    ofState(r.actions, "open").some(function (a) {
      return /iron/i.test(a.facetKey || "") || /iron/i.test(a.actionText || "");
    }),
    "Outstanding iron beside breakfast DONE remains OPEN (S10 TP6)"
  );
})();

console.log("\n=== Sprint 15 — S10 mitigated 307 MONITOR pin ===\n");
(function () {
  var r = pipeline(
    [
      "Guest rm 307 (Ms Pell) rang — chemical / sweet smell near bathroom and a faint buzzing.",
      "Extractor switched off; window opened; she is OK to stay. Offered room move; she declined for tonight.",
      "On-call engineer advised; will attend tomorrow AM for inspect — not coming tonight unless worsens.",
      "Please MONITOR 307 overnight — if smell returns or guest asks to move, call on-call. Otherwise AM engineering inspect, not a live chase every hour.",
    ],
    {
      handoverDate: "2026-08-08",
      shift: "Night",
      createdAt: "2026-08-08T23:20:00.000Z",
    }
  );
  assert(
    ofState(r.actions, "monitor", /maintenance|307/).some(function (a) {
      return String(a.room) === "307" || /307/.test(a.actionText || "");
    }),
    "S10 mitigated 307 remains MONITOR"
  );
  assert(
    !ofState(r.actions, "open", /maintenance/i).some(function (a) {
      return a.priorityBand === "P0";
    }),
    "307 not OPEN P0 chase"
  );
})();

console.log("\n=== Sprint 15 — Transport / invalid inventory pins ===\n");
(function () {
  var r = pipeline(
    [
      "SHUTTLE",
      "Mr & Mrs Lang — prepaid — rooms M118 / M119",
      "Ms Keita — prepaid — CX08",
      "Please ensure keys / welcome ready before van returns ~17:55. Shuttle is not a taxi; do not invent private transfer.",
    ],
    {
      handoverDate: "2026-09-09",
      shift: "PM",
      createdAt: "2026-09-09T15:45:00.000Z",
    }
  );
  assert(
    ofState(r.actions, "open", /transport:honour/).length >= 1,
    "Sprint 14 transport honour preserved"
  );

  var r2 = pipeline(
    [
      'Put arrival Mr Julian Crowe tonight into "TR-2". TR-2 is a spa treatment room, not a bedroom. Cannot be a hotel room.',
    ],
    {
      handoverDate: "2026-09-18",
      shift: "PM",
      createdAt: "2026-09-18T15:45:00.000Z",
    }
  );
  assert(
    ofState(r2.actions, "open", /allocation:invalid_inventory/).some(function (a) {
      return a.room === "TR-2";
    }),
    "Sprint 13 invalid inventory TR-2 preserved"
  );
})();

console.log(
  "\n=== Sprint 15 results: " + passed + " passed, " + failed + " failed ===\n"
);
process.exit(failed ? 1 : 0);
