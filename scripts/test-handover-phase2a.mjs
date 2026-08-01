/**
 * Phase 2A — structured facts drive summary, item status, and recommendations.
 * Run: node scripts/test-handover-phase2a.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

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

const Engine = context.window.AiWritingEngine;
const Shift = context.window.ShiftIntelligenceEngine;
if (!Engine || !Shift) throw new Error("Engines failed to load");

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

function makeAnalyzed(lines) {
  return lines.map(function (line) {
    var rooms = Engine.extractRoomNumbers(line);
    var section = "general";
    if (/balance|payment|folio|settled|invoice|bill/i.test(line)) section = "payments";
    if (/maintenance|shower|broken|ac |a\/c|leak/i.test(line)) section = "maintenance";
    if (/vip/i.test(line)) section = "vip";
    if (/late check/i.test(line)) section = "guest";
    if (/wake-?up|wakeup/i.test(line)) section = "tasks";
    if (/extra bed|pillow|towel/i.test(line)) section = "tasks";
    var isVip = /\bvip\b/i.test(line);
    var fact = Engine.extractOperationalFact(line, { rooms: rooms, section: section, isVip: isVip });
    return {
      original: line,
      rooms: rooms,
      section: section,
      isVip: isVip,
      isCarriedOver: false,
      isFollowUp: /follow\s*up/i.test(line),
      maintenancePriority: section === "maintenance" ? "High" : null,
      fact: fact
    };
  });
}

function itemStatus(fact) {
  return Engine.mapFactStatusToItemStatus(fact.status);
}

console.log("\nPhase 2A — status mapping\n");

(function () {
  const settled = Engine.extractOperationalFact("Outstanding balance in Room 12 is settled.");
  assert(settled.status === "done", "settled payment fact.status is done");
  assert(itemStatus(settled) === "done", "settled payment → Completed (done)");

  const late = Engine.extractOperationalFact("Room 18 late checkout approved until 2pm");
  assert(late.status === "confirmed", "late checkout approved → confirmed");
  assert(itemStatus(late) === "confirmed", "late checkout approved → Confirmed item status");

  const wake = Engine.extractOperationalFact("Room 9 wake-up call booked for 06:30");
  assert(wake.status === "confirmed", "wake-up booked → confirmed");
  assert(itemStatus(wake) === "confirmed", "wake-up booked → Confirmed item status");

  const maint = Engine.extractOperationalFact("Room 305 shower pressure low - maintenance not yet informed");
  assert(itemStatus(maint) === "pending" || itemStatus(maint) === "in_progress",
    "maintenance remains Pending/In Progress (not done)");
  assert(maint.status !== "done" && maint.status !== "confirmed", "maintenance not closed");

  const requested = Engine.extractOperationalFact("Room 7 extra bed requested");
  assert(requested.status === "requested", "extra bed requested → requested");
  assert(itemStatus(requested) === "pending", "requested → Pending item status");
})();

console.log("\nPhase 2A — summary from facts\n");

(function () {
  const analyzed = makeAnalyzed([
    "Outstanding balance in Room 12 is settled.",
    "Room 305 shower pressure low - maintenance not yet informed",
    "Room 22 VIP arrival tomorrow - twin setup requested",
    "Package held at reception for Room 4",
    "Room 7 extra bed requested"
  ]);
  const summary = Engine.summarizeHandover({ analyzed: analyzed });
  assert(/completed during the shift/i.test(summary), "summary reports payment completed");
  assert(/payment/i.test(summary), "summary mentions payment in completed acknowledgement");
  assert(!/requires settlement|settle the account|outstanding balance requires/i.test(summary),
    "summary must not contradict settled payment");
  assert(/follow-up items? remain/i.test(summary) || /follow-ups? remain/i.test(summary),
    "summary counts unresolved follow-ups");
})();

console.log("\nPhase 2A — recommendations from facts\n");

(function () {
  const notes = [
    "Outstanding balance in Room 12 is settled.",
    "Room 14 open balance on folio - guest checking out AM",
    "Room 305 shower pressure low - maintenance not yet informed",
    "Room 18 late checkout approved until 2pm",
    "Room 9 wake-up call booked for 06:30",
    "Room 22 VIP arrival tomorrow - twin setup requested, guest prefers to avoid accessibility rooms",
    "Room 7 extra bed requested"
  ];
  const analyzed = makeAnalyzed(notes);
  const result = Shift.analyze({
    shiftCode: "PM",
    shiftDisplayName: "PM",
    rawNotesText: notes.join("\n"),
    classified: {
      _analyzed: analyzed,
      _metrics: { urgent: 0, vip: 1, maintenance: 1, payments: 1, events: 0, tasks: 1 }
    },
    metrics: { urgent: 0, vip: 1, maintenance: 1, payments: 1, events: 0, tasks: 1 },
    departments: ["Reception", "Housekeeping", "Maintenance", "Duty Manager"],
    selectedDepartment: "Reception",
    hotelSnapshot: {},
    brainContext: null
  });
  const recs = result.recommendations || [];
  const recText = recs.map(function (r) { return r.text; }).join(" | ");

  assert(!/Room 12/i.test(recText) || !/settle|outstanding balance/i.test(recText),
    "recommendation omitted for completed payment (Room 12)");
  assert(!recs.some(function (r) {
    return /settle/i.test(r.text) && /Room 12/i.test(r.text);
  }), "no settle recommendation for Room 12 settled");

  assert(recs.some(function (r) {
    return /Room 14/i.test(r.text) && /balance|settle/i.test(r.text);
  }), "open balance Room 14 still gets payment recommendation");

  assert(recs.some(function (r) {
    return /305/i.test(r.text) && /maintenance|inspect|shower|pressure|fault/i.test(r.text);
  }), "maintenance remains actionable Pending recommendation");

  assert(recs.some(function (r) {
    return /305/i.test(r.text) && /—|because|remains open|guest-impacting/i.test(r.text);
  }), "maintenance recommendation explains why follow-up is needed");

  assert(!recs.some(function (r) {
    return /late check/i.test(r.text) && /Room 18/i.test(r.text);
  }), "confirmed late checkout does not get chase recommendation");

  assert(!recs.some(function (r) {
    return /wake-?up/i.test(r.text) && /Room 9/i.test(r.text);
  }), "confirmed wake-up does not get chase recommendation");

  assert(recs.some(function (r) {
    return /Room 22/i.test(r.text) && /vip/i.test(r.text);
  }), "VIP recommendation uses room from facts");

  assert(!recs.some(function (r) {
    return /^review vip notes\.?$/i.test(String(r.text).trim());
  }), "no generic Review VIP notes recommendation");

  assert(!recs.some(function (r) {
    return /arrange the guest request/i.test(r.text) || /as recorded/i.test(r.text);
  }), "no vague arrange-as-recorded recommendations");

  assert(recs.some(function (r) {
    return /Room 7/i.test(r.text) && /extra bed/i.test(r.text);
  }), "guest request recommendation names the item");
})();

console.log("\nPhase 2A — no contradiction across surfaces\n");

(function () {
  const line = "Outstanding balance in Room 12 has been settled.";
  const analyzed = makeAnalyzed([line]);
  const summary = Engine.summarizeHandover({ analyzed: analyzed });
  const status = itemStatus(analyzed[0].fact);
  const recs = Shift.generateRecommendations({
    shiftCode: "AM",
    rawNotesText: line,
    classified: { _analyzed: analyzed },
    departments: ["Reception"],
    selectedDepartment: "Reception"
  });

  assert(status === "done", "section status Completed for settled payment");
  assert(/completed/i.test(summary), "summary acknowledges completion");
  assert(!/requires settlement|please settle|settle outstanding/i.test(summary),
    "summary does not ask to settle completed payment");
  assert(!recs.some(function (r) { return /settle|outstanding/i.test(r.text); }),
    "recommendations do not chase completed payment");
})();

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
