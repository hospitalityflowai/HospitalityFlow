/**
 * Compare Meridian Sprint 14 vs Sprint 15 (state-resolution completion).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const S14 = path.resolve(__dirname, "../sprint14-validation");
const S15 = __dirname;
const FOCUS = ["003", "005", "014", "020"];

function load(dir, id, suffix) {
  return JSON.parse(
    fs.readFileSync(path.join(dir, "scenario-" + id + "-" + suffix + ".json"), "utf8")
  );
}

function actKey(a) {
  return (
    "[" +
    (a.actionState || "") +
    "|" +
    (a.facetKey || "") +
    "] rm=" +
    (a.room || "") +
    " :: " +
    (a.actionText || "")
  );
}

function byState(p, state) {
  return (p.canonicalActions || [])
    .filter((a) => a.actionState === state)
    .map(actKey);
}

const rows = [];
for (let n = 1; n <= 20; n++) {
  const id = String(n).padStart(3, "0");
  const a = load(S14, id, "sprint14");
  const b = load(S15, id, "sprint15");
  const openA = byState(a, "open");
  const openB = byState(b, "open");
  const monA = byState(a, "monitor");
  const monB = byState(b, "monitor");
  const resA = byState(a, "resolved");
  const resB = byState(b, "resolved");
  rows.push({
    id,
    title: a.title,
    focus: FOCUS.includes(id),
    sprint14Open: openA,
    sprint15Open: openB,
    sprint14Monitor: monA,
    sprint15Monitor: monB,
    addedOpen: openB.filter((x) => !openA.includes(x)),
    removedOpen: openA.filter((x) => !openB.includes(x)),
    addedMonitor: monB.filter((x) => !monA.includes(x)),
    removedMonitor: monA.filter((x) => !monB.includes(x)),
    addedResolved: resB.filter((x) => !resA.includes(x)),
    removedResolved: resA.filter((x) => !resB.includes(x)),
    briefingChanged: (a.aiSummaryBriefing || "") !== (b.aiSummaryBriefing || ""),
    sourceShaMatch:
      a.inputIntegrity?.scenarioFileSha256 ===
      b.inputIntegrity?.scenarioFileSha256,
  });
}

const report = {
  label: "MERIDIAN SPRINT 14 → SPRINT 15 STATE-RESOLUTION COMPARE",
  focus: FOCUS,
  scenarios: rows,
};

fs.writeFileSync(
  path.join(S15, "MERIDIAN_SPRINT15_STATE_RESOLUTION_COMPARE.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log("Focus scenarios:");
rows
  .filter((r) => r.focus)
  .forEach((r) => {
    console.log("\n*" + r.id, r.title);
    console.log("  OPEN14:", r.sprint14Open.join(" || ") || "(none)");
    console.log("  OPEN15:", r.sprint15Open.join(" || ") || "(none)");
    console.log("  MON14:", r.sprint14Monitor.join(" || ") || "(none)");
    console.log("  MON15:", r.sprint15Monitor.join(" || ") || "(none)");
    console.log("  +OPEN:", r.addedOpen.join(" || ") || "(none)");
    console.log("  -OPEN:", r.removedOpen.join(" || ") || "(none)");
    console.log("  +MON:", r.addedMonitor.join(" || ") || "(none)");
    console.log("  +RES:", r.addedResolved.join(" || ") || "(none)");
    console.log("  briefingChanged:", r.briefingChanged);
  });

console.log("\nAll deltas:");
rows
  .filter(
    (r) =>
      r.addedOpen.length ||
      r.removedOpen.length ||
      r.addedMonitor.length ||
      r.removedMonitor.length ||
      r.addedResolved.length ||
      r.briefingChanged
  )
  .forEach((r) => {
    console.log(
      " ",
      r.id,
      "open",
      r.sprint14Open.length,
      "→",
      r.sprint15Open.length,
      "| mon",
      r.sprint14Monitor.length,
      "→",
      r.sprint15Monitor.length,
      "| +open",
      r.addedOpen.length,
      "-open",
      r.removedOpen.length,
      "+mon",
      r.addedMonitor.length,
      r.briefingChanged ? "| briefing" : ""
    );
  });

console.log("\nWrote MERIDIAN_SPRINT15_STATE_RESOLUTION_COMPARE.json");
