/**
 * Organised section pipeline fixture — every meaningful fact appears once
 * in the correct generated section (Demo and real workspace share this path).
 *
 * Run: node scripts/test-handover-organised-section-fixture.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/** Exact operational scenario from the organised-handover regression. */
export const ORGANISED_SECTION_SOURCE = [
  "rm18 heating not working — guest cold — maint aware still unresolved",
  "rm27 late checkout confirmed 1pm",
  "rm36 wake 0600 taxi 0640",
  "rm44 outstanding 175 — collect before dep",
  "expedia virtual card pending — mr khan — still awaiting auth",
  "vip mrs taylor rm51 — anniversary setup + welcome card + chocolates still needed",
  "rm29 twin beds requested",
  "rm33 baby cot required before 1300 arrival",
  "rm15 umbrella not returned",
  "rm41 noise complaint resolved",
  "2 parcels stored for tomorrows arrivals"
].join("\n");

const EXPECTED = [
  { id: "heating18", section: "maintenance", room: /18/, cues: /heat|heating|maint/i },
  { id: "late27", section: "guest", room: /27/, cues: /late|checkout|check-out|13:00|1\s*pm/i },
  { id: "wake36", section: "guest", room: /36/, cues: /wake|06:00|0600|taxi|06:40|0640/i },
  { id: "pay44", section: "payments", room: /44/, cues: /175|outstanding|collect/i },
  { id: "expediaKhan", section: "payments", room: null, cues: /expedia|virtual|khan|pending|auth/i },
  { id: "vip51", section: "vip", room: /51/, cues: /taylor|vip|anniversary|welcome|chocolate/i },
  { id: "twin29", section: "tasks", room: /29/, cues: /twin/i },
  { id: "cot33", section: "guest", room: /33/, cues: /cot|baby|13:00|1300/i },
  { id: "umbrella15", section: "inventory", room: /15/, cues: /umbrella/i },
  { id: "noise41", section: "completed", room: /41/, cues: /noise|resolved/i },
  { id: "parcels", section: "deliveries", room: null, cues: /parcel|tomorrow|arriv|\b2\b|two/i }
];

function stubEl() {
  return {
    value: "",
    addEventListener: function () {},
    disabled: false,
    classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
    setAttribute: function () {},
    removeAttribute: function () {},
    getAttribute: function () { return null; },
    hidden: false,
    textContent: "",
    innerHTML: "",
    focus: function () {},
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    children: [],
    appendChild: function () {},
    remove: function () {},
    style: {},
    closest: function () { return null; }
  };
}

function loadEngines() {
  const ctx = {
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
  ctx.global = ctx.window;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "ai-writing-engine.js"), "utf8"), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "shift-intelligence-engine.js"), "utf8"), ctx);
  return {
    Engine: ctx.window.AiWritingEngine,
    Shift: ctx.window.ShiftIntelligenceEngine,
    Hospitality: ctx.window.HospitalityIntelligenceEngine
  };
}

function loadHandoverApi(engines) {
  const html = fs.readFileSync(path.join(ROOT, "handover.html"), "utf8");
  const scriptMatch = html.match(
    /<script src="handover-saved\.js"><\/script>(?:\s*<script src="[^"]+"><\/script>)*\s*<script>([\s\S]*?)<\/script>\s*<\/body>/
  );
  if (!scriptMatch) throw new Error("Could not extract handover inline script");
  let script = scriptMatch[1];
  script = script.replace(/\}\)\(\);\s*$/, [
    "  globalThis.__api = { parseNotes: parseNotes, classifyNotes: classifyNotes };",
    "})();"
  ].join("\n"));

  const ctx = {
    document: {
      getElementById: stubEl,
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      createElement: stubEl,
      addEventListener: function () {},
      body: stubEl()
    },
    addEventListener: function () {},
    location: { search: "", href: "", pathname: "/handover.html" },
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
    setTimeout,
    clearTimeout,
    requestAnimationFrame: function (fn) { return fn(); },
    localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
    sessionStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
    fetch: async function () { return { ok: true, json: async function () { return {}; } }; },
    alert: function () {},
    confirm: function () { return true; },
    AiWritingEngine: engines.Engine,
    ShiftIntelligenceEngine: engines.Shift,
    HospitalityIntelligenceEngine: engines.Hospitality
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(script, ctx);
  return ctx.__api;
}

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

function itemText(item) {
  return typeof item === "string" ? item : String((item && item.text) || "");
}

function sectionBlob(classified, sectionId) {
  return (classified[sectionId] || []).map(itemText).join(" || ");
}

console.log("\nOrganised section fixture — full generation pipeline\n");

const engines = loadEngines();
const Engine = engines.Engine;
const Shift = engines.Shift;
const api = loadHandoverApi(engines);

assert(typeof Shift.buildOrganisedSectionModel === "function", "engine exposes buildOrganisedSectionModel");
assert(typeof Shift.groupIntoOperationalObjects === "function", "engine exposes groupIntoOperationalObjects");

const lines = api.parseNotes(ORGANISED_SECTION_SOURCE);
assert(lines.length === 11, "parseNotes keeps related clauses together (11 operational lines)");
assert(!lines.some(function (l) { return /^guest cold$/i.test(l); }), "guest-cold fragment not orphaned");
assert(!lines.some(function (l) { return /^mr khan$/i.test(l); }), "Mr Khan fragment not orphaned");
assert(lines.some(function (l) { return /rm18.*heating/i.test(l) && /maint/i.test(l); }),
  "Room 18 heating + maint aware stay one segment");

const classified = api.classifyNotes(lines);
assert(!!classified._sectionModel, "classifyNotes stores engine section model");
assert(
  /buildOrganisedSectionModel/.test(
    fs.readFileSync(path.join(ROOT, "handover.html"), "utf8")
  ),
  "handover.html consumes buildOrganisedSectionModel"
);

/* 1. Engine objects cover the operational scenario */
const entries = (classified._analyzed || []).map(function (n, i) {
  return {
    note: n,
    fact: n.fact,
    factId: n._neutralFactId || ("f-" + i),
    topic: n.section,
    section: n.section
  };
});
const objects = Shift.groupIntoOperationalObjects(entries);
assert(objects.length >= 10, "engine output contains operational objects for the scenario");

const model = classified._sectionModel;
assert(model.objects && model.objects.length >= 10, "section model built from operational objects");

/* 2. Section model contains each expected fact once */
const seenRooms = {};
EXPECTED.forEach(function (exp) {
  const blob = sectionBlob(classified, exp.section);
  const ok = exp.cues.test(blob) && (!exp.room || exp.room.test(blob));
  assert(ok, exp.id + " appears in " + exp.section);
  if (exp.room) {
    const room = String(blob.match(exp.room) || "");
    if (room) {
      assert(!seenRooms[room + "|" + exp.section] || exp.id === seenRooms[room + "|" + exp.section],
        exp.id + " not duplicated in " + exp.section);
      seenRooms[room + "|" + exp.section] = exp.id;
    }
  }
});

/* Anti-merge regressions */
const guestBlob = sectionBlob(classified, "guest");
assert(!/Rooms?\s+18,\s*27/i.test(guestBlob), "does not merge unrelated rooms into one guest item");
assert(!/all rooms|completed late checkout/i.test(guestBlob + sectionBlob(classified, "completed")),
  "does not classify all rooms as completed late checkout");

const payItems = classified.payments || [];
assert(payItems.length >= 2, "payments stay as separate items (Room 44 + Expedia)");
assert(!payItems.some(function (it) {
  return /44/.test(itemText(it)) && /expedia|khan/i.test(itemText(it));
}), "does not collapse distinct payments into one multi-room Expedia item");

/* 3. UI section arrays render every model item */
const sectionIds = [
  "urgent", "vip", "guest", "maintenance", "payments", "events",
  "tasks", "inventory", "deliveries", "lostproperty", "general", "completed"
];
sectionIds.forEach(function (id) {
  const modelCount = ((model.sections && model.sections[id]) || []).length;
  const uiCount = (classified[id] || []).length;
  assert(uiCount === modelCount, "UI renders every section model item for " + id +
    " (" + uiCount + "=" + modelCount + ")");
});

/* 4. Demo and real share the same generation path (single classifyNotes consumer) */
const handoverSrc = fs.readFileSync(path.join(ROOT, "handover.html"), "utf8");
assert(/classifyNotes\(lines\)/.test(handoverSrc), "generateHandover uses classifyNotes");
assert(!/isDemoModeActive\(\)[\s\S]{0,120}buildOrganisedHandover/.test(handoverSrc),
  "Demo does not inject curated organised handover into Generate");

/* 5. Briefing / Status / Alerts path remains intact */
const experience = Engine.buildHandoverIntelligenceExperience(classified._analyzed || [], {});
assert(experience.briefing && experience.briefing.paragraphs && experience.briefing.paragraphs.length,
  "Today's Briefing still builds");
assert(experience.hotelStatus && experience.hotelStatus.length === 5, "Hotel Status still builds");
const alerts = Shift.computeShiftAlertsFromObjects(entries);
assert(alerts.maintenance >= 1, "Shift Alerts still count maintenance");
assert(alerts.payments >= 1, "Shift Alerts still count payments");
assert(alerts.vip >= 1, "Shift Alerts still count VIP");

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
