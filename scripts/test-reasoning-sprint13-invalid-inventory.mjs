/**
 * Reasoning Sprint 13 — Invalid inventory / invalid product configuration.
 *
 * Non-sellable bedroom inventory (e.g. treatment room) or impossible
 * interconnect configuration → OPEN clarify/reallocate. Never invent a
 * replacement room/pair. Preserve Sprint 12 atomic room tokens (TR-2 ≠ 2).
 *
 * Run: node scripts/test-reasoning-sprint13-invalid-inventory.mjs
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
      isFollowUp: /clarify|reallocate|monitor/i.test(line),
      maintenancePriority: null,
      fact: fact,
      _neutralFactId: "s13-" + index,
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
    handoverDate: temporal.handoverDate || "2026-09-18",
    shift: temporal.shift || "PM",
    createdAt: temporal.createdAt || "2026-09-18T15:45:00.000Z",
  });
  analyzed._canonicalActions = actions;
  analyzed._canonicalActionsBuilt = true;
  var briefing = Engine.buildTodaysBriefing(analyzed, {
    handoverDate: temporal.handoverDate || "2026-09-18",
    shift: temporal.shift || "PM",
    createdAt: temporal.createdAt || "2026-09-18T15:45:00.000Z",
    canonicalActions: actions,
  });
  return { analyzed: analyzed, actions: actions, briefing: briefing };
}

function openOf(actions, facet) {
  return (actions || []).filter(function (a) {
    return (
      a &&
      a.actionState === "open" &&
      (!facet || a.facetKey === facet)
    );
  });
}

console.log("\n=== Sprint 13 — Identity preservation ===\n");
(function () {
  assert(Shift.normalizeRoomNumber("TR-2") === "TR-2", "TR-2 stays TR-2");
  assert(Shift.normalizeRoomNumber("TR-2") !== "2", "TR-2 does not collapse to 2");
  var rooms = Engine.extractRoomNumbers(
    "put arrival Mr Julian Crowe tonight into TR-2 spa treatment room"
  );
  assert(rooms.indexOf("TR-2") !== -1, "Extract TR-2");
  assert(rooms.indexOf("2") === -1, "Do not also invent bare room 2");
})();

console.log("\n=== Sprint 13 — Treatment room as bedroom (013 shape) ===\n");
(function () {
  var r = pipeline(
    [
      "Stop — do not check anyone into a treatment room.",
      'Reservations put arrival Mr Julian Crowe tonight into "TR-2" on the allocation field. TR-2 is a spa treatment room, not a bedroom. Cannot be a hotel room.',
      "Crowe due ~18:30. Prepaid. Needs a real guest room. M126 vacant dirty — not promised. CX02 clean — possible. No confirmed room yet.",
      "Flowers cancelled for M130 — cancelled. Do not prep.",
    ],
    {
      handoverDate: "2026-09-18",
      shift: "PM",
      createdAt: "2026-09-18T15:45:00.000Z",
    }
  );
  var opens = openOf(r.actions, "allocation:invalid_inventory");
  assert(opens.length >= 1, "OPEN allocation:invalid_inventory");
  assert(
    opens.some(function (a) {
      return a.room === "TR-2" || (a.rooms || []).indexOf("TR-2") !== -1;
    }),
    "Binds TR-2"
  );
  assert(
    opens.some(function (a) {
      return /Crowe/i.test(a.canonicalName || "") || /Crowe/i.test(a.actionText || "");
    }),
    "Names Crowe"
  );
  assert(
    opens.every(function (a) {
      return /do not invent/i.test(a.actionText || "");
    }),
    "Fail-closed: do not invent replacement"
  );
  assert(
    !openOf(r.actions).some(function (a) {
      return a.room === "2" || (a.rooms || []).indexOf("2") !== -1;
    }),
    "No OPEN on bare room 2"
  );
  var brief = (r.briefing.paragraphs || []).join("\n");
  assert(/TR-2/.test(brief), "Briefing seats TR-2 clarify");
  assert(!/Reserve interconnecting Rooms TR-2/i.test(brief), "No invent TR-2 suite reserve");
})();

console.log("\n=== Sprint 13 — Impossible Main+Annex interconnect (018 shape) ===\n");
(function () {
  var r = pipeline(
    [
      "Mr & Mrs Okada + grandmother — booking MG-66011 — due ~14:30 — need interconnecting rooms.",
      "Allocation line shows M152 + CX10 — that is Main + Annex. Interconnects exist Main only. These two rooms do not interconnect. Physically impossible.",
      "Older note said M152 + M153 interconnect pair — M153 now occupied stayover (Mr Pike) until tomorrow.",
      "HK: M154 clean; M155 vacant dirty.",
      "DM: clarify / reallocate to a real Main interconnect pair; do not invent that Pike will check out early.",
      "Okada prepaid. Pike POA — no collect evidenced.",
    ],
    {
      handoverDate: "2026-09-23",
      shift: "AM",
      createdAt: "2026-09-23T07:15:00.000Z",
    }
  );
  var opens = openOf(r.actions, "allocation:invalid_configuration");
  assert(opens.length >= 1, "OPEN allocation:invalid_configuration");
  assert(
    opens.some(function (a) {
      var rs = a.rooms || [];
      return rs.indexOf("M152") !== -1 && rs.indexOf("CX10") !== -1;
    }),
    "Binds M152 + CX10"
  );
  assert(
    opens.some(function (a) {
      return /Okada/i.test(a.canonicalName || "") || /Okada/i.test(a.actionText || "");
    }),
    "Names Okada (not Pike as solve)"
  );
  assert(
    opens.every(function (a) {
      return !/Pike/i.test(a.canonicalName || "") && !/Pike/i.test(a.actionText || "");
    }),
    "Pike is not the action subject"
  );
  assert(
    opens.every(function (a) {
      return /do not invent/i.test(a.actionText || "");
    }),
    "Fail-closed: do not invent replacement pair"
  );
  var brief = (r.briefing.paragraphs || []).join("\n");
  assert(/M152/.test(brief) && /CX10/.test(brief), "Briefing names impossible pair");
  assert(
    !/Reserve interconnecting Rooms CX10\s*&\s*M152/i.test(brief) &&
      !/Reserve interconnecting Rooms M152\s*&\s*CX10/i.test(brief),
    "Does not soft-reserve the impossible pair"
  );
  assert(!/Reserve interconnecting Rooms M152\s*&\s*M153 for Mr Pike/i.test(brief), "Pike not invented solve");
})();

console.log("\n=== Sprint 13 — Regression pins ===\n");
(function () {
  /* Numeric blocked alloc still works (Sprint 11). */
  var r = pipeline(
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
    openOf(r.actions, "allocation:blocked_assigned").some(function (a) {
      return String(a.room) === "218";
    }),
    "Numeric 218 blocked_assigned preserved"
  );

  /* LG08 still binds. */
  var r2 = pipeline(
    [
      "Mrs Whitby arriving this evening. Allocated to LG08 on the system.",
      "LG08 is still occupied by a stayover who extended — not available.",
    ],
    {
      handoverDate: "2026-08-08",
      shift: "PM",
      createdAt: "2026-08-08T15:45:00.000Z",
    }
  );
  assert(
    openOf(r2.actions).some(function (a) {
      return (
        (a.facetKey === "allocation:blocked_assigned" ||
          a.facetKey === "occupancy_conflict:clarify") &&
        (a.room === "LG08" || (a.rooms || []).indexOf("LG08") !== -1)
      );
    }),
    "LG08 blocked/conflict path preserved"
  );

  /* Valid same-building interconnect must still be allowed to reserve (no false suppress). */
  var r3 = pipeline(
    [
      "Mrs Farah + children need interconnecting rooms M114 + M115 tomorrow.",
      "M114 clean; M115 vacant dirty — aim ready by 14:00 — not confirmed.",
    ],
    {
      handoverDate: "2026-09-16",
      shift: "AM",
      createdAt: "2026-09-16T07:15:00.000Z",
    }
  );
  assert(
    openOf(r3.actions, "allocation:invalid_configuration").length === 0,
    "Valid M114+M115 same-prefix pair is not invalid_configuration"
  );
})();

console.log(
  "\n=== Sprint 13 results: " + passed + " passed, " + failed + " failed ===\n"
);
process.exit(failed ? 1 : 0);
