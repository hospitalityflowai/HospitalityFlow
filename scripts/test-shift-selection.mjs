/**
 * Shift code normalization smoke test (mirrors handover.html helpers).
 * Run: node scripts/test-shift-selection.mjs
 */

var DEFAULT_SHIFTS = [
  { code: "AM", name: "AM" },
  { code: "PM", name: "PM" },
  { code: "Night", name: "Night" }
];

var configuredShifts = [
  { code: "Night", name: "Night Audit" },
  { code: "AM", name: "Morning" },
  { code: "PM", name: "Afternoon" }
];

function normalizeShiftCode(code) {
  if (!code) return configuredShifts[0] ? configuredShifts[0].code : "AM";
  var raw = String(code).trim();
  var lower = raw.toLowerCase();
  var exact = configuredShifts.filter(function (s) {
    return String(s.code).toLowerCase() === lower || String(s.name).toLowerCase() === lower;
  })[0];
  if (exact) return exact.code;
  var fuzzy = configuredShifts.filter(function (s) {
    var codeLower = String(s.code).toLowerCase();
    var nameLower = String(s.name).toLowerCase();
    if (/^(night|nt|overnight)$/.test(lower)) {
      return /night|nt|overnight/.test(codeLower + " " + nameLower);
    }
    if (/^(am|morning)$/.test(lower)) {
      return /\bam\b|morning/.test(codeLower + " " + nameLower);
    }
    if (/^(pm|afternoon|evening)$/.test(lower)) {
      return /\bpm\b|afternoon|evening/.test(codeLower + " " + nameLower);
    }
    return false;
  })[0];
  return fuzzy ? fuzzy.code : raw;
}

function shiftsMatch(a, b) {
  return normalizeShiftCode(a) === normalizeShiftCode(b);
}

function simulateRenderActive(selectedShift) {
  return configuredShifts.map(function (shift) {
    return {
      code: shift.code,
      active: shiftsMatch(shift.code, selectedShift)
    };
  });
}

var tests = [
  { select: "AM", expectActive: "AM" },
  { select: "PM", expectActive: "PM" },
  { select: "Night", expectActive: "Night" }
];

var pass = true;
console.log("\n=== SHIFT SELECTION TEST ===\n");
console.log("Configured order:", configuredShifts.map(function (s) { return s.code; }).join(", "));
console.log("(Night is first — active must NOT stick to Night unless selected)\n");

tests.forEach(function (t) {
  var selected = normalizeShiftCode(t.select);
  var ui = simulateRenderActive(selected);
  var activeCodes = ui.filter(function (b) { return b.active; }).map(function (b) { return b.code; });
  var ok = activeCodes.length === 1 && activeCodes[0] === t.expectActive;
  if (!ok) pass = false;
  console.log((ok ? "PASS" : "FAIL") + " Select " + t.select + " -> active: " + activeCodes.join(", ") +
    " (expected " + t.expectActive + ")");
});

console.log("\n=== OVERALL: " + (pass ? "PASS" : "FAIL") + " ===\n");
process.exit(pass ? 0 : 1);
