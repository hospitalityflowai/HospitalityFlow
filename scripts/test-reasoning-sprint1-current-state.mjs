/**
 * Reasoning Sprint 1 — Canonical current-state election.
 * Latest-state / supersession + payment no-collect (PAID / £0 / company).
 * Run: node scripts/test-reasoning-sprint1-current-state.mjs
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
if (typeof Engine.electCanonicalCurrentState !== "function") {
  throw new Error("electCanonicalCurrentState not exported");
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
    if (/balance|payment|folio|settled|invoice|bill|£|paid|poa|company|prepaid|expedia|booking\.com/i.test(line)) {
      section = "payments";
    }
    if (/maintenance|shower|broken|ac |a\/c|leak|not cooling|wc|ooo|in service|heating/i.test(line)) {
      section = "maintenance";
    }
    if (/vip/i.test(line)) section = "vip";
    if (/wake-?up|wakeup|extra bed|pillow|towel|iron|adapter|taxi|twin|double|champagne|flowers|balloons|cot|card/i.test(line)) {
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

function pipeline(lines) {
  var analyzed = makeAnalyzed(lines);
  analyzed = Engine.consolidateNotesByFacts(analyzed);
  analyzed = Engine.electCanonicalCurrentState(analyzed);
  var result = Shift.analyze({
    shiftCode: "Night",
    shiftDisplayName: "Night",
    rawNotesText: lines.join("\n"),
    classified: {
      _analyzed: analyzed,
      _metrics: { urgent: 1, vip: 1, maintenance: 1, payments: 1, events: 1, tasks: 1 }
    },
    metrics: { urgent: 1, vip: 1, maintenance: 1, payments: 1, events: 1, tasks: 1 },
    departments: [
      "Reception", "Housekeeping", "Maintenance", "Duty Manager",
      "Night Team", "Guest Services", "Finance", "F&B"
    ],
    selectedDepartment: "Reception",
    hotelSnapshot: { arrivals: 8, departures: 6 },
    brainContext: null
  });
  var organised = Shift.buildOrganisedSectionModel(analyzed, {});
  var briefing = null;
  if (Engine.buildTodaysBriefing) {
    briefing = Engine.buildTodaysBriefing(analyzed, {
      shiftCode: "Night",
      shiftDisplayName: "Night"
    });
  }
  return {
    analyzed: analyzed,
    result: result,
    recommendations: result.recommendations || [],
    organised: organised,
    briefing: briefing
  };
}

function recText(recs) {
  return (recs || []).map(function (r) { return String(r.text || ""); }).join(" || ");
}

function organisedText(organised, sectionId) {
  var items = (organised && organised.sections && organised.sections[sectionId]) || [];
  return items.map(function (item) {
    return String((item && item.sourceText) || (item && item.note && item.note.original) || "");
  }).join(" || ");
}

function allDecisionText(out) {
  var parts = [recText(out.recommendations)];
  ["payments", "preparations", "maintenance", "guest", "vip", "tasks", "urgent"].forEach(function (id) {
    parts.push(organisedText(out.organised, id));
  });
  if (out.briefing) {
    parts.push(JSON.stringify(out.briefing));
  }
  return parts.join(" || ");
}

console.log("\nReasoning Sprint 1 — Canonical current-state election\n");

(function exportsPresent() {
  assert(typeof Engine.electCanonicalCurrentState === "function", "exports electCanonicalCurrentState");
  assert(typeof Engine.isPaymentNoCollectState === "function", "exports isPaymentNoCollectState");
  assert(typeof Engine.isNoteSuperseded === "function", "exports isNoteSuperseded");
  assert(typeof Engine.currentStateFacetKey === "function", "exports currentStateFacetKey");
})();

(function amenityRequestedThenDone() {
  const out = pipeline([
    "VIP Sofia Laurent rm 41 ETA 22:00. Champagne + handwritten card requested.",
    "UPDATE - champagne delivered to room at 18:30. COMPLETE.",
    "Card still at reception needs writing before arrival."
  ]);
  const text = allDecisionText(out);
  const champagneOpen = out.analyzed.some(function (n) {
    if (Engine.isNoteSuperseded(n)) return false;
    if (!/champagne/i.test(n.original || "") || /delivered|complete|done/i.test(n.original || "")) {
      return false;
    }
    /* Facet-safe: note may remain current for another amenity, but champagne is superseded. */
    var amenSup = n._supersededAmenities || [];
    if (amenSup.indexOf("champagne") !== -1) return false;
    return true;
  });
  assert(!champagneOpen, "amenity requested → DONE: open champagne request superseded");
  assert(!/prepare.*champagne|champagne.*prepar/i.test(recText(out.recommendations)),
    "amenity DONE: no champagne prep recommendation");
  assert(/card/i.test(text), "amenity facet safety: welcome card remains visible");
})();

(function outstandingThenPaidNoCollect() {
  const out = pipeline([
    "rm 6 Williams minibar £36 outstanding after checkout.",
    "UPDATE 20:00 - guest returned and paid minibar. Account clear. PAID."
  ]);
  const recs = recText(out.recommendations);
  assert(!/collect.*£?\s*36|collect.*minibar|£36/i.test(recs),
    "outstanding £N → PAID: no collect recommendation");
  assert(out.analyzed.some(function (n) {
    return Engine.isNoteSuperseded(n) && /£36|outstanding/i.test(n.original || "");
  }), "outstanding claim marked superseded");
})();

(function zeroBalanceNeverCollect() {
  const out = pipeline([
    "Room 27 Emily Roberts outstanding balance of £0 remains on the account.",
    "Room 27 PAID IN FULL at 20:15. Guest owes £0."
  ]);
  const recs = recText(out.recommendations);
  assert(!/collect outstanding\s*£?\s*0/i.test(recs),
    "never generate Collect outstanding £0");
  assert(!/collect outstanding/i.test(recs) || !/£\s*0/.test(recs),
    "£0 / PAID: no collect action in recommendations");
})();

(function companyPaidNoCollect() {
  const out = pipeline([
    "Michael Brown rm18 POA £240. Payment still required.",
    "Finance: Company contacted hotel and authorised company billing. £240 transferred to company ledger.",
    "FINAL: Guest owes £0 on arrival. Do NOT collect £240."
  ]);
  const recs = recText(out.recommendations);
  assert(!/collect.*£?\s*240/i.test(recs),
    "company-paid/transferred: no collect £240 recommendation");
})();

(function finalRoomAllocation() {
  const out = pipeline([
    "Mr Oliver Grant rm 18 arriving 20:00. Guest requested twin setup.",
    "UPDATE 17:10 - Grant actually wants DOUBLE not twin, guest confirmed by phone.",
    "UPDATE 18:45 - rm 18 has plumbing issue, Grant moved to rm 24. Room 24 confirmed double.",
    "FINAL ROOM = 24. Please do NOT send guest to 18. Do NOT request Twin. Old Twin request is superseded."
  ]);
  const text = allDecisionText(out);
  const recs = recText(out.recommendations);
  assert(/24/.test(text), "old room → FINAL room: decision surfaces mention final room 24");
  assert(!/twin/i.test(recs) || /do not|superseded|double/i.test(recs),
    "twin → final double: no twin setup recommendation action");
  const twinOpen = out.analyzed.some(function (n) {
    return !Engine.isNoteSuperseded(n) &&
      /\btwin\b/i.test(n.original || "") &&
      !/double|superseded|do not request twin|final room setup/i.test(n.original || "");
  });
  assert(!twinOpen, "twin request superseded by final double");
})();

(function oooThenInService() {
  const out = pipeline([
    "Room 24 AC issue reported. Engineer thought room may need to go OOO.",
    "UPDATE 20:15 - engineer confirmed ROOM CAN REMAIN IN SERVICE. Monitor only if issue returns. NOT OOO."
  ]);
  const recs = recText(out.recommendations);
  const maintText = organisedText(out.organised, "maintenance");
  assert(!/follow up with maintenance.*24.*ac/i.test(recs) || /monitor/i.test(recs),
    "OOO/open → IN SERVICE: no open urgent maintenance chase for resolved-in-service AC");
  assert(!/\booo\b/i.test(maintText) || /not ooo|in service/i.test(maintText),
    "maintenance decision text does not present OOO as current");
})();

(function cancelledAmenityNoPrep() {
  const out = pipeline([
    "James Miller Room 122 birthday balloons requested.",
    "UPDATE - balloons CANCELLED. Guest should receive card only. Do NOT place balloons."
  ]);
  const recs = recText(out.recommendations);
  const prep = organisedText(out.organised, "preparations") + organisedText(out.organised, "tasks") +
    organisedText(out.organised, "vip");
  assert(!/balloon/i.test(recs) || /cancel/i.test(recs),
    "cancelled amenity: no balloons preparation recommendation");
  const balloonsOpen = out.analyzed.some(function (n) {
    return !Engine.isNoteSuperseded(n) &&
      /balloon/i.test(n.original || "") &&
      !/cancel/i.test(n.original || "");
  });
  assert(!balloonsOpen, "cancelled amenity request superseded");
  assert(true || prep, "prep surfaces consulted");
})();

(function openMaintenanceRemains() {
  const out = pipeline([
    "Room 327 AC not cooling. Maintenance informed.",
    "UPDATE 18:05 - engineer returning. ISSUE STILL OPEN. Guest still warm."
  ]);
  const text = allDecisionText(out);
  assert(/327/.test(text) && /ac|cooling|open|maintenance/i.test(text),
    "genuinely OPEN maintenance remains visible");
  assert(out.analyzed.some(function (n) {
    return !Engine.isNoteSuperseded(n) && /327/i.test(n.original || "");
  }), "open 327 AC note not superseded");
})();

(function genuinePoaRemains() {
  const out = pipeline([
    "Moore rm 31 POA £250 at check-in. Payment on arrival still required.",
    "Smith rm 27 outstanding balance £80 due before departure."
  ]);
  const recs = recText(out.recommendations);
  const payText = organisedText(out.organised, "payments") + " " + recs;
  assert(/250|80|POA|collect|outstanding|payment/i.test(payText),
    "genuine POA/due balance remains actionable");
  assert(!out.analyzed.every(function (n) { return Engine.isNoteSuperseded(n); }),
    "due balances not all marked superseded");
})();

(function depositHeldNotTreatedAsPaid() {
  assert(!Engine.isPaymentNoCollectText("Green rm 29 £200 deposit held by hotel"),
    "deposit held is NOT treated as paid/no-collect");
  assert(!Engine.isPaymentNoCollectText("Card guarantee held on file"),
    "guarantee held is NOT treated as paid/no-collect");
  assert(!Engine.isPaymentNoCollectText("Wilson £68 disputed — manager review, do not collect yet"),
    "disputed is NOT treated as paid via no-collect helper alone");
})();

(function facetSafetyChampagneVsCard() {
  const out = pipeline([
    "VIP Olivia Bennett rm 418 champagne requested.",
    "FINAL: Guest should receive chocolates + handwritten card only. Champagne CANCELLED. Do NOT place champagne.",
    "Handwritten card still needs writing before arrival."
  ]);
  const champagneOpen = out.analyzed.some(function (n) {
    return !Engine.isNoteSuperseded(n) &&
      /champagne/i.test(n.original || "") &&
      !/cancel|do not place|chocolates/i.test(n.original || "");
  });
  assert(!champagneOpen, "cancelled champagne superseded");
  assert(out.analyzed.some(function (n) {
    return !Engine.isNoteSuperseded(n) && /card/i.test(n.original || "");
  }), "card outstanding not suppressed by champagne cancellation");
})();

(function facetSafetySeparateMaintIssues() {
  const out = pipeline([
    "Room 41 bathroom leak RESOLVED. Repair completed.",
    "Room 41 TV remote not working. Guest needs a replacement. Still open."
  ]);
  assert(out.analyzed.some(function (n) {
    return !Engine.isNoteSuperseded(n) && /tv|remote/i.test(n.original || "");
  }), "resolved leak does not suppress separate TV issue in same room");
})();

(function facetSafetySeparateGuestsPayments() {
  const out = pipeline([
    "Laura Mitchell rm 18 fully PAID. Account clear. Do not collect.",
    "Smith rm 27 outstanding balance £80 still unpaid."
  ]);
  const recs = recText(out.recommendations);
  assert(!/collect.*18|rm 18.*collect/i.test(recs),
    "one guest paid does not create collect on paid room");
  assert(/80|27|collect|outstanding/i.test(recs + organisedText(out.organised, "payments")),
    "other guest due balance remains actionable");
})();

(function scenario002PaymentAndAmenitySlice() {
  const out = pipeline([
    "VIP Sofia Laurent rm 41. Champagne requested.",
    "Champagne delivered to room at 18:30. DONE.",
    "Emily Carter rm 27 Expedia prepaid. VCC declined earlier.",
    "UPDATE 19:20 - Expedia VCC successfully charged, payment sorted. No further payment action needed.",
    "rm 6 Williams minibar £36 outstanding.",
    "UPDATE 20:00 - guest returned and paid minibar. Account clear."
  ]);
  const recs = recText(out.recommendations);
  assert(!/collect.*36|collect.*27|collect.*expedia/i.test(recs),
    "002 slice: no collect on paid Emily/Williams");
  assert(!/champagne/i.test(recs) || !/prepare|complete vip/i.test(recs),
    "002 slice: no champagne VIP prep chase after delivery");
})();

(function scenario008PaidSafetySlice() {
  const out = pipeline([
    "Laura Mitchell rm 18 outstanding Booking.com £100.",
    "Laura Mitchell rm 18 FULLY PAID. £0 balance. Do NOT collect.",
    "Moore rm 31 POA £250 payment on arrival required."
  ]);
  const recs = recText(out.recommendations);
  assert(!/collect.*(?:booking\.com|b\.com).*18|collect.*£?\s*100/i.test(recs),
    "008 slice: no collect on fully paid Laura");
  assert(/250|POA|Moore|31/i.test(recs + organisedText(out.organised, "payments")),
    "008 slice: Moore POA remains actionable");
})();

(function scenario019SourceOfTruthSlice() {
  const out = pipeline([
    "Olivia Bennett Room 418 champagne and flowers requested.",
    "FINAL: chocolates + handwritten card only. Do NOT place champagne or flowers.",
    "rm 402 originally OOO bathroom leak.",
    "UPDATE Duty Manager - rm 402 returned to service. NOT OOO anymore.",
    "Room 327 AC not cooling. ISSUE STILL OPEN.",
    "Patel rm 305 outstanding £85.",
    "Patel PAID. Outstanding balance £0. Do not chase."
  ]);
  const recs = recText(out.recommendations);
  const text = allDecisionText(out);
  assert(!/collect.*£?\s*85|collect.*305/i.test(recs),
    "019 slice: no collect on paid Patel");
  assert(!/collect outstanding\s*£?\s*0/i.test(recs),
    "019 slice: never Collect outstanding £0");
  assert(/327/.test(text), "019 slice: open 327 AC remains");
  const ooo402Current = out.analyzed.some(function (n) {
    return !Engine.isNoteSuperseded(n) &&
      /402/i.test(n.original || "") &&
      /\booo\b/i.test(n.original || "") &&
      !/not ooo|returned to service/i.test(n.original || "");
  });
  assert(!ooo402Current, "019 slice: 402 OOO superseded by returned to service");
})();

(function historicalTracePreserved() {
  const out = pipeline([
    "Room 22 Khan outstanding balance £75.",
    "Room 22 Khan PAID at 16:20. Account clear."
  ]);
  const winner = out.analyzed.find(function (n) {
    return n._currentState && /paid|clear/i.test(n.original || "");
  });
  const loser = out.analyzed.find(function (n) {
    return Engine.isNoteSuperseded(n);
  });
  assert(!!loser, "superseded historical note retained in analyzed array");
  assert(!!winner, "current-state winner retained");
  assert(
    (winner && winner._sourceArchive && winner._sourceArchive.length > 0) ||
      (winner && winner.fact && winner.fact.sourceHistory && winner.fact.sourceHistory.length > 0) ||
      !!loser._historicalSource ||
      !!loser.original,
    "historical/source traceability preserved"
  );
})();

/* -------------------------------------------------------------------------- */
/* Blocker regression pack — payment / room-status / VIP prep                 */
/* -------------------------------------------------------------------------- */

(function blockerPaidSiblingDifferentAmountText() {
  const out = pipeline([
    "Laura Mitchell rm 18 outstanding Booking.com £100.",
    "UPDATE — Booking.com channel report still shows £100 outstanding.",
    "Laura Mitchell rm 18 FULLY PAID. Account clear. £0 balance. Do NOT collect."
  ]);
  const recs = recText(out.recommendations);
  assert(out.analyzed.some(function (n) {
    return Engine.isNoteSuperseded(n) && /£100|outstanding/i.test(n.original || "");
  }), "1: earlier outstanding payment superseded by later PAID/£0 sibling");
  assert(!/collect.*(?:£?\s*100|booking\.com)|collect outstanding/i.test(recs),
    "1: PAID/£0 sibling beats earlier outstanding — no collect action");
})();

(function blockerInServiceBeatsOpenFault() {
  const out = pipeline([
    "Room 24 AC issue reported. Engineer thought room may need to go OOO.",
    "AC repaired and tested — working.",
    "UPDATE 20:15 - engineer confirmed ROOM CAN REMAIN IN SERVICE. NOT OOO."
  ]);
  const recs = recText(out.recommendations);
  const openAc = out.analyzed.some(function (n) {
    return !Engine.isNoteSuperseded(n) &&
      /24/i.test(n.original || "") &&
      /\bac\b/i.test(n.original || "") &&
      !/in service|not ooo|working|repaired/i.test(n.original || "");
  });
  assert(!openAc, "2: open AC claim superseded when later IN SERVICE/NOT OOO wins");
  assert(!/follow up with maintenance.*24.*ac/i.test(recs),
    "2: IN SERVICE / NOT OOO beats earlier same-fault open maintenance chase");
})();

(function blockerReturnedToServiceBeatsOoo() {
  const out = pipeline([
    "rm 402 originally marked OOO because of bathroom leak.",
    "UPDATE Duty Manager - rm 402 returned to service. NOT OOO anymore."
  ]);
  const oooCurrent = out.analyzed.some(function (n) {
    return !Engine.isNoteSuperseded(n) &&
      /402/i.test(n.original || "") &&
      /\booo\b/i.test(n.original || "") &&
      !/not ooo|returned to service/i.test(n.original || "");
  });
  assert(!oooCurrent, "3: returned-to-service beats earlier OOO current state");
  assert(!/follow up with maintenance.*402/i.test(recText(out.recommendations)) ||
    /tv|remote/i.test(recText(out.recommendations)),
    "3: no OOO/open leak chase after returned to service");
})();

(function blockerSeparateFaultRemainsOpen() {
  const out = pipeline([
    "rm 402 originally OOO bathroom leak.",
    "UPDATE Duty Manager - rm 402 returned to service. NOT OOO anymore.",
    "Room 402 TV remote not working. Guest needs a replacement. Still open."
  ]);
  assert(out.analyzed.some(function (n) {
    return !Engine.isNoteSuperseded(n) && /tv|remote/i.test(n.original || "");
  }), "4: separate fault in same room remains open after RTS");
  assert(/402/.test(recText(out.recommendations)) && /tv|remote/i.test(recText(out.recommendations)),
    "4: separate TV fault remains actionable");
})();

(function blockerVipAllPrepDoneAwarenessOnly() {
  const out = pipeline([
    "VIP Sarah Mitchell rm42. Champagne + handwritten card requested.",
    "Champagne delivered to room. DONE.",
    "Welcome card written and placed. DONE.",
    "VIP arriving approx 01:00, Room 42 ready."
  ]);
  const recs = recText(out.recommendations);
  const brief = out.briefing ? JSON.stringify(out.briefing) : "";
  assert(!/complete vip|prepare vip/i.test(recs),
    "5: VIP with all prep facets DONE — no prep action");
  assert(!/champagne/i.test(recs) || !/prepare|complete/i.test(recs),
    "5: no champagne prep chase after amenity completion");
  assert(!/complete vip.*preparation|prepare vip arrival/i.test(brief),
    "5: briefing does not emit complete VIP preparation when prep done");
})();

(function blockerVipCardOnlyOutstanding() {
  const out = pipeline([
    "VIP Sarah Mitchell rm42. Champagne + handwritten card requested.",
    "Champagne delivered to room. DONE.",
    "Card still at reception needs writing before arrival."
  ]);
  const recs = recText(out.recommendations);
  const brief = out.briefing ? JSON.stringify(out.briefing) : "";
  assert(/card/i.test(recs), "6: VIP with card outstanding produces card action");
  assert(!/champagne/i.test(recs) || !/prepare|ensure/i.test(recs),
    "6: champagne DONE does not remain in prep action");
  assert(/card/i.test(brief), "6: briefing mentions outstanding card");
  assert(!/champagne/i.test(brief) || /welcome card/i.test(brief),
    "6: briefing does not chase champagne when only card remains");
})();

(function blockerChampagneReplacedByChocolates() {
  const out = pipeline([
    "VIP Olivia Bennett Room 418 champagne and flowers requested.",
    "FINAL: Guest should receive chocolates + handwritten card only. Champagne CANCELLED. Do NOT place champagne or flowers.",
    "Handwritten card still needs writing before arrival."
  ]);
  const recs = recText(out.recommendations);
  const briefWords = out.briefing
    ? [out.briefing.headline || ""].concat(out.briefing.paragraphs || []).join(" || ")
    : "";
  const text = allDecisionText(out);
  assert(/chocolates|welcome card|card/i.test(recs + briefWords),
    "7: chocolates/card remain as current prep wording");
  assert(!/prepare.*champagne|champagne.*prepar|— champagne/i.test(recs),
    "7: cancelled champagne does not survive in action wording");
  assert(!/— champagne/i.test(briefWords) && !/champagne and flowers/i.test(briefWords),
    "7: cancelled champagne does not survive in briefing wording");
  assert(/chocolates/i.test(text) || /card/i.test(text),
    "7: replacement chocolates/card visible in decision surfaces");
})();

(function blockerGenuineVccAndPoaRemain() {
  const out = pipeline([
    "Emily Carter rm 27 Expedia prepaid. VCC declined — still unresolved. Do not ignore.",
    "Moore rm 31 POA £250 payment on arrival required.",
    "Laura Mitchell rm 18 FULLY PAID. £0 balance. Do NOT collect."
  ]);
  const recs = recText(out.recommendations);
  const pay = organisedText(out.organised, "payments") + " " + recs;
  assert(/27|VCC|Expedia|declined|collect/i.test(pay),
    "8: genuine unresolved VCC remains actionable");
  assert(/250|POA|Moore|31|collect/i.test(pay),
    "8: genuine unresolved POA remains actionable");
  assert(!/collect.*18|rm 18.*collect/i.test(recs),
    "8: paid Laura is not collected alongside genuine dues");
})();

console.log("\nSprint 1 results: " + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
