/**
 * Handover classification coverage + PDF pagination smoke test.
 * Run: node scripts/test-handover-classification.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath, pathToFileURL } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/** Long scattered-note fixture covering every required category. */
export const SCATTERED_NOTES = [
  "Room 412 AC not cooling - maintenance informed, engineer ETA 7am",
  "VIP Mr Henderson arriving 14:00, champagne amenity on suite 501",
  "Outstanding: follow up with housekeeping on room 318 extra pillows",
  "Room 205 shower leak - still leaking from previous shift, urgent",
  "Room 118 card declined at checkout, £320 balance on folio",
  "Conference room B setup for 08:00 wedding briefing - flowers arriving 07:30",
  "Night audit completed at 04:15 by Sarah",
  "All wake-up calls completed for 05:30 batch",
  "PM accounts completed - no discrepancies",
  "Taxi to Heathrow for Room 304 already booked for 06:00",
  "Lost property: guest left phone charger in lounge, logged in book",
  "Room 227 package delivery held at reception for Mrs Chen",
  "Pool temperature logged at 28°C, within range",
  "Room 156 minibar dispute - guest says not consumed, £45 charge to review",
  "Room 99 late checkout approved until 13:00",
  "Maintenance: Room 445 TV remote not working, replacement needed",
  "General: new security fob process starts tomorrow AM shift",
  "Room 333 wedding group checking in tomorrow - 12 rooms block",
  "Housekeeping report: room 102 ready, room 103 still DND",
  "Room 24 reported that the air conditioning is not cooling properly. Maintenance has been informed but has not attended yet.",
  "Guest adapters issued to Room 15 and Room 37 are still outstanding."
].join("\n");

const SECTION_TITLES = {
  urgent: "Urgent Issues",
  guest: "VIP / Guest Information",
  tasks: "Outstanding Tasks",
  maintenance: "Maintenance",
  payments: "Payment Issues",
  events: "Events",
  general: "General Updates",
  completed: "Completed Actions"
};

function loadHandoverClassificationApi() {
  const html = fs.readFileSync(path.join(ROOT, "handover.html"), "utf8");
  const scriptMatch = html.match(/<script src="handover-saved\.js"><\/script>\s*<script>([\s\S]*?)<\/script>\s*<\/body>/);
  if (!scriptMatch) throw new Error("Could not extract handover inline script");

  let script = scriptMatch[1];
  script = script.replace(/\}\)\(\);\s*$/, [
    "  globalThis.__handoverClassificationApi = {",
    "    parseNotes: parseNotes,",
    "    classifyNotes: classifyNotes,",
    "    buildPdfSections: buildPdfSections,",
    "    getOrganisedSectionDefs: getOrganisedSectionDefs,",
    "    formatItemForPdf: formatItemForPdf,",
    "    normalizeHandoverItem: normalizeHandoverItem",
    "  };",
    "})();"
  ].join("\n"));

  const stubEl = () => ({
    value: "",
    addEventListener: () => {},
    disabled: false,
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    setAttribute: () => {},
    removeAttribute: () => {},
    getAttribute: () => null,
    hidden: false,
    textContent: "",
    innerHTML: "",
    focus: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    children: [],
    appendChild: () => {},
    remove: () => {},
    style: {}
  });

  const context = {
    document: {
      getElementById: stubEl,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: stubEl,
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

  const api = context.__handoverClassificationApi;
  if (!api || typeof api.parseNotes !== "function" || typeof api.classifyNotes !== "function") {
    throw new Error("Classification helpers were not exposed from handover.html");
  }

  return api;
}

function loadPdfCounter(exporterPath, allowLegacyFallback) {
  const exporterSrc = fs.readFileSync(exporterPath, "utf8");
  const patchedSrc = exporterSrc.includes("countPages")
    ? exporterSrc
    : exporterSrc.replace(
      /global\.HandoverPdfExporter = \{\s*\n\s*export: exportHandoverPdf\s*\n\s*\};/,
      [
        "function countHandoverPdfPages(payload) {",
        "  if (!global.jspdf || !global.jspdf.jsPDF) throw new Error('jsPDF is not loaded');",
        "  var pdf = new PdfDocument(global.jspdf.jsPDF);",
        "  var generatedAt = payload.generatedAt || new Date().toLocaleString('en-GB');",
        "  pdf.drawHeader(payload.meta, generatedAt);",
        "  pdf.drawHotelSnapshot(payload.hotelSnapshot);",
        "  pdf.drawSummary(payload.summary);",
        "  pdf.drawHandoverSections(payload.sections);",
        "  pdf.drawRecommendations(payload.recommendations);",
        "  pdf.drawIntelligenceChecklist(payload.intelligenceChecklist);",
        "  return pdf.getDocument ? pdf.getDocument().internal.getNumberOfPages() : pdf.doc.internal.getNumberOfPages();",
        "}",
        "global.HandoverPdfExporter = { export: exportHandoverPdf, countPages: countHandoverPdfPages };"
      ].join("\n")
    );

  return new Promise((resolve, reject) => {
    if (!allowLegacyFallback && !exporterSrc.includes("countPages")) {
      reject(new Error("countPages unavailable"));
      return;
    }
    fetch("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js")
      .then((res) => res.text())
      .then((jspdfSrc) => {
        const context = {
          window: {},
          global: {},
          self: {},
          console,
          navigator: { userAgent: "node" },
          location: { origin: "http://localhost" },
          document: { createElement: () => ({ dispatchEvent: () => {}, setAttribute: () => {} }) },
          atob: (value) => Buffer.from(String(value), "base64").toString("binary"),
          btoa: (value) => Buffer.from(String(value), "binary").toString("base64"),
          Blob: function Blob() {},
          FileReader: function FileReader() {}
        };
        context.window = context;
        context.global = context;
        context.self = context;
        vm.createContext(context);
        vm.runInContext(jspdfSrc, context);
        vm.runInContext(patchedSrc, context);
        if (!context.window.HandoverPdfExporter || !context.window.HandoverPdfExporter.countPages) {
          reject(new Error("HandoverPdfExporter.countPages unavailable"));
          return;
        }
        resolve(context.window.HandoverPdfExporter.countPages);
      })
      .catch(reject);
  });
}

function buildSamplePdfPayload(classified, buildPdfSections) {
  return {
    meta: {
      hotel: "The Zetter Marylebone",
      shift: "Night",
      date: "Wednesday, 22 July 2026",
      preparedBy: "Night Team"
    },
    generatedAt: "22/07/2026, 11:30",
    hotelSnapshot: [
      { label: "Arrivals", value: "3" },
      { label: "Departures", value: "4" },
      { label: "In-House", value: "19" },
      { label: "Occupancy", value: "79%" },
      { label: "ADR", value: "£245.50" },
      { label: "Rooms Sold", value: "19" }
    ],
    summary: {
      overview: "Night shift completed with several guest, maintenance and payment follow-ups for the incoming team.",
      rows: [
        { heading: "Immediate Attention", text: "One urgent maintenance carry-over requires engineer attendance.", count: 1 },
        { heading: "Guest Focus", text: "VIP arrival and several room-specific guest requests remain active.", count: 4 }
      ]
    },
    sections: buildPdfSections(classified),
    recommendations: [
      "Confirm engineer attendance for Room 205 shower leak before guest complaints escalate.",
      "Review Room 118 declined card and £320 folio balance with duty manager.",
      "Verify Room 304 Heathrow taxi is still confirmed for 06:00."
    ]
  };
}

function runClassificationTrace(api) {
  const lines = api.parseNotes(SCATTERED_NOTES);
  const classified = api.classifyNotes(lines);
  const analyzed = classified._analyzed || [];

  const trace = analyzed.map(function (note, index) {
    return {
      index: index + 1,
      source: note.original,
      sectionId: note.section,
      section: SECTION_TITLES[note.section] || note.section
    };
  });

  const screenSections = {};
  const pdfSections = {};
  Object.keys(SECTION_TITLES).forEach(function (id) {
    screenSections[id] = (classified[id] || []).length;
    pdfSections[id] = 0;
  });

  const pdfSectionList = api.buildPdfSections(classified);
  pdfSectionList.forEach(function (section) {
    const match = Object.keys(SECTION_TITLES).find(function (id) {
      return SECTION_TITLES[id] === section.title;
    });
    if (match) pdfSections[match] = section.items.length;
  });

  const organisedItemCount = Object.keys(SECTION_TITLES).reduce(function (sum, id) {
    return sum + screenSections[id];
  }, 0);

  const missing = trace.filter(function (row) {
    return screenSections[row.sectionId] === 0;
  });

  const pdfMismatch = Object.keys(SECTION_TITLES).filter(function (id) {
    return screenSections[id] !== pdfSections[id];
  });

  const completedInTasks = analyzed.filter(function (note) {
    return note.section === "tasks" && /completed|complete|done|already booked|night audit|pm accounts/i.test(note.original);
  });

  return {
    sourceNoteCount: lines.length,
    organisedItemCount,
    trace,
    screenSections,
    pdfSections,
    missing,
    pdfMismatch,
    completedInTasks,
    classified,
    pdfSectionList
  };
}

async function countPagesForExporter(exporterPath, payload, allowLegacyFallback) {
  const countPages = await loadPdfCounter(exporterPath, !!allowLegacyFallback);
  return countPages(payload);
}

async function main() {
  const api = loadHandoverClassificationApi();
  const result = runClassificationTrace(api);
  const payload = buildSamplePdfPayload(result.classified, api.buildPdfSections);

  let beforePages = null;
  const oldExporterPath = path.join(ROOT, ".tmp-handover-pdf-old.js");
  try {
    execSync(`git show HEAD:handover-pdf.js`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const oldSrc = execSync("git show HEAD:handover-pdf.js", { cwd: ROOT, encoding: "utf8" });
    fs.writeFileSync(oldExporterPath, oldSrc, "utf8");
    beforePages = await countPagesForExporter(oldExporterPath, payload, true);
  } catch (_err) {
    beforePages = null;
  } finally {
    if (fs.existsSync(oldExporterPath)) fs.unlinkSync(oldExporterPath);
  }

  const afterPages = await countPagesForExporter(path.join(ROOT, "handover-pdf.js"), payload);

  console.log("=== Handover classification trace ===");
  console.log("Source notes detected:", result.sourceNoteCount);
  console.log("Organised display items:", result.organisedItemCount);
  console.log("");
  console.log("| # | Section | Source note |");
  console.log("|---|---------|-------------|");
  result.trace.forEach(function (row) {
    const note = row.source.replace(/\|/g, "\\|");
    console.log(`| ${row.index} | ${row.section} | ${note} |`);
  });

  console.log("");
  console.log("Screen vs PDF section counts:");
  Object.keys(SECTION_TITLES).forEach(function (id) {
    console.log(`  ${SECTION_TITLES[id]}: screen=${result.screenSections[id]} pdf=${result.pdfSections[id]}`);
  });

  console.log("");
  console.log("PDF page count before:", beforePages == null ? "n/a" : beforePages);
  console.log("PDF page count after:", afterPages);

  let failed = false;

  if (result.sourceNoteCount !== result.trace.length) {
    console.error("FAIL: trace length does not match parsed note count");
    failed = true;
  }

  if (result.missing.length) {
    console.error("FAIL: notes mapped to empty sections:", result.missing.map((m) => m.index).join(", "));
    failed = true;
  }

  if (result.pdfMismatch.length) {
    console.error("FAIL: screen/PDF section mismatch:", result.pdfMismatch.join(", "));
    failed = true;
  }

  if (result.completedInTasks.length) {
    console.error("FAIL: completed actions classified as tasks:", result.completedInTasks.map((n) => n.original).join(" | "));
    failed = true;
  }

  const maintenanceLost = result.trace.filter(function (row) {
    return /maintenance|AC not cooling|shower leak|TV remote|air conditioning/i.test(row.source) &&
      row.sectionId !== "maintenance" && row.sectionId !== "urgent";
  });
  if (maintenanceLost.length) {
    console.error("FAIL: maintenance notes not in maintenance/urgent:", maintenanceLost.map((r) => r.index).join(", "));
    failed = true;
  }

  const paymentLost = result.trace.filter(function (row) {
    return /balance|folio|declined|minibar dispute|charge to review/i.test(row.source) &&
      !/lost property/i.test(row.source) &&
      row.sectionId !== "payments";
  });

  const lostPropertyMisplaced = result.trace.filter(function (row) {
    return /lost property|lost item/i.test(row.source) && row.sectionId !== "general";
  });
  if (paymentLost.length) {
    console.error("FAIL: payment notes not in payments:", paymentLost.map((r) => r.index).join(", "));
    failed = true;
  }

  if (lostPropertyMisplaced.length) {
    console.error("FAIL: lost property not in General Updates:", lostPropertyMisplaced.map((r) => r.index).join(", "));
    failed = true;
  }

  if (beforePages != null && afterPages > Math.max(beforePages + 2, 5)) {
    console.error("FAIL: page count grew excessively after readability update");
    failed = true;
  }

  if (failed) {
    process.exit(1);
  }

  console.log("");
  console.log("PASS: classification coverage and PDF pagination checks");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
