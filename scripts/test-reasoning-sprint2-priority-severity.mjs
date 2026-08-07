/**
 * Reasoning Sprint 2 — Priority / severity accuracy.
 * Shared operational-priority model after Sprint 1 current-state election.
 * Run: node scripts/test-reasoning-sprint2-priority-severity.mjs
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
if (typeof Shift.applyOperationalPriority !== "function") {
  throw new Error("applyOperationalPriority not exported");
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

function makeAnalyzed(lines) {
  return lines.map(function (line) {
    var rooms = Engine.extractRoomNumbers(line);
    var section = "general";
    if (/balance|payment|folio|settled|invoice|bill|£|paid|poa|company|prepaid|expedia|booking\.com|vcc/i.test(line)) {
      section = "payments";
    }
    if (/maintenance|shower|broken|ac |a\/c|leak|not cooling|wc|ooo|in service|heating|smell|electrical|lift|engineer|socket|corridor/i.test(line)) {
      section = "maintenance";
    }
    if (/vip/i.test(line)) section = "vip";
    if (/wake-?up|wakeup|extra bed|pillow|towel|iron|adapter|taxi|twin|double|champagne|flowers|balloons|cot|card|locked\s+out|medical|ambulance|security|rear\s+door|alone\s+until|staffing/i.test(line)) {
      section = "tasks";
    }
    if (/moved to|final room|allocation/i.test(line)) section = "guest";
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

function scoreLine(line) {
  var analyzed = makeAnalyzed([line])[0];
  return Shift.scoreOperationalImpact({ fact: analyzed.fact, note: analyzed, topic: analyzed.section });
}

function bandOf(scored) {
  return (scored.operationalContext && scored.operationalContext.priorityBand) || scored.priorityBand || "";
}

function pipeline(lines) {
  var analyzed = makeAnalyzed(lines);
  analyzed = Engine.consolidateNotesByFacts(analyzed);
  if (typeof Engine.electCanonicalCurrentState === "function") {
    analyzed = Engine.electCanonicalCurrentState(analyzed);
  }
  var entries = analyzed.filter(function (n) {
    return n && !n._superseded && !(n.fact && n.fact.superseded);
  }).map(function (n, i) {
    return { fact: n.fact, note: n, factId: "p-" + i, topic: n.section };
  });
  var ranked = Shift.rankByOperationalImpact(entries);
  var briefing = Shift.buildBriefingModel(entries, { maxBlocks: 5 });
  return { analyzed: analyzed, ranked: ranked, briefing: briefing, entries: entries };
}

function briefingBlob(model) {
  return (model.priorities || []).map(function (p) {
    return [
      p.priorityBand || "",
      p.briefingSlot || "",
      p.actionKind || "",
      JSON.stringify(p.entities || {}),
      (p.priorityReasons || []).join(",")
    ].join(" ");
  }).join(" || ");
}

console.log("\n== Reasoning Sprint 2 — Priority / Severity ==\n");

(function exportsPresent() {
  assert(typeof Shift.applyOperationalPriority === "function", "exports applyOperationalPriority");
  assert(Shift.PRIORITY_BAND && Shift.PRIORITY_BAND.P0 === "P0", "exports PRIORITY_BAND");
  assert(Shift.HAZARD_CLASS && Shift.HAZARD_CLASS.safety === "safety", "exports HAZARD_CLASS");
})();

(function burningSmellBeatsRoutineAc() {
  const smell = scoreLine("Room 35 strong burning smell near electrical socket — not yet inspected");
  const ac = scoreLine("Room 22 AC poor — fan supplied, guest comfortable, engineer tomorrow");
  assert(bandOf(smell) === "P0", "unresolved burning smell is P0");
  assert(bandOf(ac) === "P3" || ac.score >= 60, "mitigated AC is P3/low");
  assert(smell.score < ac.score, "1. burning smell ranks above routine AC");
})();

(function medicalBeatsPaymentAndVip() {
  const medical = scoreLine("Room 33 medical assistance required — guest unwell, first aid given, ambulance pending");
  const payment = scoreLine("Michael Turner Room 31 POA £480 — collect at check-in");
  const vip = scoreLine("VIP Eleanor Grant Room 42 champagne outstanding before arrival");
  assert(bandOf(medical) === "P0", "medical/welfare is P0");
  assert(bandOf(payment) === "P2", "2/3. POA is P2");
  assert(bandOf(vip) === "P2", "3. VIP amenity is P2");
  assert(medical.score < payment.score, "2. medical ranks above payment");
  assert(medical.score < vip.score, "3. medical ranks above VIP prep");
})();

(function securityBeatsRoutineMaint() {
  const security = scoreLine("Rear door insecure — propped open overnight, security risk");
  const maint = scoreLine("Room 12 bedside lamp flickering — bulb replacement scheduled");
  assert(bandOf(security) === "P0", "active security is P0");
  assert(security.score < maint.score, "4. security ranks above routine maintenance");
})();

(function activeWaterBeatsCosmetic() {
  const water = scoreLine("Room 28 active leak from ceiling — water near electrical socket, not isolated");
  const cosmetic = scoreLine("Room 31 small scratch on wardrobe door — cosmetic only, no action tonight");
  assert(bandOf(water) === "P0", "active water/electrical is P0");
  assert(bandOf(cosmetic) === "P3" || cosmetic.score >= 60, "cosmetic is P3");
  assert(water.score < cosmetic.score, "5. active water/electrical ranks above cosmetic");
})();

(function controlledBelowActive() {
  const active = scoreLine("Corridor flooding into electrical sockets — active uncontrolled hazard");
  const controlled = scoreLine(
    "Corridor water/electrical incident — risk controlled, sockets isolated, area blocked, do not restore power until morning manager review"
  );
  assert(bandOf(active) === "P0", "uncontrolled hazard is P0");
  assert(bandOf(controlled) === "P1", "6. controlled serious incident is P1");
  assert(active.score < controlled.score, "6. controlled ranks below active uncontrolled");
  assert(
    (controlled.operationalContext.priorityReasons || []).indexOf("controlled_hazard_obligation") !== -1 ||
      (controlled.reasons || []).indexOf("controlled_hazard_obligation") !== -1,
    "6/18. controlled electrical keeps control obligation reason"
  );
})();

(function liftOosAndLoneStaffing() {
  const lift = scoreLine("Lift 2 out of service until inspection tomorrow — Lift 1 OK, keep OOS");
  const staffing = scoreLine("Night manager alone until 05:00 — Marta only to midnight, coverage risk");
  assert(bandOf(lift) === "P1", "7. Lift OOS is P1");
  assert(bandOf(staffing) === "P1", "8. lone staffing is P1");
  assert(lift.score < 30 && staffing.score < 30, "7/8. shift-critical scores in P1 band");
})();

(function mitigatedAcLow() {
  const ac = scoreLine("Room 41 AC not cooling — fan provided, guest comfortable, engineer tomorrow");
  assert(bandOf(ac) === "P3", "9. mitigated AC + tomorrow = P3");
  assert(ac.score >= 60, "9. mitigated AC score is low urgency");
})();

(function imminentWakeShiftCritical() {
  const wake = scoreLine("Room 6 wake-up 04:45 not set — taxi 05:30 confirmed");
  const cosmetic = scoreLine("Lobby WC dryer slow — cosmetic, no guest impact tonight");
  assert(bandOf(wake) === "P1", "10. imminent unset wake is P1");
  assert(wake.score < cosmetic.score, "10. imminent wake outranks cosmetic");
})();

(function poaAndVipBelowSafety() {
  const smell = scoreLine("Room 35 burning smell near socket — not inspected");
  const poa = scoreLine("Arrival POA £480 outstanding — collect on arrival");
  const vip = scoreLine("VIP champagne amenity still outstanding Room 42");
  assert(bandOf(poa) === "P2", "11. genuine POA remains P2 actionable");
  assert(bandOf(vip) === "P2", "12. VIP amenity remains P2 actionable");
  assert(smell.score < poa.score && smell.score < vip.score, "11/12. safety outranks POA and VIP");
})();

(function resolvedExcluded() {
  const resolved = scoreLine("Room 18 lamp flickering — engineering replaced bulb today. Issue RESOLVED.");
  assert(bandOf(resolved) === "exclude" || resolved.score >= 88, "13. resolved issue excluded / bottom-ranked");
})();

(function briefingSeatsP0BeforeDiversity() {
  const lines = [
    "Room 35 strong burning smell near electrical socket — not yet inspected",
    "Room 28 active leak — water near sockets, not isolated",
    "Room 33 medical assistance — guest unwell",
    "Rear door insecure — propped open",
    "Guest locked out of Room 19 — let them in now",
    "VIP champagne outstanding Room 42",
    "POA £480 Room 31 collect at check-in",
    "Room 22 AC poor fan supplied guest comfortable engineer tomorrow"
  ];
  const result = pipeline(lines);
  const bands = (result.briefing.priorities || []).map(function (p) { return p.priorityBand; });
  const blob = briefingBlob(result.briefing);
  assert(bands.every(function (b) { return b === "P0" || b === "P1"; }),
    "14. briefing seats only P0/P1 while unused high-severity items remain");
  assert(!/champagne|£480|POA|comfortable engineer tomorrow/i.test(blob) || bands.indexOf("P2") === -1,
    "14. P2/P3 diversity does not displace P0 items");
  assert(/burning|leak|medical|door|locked/i.test(blob), "14. immediate issues appear in briefing");
})();

(function deterministicOrdering() {
  const lines = [
    "VIP champagne outstanding Room 42",
    "Room 35 burning smell not inspected",
    "POA £100 Room 10",
    "Room 28 active leak not isolated"
  ];
  const a = pipeline(lines).ranked.map(function (e) {
    return Shift.scoreOperationalImpact(e).score + ":" + bandOf(Shift.scoreOperationalImpact(e));
  });
  const b = pipeline(lines).ranked.map(function (e) {
    return Shift.scoreOperationalImpact(e).score + ":" + bandOf(Shift.scoreOperationalImpact(e));
  });
  assert(a.join("|") === b.join("|"), "15. ranking is deterministic across runs");
  const scores = pipeline(lines).ranked.map(function (e) { return Shift.scoreOperationalImpact(e).score; });
  var ordered = true;
  for (var i = 1; i < scores.length; i += 1) {
    if (scores[i] < scores[i - 1]) ordered = false;
  }
  assert(ordered, "15. scores non-decreasing (band/score order)");
})();

(function noKeywordOnlyFalseEscalation() {
  const cleared = scoreLine(
    "Electrical smell incident — overheating extension lead removed, area safe, no fire/smoke, cupboard remain locked, do not reuse lead"
  );
  assert(bandOf(cleared) !== "P0", "16/17. cleared fire/smell mention is not P0");
  assert(bandOf(cleared) === "P1", "17. cleared smell with controls remains P1 control obligation");
  const panel = scoreLine("Fire panel normal — no alarms");
  assert(bandOf(panel) !== "P0", "16. fire panel normal is not P0");
})();

(function controlledElectricalNotResolvedAway() {
  const controlled = scoreLine(
    "Engineer confirms immediate electrical risk controlled. Sockets isolated. Do not restore power until manager review."
  );
  assert(bandOf(controlled) === "P1", "18. controlled electrical restriction is P1 not exclude");
  assert(bandOf(controlled) !== "exclude", "18. not treated as resolved/no-action");
})();

(function hazardLifecycleNoStaleP0AfterControl() {
  console.log("\n-- Lifecycle: active then controlled (no dual P0+P1) --");
  const lines = [
    "URGENT - rm 35 strong burning smell near corridor outside room.",
    "Reception could smell something electrical near housekeeping cupboard.",
    "UPDATE - housekeeping cupboard isolated and engineering called.",
    "UPDATE - overheating extension lead unplugged and removed.",
    "NO fire / no smoke. Fire panel normal.",
    "Engineer says area safe now BUT cupboard must remain locked and extension lead must NOT be used.",
    "rm 26 bathroom ceiling started leaking around 20:15. Water coming through quite heavily.",
    "UPDATE - leak traced to rm 46 shower above. Water isolated. rm 26 now OOO."
  ];
  const result = pipeline(lines);
  const current = result.analyzed.filter(function (n) {
    return n && !n._superseded && !(n.fact && n.fact.superseded);
  });
  const staleActive = current.filter(function (n) {
    const t = n.original || "";
    return (/burning smell|smell something electrical|started leaking|water coming through/i.test(t) &&
      !/area safe|remain locked|water isolated|cupboard isolated|unplugged/i.test(t));
  });
  assert(staleActive.length === 0, "19. no stale active-only hazard remains current after control");
  const scoredCurrent = current.map(function (n) {
    return {
      band: bandOf(Shift.scoreOperationalImpact({ fact: n.fact, note: n, topic: n.section })),
      text: String(n.original || "").slice(0, 80),
      lifecycle: n.fact && n.fact.hazardLifecycle
    };
  });
  assert(scoredCurrent.some(function (s) {
    return s.band === "P1" && (/remain locked|water isolated|OOO|do not|area safe/i.test(s.text) ||
      s.lifecycle === "controlled");
  }), "19. control obligation remains P1/current");
  assert(!scoredCurrent.some(function (s) { return s.band === "P0" && /burning smell|started leaking/i.test(s.text); }),
    "19. controlled lifecycle winner is not scored as active P0");
})();

/* ---------- Live scenario regression (005 / 010 / 017) ---------- */

function extractScenarioInput(mdPath) {
  const md = fs.readFileSync(mdPath, "utf8");
  const start = md.indexOf("## Original Input");
  const end = md.indexOf("## Expected Current Truth");
  if (start < 0 || end < 0) throw new Error("Cannot parse " + mdPath);
  return md.slice(start, end)
    .split(/\r?\n/)
    .map(function (l) { return l.trim(); })
    .filter(function (l) {
      if (!l) return false;
      if (/^#/.test(l)) return false;
      if (/^---+$/.test(l)) return false;
      if (/^FINAL:/i.test(l)) return false;
      if (/^IMPORTANT\b/i.test(l)) return false;
      if (/^Do NOT\b/i.test(l)) return false;
      if (/^Monitor\b/i.test(l)) return false;
      if (/^COMPLETE\b/i.test(l)) return false;
      if (/^Awareness only/i.test(l)) return false;
      if (/^No action/i.test(l)) return false;
      if (/^Normal arrival/i.test(l)) return false;
      return true;
    });
}

function liveScenario(id, fileName, checks) {
  console.log("\n-- Live scenario " + id + " --");
  const lines = extractScenarioInput(path.join(ROOT, "testing", "pilot-hotel", fileName));
  const result = pipeline(lines);
  const blob = briefingBlob(result.briefing);
  const topBands = (result.briefing.priorities || []).map(function (p) { return p.priorityBand; });
  const rankedText = result.ranked.slice(0, 12).map(function (e) {
    const s = Shift.scoreOperationalImpact(e);
    const src = String((e.note && e.note.original) || (e.fact && e.fact.sourceText) || "");
    return bandOf(s) + ":" + s.score + ":" + src.slice(0, 90);
  }).join("\n    ");
  console.log("  Top ranked:\n    " + rankedText);
  console.log("  Briefing bands: " + topBands.join(", "));
  checks(result, blob, topBands);
}

liveScenario("005", "scenario-005.md", function (result, blob, topBands) {
  const openText = result.ranked.slice(0, 15).map(function (e) {
    return String((e.note && e.note.original) || "");
  }).join(" | ");
  const hasLift = /lift\s*2|lift\s+oos|out of service/i.test(openText + blob);
  const hasStaff = /alone|solo|coverage|until\s*05/i.test(openText + blob);
  const hasControl = /cupboard|do not reuse|isolated|locked|incident|area safe|water isolated/i.test(openText + blob);
  assert(hasLift || hasStaff || hasControl, "005 top attention includes lift/staffing/controls signals");
  assert(!/burning smell|electrical smell/i.test(blob) || topBands[0] !== "P0" ||
    /cupboard|locked|controlled|safe/i.test(blob),
    "005 does not reactivate cleared smell as uncontrolled P0 lead");
  const p2Lead = topBands[0] === "P2" || topBands[0] === "P3";
  assert(!p2Lead, "005 briefing does not lead with P2/P3");
  const staleP0 = result.ranked.filter(function (e) {
    if (e.note && (e.note._superseded || (e.note.fact && e.note.fact.superseded))) return false;
    const s = Shift.scoreOperationalImpact(e);
    const t = String((e.note && e.note.original) || "");
    return bandOf(s) === "P0" &&
      /burning smell|started leaking|smell something electrical|water coming through/i.test(t) &&
      !/area safe|remain locked|water isolated|risk controlled|do not restore/i.test(t);
  });
  assert(staleP0.length === 0, "005 no stale active-hazard P0 after control/clearance election");
  assert(topBands[0] === "P1" || topBands[0] === "P0", "005 briefing leads with P0/P1");
  assert(topBands[0] !== "P0" || !/burning smell/i.test(blob) || /locked|safe|control/i.test(blob),
    "005 briefing lead is not a stale active smell");
});

liveScenario("010", "scenario-010.md", function (result, blob, topBands) {
  const topText = result.ranked.slice(0, 10).map(function (e) {
    return String((e.note && e.note.original) || "");
  }).join(" | ");
  assert(/corridor|socket|do not restore|electrical|ooo|room\s*34|helen|reallocated/i.test(topText + blob),
    "010 tops include corridor controls / OOO / Helen allocation");
  const mitigatedHigh = result.ranked.slice(0, 3).some(function (e) {
    const t = String((e.note && e.note.original) || "");
    const s = Shift.scoreOperationalImpact(e);
    return /cosmetic|guest comfortable|engineer tomorrow|bulb|RESOLVED/i.test(t) && bandOf(s) === "P0";
  });
  assert(!mitigatedHigh, "010 mitigated/tomorrow/cosmetic not falsely P0 in top ranks");
  assert(topBands[0] === "P0" || topBands[0] === "P1", "010 briefing leads with P0/P1");
});

liveScenario("017", "scenario-017.md", function (result, blob, topBands) {
  const topText = result.ranked.slice(0, 15).map(function (e) {
    return String((e.note && e.note.original) || "");
  }).join(" | ");
  const need = [
    [/burn(?:ing)?\s+smell|electrical\s+smell/i, "burning smell"],
    [/active\s+leak|leak/i, "active leak"],
    [/medical|ambulance|first\s+aid|unwell/i, "medical/welfare"],
    [/rear\s+(?:door|staff)|staff\s+entrance|security|not\s+locking|pushed\s+open/i, "rear-door security"],
    [/locked\s+out|let\s+(?:them|guest)\s+in|cannot\s+access/i, "locked-out access"]
  ];
  need.forEach(function (pair) {
    assert(pair[0].test(topText) || pair[0].test(blob), "017 surfaces " + pair[1]);
  });
  const smell = scoreLine("Strong burning smell near electrical socket. Not inspected.");
  const poa = scoreLine("Michael Turner — rm31 — POA £480.");
  const vip = scoreLine("Champagne outstanding before arrival. VIP Eleanor Grant.");
  const ac = scoreLine("Room 41 AC not cooling. Fan supplied. Guest comfortable. Engineer tomorrow.");
  assert(smell.score < poa.score && smell.score < vip.score && smell.score < ac.score,
    "017 safety outranks POA / VIP / mitigated AC");
  const earlyP2 = topBands.slice(0, Math.min(3, topBands.length)).every(function (b) {
    return b === "P2" || b === "P3";
  });
  assert(!earlyP2, "017 first briefing seats are not all P2/P3");
});

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) process.exit(1);
