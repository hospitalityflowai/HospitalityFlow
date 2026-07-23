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

function simulateCloudSave(record, cloudRows, insertIdFactory) {
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
      operation: "UPDATE",
      message: "Updated in cloud"
    };
  }

  var insertedId = insertIdFactory();
  var insertedRow = Object.assign({}, record, { id: insertedId, cloudId: insertedId });
  cloudRows.push(insertedRow);
  return {
    cloud: true,
    updated: false,
    record: insertedRow,
    operation: "INSERT",
    message: "Saved to cloud"
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

function createEditModeSession() {
  var insertCounter = 0;
  return {
    isEditingExistingSavedHandover: false,
    editingSavedHandoverId: null,
    cloudRows: [],
    nextInsertId: function () {
      insertCounter += 1;
      return "a1000000-0000-4000-8000-" + String(insertCounter).padStart(12, "0");
    }
  };
}

function startNewHandover(session) {
  session.isEditingExistingSavedHandover = false;
  session.editingSavedHandoverId = null;
}

function restoreSavedHandover(session, saved) {
  session.isEditingExistingSavedHandover = true;
  session.editingSavedHandoverId = saved.cloudId || saved.id || null;
}

function generateHandover(session) {
  if (!session.isEditingExistingSavedHandover) {
    session.editingSavedHandoverId = null;
  }
}

function buildSavePayloadFromSession(session) {
  return {
    id: session.editingSavedHandoverId || "local-temp-id",
    cloudId: session.editingSavedHandoverId || null,
    hotelName: "Test Hotel"
  };
}

function saveFromSession(session) {
  var payload = buildSavePayloadFromSession(session);
  var result = simulateCloudSave(payload, session.cloudRows, session.nextInsertId);
  session.editingSavedHandoverId = applyCloudSavedHandoverId(
    { value: session.editingSavedHandoverId },
    result
  );
  return result;
}

function runEditModeFlowSimulations() {
  var archiveUuid = "b2000000-0000-4000-8000-000000000002";

  var flowA = createEditModeSession();
  startNewHandover(flowA);
  generateHandover(flowA);
  var flowASave = saveFromSession(flowA);

  var flowB = createEditModeSession();
  startNewHandover(flowB);
  generateHandover(flowB);
  saveFromSession(flowB);
  var flowBSave = saveFromSession(flowB);

  var flowC = createEditModeSession();
  startNewHandover(flowC);
  generateHandover(flowC);
  saveFromSession(flowC);
  generateHandover(flowC);
  var flowCSave = saveFromSession(flowC);

  var flowD = createEditModeSession();
  restoreSavedHandover(flowD, { id: archiveUuid, cloudId: archiveUuid });
  generateHandover(flowD);
  var flowDSave = saveFromSession(flowD);

  var flowE = createEditModeSession();
  restoreSavedHandover(flowE, { id: archiveUuid, cloudId: archiveUuid });
  startNewHandover(flowE);
  generateHandover(flowE);
  var flowESave = saveFromSession(flowE);

  return {
    flowA: flowASave,
    flowB: flowBSave,
    flowC: flowCSave,
    flowD: flowDSave,
    flowE: flowESave,
    flowCRowCount: flowC.cloudRows.length,
    flowERowCount: flowE.cloudRows.length
  };
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
  var insertCounter = 0;
  function nextInsertId() {
    insertCounter += 1;
    return "a1000000-0000-4000-8000-" + String(insertCounter).padStart(12, "0");
  }

  var firstPayload = buildSavePayload(editingSavedHandoverId);
  var firstResult = simulateCloudSave(firstPayload, cloudRows, nextInsertId);
  editingSavedHandoverId = applyCloudSavedHandoverId({ value: editingSavedHandoverId }, firstResult);
  cache = upsertCachedSavedRecord(cache, firstResult.record, firstPayload.id);

  var secondPayload = buildSavePayload(editingSavedHandoverId);
  var secondResult = simulateCloudSave(secondPayload, cloudRows, nextInsertId);
  cache = upsertCachedSavedRecord(cache, secondResult.record, secondPayload.id);

  editingSavedHandoverId = firstResult.record.cloudId || firstResult.record.id;
  var reopenedPayload = buildSavePayload(editingSavedHandoverId);
  var reopenedResult = simulateCloudSave(
    Object.assign({}, reopenedPayload, { hotelName: "Edited Hotel" }),
    cloudRows,
    nextInsertId
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

  if (!/isEditingExistingSavedHandover/.test(page)) {
    fail("handover.html must track isEditingExistingSavedHandover");
  } else {
    pass("Edit mode flag present in handover.html");
  }

  if (!/restoreSavedHandover[\s\S]*isEditingExistingSavedHandover = true/.test(page)) {
    fail("restoreSavedHandover must enable archive edit mode");
  } else {
    pass("restoreSavedHandover sets archive edit mode");
  }

  if (!/clearHandoverOutputState[\s\S]*isEditingExistingSavedHandover = false/.test(page)) {
    fail("clearHandoverOutputState must disable archive edit mode");
  } else {
    pass("clearHandoverOutputState clears archive edit mode");
  }

  if (!/generateHandover[\s\S]*if \(!isEditingExistingSavedHandover\)[\s\S]*editingSavedHandoverId = null/.test(page)) {
    fail("generateHandover must clear UUID for normal new-handover sessions");
  } else {
    pass("generateHandover clears UUID outside archive edit mode");
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

  var flows = runEditModeFlowSimulations();

  if (flows.flowA.operation !== "INSERT" || flows.flowA.message !== "Saved to cloud") {
    fail("Flow A (New → Generate → Save) should INSERT with Saved to cloud");
  } else {
    pass("Flow A: New → Generate → Save = INSERT / Saved to cloud");
  }

  if (flows.flowB.operation !== "UPDATE" || flows.flowB.message !== "Updated in cloud") {
    fail("Flow B (Save again without generating) should UPDATE with Updated in cloud");
  } else {
    pass("Flow B: Save again without generating = UPDATE / Updated in cloud");
  }

  if (flows.flowC.operation !== "INSERT" || flows.flowC.message !== "Saved to cloud" || flows.flowCRowCount !== 2) {
    fail("Flow C (Generate again in normal session → Save) should INSERT a new record");
  } else {
    pass("Flow C: Generate again in normal session → Save = INSERT / Saved to cloud");
  }

  if (flows.flowD.operation !== "UPDATE" || flows.flowD.message !== "Updated in cloud") {
    fail("Flow D (Open archived → regenerate → Save) should UPDATE with Updated in cloud");
  } else {
    pass("Flow D: Open archived → regenerate → Save = UPDATE / Updated in cloud");
  }

  if (flows.flowE.operation !== "INSERT" || flows.flowE.message !== "Saved to cloud") {
    fail("Flow E (Open archived → New → Generate → Save) should INSERT with Saved to cloud");
  } else {
    pass("Flow E: Open archived → New → Generate → Save = INSERT / Saved to cloud");
  }

  if (failed) process.exit(1);
  console.log("\nHandover save-update checks passed.");
}

main();
