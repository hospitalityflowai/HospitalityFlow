/**
 * Static checks for saved handover edit/update path.
 * Run: node scripts/test-handover-save-update.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function main() {
  const store = read("js/handover-store.js");
  const page = read("handover.html");
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

  if (/buildSavePayload[\s\S]*Date\.now\(\)\.toString\(36\)/.test(page) &&
      !/editingSavedHandoverId\s*\|\|/.test(page)) {
    fail("buildSavePayload always mints new IDs");
  } else {
    pass("buildSavePayload reuses ID when editing saved handover");
  }

  if (failed) process.exit(1);
  console.log("\nHandover save-update checks passed.");
}

main();
