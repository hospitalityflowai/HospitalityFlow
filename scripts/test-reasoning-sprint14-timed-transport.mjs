/**
 * Reasoning Sprint 14 — Timed guest-transport honour & conflict clarification.
 *
 * Evidenced guest/party + transport arrangement + operational time → OPEN honour.
 * Conflicting transport times/options/modes for same guest → OPEN clarify.
 * Do not invent wake-ups, private taxis, or misframe as luggage/EA.
 *
 * Run: node scripts/test-reasoning-sprint14-timed-transport.mjs
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
      isFollowUp: /clarify|honour|shuttle|transport/i.test(line),
      maintenancePriority: null,
      fact: fact,
      _neutralFactId: "s14-" + index,
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
    handoverDate: temporal.handoverDate || "2026-09-09",
    shift: temporal.shift || "PM",
    createdAt: temporal.createdAt || "2026-09-09T15:45:00.000Z",
  });
  analyzed._canonicalActions = actions;
  analyzed._canonicalActionsBuilt = true;
  var briefing = Engine.buildTodaysBriefing(analyzed, {
    handoverDate: temporal.handoverDate || "2026-09-09",
    shift: temporal.shift || "PM",
    createdAt: temporal.createdAt || "2026-09-09T15:45:00.000Z",
    canonicalActions: actions,
  });
  return { analyzed: analyzed, actions: actions, briefing: briefing };
}

function openOf(actions, facet) {
  return (actions || []).filter(function (a) {
    return a && a.actionState === "open" && (!facet || a.facetKey === facet);
  });
}

console.log("\n=== Sprint 14 — Honour timed shuttle meet/keys (002 shape) ===\n");
(function () {
  var r = pipeline(
    [
      "SHUTTLE",
      "Driver confirms 17:40 airport loop — 3 named pax on board already:",
      "Mr & Mrs Lang (booking MG-44120) — prepaid Booking.com — rooms M118 / M119",
      "Ms Keita — prepaid — CX08",
      "Please ensure keys / welcome ready before van returns ~17:55. Shuttle is not a taxi; do not invent private transfer.",
      "Langs + Keita as above — all prepaid, zero balance on arrival.",
      "Two day members finishing 18:30 — not hotel guests — Concierge can call taxi if asked.",
      "Champagne for M301 (Dr Hale) — placed — DONE.",
    ],
    {
      handoverDate: "2026-09-09",
      shift: "PM",
      createdAt: "2026-09-09T15:45:00.000Z",
    }
  );
  var honour = openOf(r.actions, "transport:honour");
  assert(honour.length >= 1, "OPEN transport:honour");
  assert(
    honour.some(function (a) {
      var rs = a.rooms || [];
      return rs.indexOf("M118") !== -1 && rs.indexOf("CX08") !== -1;
    }),
    "Binds Lang + Keita rooms"
  );
  assert(
    honour.some(function (a) {
      return /Lang/i.test(a.actionText || "") && /Keita/i.test(a.actionText || "");
    }),
    "Names Langs + Keita"
  );
  assert(
    honour.every(function (a) {
      return /do not invent private transfer/i.test(a.actionText || "");
    }),
    "Fail-closed: no private transfer invent"
  );
  assert(
    !openOf(r.actions).some(function (a) {
      return /wake/i.test(a.actionText || "");
    }),
    "No wake OPEN from spa 18:30 clock"
  );
  var brief = (r.briefing.paragraphs || []).join("\n");
  assert(/transport meet|keys readiness/i.test(brief), "Briefing seats transport honour");
  assert(!/18:30 wake/i.test(brief), "No 18:30 wake invent in briefing");
  assert(
    !honour.some(function (a) {
      return (a.rooms || []).indexOf("M301") !== -1;
    }),
    "DONE champagne room M301 not pulled into shuttle party"
  );
})();

console.log("\n=== Sprint 14 — Accessible transport conflict (015 shape) ===\n");
(function () {
  var r = pipeline(
    [
      "05:45 crew drop completed — DONE.",
      "07:20 loop — 6 pax listed. Driver short one wheelchair-capable seat for Mr Okonkwo (CX03 Acc) — need Concierge to confirm if Okonkwo takes 08:10 loop instead or private accessible taxi — not decided. Do not remove him silently.",
      "09:15 loop already full on paper.",
      "Express outs M101–M104 stacking — Luggage room crowded — porter on it.",
      "CX03 Acc Okonkwo still in-house until shuttle decision. Main M126 early arrival request EA ~11:00 — if ready — not promised.",
    ],
    {
      handoverDate: "2026-09-20",
      shift: "AM",
      createdAt: "2026-09-20T07:15:00.000Z",
    }
  );
  var clarify = openOf(r.actions, "transport:conflict_clarify");
  assert(clarify.length >= 1, "OPEN transport:conflict_clarify");
  assert(
    clarify.some(function (a) {
      return (
        (a.room === "CX03" || (a.rooms || []).indexOf("CX03") !== -1) &&
        /Okonkwo/i.test(a.canonicalName || a.actionText || "")
      );
    }),
    "Binds Okonkwo / CX03"
  );
  assert(
    clarify.some(function (a) {
      return /accessible/i.test(a.actionText || "");
    }),
    "Preserves accessibility constraint in wording"
  );
  assert(
    !openOf(r.actions).some(function (a) {
      return (
        /ea_luggage|luggage_ea/i.test(a.facetKey || "") &&
        (a.room === "CX03" || /Okonkwo/i.test(a.canonicalName || ""))
      );
    }),
    "Okonkwo not misframed as luggage/EA OPEN"
  );
  assert(
    !openOf(r.actions, "transport:honour").some(function (a) {
      return /05:45/.test(a.actionText || "");
    }),
    "DONE 05:45 crew drop not reopened as honour"
  );
  var brief = (r.briefing.paragraphs || []).join("\n");
  assert(/Clarify.*transport/i.test(brief), "Briefing seats conflict clarify");
  assert(!/07:20 wake/i.test(brief), "No wake invent from loop time");
})();

console.log("\n=== Sprint 14 — Clock alone is not transport/wake ===\n");
(function () {
  var r = pipeline(
    [
      "Two day members finishing 18:30 — not hotel guests.",
      "Quiet night. Spa closed.",
    ],
    {
      handoverDate: "2026-09-09",
      shift: "Night",
      createdAt: "2026-09-09T23:20:00.000Z",
    }
  );
  assert(openOf(r.actions, "transport:honour").length === 0, "No transport honour from spa finish clock");
  assert(openOf(r.actions, "transport:conflict_clarify").length === 0, "No transport conflict from spa finish");
  var brief = (r.briefing.paragraphs || []).join("\n");
  assert(!/wake-up/i.test(brief), "No wake invent from bare 18:30");
})();

console.log("\n=== Sprint 14 — Regression pins ===\n");
(function () {
  /* Genuine Trent-style luggage EA still allowed. */
  var r = pipeline(
    [
      "Ms Trent arriving early — luggage / early-arrival around lunch for Room M122.",
      "Please honour luggage hold near reception.",
    ],
    {
      handoverDate: "2026-09-11",
      shift: "AM",
      createdAt: "2026-09-11T07:15:00.000Z",
    }
  );
  assert(
    openOf(r.actions).some(function (a) {
      return /luggage|ea_luggage/i.test(a.facetKey || "") &&
        (a.room === "M122" || (a.rooms || []).indexOf("M122") !== -1);
    }),
    "Genuine luggage/EA OPEN preserved (Trent shape)"
  );

  /* Sprint 13 TR-2 still fires. */
  var r2 = pipeline(
    [
      'Put arrival Mr Julian Crowe tonight into "TR-2". TR-2 is a spa treatment room, not a bedroom. Cannot be a hotel room.',
      "Do not check anyone into a treatment room.",
    ],
    {
      handoverDate: "2026-09-18",
      shift: "PM",
      createdAt: "2026-09-18T15:45:00.000Z",
    }
  );
  assert(
    openOf(r2.actions, "allocation:invalid_inventory").some(function (a) {
      return a.room === "TR-2";
    }),
    "Sprint 13 invalid inventory TR-2 preserved"
  );

  /* Sprint 11 numeric blocked alloc. */
  var r3 = pipeline(
    [
      "Room 218 — OOO — water leak. Still OOO.",
      "Arrival Ms Yuen originally allocated 218 for tonight — cannot go into 218 while OOO.",
    ],
    {
      handoverDate: "2026-08-08",
      shift: "AM",
      createdAt: "2026-08-08T07:15:00.000Z",
    }
  );
  assert(
    openOf(r3.actions, "allocation:blocked_assigned").some(function (a) {
      return String(a.room) === "218";
    }),
    "Sprint 11 numeric blocked_assigned preserved"
  );
})();

console.log(
  "\n=== Sprint 14 results: " + passed + " passed, " + failed + " failed ===\n"
);
process.exit(failed ? 1 : 0);
