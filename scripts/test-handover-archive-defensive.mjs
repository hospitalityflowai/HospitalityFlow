/**
 * Regression checks for saved handover archive null-safety and save error handling.
 * Run: node scripts/test-handover-archive-defensive.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function filterSavedHandoverList(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(function (item) {
    return !!(item && typeof item === "object");
  });
}

function loadGetHandoverDateKey() {
  var source = read("handover-saved.js");
  var sandbox = { window: {}, console: console };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  var savedSource = read("handover-saved.js");
  var match = savedSource.match(/function getHandoverDateKey\(item\) \{[\s\S]*?\n  \}/);
  if (!match) throw new Error("Could not extract getHandoverDateKey from handover-saved.js");
  var fn = vm.runInContext("(" + match[0] + ")", sandbox);
  return fn;
}

function simulateSaveResponse(response, cloudId) {
  if (response.error) {
    return { ok: false, error: response.error };
  }
  if (!response.data) {
    return {
      ok: false,
      error: {
        message: "SAVE_NO_ROW_RETURNED",
        code: "SAVE_NO_ROW_RETURNED",
        details: null,
        hint: cloudId ? "UPDATE matched no rows" : "INSERT returned no row"
      }
    };
  }
  return { ok: true, record: response.data };
}

function simulateHandleSaveLogging(result, renderThrows) {
  var logs = [];
  var log = function (tag, payload) {
    logs.push({ tag: tag, payload: payload });
  };

  try {
    if (renderThrows) {
      throw new TypeError("Cannot read properties of null (reading 'date')");
    }
  } catch (renderErr) {
    log("renderList failed", renderErr.message);
  }

  if (!result.cloud && result.error) {
    log("cloud save failed", {
      message: result.error.message || String(result.error),
      code: result.error.code || null,
      details: result.error.details || null,
      hint: result.error.hint || null
    });
  }

  return logs;
}

function main() {
  var store = read("js/handover-store.js");
  var savedUi = read("handover-saved.js");
  var failed = false;

  function fail(message) {
    console.error("FAIL:", message);
    failed = true;
  }

  function pass(message) {
    console.log("PASS:", message);
  }

  if (!/function filterSavedHandoverList\(list\)/.test(store)) {
    fail("handover-store.js must filter saved handover lists");
  } else {
    pass("getSavedHandovers uses filterSavedHandoverList");
  }

  if (!/return filterSavedHandoverList\(list\)/.test(store)) {
    fail("getSavedHandovers must return filtered list");
  } else {
    pass("getSavedHandovers returns filtered list");
  }

  if (!/if \(!item \|\| typeof item !== "object"\) return "unknown"/.test(savedUi)) {
    fail("getHandoverDateKey must guard null/invalid items");
  } else {
    pass("getHandoverDateKey has null guard");
  }

  if (!/SAVE_NO_ROW_RETURNED/.test(store) || !/if \(!response\.data\)/.test(store)) {
    fail("saveHandover must reject empty Supabase response.data");
  } else {
    pass("saveHandover treats missing response.data as failure");
  }

  if (!/hint: response\.error\.hint/.test(store) || !/hint: err && err\.hint/.test(store)) {
    fail("saveHandover logging must preserve Supabase hint");
  } else {
    pass("saveHandover logging preserves Supabase hint");
  }

  if (!/\[HandoverSaved\] renderList failed:/.test(savedUi)) {
    fail("handleSaveClick must log renderList failures separately");
  } else {
    pass("renderList failures logged separately");
  }

  if (!/!result\.cloud && result\.error/.test(savedUi)) {
    fail("handleSaveClick must log original cloud error from resolved result");
  } else {
    pass("Original cloud error logged from resolved save result");
  }

  var mixedList = [
    null,
    undefined,
    "bad",
    42,
    { id: "valid-1", date: "2026-07-23", timestamp: "2026-07-23T10:00:00.000Z" },
    { id: "valid-2", timestamp: "2026-07-22T09:00:00.000Z" }
  ];
  var filtered = filterSavedHandoverList(mixedList);

  if (filtered.length !== 2) {
    fail("filterSavedHandoverList should keep only 2 valid records, got " + filtered.length);
  } else {
    pass("Null and invalid entries filtered from saved list");
  }

  if (filtered[0].id !== "valid-1" || filtered[1].id !== "valid-2") {
    fail("Valid saved handover records were not preserved");
  } else {
    pass("Valid saved handover records preserved");
  }

  var getHandoverDateKey = loadGetHandoverDateKey();
  var nullKey = getHandoverDateKey(null);
  var undefinedKey = getHandoverDateKey(undefined);
  var validKey = getHandoverDateKey({ date: "2026-07-23" });

  if (nullKey !== "unknown" || undefinedKey !== "unknown") {
    fail("getHandoverDateKey should return unknown for null/undefined");
  } else {
    pass("getHandoverDateKey(null) does not crash");
  }

  if (validKey !== "2026-07-23") {
    fail("getHandoverDateKey should still read valid record dates");
  } else {
    pass("getHandoverDateKey still works for valid records");
  }

  var noRow = simulateSaveResponse({ data: null, error: null }, "a1000000-0000-4000-8000-000000000001");
  if (noRow.ok || noRow.error.code !== "SAVE_NO_ROW_RETURNED") {
    fail("Empty Supabase response.data must be treated as SAVE_NO_ROW_RETURNED");
  } else {
    pass("No-row Supabase response treated as failure");
  }

  var supabaseErr = simulateSaveResponse({
    data: null,
    error: { message: "permission denied", code: "42501", details: "RLS", hint: "Check policy" }
  });
  if (supabaseErr.ok || supabaseErr.error.code !== "42501" || supabaseErr.error.hint !== "Check policy") {
    fail("Supabase error fields must be preserved");
  } else {
    pass("Supabase error message/code/details/hint preserved");
  }

  var cloudError = {
    message: "permission denied",
    code: "42501",
    details: "RLS",
    hint: "Check policy"
  };
  var logs = simulateHandleSaveLogging(
    { cloud: false, error: cloudError, message: "Saved locally — not yet synced" },
    true
  );

  var renderLog = logs.find(function (entry) { return entry.tag === "renderList failed"; });
  var cloudLog = logs.find(function (entry) { return entry.tag === "cloud save failed"; });

  if (!renderLog) {
    fail("renderList failure should be logged separately");
  } else {
    pass("renderList failure logged on its own");
  }

  if (!cloudLog || cloudLog.payload.code !== "42501" || cloudLog.payload.hint !== "Check policy") {
    fail("Original cloud error must remain visible when renderList also fails");
  } else {
    pass("Original cloud error remains visible alongside renderList failure");
  }

  if (failed) process.exit(1);
  console.log("\nHandover archive defensive checks passed.");
}

main();
