/**
 * Shift selection + recommendation quality smoke test.
 * Run: node scripts/test-shift-recommendations.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const engineSrc = fs.readFileSync(path.join(__dirname, "..", "shift-intelligence-engine.js"), "utf8");

const context = {
  window: {},
  global: {},
  console: console,
  Date: Date,
  Math: Math,
  Object: Object,
  Array: Array,
  String: String,
  parseFloat: parseFloat,
  isNaN: isNaN
};
context.global = context.window;
vm.createContext(context);
vm.runInContext(engineSrc, context);

var ShiftIntelligenceEngine = context.window.ShiftIntelligenceEngine;

function makeNote(text, section, rooms) {
  return {
    original: text,
    section: section || "guest",
    rooms: rooms || [],
    isVip: /vip/i.test(text),
    maintenancePriority: section === "maintenance" ? "High" : null
  };
}

function analyzeNotes(notes, shiftCode, shiftName) {
  var lines = notes.split("\n").filter(Boolean);
  var classified = {
    _analyzed: lines.map(function (line) {
      var rooms = [];
      var roomMatch = line.match(/room\s+(\d+[a-z]?)/i);
      if (roomMatch) rooms.push(roomMatch[1]);
      var section = "general";
      if (/balance|payment|folio/i.test(line)) section = "payments";
      if (/maintenance|shower|broken/i.test(line)) section = "maintenance";
      if (/vip|arrival/i.test(line)) section = "guest";
      return makeNote(line, section, rooms);
    }),
    _metrics: { urgent: 0, vip: 1, maintenance: 1, payments: 1, events: 0, tasks: 1,
      display: { urgent: 0, guest: 1, maintenance: 1, payments: 1, events: 0, tasks: 1, general: 0 }
    },
    urgent: [], guest: [], maintenance: [], payments: [], events: [], tasks: [], general: []
  };
  return ShiftIntelligenceEngine.analyze({
    shiftCode: shiftCode,
    shiftDisplayName: shiftName,
    rawNotesText: notes,
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

var notes =
  "Room 22 VIP arrival tomorrow - twin setup requested, guest prefers to avoid accessibility rooms\n" +
  "Room 14 open balance on folio - guest checking out AM\n" +
  "Room 305 shower pressure low - maintenance not yet informed\n" +
  "Room 18 late checkout approved until 2pm";

var result = analyzeNotes(notes, "PM", "PM");
var recs = result.recommendations || [];

console.log("\n=== RECOMMENDATION QUALITY TEST ===\n");
recs.forEach(function (rec, i) {
  console.log((i + 1) + ". [" + rec.priority + " / " + rec.department + "] " + rec.text);
});

var checks = [
  { label: "VIP specific", pass: recs.some(function (r) {
    return /room 22/i.test(r.text) && (/twin|accessibility|vip/i.test(r.text));
  })},
  { label: "Payment specific", pass: recs.some(function (r) {
    return /room 14/i.test(r.text) && /reception|balance|payment/i.test(r.text);
  })},
  { label: "Maintenance specific", pass: recs.some(function (r) {
    return /room 305|305/i.test(r.text) && /maintenance|shower|pressure/i.test(r.text);
  })},
  { label: "No generic VIP only", pass: !recs.some(function (r) {
    return /^review vip guest requirements\.?$/i.test(r.text.trim());
  })},
  { label: "No generic collect payment only", pass: !recs.some(function (r) {
    return /^collect outstanding payment before departure/i.test(r.text);
  })}
];

var allPass = true;
console.log("\n--- Checks ---");
checks.forEach(function (c) {
  if (!c.pass) allPass = false;
  console.log((c.pass ? "PASS" : "FAIL") + " " + c.label);
});

console.log("\n=== OVERALL: " + (allPass ? "PASS" : "FAIL") + " ===\n");
process.exit(allPass ? 0 : 1);
