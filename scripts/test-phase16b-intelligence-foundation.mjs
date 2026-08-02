/**
 * Phase 16B — Thin shared intelligence foundation tests.
 * Run: node scripts/test-phase16b-intelligence-foundation.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function load(name) {
  return fs.readFileSync(path.join(ROOT, name), "utf8");
}

const context = {
  window: {},
  global: {},
  console,
  Date,
  Math,
  Object,
  Array,
  String,
  Number,
  parseFloat,
  parseInt,
  isNaN,
  RegExp,
  JSON
};
context.global = context.window;
vm.createContext(context);
vm.runInContext(load("ai-writing-engine.js"), context);
vm.runInContext(load("hotel-profile-operational.js"), context);
vm.runInContext(load("shift-intelligence-engine.js"), context);

const SI = context.window.ShiftIntelligenceEngine;
const HPO = context.window.HotelProfileOperational;
const AiWritingEngine = context.window.AiWritingEngine;

let passed = 0;
let failed = 0;

function assert(cond, label) {
  if (cond) {
    passed += 1;
    console.log("  PASS  " + label);
  } else {
    failed += 1;
    console.log("  FAIL  " + label);
  }
}

function makeNote(text, section, rooms) {
  const isVip = /vip/i.test(text);
  const fact = AiWritingEngine.extractOperationalFact(text, {
    rooms: rooms || [],
    section: section,
    isVip: isVip
  });
  return {
    original: text,
    section: section || "guest",
    rooms: rooms || [],
    isVip: isVip,
    maintenancePriority: section === "maintenance" ? "High" : null,
    fact: fact
  };
}

function legacyAnalyze(notesText) {
  const lines = notesText.split("\n").filter(Boolean);
  const classified = {
    _analyzed: lines.map(function (line) {
      const rooms = [];
      const roomMatch = line.match(/room\s+(\d+[a-z]?)/i);
      if (roomMatch) rooms.push(roomMatch[1]);
      let section = "general";
      if (/balance|payment|folio/i.test(line)) section = "payments";
      if (/maintenance|shower|broken/i.test(line)) section = "maintenance";
      if (/vip|arrival/i.test(line)) section = "guest";
      return makeNote(line, section, rooms);
    }),
    _metrics: {
      urgent: 0, vip: 1, maintenance: 1, payments: 1, events: 0, tasks: 1,
      display: { urgent: 0, guest: 1, maintenance: 1, payments: 1, events: 0, tasks: 1, general: 0 }
    },
    urgent: [], guest: [], maintenance: [], payments: [], events: [], tasks: [], general: []
  };
  return SI.analyze({
    shiftCode: "PM",
    shiftDisplayName: "PM",
    rawNotesText: notesText,
    classified: classified,
    metrics: classified._metrics,
    departments: ["Reception", "Housekeeping", "Maintenance", "Duty Manager"],
    selectedDepartment: "Reception",
    hotelSnapshot: {},
    brainContext: {
      general: { hotelName: "Test Hotel" },
      hotelKnowledge: { vipRules: "VIP guests receive welcome amenities." }
    }
  });
}

const FIXTURE_NOTES =
  "Room 22 VIP arrival tomorrow - twin setup requested, guest prefers to avoid accessibility rooms\n" +
  "Room 14 open balance on folio - guest checking out AM\n" +
  "Room 305 shower pressure low - maintenance not yet informed\n" +
  "Room 18 late checkout approved until 2pm";

console.log("\n=== Phase 16B Intelligence Foundation ===\n");

console.log("-- Public API preserved --");
assert(SI && typeof SI.analyze === "function", "analyze exists");
assert(typeof SI.generateRecommendations === "function", "generateRecommendations exists");
assert(typeof SI.generateChecklist === "function", "generateChecklist exists");
assert(typeof SI.normalizeChecklistItem === "function", "normalizeChecklistItem exists");
assert(typeof SI.normalizeShiftType === "function", "normalizeShiftType exists");
assert(SI.CHECKLIST_STATUS && SI.CHECKLIST_STATUS.pending === "pending", "CHECKLIST_STATUS preserved");
assert(typeof SI.analyzeFacts === "function", "analyzeFacts added");
assert(typeof context.window.HandoverRecommendationEngine.generate === "function", "legacy HandoverRecommendationEngine exists");

console.log("\n-- Normalisation helpers --");
assert(SI.normalizeRoomNumber("Room 24") === "24", "Room 24 → 24");
assert(SI.normalizeRoomNumber("24") === "24", "24 → 24");
assert(SI.normalizeRoomNumber("room24") === "24", "room24 → 24");
assert(SI.normalizeRoomNumber("  rm 12A ") === "12A", "rm 12A → 12A");
assert(SI.normalizePriority("Critical") === "urgent", "Critical → urgent");
assert(SI.normalizePriority("normal") === "medium", "normal → medium");
assert(SI.normalizePriority("medium") === "medium", "medium → medium");
assert(SI.toRecommendationPriority("medium") === "normal", "medium → recommendation normal");
assert(SI.isResolvedStatus("completed") === true, "completed is resolved");
assert(SI.isResolvedStatus("resolved") === true, "resolved is resolved");
assert(SI.isResolvedStatus("done") === true, "done is resolved");
assert(SI.isResolvedStatus("open") === false, "open is not resolved");
assert(SI.createSourceIdentity("maintenance", "abc") === "maintenance:abc", "source identity stable");
assert(
  SI.buildNeutralFactId("maintenance", "id-1", "24", "maintenance") ===
  SI.buildNeutralFactId("maintenance", "id-1", "24", "maintenance"),
  "fact id stable for same inputs"
);

console.log("\n-- Legacy Handover recommendations unchanged --");
const legacy = legacyAnalyze(FIXTURE_NOTES);
const recs = legacy.recommendations || [];
assert(recs.some(function (r) {
  return /room 22/i.test(r.text) && (/twin|accessibility|vip/i.test(r.text));
}), "VIP-specific recommendation retained");
assert(recs.some(function (r) {
  return /room 14/i.test(r.text) && /reception|balance|payment|settle/i.test(r.text);
}), "Payment-specific recommendation retained");
assert(recs.some(function (r) {
  return /room 305|305/i.test(r.text) && /maintenance|shower|pressure|follow up/i.test(r.text);
}), "Maintenance-specific recommendation retained");
assert(legacy.facts && legacy.facts.length === 4, "analyze returns adapted neutral facts");
assert(legacy.facts.every(function (f) { return f.sourceType === "handover"; }), "handover adapter sourceType");

console.log("\n-- Handover adapter fields --");
const sampleNote = makeNote("Room 305 shower pressure low - maintenance not yet informed", "maintenance", ["305"]);
const nf = SI.handoverNoteToNeutralFact(sampleNote, 0, { workspaceId: "ws-1" });
assert(nf.room === "305", "adapter preserves room");
assert(nf.sourceType === "handover", "adapter sourceType handover");
assert(nf.sourceText.indexOf("305") !== -1, "adapter preserves source text");
assert(nf.priority === "high", "High maintenancePriority → high");
assert(nf.isResolved === false, "open maintenance not resolved");
assert(nf.confidence === "high" || nf.confidence === "low", "confidence set");
assert(nf.metadata && nf.metadata.handoverNote, "metadata keeps handover note for round-trip");

console.log("\n-- Legacy input delegates through adapter (round-trip) --");
const fromFacts = SI.analyzeFacts({
  facts: legacy.facts,
  shiftCode: "PM",
  shiftDisplayName: "PM",
  departments: ["Reception", "Housekeeping", "Maintenance", "Duty Manager"],
  selectedDepartment: "Reception",
  hotelSnapshot: {},
  brainContext: {
    general: { hotelName: "Test Hotel" },
    hotelKnowledge: { vipRules: "VIP guests receive welcome amenities." }
  }
});
const textsLegacy = (legacy.recommendations || []).map(function (r) { return r.text; }).sort();
const textsFacts = (fromFacts.recommendations || []).map(function (r) { return r.text; }).sort();
assert(
  textsLegacy.join("||") === textsFacts.join("||"),
  "analyzeFacts(legacy.facts) matches analyze(legacy) recommendation texts"
);

console.log("\n-- Neutral fact input accepted --");
const neutralOnly = SI.analyzeFacts({
  facts: [
    SI.ensureNeutralFact({
      sourceType: "handover",
      sourceId: "n1",
      subjectType: "maintenance",
      room: "88",
      department: "Maintenance",
      status: "open",
      priority: "high",
      sourceText: "Room 88 AC not cooling - maintenance informed",
      detail: "AC not cooling",
      action: "follow_up",
      metadata: {
        handoverNote: {
          original: "Room 88 AC not cooling - maintenance informed",
          rooms: ["88"],
          section: "maintenance",
          isVip: false,
          maintenancePriority: "High",
          fact: AiWritingEngine.extractOperationalFact(
            "Room 88 AC not cooling - maintenance informed",
            { rooms: ["88"], section: "maintenance" }
          )
        }
      }
    })
  ],
  shiftCode: "AM",
  shiftDisplayName: "AM",
  departments: ["Reception", "Maintenance"],
  brainContext: { general: { hotelName: "Test" }, hotelKnowledge: {} }
});
assert(
  (neutralOnly.recommendations || []).some(function (r) { return /88/i.test(r.text); }),
  "neutral fact input yields room-specific recommendation"
);
assert(
  (neutralOnly.recommendations || []).some(function (r) {
    return r.sourceFactIds && r.sourceFactIds.length;
  }),
  "recommendations carry sourceFactIds when available"
);

console.log("\n-- Maintenance adapter --");
const issue = {
  id: "issue-uuid-1",
  workspaceId: "ws-1",
  title: "Leaking tap",
  description: "Basin tap dripping in bathroom",
  roomNumber: "Room 24",
  area: "",
  category: "plumbing",
  priority: "medium",
  status: "open",
  assignedDepartment: "Maintenance",
  dueAt: "2026-07-29T12:00:00.000Z",
  includeInHandover: true,
  createdAt: "2026-07-28T08:00:00.000Z",
  updatedAt: "2026-07-28T09:00:00.000Z"
};
const mFact = SI.maintenanceIssueToNeutralFact(issue);
assert(mFact.sourceType === "maintenance", "maintenance sourceType");
assert(mFact.sourceId === "issue-uuid-1", "issue.id → sourceId");
assert(mFact.room === "24", "room_number normalised");
assert(mFact.department === "Maintenance", "assigned department mapped");
assert(mFact.category === "plumbing", "category mapped");
assert(mFact.priority === "medium", "priority medium preserved");
assert(mFact.includeInHandover === true, "includeInHandover mapped");
assert(mFact.isResolved === false, "open issue not resolved");
assert(mFact.dueAt.indexOf("2026-07-29") !== -1, "dueAt mapped");
assert(/Leaking tap/i.test(mFact.detail), "title in detail");
assert(mFact.metadata && mFact.metadata.issue && mFact.metadata.issue.id === "issue-uuid-1", "metadata keeps issue");

const completed = SI.maintenanceIssueToNeutralFact({
  id: "issue-2",
  roomNumber: "10",
  title: "Fixed",
  status: "completed",
  priority: "low",
  completedAt: "2026-07-28T10:00:00.000Z",
  includeInHandover: false
});
assert(completed.isResolved === true, "completed → isResolved");

console.log("\n-- Hotel Brain context extraction --");
assert(typeof HPO.buildHotelBrainContext === "function", "buildHotelBrainContext exported");
const profile = {
  general: { hotelName: "Audit Hotel", hotelType: "Boutique", totalRooms: "40", brandVoice: "Warm" },
  hotelKnowledge: {
    vipRules: "VIP welcome drink",
    hotelStandards: "Quiet after 11pm",
    aiInstructions: "Be concise"
  },
  aiPrefs: { tone: "professional", detail: "standard", language: "British English", dateFormat: "DD/MM/YYYY (24-hour)", instructions: "Use hotel terms" },
  departments: [{ name: "Reception", head: "Alex" }],
  rooms: [{ type: "Deluxe", code: "DLX", count: "10" }],
  terminology: [{ term: "EOW", definition: "Early open window" }],
  operationalKnowledge: {
    knowledgeEntries: [],
    staffingContext: "Night manager on site",
    handoverSources: [{ name: "Opera", description: "PMS", active: true }]
  },
  guestServices: { wakeUpCalls: "Via Opera" },
  supplies: [],
  otaChannels: [],
  policies: {},
  policiesStructured: null,
  roomFacilities: [],
  terminology: [{ term: "EOW", definition: "Early open window" }]
};
const ctx = HPO.buildHotelBrainContext(profile);
assert(ctx && ctx.general.hotelName === "Audit Hotel", "context general preserved");
assert(ctx.hotelKnowledge.vipRules === "VIP welcome drink", "vip rules preserved");
assert(/Audit Hotel/.test(ctx.internalInstructions), "internal instructions include hotel");
assert(/VIP welcome drink/.test(ctx.internalInstructions), "internal instructions include VIP rules");
assert(/Source of truth: Operational Knowledge/.test(ctx.internalInstructions), "source-of-truth line preserved");
assert(ctx.combinedInstructions.indexOf("Use hotel terms") !== -1, "combined instructions include aiPrefs");
assert(Array.isArray(ctx.policyLines), "policyLines present");
assert(Array.isArray(ctx.roomTypeSummary) && ctx.roomTypeSummary.length === 1, "room types summarised");
assert(HPO.buildHotelBrainContext(null) === null, "null profile → null context");

console.log("\n-- Guardrails: no DB / engine stays storage-free --");
const engineSrc = load("shift-intelligence-engine.js");
const maintHtml = load("maintenance.html");
assert(!/from\s+['\"]@supabase|createClient\(|\.from\(\s*['\"]maintenance/i.test(engineSrc), "engine has no database access");
assert(!/ShiftIntelligenceEngine|analyzeFacts|factsFromMaintenance/i.test(maintHtml), "maintenance.html does not host intelligence engine");

const migrationsDir = path.join(ROOT, "supabase", "migrations");
const migrationFiles = fs.readdirSync(migrationsDir).filter(function (f) { return f.endsWith(".sql"); });
/* Guardrail: no durable shared operational-fact table. phase16_operator_* product
   migrations are unrelated and must not trip this check. */
assert(!migrationFiles.some(function (f) {
  return /shared_fact|operational_fact|intelligence_fact/i.test(f);
}), "no shared-fact / operational-fact migration added");

console.log("\n=== Results: " + passed + " passed, " + failed + " failed ===\n");
if (failed) process.exit(1);
