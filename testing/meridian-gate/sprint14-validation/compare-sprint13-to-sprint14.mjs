/**
 * Compare Meridian Sprint 13 vs Sprint 14 (timed transport focus).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const S13 = path.resolve(__dirname, "../sprint13-validation");
const S14 = __dirname;
const FOCUS = ["002", "015", "017"];

function load(dir, id, suffix) {
  return JSON.parse(
    fs.readFileSync(path.join(dir, "scenario-" + id + "-" + suffix + ".json"), "utf8")
  );
}

function openSum(p) {
  return (p.canonicalActions || [])
    .filter((a) => a.actionState === "open")
    .map(
      (a) =>
        "[" +
        (a.facetKey || "") +
        "] rm=" +
        (a.room || "") +
        " :: " +
        (a.actionText || "")
    );
}

function roomsFromNotes(p) {
  const set = {};
  (p.noteEvidence || []).forEach((n) => {
    (n.rooms || []).forEach((r) => {
      if (r) set[r] = true;
    });
  });
  return Object.keys(set).sort();
}

const rows = [];
for (let n = 1; n <= 20; n++) {
  const id = String(n).padStart(3, "0");
  const a = load(S13, id, "sprint13");
  const b = load(S14, id, "sprint14");
  const oA = openSum(a);
  const oB = openSum(b);
  const removed = oA.filter((x) => !oB.includes(x));
  const added = oB.filter((x) => !oA.includes(x));
  rows.push({
    id,
    title: a.title,
    focus: FOCUS.includes(id),
    sprint13Rooms: roomsFromNotes(a),
    sprint14Rooms: roomsFromNotes(b),
    sprint13Open: oA,
    sprint14Open: oB,
    addedOpen: added,
    removedOpen: removed,
    openCountDelta: oB.length - oA.length,
    roomsDelta: roomsFromNotes(b).filter((r) => !roomsFromNotes(a).includes(r))
      .length,
    briefingChanged: (a.aiSummaryBriefing || "") !== (b.aiSummaryBriefing || ""),
    sourceShaMatch:
      a.inputIntegrity?.scenarioFileSha256 ===
      b.inputIntegrity?.scenarioFileSha256,
  });
}

const report = {
  label: "MERIDIAN SPRINT 13 → SPRINT 14 TIMED-TRANSPORT COMPARE",
  focus: FOCUS,
  scenarios: rows,
};

fs.writeFileSync(
  path.join(S14, "MERIDIAN_SPRINT14_TIMED_TRANSPORT_COMPARE.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log("Focus scenarios:");
rows
  .filter((r) => r.focus)
  .forEach((r) => {
    console.log("\n*" + r.id, r.title);
    console.log("  OPEN sprint13:", r.sprint13Open.join(" || ") || "(none)");
    console.log("  OPEN sprint14:", r.sprint14Open.join(" || ") || "(none)");
    console.log("  +added:", r.addedOpen.join(" || ") || "(none)");
    console.log("  -removed:", r.removedOpen.join(" || ") || "(none)");
    console.log("  briefingChanged:", r.briefingChanged);
  });

console.log("\nAll deltas (open/briefing/rooms):");
rows
  .filter(
    (r) =>
      r.openCountDelta !== 0 ||
      r.roomsDelta !== 0 ||
      r.briefingChanged ||
      r.addedOpen.length ||
      r.removedOpen.length
  )
  .forEach((r) => {
    console.log(
      " ",
      r.id,
      "open",
      r.sprint13Open.length,
      "→",
      r.sprint14Open.length,
      "| +",
      r.addedOpen.length,
      "-",
      r.removedOpen.length,
      "| rooms+",
      r.roomsDelta,
      r.briefingChanged ? "| briefing changed" : ""
    );
  });

console.log("\nWrote MERIDIAN_SPRINT14_TIMED_TRANSPORT_COMPARE.json");
