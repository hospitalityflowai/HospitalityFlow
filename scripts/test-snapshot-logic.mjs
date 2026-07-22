/**
 * Snapshot pipeline unit test (standalone copy of handover snapshot logic).
 * Run: node scripts/test-snapshot-logic.mjs
 */

var currencySymbol = "£";
var HOTEL_SNAPSHOT_STATS = [
  { id: "arrivals" }, { id: "departures" }, { id: "inHouse" },
  { id: "occupancy" }, { id: "adr" }, { id: "roomsSold" }
];
var SNAPSHOT_EMPTY = "—";
var SNAPSHOT_PDF_LABELS = {
  arrivals: "Arrivals", departures: "Departures", inHouse: "In-House Guests",
  occupancy: "Occupancy", adr: "ADR", roomsSold: "Rooms Sold"
};

var NOTES_TEXT = "";
var FORM_RAW = {};
var lastHotelSnapshotOverrides = {};
var lastNormalizedSnapshot = null;

var notesInput = { value: NOTES_TEXT };
var preHotelSnapshotGrid = {
  querySelectorAll: function (sel) {
    if (sel.indexOf("snapshot-field-input") === -1) return [];
    return Object.keys(FORM_RAW).map(function (id) {
      return {
        getAttribute: function (a) { return a === "data-snapshot-input" ? id : null; },
        value: FORM_RAW[id]
      };
    });
  }
};
var shiftSnapshotGrid = { children: [], querySelectorAll: function () { return []; } };

function firstPatternMatch(text, patterns) {
  for (var i = 0; i < patterns.length; i++) {
    var match = text.match(patterns[i]);
    if (match) return match;
  }
  return null;
}

function extractHotelSnapshot(notesText) {
  var text = String(notesText || "");
  var normalized = text.replace(/\s+/g, " ").trim();
  var arrivalsMatch = firstPatternMatch(normalized, [
    /(?:expected\s+)?arrivals?\s*(?:today|tomorrow)?\s*[:\-]?\s*(\d+)/i,
    /arrivals?\s*[:\-]\s*(\d+)/i, /(\d+)\s+arrivals?/i
  ]);
  var departuresMatch = firstPatternMatch(normalized, [
    /(?:expected\s+)?departures?\s*(?:today|tomorrow)?\s*[:\-]?\s*(\d+)/i,
    /departures?\s*[:\-]\s*(\d+)/i, /(\d+)\s+departures?/i
  ]);
  var inHouseMatch = firstPatternMatch(normalized, [
    /in[-\s]?house\s*(?:guests?)?\s*[:\-]?\s*(\d+)/i,
    /(\d+)\s+in[-\s]?house/i, /(\d+)\s+guests?\s+in[-\s]?house/i
  ]);
  var occupancyMatch = firstPatternMatch(normalized, [
    /occupancy\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:%|percent)/i,
    /(\d+(?:\.\d+)?)\s*%\s+occupancy/i, /occupancy\s+at\s+(\d+(?:\.\d+)?)/i
  ]);
  var adrMatch = firstPatternMatch(normalized, [
    /adr\s*[:\-]?\s*([£$€])?\s*(\d+(?:\.\d+)?)/i,
    /([£$€])\s*(\d+(?:\.\d+)?)\s+adr/i
  ]);
  var adr = null;
  if (adrMatch) {
    adr = { currency: adrMatch[2] ? (adrMatch[1] || "£") : "£", value: adrMatch[2] || adrMatch[1] };
  }
  var roomsSoldMatch = firstPatternMatch(normalized, [
    /rooms?\s+sold\s*[:\-]?\s*(\d+)/i, /(\d+)\s+rooms?\s+sold/i
  ]);
  return {
    arrivals: arrivalsMatch ? arrivalsMatch[1] : null,
    departures: departuresMatch ? departuresMatch[1] : null,
    inHouse: inHouseMatch ? inHouseMatch[1] : null,
    occupancy: occupancyMatch ? occupancyMatch[1] : null,
    adr: adr,
    roomsSold: roomsSoldMatch ? roomsSoldMatch[1] : null
  };
}

function parseOccupancyNumber(raw) {
  var occ = String(raw || "").replace(/%+\s*$/, "").trim();
  if (!occ || isNaN(parseFloat(occ))) return null;
  return parseFloat(occ);
}

function formatOccupancyPercent(num) {
  var clamped = Math.min(100, Math.max(0, num));
  var formatted = clamped % 1 === 0 ? String(Math.round(clamped)) : clamped.toFixed(1).replace(/\.0$/, "");
  return formatted + "%";
}

function normalizeSnapshotStoredValue(statId, raw) {
  var trimmed = String(raw || "").trim();
  if (!trimmed || trimmed === SNAPSHOT_EMPTY) return "";
  switch (statId) {
    case "occupancy": {
      var occNum = parseOccupancyNumber(trimmed);
      if (occNum === null) return "";
      return formatOccupancyPercent(occNum);
    }
    case "adr": {
      var adrText = trimmed.replace(/^adr\s*[:\-]?\s*/i, "").replace(/^[£$€]\s*/, "").trim();
      if (!adrText || !/\d/.test(adrText)) return "";
      return currencySymbol + adrText;
    }
    default:
      return trimmed;
  }
}

function formatAdrDisplay(raw) {
  if (raw === null || raw === undefined || raw === "") return SNAPSHOT_EMPTY;
  if (typeof raw === "object") {
    if (raw.value !== undefined && raw.value !== null && raw.value !== "") return formatAdrDisplay(raw.value);
    return SNAPSHOT_EMPTY;
  }
  var str = String(raw).trim();
  if (!str) return SNAPSHOT_EMPTY;
  var adrLineMatch = str.match(/^adr\s*[:\-]?\s*(.+)$/i);
  if (adrLineMatch) str = adrLineMatch[1].trim();
  var numeric = str.replace(/^[£$€]\s*/, "").replace(/,/g, "").trim();
  if (!numeric || !/\d/.test(numeric)) return SNAPSHOT_EMPTY;
  var num = parseFloat(numeric);
  if (isNaN(num)) return currencySymbol + numeric;
  return currencySymbol + num.toFixed(2);
}

function formatSnapshotValueFromExtracted(statId, value) {
  if (value === null || value === undefined || value === "") return SNAPSHOT_EMPTY;
  switch (statId) {
    case "occupancy": {
      var extractedOcc = parseOccupancyNumber(value);
      return extractedOcc === null ? SNAPSHOT_EMPTY : formatOccupancyPercent(extractedOcc);
    }
    case "adr":
      return formatAdrDisplay(value);
    default:
      return String(value);
  }
}

function formatSnapshotDisplayValue(statId, storedValue) {
  if (!storedValue || storedValue === SNAPSHOT_EMPTY) return SNAPSHOT_EMPTY;
  switch (statId) {
    case "adr": return formatAdrDisplay(storedValue);
    case "occupancy": {
      var occNum = parseOccupancyNumber(storedValue);
      return occNum === null ? SNAPSHOT_EMPTY : formatOccupancyPercent(occNum);
    }
    default: return String(storedValue);
  }
}

function readRawSnapshotFromForm() {
  var raw = {};
  HOTEL_SNAPSHOT_STATS.forEach(function (stat) { raw[stat.id] = ""; });
  preHotelSnapshotGrid.querySelectorAll(".snapshot-field-input").forEach(function (input) {
    var statId = input.getAttribute("data-snapshot-input");
    if (statId) raw[statId] = String(input.value || "").trim();
  });
  return raw;
}

function buildNormalizedSnapshot(notesText) {
  var rawForm = readRawSnapshotFromForm();
  var extracted = extractHotelSnapshot(notesText || "");
  var normalized = {};
  HOTEL_SNAPSHOT_STATS.forEach(function (stat) {
    var raw = rawForm[stat.id];
    if (raw && raw !== SNAPSHOT_EMPTY) {
      var stored = normalizeSnapshotStoredValue(stat.id, raw);
      if (stored) {
        var display = formatSnapshotDisplayValue(stat.id, stored);
        if (display !== SNAPSHOT_EMPTY) normalized[stat.id] = display;
      }
      return;
    }
    var fromExtract = formatSnapshotValueFromExtracted(stat.id, extracted[stat.id]);
    if (fromExtract !== SNAPSHOT_EMPTY) normalized[stat.id] = fromExtract;
  });
  return normalized;
}

function syncSnapshotOverrideFromInput(statId, raw) {
  var normalized = normalizeSnapshotStoredValue(statId, raw);
  if (!normalized) delete lastHotelSnapshotOverrides[statId];
  else lastHotelSnapshotOverrides[statId] = normalized;
}

function captureHotelSnapshotInputs() {
  preHotelSnapshotGrid.querySelectorAll(".snapshot-field-input").forEach(function (input) {
    var statId = input.getAttribute("data-snapshot-input");
    if (statId) syncSnapshotOverrideFromInput(statId, input.value);
  });
}

function commitSnapshotState(notesText) {
  captureHotelSnapshotInputs();
  notesInput.value = notesText != null ? notesText : notesInput.value;
  lastNormalizedSnapshot = buildNormalizedSnapshot(notesInput.value);
  lastHotelSnapshotOverrides = {};
  HOTEL_SNAPSHOT_STATS.forEach(function (stat) {
    if (lastNormalizedSnapshot[stat.id]) lastHotelSnapshotOverrides[stat.id] = lastNormalizedSnapshot[stat.id];
  });
  return lastNormalizedSnapshot;
}

function getCommittedSnapshot() {
  return commitSnapshotState();
}

function formatSnapshotPdfValue(statId, displayValue) {
  if (!displayValue || displayValue === SNAPSHOT_EMPTY) return SNAPSHOT_EMPTY;
  var text = String(displayValue).trim();
  switch (statId) {
    case "adr": {
      var num = parseFloat(text.replace(/^[£$€]\s*/, "").replace(/,/g, ""));
      return isNaN(num) ? SNAPSHOT_EMPTY : currencySymbol + num.toFixed(2);
    }
    case "occupancy": {
      var occNum = parseOccupancyNumber(text);
      return occNum === null ? SNAPSHOT_EMPTY : formatOccupancyPercent(occNum);
    }
    default: return text;
  }
}

function buildHotelSnapshotPdfRows(snapshot) {
  snapshot = snapshot || {};
  return HOTEL_SNAPSHOT_STATS.map(function (stat) {
    return {
      label: SNAPSHOT_PDF_LABELS[stat.id],
      value: formatSnapshotPdfValue(stat.id, snapshot[stat.id] || SNAPSHOT_EMPTY)
    };
  });
}

function buildHotelSnapshotForPdf() {
  return buildHotelSnapshotPdfRows(getCommittedSnapshot());
}

function pdfMap(rows) {
  var map = {};
  rows.forEach(function (row) {
    if (row.label === "Arrivals") map.arrivals = row.value;
    if (row.label === "Departures") map.departures = row.value;
    if (row.label === "In-House Guests") map.inHouse = row.value;
    if (row.label === "Occupancy") map.occupancy = row.value;
    if (row.label === "ADR") map.adr = row.value;
    if (row.label === "Rooms Sold") map.roomsSold = row.value;
  });
  return map;
}

function runCase(name, notesText, formRaw, expected) {
  NOTES_TEXT = notesText;
  FORM_RAW = formRaw;
  notesInput.value = notesText;
  lastHotelSnapshotOverrides = {};
  lastNormalizedSnapshot = null;

  var raw = readRawSnapshotFromForm();
  var normalized = buildNormalizedSnapshot(notesText);
  var committed = getCommittedSnapshot();
  var pdf = pdfMap(buildHotelSnapshotForPdf());

  var pass = true;
  console.log("\n=== " + name + " ===");
  console.log("Raw form:", JSON.stringify(raw));
  console.log("Normalized:", JSON.stringify(normalized));
  console.log("Committed:", JSON.stringify(committed));
  console.log("PDF:", JSON.stringify(pdf));

  Object.keys(expected).forEach(function (key) {
    [["normalized", normalized[key]], ["committed", committed[key]], ["pdf", pdf[key]]].forEach(function (pair) {
      var ok = pair[1] === expected[key];
      if (!ok) pass = false;
      console.log((ok ? "PASS" : "FAIL") + " " + pair[0] + "." + key + ": " + JSON.stringify(pair[1]) + " expected " + JSON.stringify(expected[key]));
    });
  });
  return pass;
}

var staleNotes = "Arrivals: 11\nDepartures: 8\nIn-house: 100\nOccupancy: 100%\nADR: £323\nRooms sold: 24";
var expected = { arrivals: "3", departures: "4", inHouse: "19", occupancy: "79%", adr: "£245.50", roomsSold: "19" };
var form = { arrivals: "3", departures: "4", inHouse: "19", occupancy: "79", adr: "245.50", roomsSold: "19" };

var pass1 = runCase("Manual form overrides stale notes", staleNotes, form, expected);
var pass2 = runCase("Extract from notes when form blank", staleNotes, {}, {
  arrivals: "11", departures: "8", inHouse: "100", occupancy: "100%", adr: "£323.00", roomsSold: "24"
});
var pass3 = runCase("Blank field falls back to notes extraction", staleNotes, {
  arrivals: "", departures: "4", inHouse: "19", occupancy: "79", adr: "245.50", roomsSold: "19"
}, {
  arrivals: "11", departures: "4", inHouse: "19", occupancy: "79%", adr: "£245.50", roomsSold: "19"
});

console.log("\n=== OVERALL: " + (pass1 && pass2 && pass3 ? "PASS" : "FAIL") + " ===\n");
process.exit(pass1 && pass2 && pass3 ? 0 : 1);
