/**
 * Compare frozen Meridian baseline vs Sprint 12 validation (room-token focus).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(__dirname, "../baseline-validation");
const S12 = __dirname;
const FOCUS = ["006", "009", "011", "013", "018"];

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
  const a = load(BASE, id, "baseline");
  const b = load(S12, id, "sprint12");
  const oA = openSum(a);
  const oB = openSum(b);
  rows.push({
    id,
    title: a.title,
    focus: FOCUS.includes(id),
    baselineRooms: roomsFromNotes(a),
    sprint12Rooms: roomsFromNotes(b),
    baselineOpen: oA,
    sprint12Open: oB,
    openCountDelta: oB.length - oA.length,
    roomsDelta:
      roomsFromNotes(b).filter((r) => !roomsFromNotes(a).includes(r)).length,
    briefingChanged: (a.aiSummaryBriefing || "") !== (b.aiSummaryBriefing || ""),
    sourceShaMatch:
      a.inputIntegrity?.scenarioFileSha256 ===
      b.inputIntegrity?.scenarioFileSha256
  });
}

const report = {
  label: "MERIDIAN BASELINE → SPRINT 12 ROOM-TOKEN COMPARE",
  focus: FOCUS,
  scenarios: rows
};

fs.writeFileSync(
  path.join(S12, "MERIDIAN_SPRINT12_ROOM_TOKEN_COMPARE.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log("Focus scenarios:");
rows
  .filter((r) => r.focus)
  .forEach((r) => {
    console.log("\n*" + r.id, r.title);
    console.log("  rooms baseline:", r.baselineRooms.join(", ") || "(none)");
    console.log("  rooms sprint12:", r.sprint12Rooms.join(", ") || "(none)");
    console.log("  OPEN baseline:", r.baselineOpen.join(" || ") || "(none)");
    console.log("  OPEN sprint12:", r.sprint12Open.join(" || ") || "(none)");
  });

console.log("\nOther deltas (open count or rooms gained):");
rows
  .filter((r) => !r.focus && (r.openCountDelta !== 0 || r.roomsDelta !== 0 || r.briefingChanged))
  .forEach((r) => {
    console.log(
      " ",
      r.id,
      "open",
      r.baselineOpen.length,
      "→",
      r.sprint12Open.length,
      "| rooms+",
      r.roomsDelta,
      r.briefingChanged ? "| briefing changed" : ""
    );
  });

console.log("\nWrote MERIDIAN_SPRINT12_ROOM_TOKEN_COMPARE.json");
