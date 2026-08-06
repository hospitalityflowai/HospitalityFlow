/**
 * Hotel Snapshot Occupancy / RevPAR + notes section context tests.
 * Run: node scripts/test-hotel-snapshot-metrics.mjs
 */
import { createRequire } from "module";
import assert from "assert";
import { pathToFileURL } from "url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const require = createRequire(import.meta.url);

/* Load shared modules in Node (UMD-style attach to globalThis) */
function load(rel) {
  const mod = require(path.join(root, rel));
  return mod;
}

const Metrics = load("js/hotel-snapshot-metrics.js");
const Notes = load("js/handover-notes-sections.js");
const Prep = load("js/handover-preparations.js");
const Quote = load("js/handover-quote-of-the-day.js");

let passed = 0;
function ok(cond, msg) {
  assert.ok(cond, msg);
  passed += 1;
  console.log("  ✓", msg);
}

console.log("\n1. Occupancy with zero OOO");
{
  const occ = Metrics.calculateOccupancy(23, 25, 0);
  ok(Math.abs(occ - 92) < 0.01, "23/25 = 92%");
}

console.log("\n2. Occupancy with OOO rooms");
{
  const occ = Metrics.calculateOccupancy(23, 26, 2);
  ok(Math.abs(occ - (23 / 24) * 100) < 0.01, "sellable = 24 → 95.833…%");
  const enriched = Metrics.enrichSnapshot(
    { roomsSold: 23, oooRooms: 2, adr: 266.24 },
    { totalRooms: 26, overwriteOccupancy: true }
  );
  ok(enriched.occupancy.indexOf("%") !== -1, "occupancy formatted with %");
  ok(enriched.revparValue != null, "revpar derived");
}

console.log("\n3. RevPAR calculation");
{
  const rev = Metrics.calculateRevpar(266.24, 96);
  ok(Math.abs(rev - 255.59) < 0.011, "ADR × 96% = £255.59");
}

console.log("\n4. Missing ADR");
{
  const rev = Metrics.calculateRevpar(null, 96);
  ok(rev === null, "missing ADR → null RevPAR");
  const enriched = Metrics.enrichSnapshot(
    { roomsSold: 20, occupancy: "80%" },
    { totalRooms: 25, overwriteOccupancy: true, clearInvalidRevpar: true }
  );
  ok(!enriched.revparValue, "no ADR → no revparValue");
}

console.log("\n5. Missing or zero sellable inventory");
{
  ok(Metrics.calculateOccupancy(10, 0, 0) === null, "zero total rooms → null");
  ok(Metrics.calculateOccupancy(10, 5, 5) === null, "zero sellable → null");
  ok(Metrics.sellableRooms(10, 12) === null, "OOO > total → null");
  const bad = Metrics.enrichSnapshot({ roomsSold: 10 }, { totalRooms: 0 });
  ok(!bad.occupancyValue, "no misleading occupancy");
}

console.log("\n6. Arrivals remain arrival-context");
{
  const bias = Notes.resolveSourceBias("arrivals", "VIP due 11am quiet upper rm42");
  ok(bias === "arrivals", "arrival note stays arrivals");
}

console.log("\n7. Departures remain departure-context");
{
  const bias = Notes.resolveSourceBias("departures", "minibar still open collect b4 checkout");
  ok(bias === "departures", "departure note stays departures");
  const cross = Notes.resolveSourceBias("arrivals", "late checkout approved 1pm");
  ok(cross === "departures", "clear departure wording can leave arrivals");
}

console.log("\n8. Duplicate checklist items removed");
{
  const groups = Prep.buildPreparationGroups([
    { original: "champagne and welcome card for Eleanor Room 42", rooms: ["42"], fact: { guestName: "Eleanor Whitmore" } },
    { original: "champagne + welcome card — Eleanor Whitmore rm42", rooms: ["42"], fact: { guestName: "Eleanor Whitmore" } }
  ]);
  ok(groups.length >= 1, "preparation group created");
  const lines = Prep.formatPreparationLines(groups);
  const actions = lines.filter(function (l) { return !l.isHeading; });
  ok(actions.length >= 1, "at least one prep action");
  const texts = actions.map(function (a) { return a.text.replace(/^[☑☐]\s*/, "").toLowerCase(); });
  const unique = new Set(texts);
  ok(unique.size === texts.length && texts.length > 0, "duplicate prep actions removed");
}

console.log("\n9. Completed preparation not outstanding");
{
  const groups = Prep.buildPreparationGroups([
    { original: "Flowers placed in Room 11 for Yoshiko", rooms: ["11"], fact: { guestName: "Yoshiko Sakamoto" } }
  ]);
  const item = groups[0].items[0];
  ok(item.completed === true, "completed cue marks checked");
  const line = Prep.formatPreparationLines(groups).find(function (l) { return !l.isHeading; });
  ok(line.text.indexOf("☑") === 0, "shows checked box");
}

console.log("\n10. Confirmed information not open question");
{
  const qs = Prep.buildOpenQuestions([
    { original: "Late check-out Room 21 Chen approved 1pm", rooms: ["21"], section: "guest" }
  ]);
  ok(qs.length === 0, "approved late check-out is not an open question");
}

console.log("\n10b. Open questions require guest/room context");
{
  const anon = Prep.buildOpenQuestions([
    { original: "Has the balance been paid?", rooms: [], fact: null }
  ]);
  ok(anon.length === 0, "anonymous balance question omitted");
  const contextual = Prep.buildOpenQuestions([
    {
      original: "Room 22 minibar £42.50 still open — confirm paid?",
      rooms: ["22"],
      fact: { guestName: "Okonkwo", rooms: ["22"] }
    }
  ]);
  ok(contextual.length === 1, "contextual finance question generated");
  ok(/Room 22/.test(contextual[0].text) && /balance|paid/i.test(contextual[0].text),
    "question names room and task");
}

console.log("\n11. Unknown guest not falsely assigned");
{
  const groups = Prep.buildPreparationGroups([
    { original: "Twin beds please", rooms: [], fact: null }
  ]);
  ok(groups.length === 0 || /not identified/i.test(groups[0].heading) || !groups[0].guest,
    "does not invent a guest name");
}

console.log("\n11b. Preparations group by guest with short actions");
{
  const groups = Prep.buildPreparationGroups([
    {
      original: "champagne + welcome card for Josh Piercey-Fisher Room 18",
      rooms: ["18"],
      fact: { guestName: "Josh Piercey-Fisher", rooms: ["18"] }
    },
    {
      original: "Henderson twin setup and balloons Room 15",
      rooms: ["15"],
      fact: { guestName: "Henderson", rooms: ["15"] }
    }
  ]);
  ok(groups.length === 2, "two guest preparation groups");
  ok(groups.some(function (g) { return /Josh Piercey-Fisher/i.test(g.heading); }), "Josh heading");
  ok(groups.some(function (g) { return /Henderson/i.test(g.heading); }), "Henderson heading");
  const josh = groups.find(function (g) { return /Josh/i.test(g.heading); });
  const actions = (josh.items || []).map(function (i) { return i.text; });
  ok(actions.indexOf("Champagne") !== -1 && actions.indexOf("Welcome card") !== -1,
    "short amenity checklist labels");
}

console.log("\n12. Workspace and demo share calculation logic");
{
  ok(typeof Metrics.calculateOccupancy === "function", "shared Metrics API");
  ok(typeof Notes.combineForAi === "function", "shared Notes API");
  const parts = Notes.normalizeParts({
    arrivals: "VIP due 11am",
    departures: "collect minibar",
    general: "AC broken rm24"
  });
  const ai = Notes.combineForAi(parts);
  ok(ai.indexOf("TODAY'S ARRIVALS") !== -1, "AI contract labels arrivals");
  ok(ai.indexOf("TODAY'S DEPARTURES") !== -1, "AI contract labels departures");
  ok(ai.indexOf("GENERAL HOTEL") !== -1, "AI contract labels general");
}

console.log("\n13. Compact display lines include Guests in House + OOO Rooms");
{
  const lines = Metrics.buildCompactDisplayLines({
    arrivals: 8,
    departures: 6,
    stayovers: 52,
    inHouse: 86,
    roomsSold: 60,
    roomsAvailable: 18,
    oooRooms: 2,
    adr: 285
  }, { currency: "£", totalRooms: 80 });
  const joined = lines.map((l) => l.group + ": " + l.line).join(" | ");
  ok(lines.some((l) => l.group === "Operations" && /Guests in House 86/.test(l.line)), "Guests in House");
  ok(lines.some((l) => l.group === "Inventory" && /OOO Rooms 2/.test(l.line)), "OOO Rooms");
  ok(lines.some((l) => /Occupancy 76\.9%/.test(l.line)), "Occupancy 76.9%");
  ok(lines.some((l) => /RevPAR £219\.23/.test(l.line)), "RevPAR £219.23");
  ok(!/Adults/.test(joined) && !/Children/.test(joined), "no Adults/Children cards in snapshot lines");
}

console.log("\n14. Source notes capture is immutable and sectioned");
{
  const captured = Notes.captureSourceNotes({
    arrivals: "VIP due 11:00 Room 42",
    departures: "Collect minibar Room 22",
    general: "AC broken Room 24"
  });
  ok(!!captured.id && captured.version === 1, "source notes id + version");
  ok(captured.parts.arrivals.indexOf("VIP due") !== -1, "arrivals preserved");
  ok(captured.lines.length >= 3, "line index foundation present");
  const model = Notes.buildSourceNotesViewModel(captured);
  ok(model.hasContent && model.mode === "sections", "sectioned view model");
  ok(model.sections.length === 3, "three source sections");
  const legacy = Notes.buildSourceNotesViewModel({ originalNotes: "Loose staff note without labels" });
  ok(legacy.hasContent, "legacy notes still show");
  const legacyText = legacy.sections.map(function (s) { return s.text; }).join("\n");
  ok(/Loose staff note/.test(legacyText), "legacy text preserved (general or fallback)");
}

console.log("\n15. Quote of the Day is local, short and stable for a seed");
{
  const a = Quote.generateQuoteOfTheDay({ seed: "oakwood|Night|2026-08-06", hotelName: "The Oakwood Mayfair" });
  const b = Quote.generateQuoteOfTheDay({ seed: "oakwood|Night|2026-08-06", hotelName: "The Oakwood Mayfair" });
  ok(!!a.text && a.text === b.text, "same seed yields same quote");
  ok(a.text.split(/\s+/).length <= 28, "quote within a short length");
  const formatted = Quote.formatQuoted(a);
  ok(!!formatted.text && /[“"].+[”"]/.test(formatted.text), "formatted with quotation marks");
  const famous = Quote.generateQuoteOfTheDay({
    quote: "People will forget what you said, people will forget what you did, but people will never forget how you made them feel.",
    author: "Maya Angelou"
  });
  ok(famous.author === "Maya Angelou", "confident attribution preserved when provided");
  const uncertain = Quote.generateQuoteOfTheDay({ quote: "An original line about service.", author: "unknown source" });
  ok(!uncertain.author, "uncertain author names are dropped");
}

console.log("\n─── Results ───");
console.log("Passed:", passed);
console.log("OK");
