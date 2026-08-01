/**
 * Canonical generated handover view — Print / PDF / Copy parity.
 * Run: node scripts/test-handover-generated-view.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEngines() {
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
  vm.runInContext(fs.readFileSync(path.join(ROOT, "js/handover-generated-view.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "handover-report.js"), "utf8"), context);
  return context;
}

const FIXTURE = [
  "pm → night — busy pls read",
  "24 ac broken maint aware fan guest",
  "vip eleanor whitmore due 11am quiet upper pls — rm42 if free",
  "okonkwo rm22 dep am — wake 0630 addison lee 1015",
  "minibar 42.50 still open — collect b4 checkout",
  "expedia room4 city tax 12.50",
  "henderson x4 interconnect 14+15 tmrw — bday balloons 15 @1500 fb informed",
  "arrivals left tonight: 2",
  "no show davies rm5 b.com — hold till night confirms"
];

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

console.log("\nCanonical Generated Handover View\n");

const ctx = loadEngines();
const Engine = ctx.window.AiWritingEngine;
const View = ctx.window.HandoverGeneratedView;
const Report = ctx.window.HandoverReport;

const analyzed = FIXTURE.map(function (line, index) {
  const rooms = Engine.extractRoomNumbers(line);
  const isVip = /\bvip\b/i.test(line);
  const fact = Engine.extractOperationalFact(line, { rooms: rooms, isVip: isVip });
  return {
    original: line,
    rooms: rooms.length ? rooms : fact.rooms || [],
    section: Engine.sectionFromFact(fact, "general"),
    isVip: isVip,
    fact: fact,
    _neutralFactId: "f-" + index
  };
}).filter(function (n) {
  return Engine.hasUsefulOperationalDetail(n.fact);
});

const consolidated = Engine.consolidateNotesByFacts
  ? Engine.consolidateNotesByFacts(analyzed)
  : analyzed;

const experience = Engine.buildHandoverIntelligenceExperience(consolidated);
const classified = { _analyzed: consolidated };
["urgent", "vip", "guest", "maintenance", "payments", "events", "tasks", "general"].forEach(function (id) {
  classified[id] = [];
});
consolidated.forEach(function (note) {
  const section = note.section || "general";
  if (!classified[section]) classified[section] = [];
  classified[section].push({
    id: note._neutralFactId,
    text: Engine.rewriteNote(note, {}),
    status: "pending",
    sectionId: section
  });
});

const view = View.build({
  meta: {
    hotel: "The Oakwood Mayfair",
    shift: "Night",
    date: "1 August 2026",
    preparedBy: "Demo"
  },
  generatedAt: "01/08/2026, 12:00",
  snapshot: [
    { label: "Arrivals", value: "2" },
    { label: "Departures", value: "6" }
  ],
  experience: experience,
  classified: classified,
  sectionDefs: [
    { id: "urgent", title: "Urgent Issues" },
    { id: "vip", title: "VIP / Guest Information" },
    { id: "guest", title: "Guest Follow-up" },
    { id: "maintenance", title: "Maintenance" },
    { id: "payments", title: "Payment Issues" },
    { id: "events", title: "Events" },
    { id: "tasks", title: "Outstanding Tasks" },
    { id: "general", title: "General Updates" }
  ],
  recommendations: [
    { text: "Review VIP requirements before the 11:00 arrival.", priority: "high", department: "Reception" },
    { text: "Follow up the Room 24 AC fault with Maintenance until resolved.", priority: "high", department: "Maintenance" }
  ],
  formatItemText: function (item) { return item.text; },
  formatRecommendation: function (rec) { return rec.text; }
});

assert(view && view.version === 1, "canonical generated view model exists");
assert(view.briefing && view.briefing.paragraphs.length >= 1, "view includes Today's Briefing paragraphs");
assert(view.hotelStatus && view.hotelStatus.length === 5, "view includes five Hotel Status areas");
assert(view.timeline && view.timeline.groups && view.timeline.groups.length >= 1, "view includes Timeline groups");
assert(typeof View.formatTimelineEntry === "function", "timeline entry formatter exported");
(function assertTimelineFormatting() {
  const sample = { time: "23:30", action: "Prepare quiet upper-floor room for VIP Mr Smith", icon: "⭐" };
  const line = View.formatTimelineEntry(sample);
  assert(line === "23:30 \u2014 Prepare quiet upper-floor room for VIP Mr Smith",
    "timeline formats as time — action without icons");
  assert(!/[⭐🔧•]/.test(line), "timeline line excludes emoji/icons");
  const pdfLine = View.formatTimelineEntry(sample, { pdfSafe: true });
  assert(pdfLine.indexOf("23:30 - ") === 0 && pdfLine.indexOf("VIP Mr Smith") > 0,
    "PDF-safe timeline uses ASCII hyphen separator");
})();
assert(view.sections && view.sections.length >= 1, "view includes operational sections");
assert(view.recommendations && view.recommendations.length === 2, "view includes recommendations");
assert(view.snapshot && view.snapshot.length === 2, "view includes snapshot");

const payload = View.toReportPayload(view);
assert(payload.hasCanonicalView === true, "report payload marks canonical view");
assert(payload.summary == null, "no legacy summary object when canonical model exists");
assert(!(payload.summary && payload.summary.rows && payload.summary.rows.length),
  "no legacy detail rows when canonical model exists");

const html = Report.renderHtml(payload);
assert(/Today's Briefing/.test(html), "Print contains Today's Briefing");
assert(/Hotel Status/.test(html), "Print contains Hotel Status");
assert(/Today's Timeline/.test(html), "Print contains Today's Timeline");
assert(!/AI Summary/.test(html), "no AI Summary title when canonical model exists");
assert(/AI Recommendations/.test(html), "Print contains AI Recommendations");
assert(/Hotel Snapshot/.test(html), "Print contains Hotel Snapshot");

/* PDF path uses same payload fields (jsPDF not required for field parity). */
assert(payload.briefing.paragraphs.join(" ").length > 20, "PDF payload contains Today's Briefing");
assert(payload.hotelStatus.some(function (a) { return /Guest Experience|VIP|Maintenance/i.test(a.label); }),
  "PDF payload contains Hotel Status areas");
assert(payload.timeline.groups.some(function (g) { return (g.items || []).length > 0; }),
  "PDF payload contains Today's Timeline items");

const copyText = View.formatText(view);
assert(/TODAY'S BRIEFING/.test(copyText), "Copy uses canonical model briefing");
assert(/HOTEL STATUS/.test(copyText), "Copy includes Hotel Status");
assert(/TODAY'S TIMELINE/.test(copyText), "Copy includes Today's Timeline");
assert(/AI RECOMMENDATIONS/.test(copyText), "Copy includes recommendations");
assert(!/AI SUMMARY/.test(copyText), "Copy does not use legacy AI Summary label");

/* Screen/print/PDF consume the same model fields */
assert(JSON.stringify(payload.briefing) === JSON.stringify(view.briefing),
  "screen, Print and PDF consume the same briefing model");
assert(JSON.stringify(payload.hotelStatus) === JSON.stringify(view.hotelStatus),
  "screen, Print and PDF consume the same hotelStatus model");
assert(JSON.stringify(payload.timeline) === JSON.stringify(view.timeline),
  "screen, Print and PDF consume the same timeline model");

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
