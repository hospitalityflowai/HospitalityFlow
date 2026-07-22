/**
 * Smoke test: unified report payload + HTML renderer.
 * Run: node scripts/test-handover-report.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadReportApi() {
  const src = fs.readFileSync(path.join(ROOT, "handover-report.js"), "utf8");
  const context = { window: {}, global: {}, console };
  context.window = context;
  context.global = context;
  vm.createContext(context);
  vm.runInContext(src, context);
  return context.HandoverReport;
}

function loadClassificationApi() {
  const html = fs.readFileSync(path.join(ROOT, "handover.html"), "utf8");
  const scriptMatch = html.match(/<script src="handover-saved\.js"><\/script>\s*<script>([\s\S]*?)<\/script>\s*<\/body>/);
  if (!scriptMatch) throw new Error("Could not extract handover inline script");

  let script = scriptMatch[1];
  script = script.replace(/\}\)\(\);\s*$/, [
    "  globalThis.__handoverApi = {",
    "    parseNotes: parseNotes,",
    "    classifyNotes: classifyNotes,",
    "    buildPdfSections: buildPdfSections,",
    "    buildHandoverReportPayload: buildHandoverReportPayload,",
    "    buildHandoverReportPayloadFromSaved: buildHandoverReportPayloadFromSaved,",
    "    restoreClassifiedFromSaved: restoreClassifiedFromSaved,",
    "    buildOrganisedHandover: buildOrganisedHandover",
    "  };",
    "})();"
  ].join("\n"));

  const elements = {};
  const stubEl = (id) => {
    const el = {
      id: id || "",
      value: "",
      addEventListener: () => {},
      disabled: false,
      classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
      setAttribute: () => {},
      removeAttribute: () => {},
      textContent: "",
      innerHTML: "",
      focus: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
      appendChild: () => {},
      children: [],
      style: {}
    };
    if (id) elements[id] = el;
    return el;
  };

  [
    "hotelName",
    "preparedBy",
    "handoverDate",
    "notesInput",
    "preHotelSnapshotGrid",
    "shiftSnapshotGrid"
  ].forEach(stubEl);

  const context = {
    document: {
      getElementById: (id) => elements[id] || stubEl(id),
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => stubEl(),
      addEventListener: () => {}
    },
    addEventListener: () => {},
    location: { search: "" },
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
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (fn) => fn(),
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  };
  context.window = context;
  context.globalThis = context;

  vm.createContext(context);
  vm.runInContext(script, context);
  return context.__handoverApi;
}

const MEDIUM_NOTES = [
  "VIP Mr Henderson arriving 14:00, champagne amenity on suite 501 with very detailed dietary requirements and late checkout expectations for the entire party",
  "Taxi to Heathrow for Room 304 already booked for 06:00",
  "Room 412 AC not cooling - maintenance informed, engineer ETA 7am",
  "Room 118 card declined at checkout, £320 balance on folio",
  "Breakfast setup for conference room from 07:00",
  "General: new security fob process starts tomorrow AM shift",
  "Night audit completed at 04:15 by Sarah"
].join("\n");

const report = loadReportApi();
const api = loadClassificationApi();

const lines = api.parseNotes(MEDIUM_NOTES);
const classified = api.classifyNotes(lines);
const payload = api.buildHandoverReportPayload(classified, {
  meta: {
    hotel: "The Zetter Marylebone",
    shift: "Night",
    date: "Wednesday, 22 July 2026",
    preparedBy: "Mantas"
  },
  generatedAt: "22/07/2026, 11:46",
  recommendations: [
    "Confirm engineer attendance for Room 412 before peak arrivals.",
    "Review Room 118 declined card with duty manager."
  ]
});

const html = report.renderHtml(payload);
const sectionTitles = payload.sections.map((s) => s.title);
const expectedOrder = [
  "Urgent Issues",
  "VIP / Guest Information",
  "Outstanding Tasks",
  "Maintenance",
  "Payment Issues",
  "Events",
  "General Updates",
  "Completed Actions"
];

let failed = false;

if (payload.hotelSnapshot.length !== 6) {
  console.error("FAIL: snapshot must contain 6 metrics, got", payload.hotelSnapshot.length);
  failed = true;
}

if (payload.sections.reduce((n, s) => n + s.items.length, 0) !== lines.length) {
  console.error("FAIL: report sections do not include all notes");
  failed = true;
}

let lastIndex = -1;
sectionTitles.forEach(function (title) {
  const idx = expectedOrder.indexOf(title);
  if (idx === -1 || idx < lastIndex) {
    console.error("FAIL: section order invalid:", title);
    failed = true;
  }
  lastIndex = idx;
});

if (!html.includes("hr-note-body") || html.includes("<table")) {
  console.error("FAIL: report HTML missing vertical note blocks or uses tables");
  failed = true;
}

if (!html.includes("Hotel Snapshot") || !html.includes("Shift Intelligence")) {
  console.error("FAIL: report HTML missing required sections");
  failed = true;
}

const savedPayload = api.buildHandoverReportPayloadFromSaved({
  hotelName: "The Zetter Marylebone",
  shift: "Night",
  date: "2026-07-22",
  dateDisplay: "Wednesday, 22 July 2026",
  preparedBy: "Mantas",
  timestamp: "2026-07-22T11:46:00.000Z",
  organisedHandover: api.buildOrganisedHandover(classified),
  hotelSnapshot: {
    arrivals: "3",
    departures: "4",
    inHouse: "19",
    occupancy: "79%",
    adr: "£245.50",
    roomsSold: "19"
  },
  recommendations: payload.recommendations
});

if (savedPayload.sections.length !== payload.sections.length) {
  console.error("FAIL: saved payload section count differs from live payload");
  failed = true;
}

console.log("Report sections:", sectionTitles.join(" | "));
console.log("Snapshot labels:", payload.hotelSnapshot.map((c) => c.label).join(", "));
console.log("HTML length:", html.length);

if (failed) process.exit(1);
console.log("PASS: unified report payload and HTML renderer checks");
