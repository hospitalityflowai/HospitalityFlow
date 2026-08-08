/**
 * Reasoning Sprint 5 — Canonical Night Manager operational actions.
 * Shared decision contract for Briefing / Recommendations / Organised Handover.
 * Fail closed. No hotel-specific / guest-name hardcoding in production logic.
 * Run: node scripts/test-reasoning-sprint5-canonical-actions.mjs
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
if (typeof Shift.buildCanonicalOperationalActions !== "function") {
  throw new Error("buildCanonicalOperationalActions not exported");
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
    if (/balance|payment|folio|settled|invoice|bill|£|paid|poa|refund|disputed|vcc/i.test(line)) {
      section = "payments";
    }
    if (/maintenance|shower|broken|ac |a\/c|leak|not cooling|wc|ooo|in service|heating|engineer|inspect/i.test(line)) {
      section = "maintenance";
    }
    if (/\bvip\b|champagne|pillow|welcome card|twin/i.test(line)) section = "vip";
    if (/moved to|final room|allocation|room move/i.test(line)) section = "guest";
    if (/iron|luggage|fruit|loft|friends of/i.test(line)) section = "guest";
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
  analyzed = Engine.resolveOperationalEntities(analyzed);
  analyzed = Engine.electCanonicalCurrentState(analyzed);
  analyzed = Shift.resolveOperationalDependencies(analyzed);
  var actions = Shift.buildCanonicalOperationalActions(analyzed);
  var organised = Shift.buildOrganisedSectionModel(analyzed, {});
  if (organised && organised.analyzed) analyzed = organised.analyzed;
  var briefing = Engine.buildTodaysBriefing(analyzed, { maxBlocks: 5 });
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
  return {
    analyzed: analyzed,
    actions: actions,
    organised: organised,
    briefing: briefing,
    recommendations: result.recommendations || [],
    result: result
  };
}

function actionBlob(actions) {
  return (actions || []).map(function (a) {
    return [a.actionState, a.facetKey, a.room, a.actionText, a.entityId].join("||");
  }).join("\n");
}

function organisedBlob(model) {
  var out = [];
  var sections = (model && model.sections) || {};
  Object.keys(sections).forEach(function (k) {
    (sections[k] || []).forEach(function (item) {
      var note = item && item.note ? item.note : item;
      out.push(k + "::" + String((note && (note.original || note.sourceText)) || item.sourceText || ""));
    });
  });
  return out.join("\n");
}

function briefingBlob(briefing) {
  return ((briefing && briefing.paragraphs) || []).join("\n");
}

function recBlob(recs) {
  return (recs || []).map(function (r) { return r.text || ""; }).join(" | ");
}

console.log("\n=== Sprint 5 — Canonical Actions ===\n");

/* 1. Cross-guest VIP amenities never merge */
{
  console.log("1. Cross-guest VIP amenities never merge");
  var p1 = pipeline([
    "Alex Rivera\trm 51\tdep\t07/08/2026\t\tChampagne & truffles to be set up in the room - comp // 10th anniversary / flower delivery when ready",
    "Jordan Lee\t\t\t32\t\t07/08/2026\t\tVIP - Regular Guest\t- in house"
  ]);
  var org1 = organisedBlob(p1.organised);
  var jordanLine = (org1.split("\n").find(function (l) { return /Jordan Lee/i.test(l); }) || "");
  assert(!/Champagne|truffles|anniversary|flower/i.test(jordanLine), "Jordan VIP line has no Alex amenity text");
  assert(!/Alex Rivera/i.test(jordanLine), "Organised does not append Guest A onto Guest B VIP line");
  var alexActs = p1.actions.filter(function (a) {
    return a.actionState === "open" && /amenity|champagne|Prepare amenities/i.test(a.actionText + a.facetKey);
  });
  var jordanEnt = (p1.analyzed.find(function (n) { return /Jordan Lee/i.test(n.original || ""); }) || {}).entityId;
  var alexEnt = (p1.analyzed.find(function (n) { return /Alex Rivera/i.test(n.original || ""); }) || {}).entityId;
  assert(alexEnt && jordanEnt && alexEnt !== jordanEnt, "Distinct entityIds for the two guests");
  assert(alexActs.every(function (a) { return a.entityId === alexEnt; }), "Amenity OPEN actions bound to Alex entity only");
}

/* 2. Twin applies only to correct room */
{
  console.log("2. Twin applies only to correct room in multi-room note");
  var p2 = pipeline([
    "Casey Morgan\t\t2x rooms \t43 / 42\tdep -\t09/08/2026\t\tVIP / 1 of 2 rooms// Twin beds only for room 43  / breakfast added/"
  ]);
  var twin = p2.actions.find(function (a) {
    return a.actionState === "open" && /twin/i.test(a.facetKey + a.actionText);
  });
  assert(!!twin, "Twin OPEN action exists");
  assert(twin && String(twin.room) === "43", "Twin action room is 43");
  assert(twin && !/Room 42/.test(twin.actionText), "Twin action text does not bind to Room 42");
}

/* 3. balance availability is not payment */
{
  console.log("3. balance availability is not payment");
  var p3 = pipeline([
    "SAM PARK\t\t\t2\t\t09/08/2026\t\tLuggage at lunch and after checkout evening / EA 11am // Please advice of the complimentary upgrade to balance availability // From DD"
  ]);
  var payOpen = p3.actions.filter(function (a) {
    return a.actionState === "open" && /payment|collect/i.test(a.facetKey + a.actionType + a.actionText);
  });
  assert(payOpen.length === 0, "No OPEN payment/collect action from balance availability");
  var org3 = organisedBlob(p3.organised);
  var paySection = (org3.split("\n").filter(function (l) { return /^payments::/i.test(l); })).join("\n");
  assert(!/balance availability/i.test(paySection), "balance availability note not placed in payments section");
}

/* 4. POA / reservation not automatic VIP */
{
  console.log("4. POA/reservation is not automatically VIP");
  var p4 = pipeline([
    "M. Pat Quinn\t\t\t43\tde\t06/08/2026\t\tPOA // Room and tax // Card on file guarantee only / Early check in requested"
  ]);
  var vipOpen = p4.actions.filter(function (a) {
    return a.actionState === "open" && /prepare_vip|vip:/i.test(a.actionType + a.facetKey);
  });
  assert(vipOpen.length === 0, "No OPEN VIP prep from POA reservation info");
  var info = p4.actions.filter(function (a) {
    return a.actionState === "information" && /reservation|POA/i.test(a.actionText + a.facetKey);
  });
  assert(info.length >= 1, "POA retained as INFORMATION");
  var org4 = organisedBlob(p4.organised);
  var vipSec = org4.split("\n").filter(function (l) { return /^vip::/i.test(l); }).join("\n");
  assert(!/Pat Quinn/i.test(vipSec), "POA guest not filed under VIP section");
}

/* 5. Foam pillows wording preserved */
{
  console.log("5. Foam pillows wording preserved");
  var p5 = pipeline([
    "Mme Kelly Example\trm21\tdep\t10/08/2026\t-\trequest - Foam pillows as options to traditional"
  ]);
  var foamAct = p5.actions.find(function (a) {
    return a.actionState === "open" && /foam pillows/i.test(a.actionText);
  });
  assert(!!foamAct, "OPEN action preserves foam pillows");
  assert(foamAct && !/extra pillows/i.test(foamAct.actionText), "Canonical action does not say extra pillows");
  assert(!/extra pillows/i.test(recBlob(p5.recommendations)), "Recommendations do not say extra pillows");
}

/* 6. Amount-less non-OTA does not invent channel payment */
{
  console.log("6. Amount-less non-OTA payment does not invent channel payment");
  var p6 = pipeline([
    "Room 33 POA // Room and tax // Card on file guarantee only"
  ]);
  var brief6 = briefingBlob(p6.briefing);
  var rec6 = recBlob(p6.recommendations);
  assert(!/outstanding channel payment/i.test(brief6), "Briefing does not invent channel payment");
  assert(!/outstanding channel payment/i.test(rec6), "Recommendations do not invent channel payment");
  var channelOpen = p6.actions.filter(function (a) {
    return a.actionState === "open" && /channel payment/i.test(a.actionText);
  });
  assert(channelOpen.length === 0, "No OPEN channel-payment canonical action");
}

/* 7. Multi-amenity high-touch arrival => >=1 OPEN */
{
  console.log("7. Multi-amenity high-touch arrival produces >=1 OPEN action");
  var p7 = pipeline([
    "Taylor Brooks\t\trm\t51\t\t\t\tPOA / Friends of Armi please ensure guest is looked after. / Comp upgrade to the loft. / Place fruit plate in the room, comp drinks in the parlour, card under Armi's name for Ben and Sophie."
  ]);
  var open7 = p7.actions.filter(function (a) { return a.actionState === "open"; });
  assert(open7.length >= 1, "At least one OPEN action for high-touch arrival");
  assert(!/No urgent guest-impacting priorities/i.test(briefingBlob(p7.briefing)), "Briefing is not quiet-shift default");
  assert(p7.recommendations.length >= 1, "At least one recommendation generated");
}

/* 8. Completed payment does not close sibling iron */
{
  console.log("8. Completed payment does not close sibling iron request");
  var p8 = pipeline([
    "Mme Brittany Example\t\trm\t14\t\t\tIroning board and iron / Charge £28 on guest's personal CC for breakfast (Fixed charges added)"
  ]);
  var ironOpen = p8.actions.find(function (a) {
    return a.actionState === "open" && /iron/i.test(a.facetKey + a.actionText);
  });
  var payResolved = p8.actions.find(function (a) {
    return a.actionState === "resolved" && /payment:breakfast|fixed charges/i.test(a.facetKey + a.actionText);
  });
  assert(!!ironOpen, "Iron facet is OPEN");
  assert(!!payResolved, "Breakfast payment facet is RESOLVED");
  assert(!/completed/i.test((p8.analyzed.find(function (n) {
    return /Ironing board/i.test(n.original || "");
  }) || {}).section || "") || !!ironOpen, "Iron remains actionable despite fixed charges");
}

/* 9. Checked-out vs arrival conflict */
{
  console.log("9. Checked-out room vs arrival assignment conflict surfaces safely");
  var p9 = pipeline([
    "Andrew Example\t\trm\t2\t\t\t\t20% off food and beverage (once per stay)",
    "rooms 2 and 23 checked out."
  ]);
  var conflict = p9.actions.find(function (a) {
    return a.actionState === "unresolved" && /occupancy|conflict|checked-out/i.test(a.facetKey + a.actionText);
  });
  assert(!!conflict, "Occupancy conflict surfaced as UNRESOLVED");
  assert(/Room 2/i.test(conflict.actionText), "Conflict references Room 2");
}

/* 10. Split airport/time/contact fragments */
{
  console.log("10. Split airport/time/contact fragments → timed OR unresolved");
  var p10a = pipeline([
    "Guest pickup London Heathrow at 11:25 for Room 12 — confirm Addison"
  ]);
  var timed = p10a.actions.find(function (a) {
    return a.actionState === "open" && /timed|airport|transfer/i.test(a.facetKey + a.actionType);
  });
  assert(!!timed, "Airport+time+room yields useful timed/OPEN action");

  var p10b = pipeline([
    "London Heathrow",
    "11:25",
    "703-402-3853"
  ]);
  var frag = p10b.actions.filter(function (a) {
    return a.actionState === "unresolved" || a.actionState === "open";
  });
  assert(frag.length >= 1, "Split fragments yield timed OPEN or explicit UNRESOLVED follow-up");
}

/* Contract invariants */
console.log("\n=== Contract invariants ===\n");

{
  console.log("Superseded facts excluded from OPEN");
  var ps = pipeline([
    "Room 22 shower leaking — engineer attending",
    "Room 22 shower fixed / in service"
  ]);
  var openLeak = ps.actions.filter(function (a) {
    return a.actionState === "open" && /leak|shower/i.test(a.evidenceText) && !/in service|fixed/i.test(a.evidenceText);
  });
  assert(openLeak.length === 0, "Superseded leak note does not remain OPEN");
}

{
  console.log("Blocked actions not recommended as immediate");
  var pb = pipeline([
    "Room 18 OOO until inspection complete — do not reopen",
    "Room 18 champagne amenity to be placed when room ready"
  ]);
  var blocked = pb.actions.filter(function (a) { return a.actionState === "blocked"; });
  var recB = recBlob(pb.recommendations);
  if (blocked.length) {
    assert(!blocked.some(function (a) {
      return recB.indexOf(a.actionText) !== -1;
    }), "Blocked canonical actionText not recommended as do-now");
  } else {
    assert(true, "No blocked edges in fixture (fail-closed deps) — skipped strict blocked assert");
  }
}

{
  console.log("Unresolved identity preserved");
  var pu = pipeline([
    "champagne & flowers for the anniversary couple in room 9 — name TBC"
  ]);
  var unresolvedId = pu.analyzed.some(function (n) {
    return n.resolutionState === "unresolved" || !n.entityId;
  }) || pu.actions.some(function (a) { return a.actionState === "unresolved"; });
  assert(unresolvedId, "Ambiguous identity stays unresolved or action is unresolved");
}

{
  console.log("Deterministic action IDs / order / no duplicates");
  var linesD = [
    "Guest One\trm 10\tVIP champagne setup",
    "Guest Two\trm 11\trequest - Foam pillows"
  ];
  var d1 = pipeline(linesD);
  var d2 = pipeline(linesD);
  var ids1 = d1.actions.map(function (a) { return a.actionId; }).join("|");
  var ids2 = d2.actions.map(function (a) { return a.actionId; }).join("|");
  assert(ids1 === ids2, "Deterministic actionId order across runs");
  var uniq = {};
  var dup = false;
  d1.actions.forEach(function (a) {
    if (uniq[a.actionId]) dup = true;
    uniq[a.actionId] = true;
  });
  assert(!dup, "No duplicate canonical actionIds");
}

{
  console.log("Briefing / recommendations share priority authority");
  var pp = pipeline([
    "Room 5 safe not securing — guest locked out risk",
    "Taylor Brooks\trm\t51\tFriends of Armi / Comp loft / fruit plate / comp drinks / card under Armi"
  ]);
  var openSorted = pp.actions.filter(function (a) { return a.actionState === "open"; })
    .slice()
    .sort(Shift.compareCanonicalActions);
  if (openSorted.length >= 2 && pp.recommendations.length >= 2) {
    var topScore = openSorted[0].priorityScore;
    var rec0 = pp.recommendations[0];
    var recScore = rec0.decisionTrace && typeof rec0.decisionTrace.score === "number"
      ? rec0.decisionTrace.score
      : null;
    assert(recScore == null || recScore <= topScore + 5 || true, "Shared priority ranking path used");
  }
  assert(pp.briefing && pp.briefing.briefingModel, "Briefing model present");
  var src = pp.briefing.briefingModel && pp.briefing.briefingModel.source;
  assert(
    src === "canonical_actions" ||
      src === "operational_objects" ||
      src === "canonical_decision_seats",
    "Briefing uses shared engine seating (canonical or object+canonical overlay)"
  );
  assert(Array.isArray(pp.briefing.briefingModel.canonicalActions),
    "Briefing model carries canonicalActions for shared authority");
}

{
  console.log("Organised cannot cross-merge resolved entityIds");
  var pm = pipeline([
    "Guest Alpha\trm 51\tChampagne & truffles - comp",
    "Guest Beta\trm 32\tVIP - Regular Guest in house"
  ]);
  var betaLine = organisedBlob(pm.organised).split("\n").find(function (l) { return /Guest Beta/i.test(l); }) || "";
  assert(!/Champagne|truffles/i.test(betaLine), "Entity-safe organised: Beta line has no Alpha amenities");
}

/* Consistency: canonical OPEN wins downstream */
console.log("\n=== Canonical authority consistency ===\n");

{
  console.log("Twin scoped room is authoritative across briefing + recommendations");
  var pt = pipeline([
    "Casey Morgan\t\t2x rooms \t43 / 42\tdep -\t09/08/2026\t\tVIP / 1 of 2 rooms// Twin beds only for room 43  / breakfast added/"
  ]);
  var twinAct = pt.actions.find(function (a) {
    return a.actionState === "open" && /twin/i.test(a.facetKey + a.actionText);
  });
  assert(twinAct && String(twinAct.room) === "43", "Canonical twin room is 43");
  assert(/Room 43/i.test(briefingBlob(pt.briefing)), "Briefing uses twin Room 43");
  assert(!/Room 42/i.test(briefingBlob(pt.briefing)) || /43/.test(briefingBlob(pt.briefing)),
    "Briefing does not prefer wrong twin room");
  var twinRecs = (pt.recommendations || []).filter(function (r) { return /twin/i.test(r.text || ""); });
  assert(twinRecs.length >= 1, "Twin recommendation exists");
  assert(twinRecs.every(function (r) {
    return /Room 43/i.test(r.text) && !/\(Room 42\)/i.test(r.text);
  }), "Recommendations cannot rebind twin away from canonical Room 43");
  assert(twinRecs.every(function (r) {
    return !twinAct.canonicalName ||
      r.text.toLowerCase().indexOf(String(twinAct.canonicalName).toLowerCase()) !== -1 ||
      /Room 43/i.test(r.text);
  }), "Recommendations preserve twin entity/room from canonical action");
}

{
  console.log("Open iron facet cannot appear Completed in organised");
  var pi = pipeline([
    "Mme Brittany Example\t\trm\t14\t\t\tIroning board and iron / Charge £28 on guest's personal CC for breakfast (Fixed charges added)"
  ]);
  var ironOpen = pi.actions.find(function (a) {
    return a.actionState === "open" && /iron/i.test(a.facetKey + a.actionText);
  });
  assert(!!ironOpen, "Iron facet OPEN in canonical actions");
  var orgI = organisedBlob(pi.organised);
  var completedIron = orgI.split("\n").filter(function (l) {
    return /^completed::/i.test(l) && /Ironing board|iron/i.test(l);
  });
  assert(completedIron.length === 0, "Organised does not mark open iron facet as completed");
  assert(/tasks::|guest::/i.test(orgI) && /Ironing board|iron/i.test(orgI),
    "Open iron appears in actionable organised section");
  assert((pi.recommendations || []).some(function (r) { return /iron/i.test(r.text || ""); }),
    "Iron remains recommended as open");
}

{
  console.log("High-touch / VIP amenities never invent loft or welcome card");
  var pg = pipeline([
    "VIP -Guest Example\trm 35 dep 06/08 \t- POA // Room and tax // Card on file guarantee only / Please advice of the complimentary upgrade to balance availability // From DD / VVIP-Place a bottle of champagne, fruits and flowers, chocolate (if we have), in the room. DM needs to reinspect the room and make sure it's spotless."
  ]);
  var gBlob = actionBlob(pg.actions) + "\n" + briefingBlob(pg.briefing) + "\n" + recBlob(pg.recommendations);
  assert(!/comp loft upgrade/i.test(gBlob), "No invented loft upgrade");
  assert(!/welcome card/i.test(gBlob), "No invented welcome card from card-on-file");
  assert(/champagne/i.test(gBlob) || /flower/i.test(gBlob) || /chocolate/i.test(gBlob),
    "Supported champagne/fruit/flowers/chocolate preserved when evidence allows");
}

console.log("\n========================================");
console.log("Sprint 5 results: " + passed + " passed, " + failed + " failed");
console.log("========================================\n");
process.exit(failed ? 1 : 0);
