/**
 * Compare Meridian Sprint 12 vs Sprint 13 (invalid inventory focus).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const S12 = path.resolve(__dirname, "../sprint12-validation");
const S13 = __dirname;
const FOCUS = ["013", "018"];

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
  const a = load(S12, id, "sprint12");
  const b = load(S13, id, "sprint13");
  const oA = openSum(a);
  const oB = openSum(b);
  rows.push({
    id,
    title: a.title,
    focus: FOCUS.includes(id),
    sprint12Rooms: roomsFromNotes(a),
    sprint13Rooms: roomsFromNotes(b),
    sprint12Open: oA,
    sprint13Open: oB,
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
  label: "MERIDIAN SPRINT 12 → SPRINT 13 INVALID-INVENTORY COMPARE",
  focus: FOCUS,
  scenarios: rows,
};

fs.writeFileSync(
  path.join(S13, "MERIDIAN_SPRINT13_INVALID_INVENTORY_COMPARE.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log("Focus scenarios:");
rows
  .filter((r) => r.focus)
  .forEach((r) => {
    console.log("\n*" + r.id, r.title);
    console.log("  rooms sprint12:", r.sprint12Rooms.join(", ") || "(none)");
    console.log("  rooms sprint13:", r.sprint13Rooms.join(", ") || "(none)");
    console.log("  OPEN sprint12:", r.sprint12Open.join(" || ") || "(none)");
    console.log("  OPEN sprint13:", r.sprint13Open.join(" || ") || "(none)");
  });

console.log("\nOther deltas (open count or rooms gained):");
rows
  .filter(
    (r) => !r.focus && (r.openCountDelta !== 0 || r.roomsDelta !== 0 || r.briefingChanged)
  )
  .forEach((r) => {
    console.log(
      " ",
      r.id,
      "open",
      r.sprint12Open.length,
      "→",
      r.sprint13Open.length,
      "| rooms+",
      r.roomsDelta,
      r.briefingChanged ? "| briefing changed" : ""
    );
  });

console.log("\nWrote MERIDIAN_SPRINT13_INVALID_INVENTORY_COMPARE.json");
