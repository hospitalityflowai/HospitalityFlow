/**
 * Static and simulated checks for saved handover edit/update path.
 * Run: node scripts/test-handover-save-update.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const CLOUD_HANDOVER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function resolveCloudHandoverId(record) {
  if (!record) return null;
  if (record.cloudId && CLOUD_HANDOVER_ID_RE.test(String(record.cloudId))) {
    return String(record.cloudId);
  }
  if (record.id && CLOUD_HANDOVER_ID_RE.test(String(record.id))) {
    return String(record.id);
  }
  return null;
}

function upsertCachedSavedRecord(cache, savedRecord, previousId) {
  var replaced = false;
  var next = cache.map(function (item) {
    if (item.id === savedRecord.id || (previousId && item.id === previousId)) {
      replaced = true;
      return savedRecord;
    }
    return item;
  });
  if (!replaced) {
    next.unshift(savedRecord);
  }
  return next;
}

function simulateCloudSave(record, cloudRows) {
  var cloudId = resolveCloudHandoverId(record);
  if (cloudId) {
    var updatedRow = Object.assign({}, record, { id: cloudId, cloudId: cloudId });
    var index = cloudRows.findIndex(function (row) { return row.id === cloudId; });
    if (index >= 0) {
      cloudRows[index] = updatedRow;
    }
    return {
      cloud: true,
      updated: true,
      record: updatedRow,
      operation: "UPDATE"
    };
  }

  var insertedId = "a1000000-0000-4000-8000-000000000001";
  var insertedRow = Object.assign({}, record, { id: insertedId, cloudId: insertedId });
  cloudRows.push(insertedRow);
  return {
    cloud: true,
    updated: false,
    record: insertedRow,
    operation: "INSERT"
  };
}

function applyCloudSavedHandoverId(editingState, result) {
  if (!result || !result.cloud || !result.record) {
    return editingState.value;
  }
  var cloudId = result.record.cloudId || result.record.id;
  if (cloudId && CLOUD_HANDOVER_ID_RE.test(String(cloudId))) {
    return String(cloudId);
  }
  return editingState.value;
}

function buildSavePayload(editingSavedHandoverId) {
  return {
    id: editingSavedHandoverId || "local-temp-id",
    cloudId: editingSavedHandoverId || null,
    hotelName: "Test Hotel"
  };
}

function runSimulation() {
  var cloudRows = [];
  var cache = [];
  var editingSavedHandoverId = null;

  var firstPayload = buildSavePayload(editingSavedHandoverId);
  var firstResult = simulateCloudSave(firstPayload, cloudRows);
  editingSavedHandoverId = applyCloudSavedHandoverId({ value: editingSavedHandoverId }, firstResult);
  cache = upsertCachedSavedRecord(cache, firstResult.record, firstPayload.id);

  var secondPayload = buildSavePayload(editingSavedHandoverId);
  var secondResult = simulateCloudSave(secondPayload, cloudRows);
  cache = upsertCachedSavedRecord(cache, secondResult.record, secondPayload.id);

  editingSavedHandoverId = firstResult.record.cloudId || firstResult.record.id;
  var reopenedPayload = buildSavePayload(editingSavedHandoverId);
  var reopenedResult = simulateCloudSave(
    Object.assign({}, reopenedPayload, { hotelName: "Edited Hotel" }),
    cloudRows
  );
  cache = upsertCachedSavedRecord(cache, reopenedResult.record, reopenedPayload.id);

  var cacheIds = cache.map(function (item) { return item.id; });

  return {
    firstOperation: firstResult.operation,
    secondOperation: secondResult.operation,
    sameUuidOnSecondSave: firstResult.record.id === secondResult.record.id,
    reopenedOperation: reopenedResult.operation,
    reopenedSameUuid: reopenedResult.record.id === firstResult.record.id,
    cloudRowCount: cloudRows.length,
    cacheCount: cache.length,
    duplicateCache: cacheIds.length !== new Set(cacheIds).size
  };
}

function main() {
  const store = read("js/handover-store.js");
  const page = read("handover.html");
  const savedUi = read("handover-saved.js");
  let failed = false;

  function fail(message) {
    console.error("FAIL:", message);
    failed = true;
  }

  function pass(message) {
    console.log("PASS:", message);
  }

  if (!/resolveCloudHandoverId/.test(store) || !/\.update\(row\)/.test(store)) {
    fail("handover-store.js must update existing cloud handovers");
  } else {
    pass("Cloud save uses update for existing handover IDs");
  }

  if (!/editingSavedHandoverId/.test(page) || !/cloudId: editingSavedHandoverId/.test(page)) {
    fail("handover.html must preserve saved handover ID when editing");
  } else {
    pass("Edit flow preserves saved handover ID in save payload");
  }

  if (!/applyCloudSavedHandoverId/.test(page) || !/onSaveComplete: applyCloudSavedHandoverId/.test(page)) {
    fail("handover.html must apply cloud UUID after successful save");
  } else {
    pass("Successful cloud save updates editingSavedHandoverId");
  }

  if (!/onSaveComplete/.test(savedUi)) {
    fail("handover-saved.js must expose onSaveComplete callback");
  } else {
    pass("Save completion callback wired in archive module");
  }

  if (/buildSavePayload[\s\S]*Date\.now\(\)\.toString\(36\)/.test(page) &&
      !/editingSavedHandoverId\s*\|\|/.test(page)) {
    fail("buildSavePayload always mints new IDs");
  } else {
    pass("buildSavePayload reuses ID when editing saved handover");
  }

  var simulation = runSimulation();

  if (simulation.firstOperation !== "INSERT") {
    fail("First save should INSERT");
  } else {
    pass("First save = INSERT");
  }

  if (simulation.secondOperation !== "UPDATE" || !simulation.sameUuidOnSecondSave) {
    fail("Second save without reopening should UPDATE same UUID");
  } else {
    pass("Second save without reopening = UPDATE same UUID");
  }

  if (simulation.reopenedOperation !== "UPDATE" || !simulation.reopenedSameUuid) {
    fail("Open saved handover -> edit -> save should UPDATE same UUID");
  } else {
    pass("Open saved handover -> edit -> Save = UPDATE same UUID");
  }

  if (simulation.cloudRowCount !== 1) {
    fail("Cloud rows should remain a single record across update flow");
  } else {
    pass("No duplicate cloud row in simulation");
  }

  if (simulation.duplicateCache || simulation.cacheCount !== 1) {
    fail("Cache should not contain duplicate entries after update flow");
  } else {
    pass("No duplicate cache entry");
  }

  if (failed) process.exit(1);
  console.log("\nHandover save-update checks passed.");
}

main();
