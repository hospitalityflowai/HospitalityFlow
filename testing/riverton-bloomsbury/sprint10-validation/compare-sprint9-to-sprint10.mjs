/**
 * Compare frozen Sprint 9 Riverton validation vs Sprint 10 validation
 * for state-resolution OPEN deltas and seating/briefing changes.
 *
 * Run after both artefact folders exist.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const S9 = path.resolve(__dirname, "../sprint9-validation");
const S10 = __dirname;

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

function falseOpenCandidates(payload) {
  return (payload.canonicalActions || []).filter((a) => {
    if (a.actionState !== "open") return false;
    const text = ((a.actionText || "") + " " + (a.evidenceText || "")).toLowerCase();
    const facet = String(a.facetKey || "");
    return (
      /amenity:prep|amenity:twin|guest_request:extra_pillows|maintenance\b/i.test(facet) ||
      /prepare (fruit|twin|champagne|flowers)|extra pillows|follow up (open )?maintenance/i.test(
        a.actionText || ""
      ) ||
      /delivered — done|already in room|twin done|cancelled|if available|no flowers|monitor 307|cosmetic/i.test(
        text
      )
    );
  });
}

const rows = [];
let s9OpenTotal = 0;
let s10OpenTotal = 0;
let s9PayTotal = 0;
let s10PayTotal = 0;
let s9FalseFamily = 0;
let s10FalseFamily = 0;

for (let n = 1; n <= 20; n++) {
  const id = String(n).padStart(3, "0");
  const a = load(S9, id, "sprint9");
  const b = load(S10, id, "sprint10");
  const s9Open = (a.canonicalActions || []).filter((x) => x.actionState === "open");
  const s10Open = (b.canonicalActions || []).filter((x) => x.actionState === "open");
  const s9Pay = openPaymentCollects(a);
  const s10Pay = openPaymentCollects(b);
  const s9Fam = falseOpenCandidates(a);
  const s10Fam = falseOpenCandidates(b);

  s9OpenTotal += s9Open.length;
  s10OpenTotal += s10Open.length;
  s9PayTotal += s9Pay.length;
  s10PayTotal += s10Pay.length;
  s9FalseFamily += s9Fam.length;
  s10FalseFamily += s10Fam.length;

  const focus = ["001", "005", "007", "008", "012", "020"].includes(id);

  rows.push({
    id,
    title: a.title,
    focus,
    s9OpenAll: s9Open.length,
    s10OpenAll: s10Open.length,
    deltaOpenAll: s10Open.length - s9Open.length,
    s9OpenPay: s9Pay.length,
    s10OpenPay: s10Pay.length,
    s9FalseFamily: s9Fam.length,
    s10FalseFamily: s10Fam.length,
    s9FalseFamilyTexts: summarizeActions(s9Fam),
    s10FalseFamilyTexts: summarizeActions(s10Fam),
    s9Monitor: a.actionStateCounts?.monitor ?? 0,
    s10Monitor: b.actionStateCounts?.monitor ?? 0,
    s9Resolved: a.actionStateCounts?.resolved ?? 0,
    s10Resolved: b.actionStateCounts?.resolved ?? 0,
    briefingChanged: (a.aiSummaryBriefing || "") !== (b.aiSummaryBriefing || ""),
    s9Brief: (a.aiSummaryBriefing || "").slice(0, 180),
    s10Brief: (b.aiSummaryBriefing || "").slice(0, 180),
    sourceShaMatch:
      a.inputIntegrity?.sourceSha256 === b.inputIntegrity?.sourceSha256
  });
}

const report = {
  label: "RIVERTON SPRINT 9 → SPRINT 10 STATE-RESOLUTION COMPARE",
  s9OpenTotal,
  s10OpenTotal,
  openNetChange: s10OpenTotal - s9OpenTotal,
  s9OpenPaymentCollectTotal: s9PayTotal,
  s10OpenPaymentCollectTotal: s10PayTotal,
  paymentCollectNetChange: s10PayTotal - s9PayTotal,
  s9FalseFamilyOpenTotal: s9FalseFamily,
  s10FalseFamilyOpenTotal: s10FalseFamily,
  falseFamilyNetChange: s10FalseFamily - s9FalseFamily,
  scenarios: rows
};

fs.writeFileSync(
  path.join(S10, "RIVERTON_SPRINT10_STATE_COMPARE.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log("Sprint 9 OPEN total:", s9OpenTotal);
console.log("Sprint 10 OPEN total:", s10OpenTotal);
console.log("OPEN net change:", s10OpenTotal - s9OpenTotal);
console.log("Payment collect OPEN S9→S10:", s9PayTotal, "→", s10PayTotal);
console.log("False-family OPEN S9→S10:", s9FalseFamily, "→", s10FalseFamily);
console.log("");
rows.forEach((r) => {
  if (r.focus || r.deltaOpenAll !== 0 || r.briefingChanged) {
    console.log(
      (r.focus ? "*" : " ") + r.id,
      "open",
      r.s9OpenAll,
      "→",
      r.s10OpenAll,
      "| monitor",
      r.s9Monitor,
      "→",
      r.s10Monitor,
      "| fam",
      r.s9FalseFamily,
      "→",
      r.s10FalseFamily,
      r.briefingChanged ? "| briefing changed" : ""
    );
    if (r.focus) {
      if (r.s9FalseFamilyTexts.length) console.log("  S9 fam:", r.s9FalseFamilyTexts.join(" || "));
      if (r.s10FalseFamilyTexts.length) console.log("  S10 fam:", r.s10FalseFamilyTexts.join(" || "));
    }
  }
});
console.log("\nWrote RIVERTON_SPRINT10_STATE_COMPARE.json");
