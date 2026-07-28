/**
 * Phase M4 — Maintenance → AI Shift Handover integration tests.
 * Run: node scripts/test-maintenance-handover-m4.mjs
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
  JSON,
  Promise
};
context.global = context.window;
vm.createContext(context);
vm.runInContext(load("ai-writing-engine.js"), context);
vm.runInContext(load("hotel-profile-operational.js"), context);
vm.runInContext(load("shift-intelligence-engine.js"), context);

const SI = context.window.ShiftIntelligenceEngine;
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

function makeIssue(overrides) {
  return Object.assign({
    id: "issue-1",
    workspaceId: "ws-1",
    title: "Shower pressure low",
    description: "Guest bathroom shower pressure low",
    roomNumber: "305",
    area: "",
    category: "plumbing",
    priority: "high",
    status: "open",
    assignedDepartment: "Maintenance",
    dueAt: null,
    includeInHandover: true,
    createdAt: "2026-07-28T08:00:00.000Z",
    updatedAt: "2026-07-28T09:00:00.000Z"
  }, overrides || {});
}

function makeHandoverNote(text, section, rooms) {
  const fact = AiWritingEngine.extractOperationalFact(text, {
    rooms: rooms || [],
    section: section,
    isVip: /vip/i.test(text)
  });
  return {
    original: text,
    section: section || "maintenance",
    rooms: rooms || [],
    isVip: /vip/i.test(text),
    maintenancePriority: section === "maintenance" ? "High" : null,
    fact: fact
  };
}

console.log("\n=== Phase M4 Maintenance → Handover ===\n");

console.log("-- Filter include_in_handover + unresolved --");
const filtered = SI.filterMaintenanceIssuesForHandover([
  makeIssue({ id: "a", includeInHandover: true, status: "open" }),
  makeIssue({ id: "b", includeInHandover: true, status: "in_progress" }),
  makeIssue({ id: "c", includeInHandover: true, status: "completed", completedAt: "2026-07-28T10:00:00.000Z" }),
  makeIssue({ id: "d", includeInHandover: false, status: "open" }),
  makeIssue({ id: "e", include_in_handover: true, status: "waiting_parts" })
]);
assert(filtered.map(function (i) { return i.id; }).sort().join(",") === "a,b,e", "only include_in_handover && not completed");
assert(!filtered.some(function (i) { return i.status === "completed"; }), "completed issues excluded");
assert(!filtered.some(function (i) { return i.id === "d"; }), "include_in_handover=false excluded");

console.log("\n-- Import converts via factsFromMaintenanceIssues --");
const importFacts = SI.factsFromMaintenanceIssues(filtered);
assert(importFacts.length === 3, "factsFromMaintenanceIssues used for eligible issues");
assert(importFacts.every(function (f) { return f.sourceType === "maintenance"; }), "sourceType maintenance");
assert(importFacts.some(function (f) { return f.room === "305" && f.sourceId === "a"; }), "include_in_handover=true imports room/id");

console.log("\n-- Duplicate prevention --");
const manualNote = makeHandoverNote(
  "Room 305 shower pressure low - maintenance not yet informed",
  "maintenance",
  ["305"]
);
const handoverFacts = SI.factsFromHandoverAnalyzedNotes([manualNote], {});
const maintDup = SI.factsFromMaintenanceIssues([
  makeIssue({ id: "dup-1", roomNumber: "305", title: "Shower pressure low", description: "shower pressure low" })
]);
const deduped = SI.dedupeMaintenanceFactsAgainstHandover(maintDup, handoverFacts);
assert(deduped.length === 0, "duplicate room+topic maintenance fact suppressed");

const otherRoom = SI.factsFromMaintenanceIssues([
  makeIssue({ id: "other-1", roomNumber: "88", title: "AC not cooling", description: "air conditioning not cooling" })
]);
const kept = SI.dedupeMaintenanceFactsAgainstHandover(otherRoom, handoverFacts);
assert(kept.length === 1 && kept[0].room === "88", "different room still imported");

console.log("\n-- Mixed manual + imported facts → recommendations --");
const mixedFacts = handoverFacts.concat(kept);
const mixedResult = SI.analyzeFacts({
  facts: mixedFacts,
  shiftCode: "PM",
  shiftDisplayName: "PM",
  departments: ["Reception", "Maintenance", "Housekeeping"],
  selectedDepartment: "Reception",
  brainContext: { general: { hotelName: "Test" }, hotelKnowledge: {} },
  hotelSnapshot: {}
});
const mixedRecs = mixedResult.recommendations || [];
assert(mixedRecs.length > 0, "recommendations still generated for mixed facts");
assert(mixedRecs.some(function (r) { return /305/i.test(r.text); }), "manual Room 305 still recommended");
assert(mixedFacts.some(function (f) { return f.room === "88" && f.sourceType === "maintenance"; }), "imported Room 88 fact present in merged set");
assert(
  mixedRecs.some(function (r) { return r.sourceFactIds && r.sourceFactIds.length; }),
  "traceability sourceFactIds preserved"
);

const importedOnly = SI.analyzeFacts({
  facts: kept,
  shiftCode: "PM",
  shiftDisplayName: "PM",
  departments: ["Reception", "Maintenance"],
  brainContext: { general: { hotelName: "Test" }, hotelKnowledge: {} },
  hotelSnapshot: {}
});
assert(
  (importedOnly.recommendations || []).some(function (r) { return /88/i.test(r.text); }),
  "imported-only maintenance fact yields Room 88 recommendation"
);

console.log("\n-- Legacy handover still works without Maintenance --");
const legacyNotes = [
  makeHandoverNote("Room 14 open balance on folio - guest checking out AM", "payments", ["14"]),
  makeHandoverNote("Room 22 VIP arrival tomorrow", "guest", ["22"])
];
const legacy = SI.analyze({
  shiftCode: "PM",
  shiftDisplayName: "PM",
  rawNotesText: legacyNotes.map(function (n) { return n.original; }).join("\n"),
  classified: { _analyzed: legacyNotes, _metrics: {} },
  departments: ["Reception", "Maintenance"],
  brainContext: { general: { hotelName: "Test" }, hotelKnowledge: {} },
  hotelSnapshot: {}
});
assert((legacy.recommendations || []).length > 0, "legacy analyze path works without maintenance facts");
assert(
  (legacy.recommendations || []).some(function (r) { return /14/i.test(r.text) && /balance|settle|payment/i.test(r.text); }),
  "legacy payment recommendation retained"
);

console.log("\n-- Handover page wiring (static) --");
const handoverHtml = load("handover.html");
assert(/maintenance-store\.js/.test(handoverHtml), "handover loads maintenance-store.js");
assert(/integrateMaintenanceIssues/.test(handoverHtml), "integrateMaintenanceIssues present");
assert(/factsFromMaintenanceIssues/.test(handoverHtml), "uses factsFromMaintenanceIssues");
assert(/analyzeFacts/.test(handoverHtml), "calls analyzeFacts when maintenance facts present");
assert(/Imported from Maintenance/.test(handoverHtml), "import badge present");
assert(/loadMaintenanceIssuesForHandover/.test(handoverHtml), "loads maintenance issues on generate");
assert(!/recommendationFromMaintenance|maintenanceSpecificRule/.test(handoverHtml), "no Maintenance-specific recommendation rules in page");

console.log("\n-- No schema / migration changes --");
const migrations = fs.readdirSync(path.join(ROOT, "supabase", "migrations"));
assert(!migrations.some(function (f) { return /m4|phase16.*fact|shared_fact/i.test(f); }), "no M4/shared-fact migration added");
assert(!/CREATE TABLE.*operational_fact|shared_facts/i.test(load("supabase/migrations/phase15_maintenance.sql")), "phase15 unchanged regarding shared facts");

console.log("\n=== Results: " + passed + " passed, " + failed + " failed ===\n");
if (failed) process.exit(1);
