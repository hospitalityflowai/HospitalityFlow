/**
 * Compare frozen Sprint 8 Riverton baseline vs Sprint 9 validation
 * for payment:collect OPEN deltas and seating/briefing changes.
 *
 * Run after both artefact folders exist.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const S8 = path.resolve(__dirname, "../sprint8-baseline-validation");
const S9 = __dirname;

function load(dir, id, suffix) {
  return JSON.parse(
    fs.readFileSync(path.join(dir, "scenario-" + id + "-" + suffix + ".json"), "utf8")
  );
}

function openPaymentCollects(payload) {
  return (payload.canonicalActions || []).filter(
    (a) =>
      a.actionState === "open" && /payment:collect\b/i.test(a.facetKey || "")
  );
}

function collectRecs(payload) {
  return (payload.recommendations || []).filter((r) =>
    /collect\s+outstanding/i.test(r.text || "")
  );
}

function briefHasCollect(payload) {
  return /collect\s+outstanding|outstanding channel payment|Revenue follow-up required for.*payment/i.test(
    payload.aiSummaryBriefing || ""
  );
}

function summarizeActions(acts) {
  return acts.map(
    (a) =>
      "[" +
      a.actionState +
      "] " +
      (a.facetKey || "") +
      " :: " +
      (a.actionText || "") +
      (a.room ? " rm" + a.room : "")
  );
}

const rows = [];
let s8OpenTotal = 0;
let s9OpenTotal = 0;
let falseOpenGone = 0;
let scenariosWithPaymentOpenDrop = 0;
let scenariosWithPaymentOpenRise = 0;

for (let n = 1; n <= 20; n++) {
  const id = String(n).padStart(3, "0");
  const a = load(S8, id, "baseline");
  const b = load(S9, id, "sprint9");
  const s8Pay = openPaymentCollects(a);
  const s9Pay = openPaymentCollects(b);
  s8OpenTotal += s8Pay.length;
  s9OpenTotal += s9Pay.length;
  const delta = s9Pay.length - s8Pay.length;
  if (delta < 0) {
    scenariosWithPaymentOpenDrop += 1;
    falseOpenGone += -delta;
  }
  if (delta > 0) scenariosWithPaymentOpenRise += 1;

  const s8Rec = collectRecs(a).length;
  const s9Rec = collectRecs(b).length;
  const seatingEmptyS8 = /no urgent guest-impacting priorities/i.test(
    a.aiSummaryBriefing || ""
  );
  const seatingEmptyS9 = /no urgent guest-impacting priorities/i.test(
    b.aiSummaryBriefing || ""
  );

  rows.push({
    id,
    title: a.title,
    s8OpenPay: s8Pay.length,
    s9OpenPay: s9Pay.length,
    deltaOpenPay: delta,
    s8PayTexts: summarizeActions(s8Pay),
    s9PayTexts: summarizeActions(s9Pay),
    s8CollectRecs: s8Rec,
    s9CollectRecs: s9Rec,
    s8BriefCollect: briefHasCollect(a),
    s9BriefCollect: briefHasCollect(b),
    s8OpenAll: a.actionStateCounts?.open ?? null,
    s9OpenAll: b.actionStateCounts?.open ?? null,
    seatingEmptyS8,
    seatingEmptyS9,
    briefingChanged: (a.aiSummaryBriefing || "") !== (b.aiSummaryBriefing || ""),
    recCountS8: (a.recommendations || []).length,
    recCountS9: (b.recommendations || []).length
  });
}

const report = {
  label: "RIVERTON SPRINT 8 → SPRINT 9 PAYMENT COMPARE",
  s8OpenPaymentCollectTotal: s8OpenTotal,
  s9OpenPaymentCollectTotal: s9OpenTotal,
  openPaymentCollectNetChange: s9OpenTotal - s8OpenTotal,
  openPaymentCollectActionsRemoved: falseOpenGone,
  scenariosWithFewerOpenPaymentCollects: scenariosWithPaymentOpenDrop,
  scenariosWithMoreOpenPaymentCollects: scenariosWithPaymentOpenRise,
  scenarios: rows
};

fs.writeFileSync(
  path.join(S9, "RIVERTON_SPRINT9_PAYMENT_COMPARE.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log("Sprint 8 OPEN payment:collect total:", s8OpenTotal);
console.log("Sprint 9 OPEN payment:collect total:", s9OpenTotal);
console.log("Net change:", s9OpenTotal - s8OpenTotal);
console.log("OPEN payment:collect actions removed:", falseOpenGone);
console.log("Scenarios with fewer OPEN collects:", scenariosWithPaymentOpenDrop);
console.log("Scenarios with more OPEN collects:", scenariosWithPaymentOpenRise);
console.log("");
rows.forEach((r) => {
  if (r.deltaOpenPay !== 0 || r.s8CollectRecs !== r.s9CollectRecs || r.briefingChanged) {
    console.log(
      r.id,
      "openPay",
      r.s8OpenPay,
      "→",
      r.s9OpenPay,
      "| recCollect",
      r.s8CollectRecs,
      "→",
      r.s9CollectRecs,
      "| briefCollect",
      r.s8BriefCollect,
      "→",
      r.s9BriefCollect,
      r.briefingChanged ? "| briefing changed" : ""
    );
    if (r.s8PayTexts.length) console.log("  S8:", r.s8PayTexts.join(" || "));
    if (r.s9PayTexts.length) console.log("  S9:", r.s9PayTexts.join(" || "));
  }
});
console.log("\nWrote RIVERTON_SPRINT9_PAYMENT_COMPARE.json");
