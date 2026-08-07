/**
 * Field-testing safe UX: compact notes, sequential Priority labels, print rhythm.
 * Run: node scripts/test-field-testing-safe-ux.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadContext() {
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
  [
    "ai-writing-engine.js",
    "shift-intelligence-engine.js",
    "js/handover-generated-view.js",
    "handover-report.js"
  ].forEach(function (file) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), context);
  });
  return context;
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("PASS:", msg);
  }
}

const ctx = loadContext();
const Report = ctx.window.HandoverReport;
const Engine = ctx.window.AiWritingEngine;

/* Compact note rendering */
const noteHtml = Report.renderHtml({
  meta: {
    hotel: "Test Hotel",
    shift: "AM",
    date: "Friday, 7 August 2026",
    preparedBy: "Tester"
  },
  generatedAt: "07/08/2026, 09:00",
  hotelSnapshot: [{ label: "Arrivals", value: "2" }],
  briefing: { paragraphs: ["Priority 1\nFollow up Room 22 late check-out."] },
  hotelStatus: [],
  timeline: { groups: [] },
  sections: [{
    title: "Guest Follow-up",
    items: [
      { text: "Room 22 – Late check-out until 12:00" },
      { text: "Room 33 – Twin setup required; iron + ironing board requested" }
    ]
  }],
  recommendations: ["Confirm twin setup for Room 33."],
  sourceNotes: null,
  quoteOfTheDay: null
});

assert(noteHtml.includes("hr-note-heading") && noteHtml.includes("hr-note-sep"),
  "Print notes use compact lead — detail markup");
assert(/Room 22<\/span><span class="hr-note-sep">/.test(noteHtml),
  "Room identifier stays in emphasized heading span");
assert(!/<div class="hr-note-heading">/.test(noteHtml),
  "Compact notes no longer stack heading as a separate block div");
assert(noteHtml.includes("page-break-inside: avoid"),
  "Print CSS keeps avoid breaks on compact note rows");

/* Sequential Priority display numbering when a middle format result is empty */
const SI = ctx.window.ShiftIntelligenceEngine;
const fakePriorities = [
  { actionKind: "guest_follow_up", entities: {}, factIds: ["a"] },
  {
    actionKind: "follow_up_maintenance",
    entities: { room: "24", faultType: "AC" },
    reasonKind: "before_departure_guest_impact",
    factIds: ["b"]
  },
  {
    actionKind: "prepare_vip",
    entities: { room: "501", guestName: "Mr Henderson", amenities: ["champagne"] },
    factIds: ["c"]
  }
];

const originalBuild = SI.buildBriefingModel;
SI.buildBriefingModel = function () {
  return { objects: [], priorities: fakePriorities };
};
const briefing = Engine.buildTodaysBriefing([]);
SI.buildBriefingModel = originalBuild;

const priorityLabels = (briefing.paragraphs || [])
  .map(function (p) { return String(p).split("\n")[0]; })
  .filter(function (line) { return /^Priority\s+\d+/i.test(line); });

assert(priorityLabels[0] === "Priority 1", "First rendered priority is Priority 1");
assert(priorityLabels.every(function (label, i) {
  return label === "Priority " + (i + 1);
}), "Displayed priorities are sequential with no gaps");
assert(!priorityLabels.some(function (label) { return label === "Priority 3" && priorityLabels.length === 2; }),
  "No Priority 3 label when only two priorities render");

/* Consistency gate renumbers even when counts already match */
const gated = SI.applyExperienceConsistencyGate({
  briefing: {
    briefingModel: {
      priorities: [
        {
          actionKind: "follow_up_maintenance",
          entities: { room: "24", faultType: "AC" },
          factIds: ["b"]
        },
        {
          actionKind: "prepare_vip",
          entities: { room: "501", guestName: "Mr Henderson" },
          factIds: ["c"]
        }
      ]
    },
    paragraphs: [
      "Priority 2\nFollow up with Maintenance regarding Room 24 AC before further guest impact.",
      "Priority 3\nVIP readiness follow-up for Mr Henderson in Room 501."
    ]
  }
});
const gatedLabels = gated.briefing.paragraphs.map(function (p) {
  return String(p).split("\n")[0];
});
assert(gatedLabels[0] === "Priority 1" && gatedLabels[1] === "Priority 2",
  "Experience gate renumbers Priority 2/3 display labels to 1/2");

/* Presentation guard: internal reference metadata must not print */
const guardedHtml = Report.renderHtml({
  meta: {
    hotel: "Test Hotel",
    shift: "AM",
    date: "Friday, 7 August 2026",
    preparedBy: "Tester"
  },
  generatedAt: "07/08/2026, 09:00",
  hotelSnapshot: [],
  briefing: { paragraphs: ["Priority 1\nFollow up Room 22."] },
  hotelStatus: [],
  timeline: { groups: [] },
  sections: [],
  recommendations: [
    "Confirm twin setup for Room 33.",
    "Room attribute reference (staff allocation) — Use configured room attributes as factual reference — bed size, twin capability."
  ],
  sourceNotes: null,
  quoteOfTheDay: null
});
assert(guardedHtml.includes("Confirm twin setup for Room 33"),
  "Normal recommendations still print");
assert(!/Room attribute reference|factual reference|staff allocation/i.test(guardedHtml),
  "Internal room-attribute reference metadata is stripped from print output");

if (failed) {
  console.error("\n" + failed + " failure(s)");
  process.exit(1);
}
console.log("\nPASS: field-testing safe UX checks");
