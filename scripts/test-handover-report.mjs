/**
 * Smoke test: canonical report payload + HTML renderer.
 * Run: node scripts/test-handover-report.mjs
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
  vm.runInContext(fs.readFileSync(path.join(ROOT, "ai-writing-engine.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "shift-intelligence-engine.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "js/handover-generated-view.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "handover-report.js"), "utf8"), context);
  return context;
}

const NOTES = [
  "VIP Mr Henderson arriving 14:00, champagne amenity on suite 501",
  "Taxi to Heathrow for Room 304 already booked for 06:00",
  "Room 412 AC not cooling - maintenance informed, engineer ETA 7am",
  "Room 118 card declined at checkout, £320 balance on folio",
  "Breakfast setup for conference room from 07:00",
  "General: new security fob process starts tomorrow AM shift"
];

const ctx = loadContext();
const Engine = ctx.window.AiWritingEngine;
const View = ctx.window.HandoverGeneratedView;
const Report = ctx.window.HandoverReport;

const analyzed = NOTES.map(function (line, index) {
  const rooms = Engine.extractRoomNumbers(line);
  const isVip = /\bvip\b/i.test(line);
  const fact = Engine.extractOperationalFact(line, { rooms: rooms, isVip: isVip });
  return {
    original: line,
    rooms: rooms.length ? rooms : fact.rooms || [],
    section: Engine.sectionFromFact(fact, "general"),
    isVip: isVip,
    fact: fact,
    _neutralFactId: "n-" + index
  };
}).filter(function (n) {
  return Engine.hasUsefulOperationalDetail(n.fact);
});

const experience = Engine.buildHandoverIntelligenceExperience(analyzed);
const classified = { _analyzed: analyzed };
analyzed.forEach(function (note) {
  const section = note.section || "general";
  classified[section] = classified[section] || [];
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
    date: "Wednesday, 22 July 2026",
    preparedBy: "Mantas"
  },
  generatedAt: "22/07/2026, 11:46",
  snapshot: [
    { label: "Arrivals", value: "3" },
    { label: "Departures", value: "4" },
    { label: "In-house", value: "19" },
    { label: "Occupancy", value: "79%" },
    { label: "ADR", value: "£245.50" },
    { label: "Rooms sold", value: "19" }
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
    "Confirm engineer attendance for Room 412 before peak arrivals.",
    "Review Room 118 declined card with duty manager."
  ],
  formatItemText: function (item) { return item.text; },
  formatRecommendation: function (rec) {
    return typeof rec === "string" ? rec : rec.text;
  }
});

const payload = View.toReportPayload(view);
const html = Report.renderHtml(payload);

let failed = false;

if (!payload.hasCanonicalView) {
  console.error("FAIL: payload must be canonical");
  failed = true;
}

if (payload.summary != null) {
  console.error("FAIL: legacy summary must be null on canonical payload");
  failed = true;
}

if (payload.hotelSnapshot.length !== 6) {
  console.error("FAIL: snapshot must contain 6 metrics, got", payload.hotelSnapshot.length);
  failed = true;
}

if (!html.includes("hr-note-body") || html.includes("<table")) {
  console.error("FAIL: report HTML missing vertical note blocks or uses tables");
  failed = true;
}

if (!html.includes("Hotel Snapshot") || !html.includes("Today's Briefing") ||
    !html.includes("Hotel Status") || !html.includes("Today's Timeline") ||
    !html.includes("AI Recommendations")) {
  console.error("FAIL: report HTML missing Sprint 1 sections");
  failed = true;
}

if (html.includes("AI Summary")) {
  console.error("FAIL: report HTML still uses AI Summary title");
  failed = true;
}

console.log("Report sections:", payload.sections.map((s) => s.title).join(" | "));
console.log("Snapshot labels:", payload.hotelSnapshot.map((c) => c.label).join(", "));
console.log("HTML length:", html.length);

if (failed) process.exit(1);
console.log("PASS: unified report payload and HTML renderer checks");
