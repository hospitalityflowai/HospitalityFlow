/**
 * Live dense-paragraph fixture — proves room/fact isolation through the
 * full generated-handover pipeline (Demo and real share this path).
 *
 * Run: node scripts/test-handover-live-fixture-fact-isolation.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/** Exact live fixture from the contamination bug report. */
export const LIVE_FIXTURE_SOURCE = [
  "Arr 14 dep 12 stay over 29 / guests in house 65 adults 54 kids 11 / rooms sold 46 / rooms avail 13 / occ 78%.",
  "",
  "Night shift fairly busy at start but quiet after 2am. Rm 18 complained heating too warm and controls not responding, fan provided and maint informed, still need follow up. Rm 27 requested late c/o 12:30 confirmed. Wake-up call for rm 36 at 6am and taxi booked for 6:40. Rm 44 has £175 balance outstanding, payment link sent but not paid yet. VIP Mrs Taylor arriving today allocated rm 51, anniversary stay, needs welcome card and chocolates in room before arrival. Rm 29 requested twin beds, HK aware. Baby cot needed in rm 33 before 1pm arrival. Rm 15 borrowed an umbrella, not returned yet. Guest in rm 41 complained about noise from corridor around midnight, apologised and quiet afterwards. Expedia booking for Mr Khan arriving today showing payment pending, please check virtual card after 5am. Two parcels received for guests arriving tomorrow and stored in back office. Please follow up heating, collect both outstanding payments and check VIP setup."
].join("\n");

const MEGA_ROOM_LIST = /18[,\s]+27[,\s]+36[,\s]+44[,\s]+51[,\s]+29[,\s]+33[,\s]+15[,\s]+41/;

const EXPECTED_OBJECTS = [
  { id: "heating18", room: "18", cues: /heat|heating|maint|fan/i, section: /maintenance|urgent/ },
  { id: "late27", room: "27", cues: /late|check-?out|12:30|c\/o/i, section: /guest/ },
  { id: "wake36", room: "36", cues: /wake|taxi|6:?\d{0,2}|06/i, section: /guest/ },
  { id: "pay44", room: "44", cues: /175|outstanding|balance|payment\s+link/i, section: /payments/ },
  { id: "vip51", room: "51", cues: /taylor|vip|anniversary|welcome|chocolate/i, section: /vip/ },
  { id: "twin29", room: "29", cues: /twin/i, section: /tasks/ },
  { id: "cot33", room: "33", cues: /cot|baby|1\s*pm|13:00/i, section: /guest|tasks/ },
  { id: "umbrella15", room: "15", cues: /umbrella/i, section: /inventory|tasks/ },
  { id: "noise41", room: "41", cues: /noise|quiet|apologis/i, section: /completed|general/ },
  { id: "expediaKhan", room: null, cues: /expedia|khan|virtual|5\s*am|05:00|pending/i, section: /payments/ },
  { id: "parcels", room: null, cues: /parcel|tomorrow|back\s+office|stored|package/i, section: /deliveries|general|completed/ }
];

function stubEl() {
  return {
    value: "",
    addEventListener() {},
    disabled: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {},
    removeAttribute() {},
    getAttribute() { return null; },
    hidden: false,
    textContent: "",
    innerHTML: "",
    focus() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    children: [],
    appendChild() {},
    remove() {},
    style: {},
    closest() { return null; }
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
      querySelector() { return null; },
      querySelectorAll() { return []; },
      createElement: stubEl,
      addEventListener() {},
      body: stubEl()
    },
    addEventListener() {},
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
    requestAnimationFrame(fn) { return fn(); },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    alert() {},
    confirm() { return true; },
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

function itemText(item) {
  return typeof item === "string" ? item : String((item && item.text) || "");
}

function roomsOf(item) {
  if (!item || typeof item === "string") return [];
  if (item.fact && item.fact.rooms) return item.fact.rooms.map(String);
  if (item.rooms) return item.rooms.map(String);
  return [];
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

console.log("\nLive fixture — fact isolation regression\n");

const engines = loadEngines();
const Engine = engines.Engine;
const Shift = engines.Shift;
const api = loadHandoverApi(engines);

/* ---------- Stage counts ---------- */
const segments = Engine.splitSourceIntoFactSegments(LIVE_FIXTURE_SOURCE);
const facts = Engine.extractOperationalFacts(LIVE_FIXTURE_SOURCE);
const lines = api.parseNotes(LIVE_FIXTURE_SOURCE);
const classified = api.classifyNotes(lines);
const analyzed = classified._analyzed || [];

const sectionIds = [
  "urgent", "vip", "guest", "maintenance", "payments", "events",
  "tasks", "inventory", "deliveries", "lostproperty", "general", "completed"
];
const sectionItems = [];
sectionIds.forEach((id) => {
  (classified[id] || []).forEach((item) => {
    sectionItems.push({ section: id, text: itemText(item), rooms: roomsOf(item), item });
  });
});
const allGeneratedText = sectionItems.map((s) => s.text).join("\n");

const entries = analyzed.map((n, i) => ({
  note: n,
  fact: n.fact,
  factId: n._neutralFactId || ("f-" + i),
  topic: n.section,
  section: n.section
}));
const objects = Shift.groupIntoOperationalObjects(entries);
const recs = Shift.generateRecommendations({
  shiftCode: "Night",
  rawNotesText: LIVE_FIXTURE_SOURCE,
  classified: { _analyzed: analyzed },
  departments: ["Reception", "Maintenance", "Housekeeping", "Duty Manager"],
  selectedDepartment: "Reception",
  hotelSnapshot: {},
  brainContext: null
});
const experience = Engine.buildHandoverIntelligenceExperience(analyzed, {});
const briefingText = (experience.briefing.paragraphs || []).join("\n");
const statusText = (experience.hotelStatus || []).map((a) => a.summary).join("\n");
const recText = recs.map((r) => r.text).join("\n");

console.log("Stage counts:");
console.log("  segments=", segments.length, "facts=", facts.length, "parseNotes=", lines.length);
console.log("  analyzed=", analyzed.length, "objects=", objects.length, "sectionItems=", sectionItems.length);
console.log("  recommendations=", recs.length);

/* 1–2: eleven operational facts/objects with correct room attachment */
const operationalFacts = facts.filter((f) => {
  const src = String(f.sourceText || "");
  if (/^arr\s+\d/i.test(src)) return false;
  if (/night shift fairly busy/i.test(src)) return false;
  if (/^please\s+follow\s+up\b/i.test(src)) return false;
  return Engine.hasUsefulOperationalDetail(f);
});

assert(operationalFacts.length >= 11, "1. at least 11 operational facts extracted");
assert(objects.length >= 11, "1b. at least 11 operational objects grouped");

EXPECTED_OBJECTS.forEach((exp) => {
  const fact = operationalFacts.find((f) => {
    const src = String(f.sourceText || "") + " " + (f.guestName || "") + " " + (f.subject || "");
    if (!exp.cues.test(src)) return false;
    if (exp.room) return (f.rooms || []).map(String).indexOf(exp.room) !== -1;
    return true;
  });
  assert(!!fact, "2. fact present for " + exp.id);
  if (fact && exp.room) {
    assert(
      (fact.rooms || []).map(String).every((r) => r === exp.room) ||
        (fact.rooms || []).map(String).indexOf(exp.room) !== -1 && (fact.rooms || []).length === 1,
      "2b. " + exp.id + " rooms attached only to " + exp.room + " (got " + (fact.rooms || []).join(",") + ")"
    );
  }
});

/* 3–7: ownership assertions */
const twinFact = operationalFacts.find((f) => /twin/i.test(f.sourceText || "") || f.subject === "twin_setup");
assert(twinFact && (twinFact.rooms || []).map(String).indexOf("29") !== -1, "3. Room 29 owns twin beds");
assert(twinFact && (twinFact.rooms || []).map(String).indexOf("18") === -1, "3b. twin beds not on Room 18");

const heatFact = operationalFacts.find((f) => /heat/i.test(f.sourceText || "") || f.subject === "maintenance");
assert(heatFact && (heatFact.rooms || []).map(String).indexOf("18") !== -1, "4. Room 18 owns heating");

const pay44 = operationalFacts.find((f) => /175/.test(f.sourceText || ""));
assert(pay44 && (pay44.rooms || []).map(String).indexOf("44") !== -1, "5. Room 44 owns £175");
assert(pay44 && !/expedia|khan/i.test(pay44.sourceText || ""), "5b. £175 fact is not Expedia");

const expedia = operationalFacts.find((f) => /expedia|khan/i.test((f.sourceText || "") + " " + (f.guestName || "")));
assert(expedia && /khan/i.test(expedia.guestName || expedia.sourceText || ""), "6. Mr Khan owns Expedia");
assert(expedia && /5\s*am|05:00|virtual/i.test(expedia.sourceText || ""), "6b. Expedia keeps virtual-card after 05:00 cue");
assert(!(expedia.rooms || []).length || (expedia.rooms || []).map(String).indexOf("44") === -1, "6c. Expedia not attached to Room 44");

const vip = operationalFacts.find((f) => f.subject === "vip_arrival" || /mrs\s+taylor/i.test((f.guestName || "") + (f.sourceText || "")));
assert(vip && (vip.rooms || []).map(String).indexOf("51") !== -1, "7. Mrs Taylor / Room 51 owns VIP");
const otherVip = operationalFacts.filter((f) => f.subject === "vip_arrival" && (f.rooms || []).map(String).indexOf("51") === -1);
assert(otherVip.length === 0, "7b. no other VIP-subject facts without Room 51");

/* 8: wake + taxi one Room 36 object */
const wakeObj = objects.find((o) => (o.rooms || []).map(String).indexOf("36") !== -1);
assert(!!wakeObj, "8. Room 36 operational object exists");
assert(
  wakeObj && /wake/i.test(JSON.stringify(wakeObj)) && /taxi/i.test(JSON.stringify(wakeObj)),
  "8b. wake-up and taxi remain one Room 36 object"
);
assert(
  wakeObj && (wakeObj.rooms || []).map(String).every((r) => r === "36"),
  "8c. Room 36 object does not include other rooms"
);

/* 9: no mega room list */
assert(!MEGA_ROOM_LIST.test(allGeneratedText), "9. no mega room list in section items");
assert(!MEGA_ROOM_LIST.test(recText), "9b. no mega room list in recommendations");
assert(!MEGA_ROOM_LIST.test(briefingText), "9c. no mega room list in briefing");

/* 10–11: each fact once in canonical sections */
EXPECTED_OBJECTS.forEach((exp) => {
  const hits = sectionItems.filter((s) => {
    if (!exp.cues.test(s.text)) return false;
    if (exp.room && s.rooms.length && s.rooms.indexOf(exp.room) === -1) return false;
    if (exp.room && !s.rooms.length && !new RegExp("\\b" + exp.room + "\\b").test(s.text)) return false;
    return true;
  });
  assert(hits.length >= 1, "10. " + exp.id + " appears in canonical sections");
  assert(hits.length === 1, "11. " + exp.id + " appears exactly once (got " + hits.length + ")");
  if (hits[0]) {
    assert(exp.section.test(hits[0].section), "11b. " + exp.id + " in expected section family (got " + hits[0].section + ")");
  }
});

assert(!/Prepare Room 18 with twin/i.test(allGeneratedText), "10b. Room 18 is not rendered as twin beds");
assert(!/twin/i.test(sectionItems.filter((s) => s.rooms.indexOf("18") !== -1).map((s) => s.text).join(" ")), "10c. Room 18 section text has no twin");

/* 12: recommendations from correct objects */
assert(recs.some((r) => /18/.test(r.text) && /heat/i.test(r.text)), "12. recommendation for Room 18 heating");
assert(recs.some((r) => /44/.test(r.text) && /175/.test(r.text)), "12b. recommendation for Room 44 £175");
assert(recs.some((r) => /expedia|khan/i.test(r.text)), "12c. recommendation for Expedia/Mr Khan");
assert(recs.some((r) => /29/.test(r.text) && /twin/i.test(r.text)), "12d. recommendation for Room 29 twin");
assert(!recs.some((r) => /175/.test(r.text) && /expedia/i.test(r.text)), "12e. £175 not merged into Expedia recommendation");
assert(!recs.some((r) => MEGA_ROOM_LIST.test(r.text)), "12f. no recommendation lists all rooms");
assert(!recs.some((r) => /41/.test(r.text) && /noise|urgent|collect/i.test(r.text)), "12g. resolved Room 41 noise has no urgent recommendation");

/* 13: briefing and hotel status consume restored objects */
assert(/18/.test(briefingText) && /heat/i.test(briefingText), "13. briefing mentions Room 18 heating");
assert(/44/.test(briefingText) && /175/.test(briefingText), "13b. briefing mentions Room 44 £175");
assert(/51|taylor|vip/i.test(briefingText), "13c. briefing mentions VIP Room 51");
assert(/36/.test(briefingText), "13d. briefing mentions Room 36 timed actions");
assert(/18/.test(statusText) || /heat|guest-impact|fault/i.test(statusText), "13e. hotel status reflects unresolved work");
assert(!/no unresolved|nothing outstanding|all clear/i.test(briefingText + "\n" + statusText), "13f. status/briefing do not claim no unresolved work");

/* 14: demo and real share the same pipeline (classifyNotes → section model) */
assert(!!classified._sectionModel || !!classified._analyzed, "14. classifyNotes produces canonical analyzed model");
assert(
  typeof Shift.buildOrganisedSectionModel === "function",
  "14b. organised section model is engine-owned (shared by demo/real)"
);

/* Snapshot still extracted */
assert(/78%|occupancy|rooms sold|arr(?:ival)?\s*14/i.test(allGeneratedText), "snapshot metrics retained in output");

/* ---------- Writing polish regressions (presentation only) ---------- */
console.log("\nWriting polish regressions\n");

function sectionTextMatching(re) {
  return sectionItems.filter((s) => re.test(s.text)).map((s) => s.text).join("\n");
}

const vipText = sectionTextMatching(/Taylor|VIP arrival/i);
assert(/Mrs Taylor\s*[—-]\s*VIP arrival/i.test(vipText), "W1. VIP uses concise name — VIP arrival lead");
assert(/Anniversary stay/i.test(vipText), "W1b. VIP keeps anniversary occasion");
assert(/welcome card/i.test(vipText) && /chocolate/i.test(vipText), "W1c. VIP keeps welcome card and chocolates");
assert(/Room 51/i.test(vipText), "W1d. VIP keeps Room 51");
assert(!/is a VIP guest arriving for Room/i.test(vipText), "W1e. VIP avoids repetitive arriving-for-room wording");

const wakeText = sectionTextMatching(/Wake-up|06:00|taxi/i);
assert(/Room 36/i.test(wakeText), "W7. timed action keeps Room 36");
assert(/Wake-up call at 06:00/i.test(wakeText), "W7b. wake-up uses 06:00");
assert(/Taxi booked for 06:40/i.test(wakeText), "W7c. linked taxi time retained");
assert(!/Wake-up call for at/i.test(wakeText), "W7d. no broken 'Wake-up call for at' fragment");

const cotText = sectionTextMatching(/baby cot|Room 33/i);
assert(/Prepare baby cot in Room 33 before the 13:00 arrival/i.test(cotText), "W8. baby cot grammar and room/time");

const heatText = sectionTextMatching(/Heating|Room 18/i);
assert(/controls not responding/i.test(heatText), "W4. maintenance keeps controls fault");
assert(/Guest comfort affected/i.test(heatText), "W4b. maintenance keeps guest impact");
assert(/Maintenance informed/i.test(heatText), "W4c. maintenance keeps informed status");
assert(/Follow up required/i.test(heatText), "W4d. maintenance keeps next action");
assert(!/^Room 18 – Heating issue reported\.?$/i.test(heatText.trim()), "W4e. maintenance is not reduced to bare issue reported");

const parcelText = sectionTextMatching(/parcel|back office/i);
assert(/Two parcels received for tomorrow's arrivals/i.test(parcelText), "W5. deliveries keep quantity and tomorrow's arrivals");
assert(/Stored in the back office/i.test(parcelText), "W5b. deliveries keep stated storage location");
assert(!/held at Reception/i.test(parcelText), "W5c. deliveries do not invent Reception");

const doneText = sectionTextMatching(/noise|corridor|Room 41/i);
assert(/closed|resolved|No further action required/i.test(doneText), "W6. completed noise reads as closed");
assert(!/Guest in complained/i.test(doneText), "W6b. completed noise is not a raw complaint replay");

const timelineText = (experience.timeline.groups || []).map((g) =>
  (g.items || []).map((it) => it.action || it.displayText || it.text || "").join("\n")
).join("\n");
assert(/Complete VIP room setup for Mrs Taylor \(Room 51\)/i.test(timelineText), "W2. timeline VIP is checklist-style");
assert(!/Prepare arrival for VIP/i.test(timelineText), "W2b. timeline avoids generic prepare-arrival VIP phrasing");
assert(/Complete (?:wake-up call|taxi departure).*Room 36/i.test(timelineText), "W2c. timeline timed actions keep Room 36");

assert(/Revenue follow-up required/i.test(briefingText), "W3. briefing uses revenue summary wording");
assert(/44/.test(briefingText) && /175/.test(briefingText), "W3b. briefing still surfaces Room 44 £175");
assert(!/Collect outstanding Expedia payment before departure/i.test(briefingText), "W3c. briefing does not mirror Expedia recommendation card");
assert(!/Collect outstanding payment before departure\.?$/im.test(briefingText), "W3d. briefing does not mirror generic collect recommendation");
assert(/VIP readiness follow-up/i.test(briefingText), "W3e. briefing VIP is summary-level");

assert(/Complete VIP Room 51 anniversary setup before arrival/i.test(recText), "W9. VIP recommendation is Duty Manager action");
assert(/Follow up the Room 18 heating fault with Maintenance until resolved/i.test(recText), "W9b. heating recommendation keeps room/action/owner");
assert(!/Review VIP requirements/i.test(recText), "W9c. VIP recommendation avoids vague review phrasing");

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
