/**
 * Compare frozen Sprint 10 Riverton validation vs Sprint 11 validation
 * for blocked-allocation OPEN deltas and seating/briefing changes.
 *
 * Run after both artefact folders exist.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const S10 = path.resolve(__dirname, "../sprint10-validation");
const S11 = __dirname;

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

function blockedAllocOpen(payload) {
  return (payload.canonicalActions || []).filter(
    (a) =>
      a.actionState === "open" &&
      /allocation:blocked_assigned|occupancy_conflict/i.test(a.facetKey || "")
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
let s10OpenTotal = 0;
let s11OpenTotal = 0;
let s10PayTotal = 0;
let s11PayTotal = 0;
let s10FalseFamily = 0;
let s11FalseFamily = 0;
let s10BlockedTotal = 0;
let s11BlockedTotal = 0;

for (let n = 1; n <= 20; n++) {
  const id = String(n).padStart(3, "0");
  const a = load(S10, id, "sprint10");
  const b = load(S11, id, "sprint11");
  const s10Open = (a.canonicalActions || []).filter((x) => x.actionState === "open");
  const s11Open = (b.canonicalActions || []).filter((x) => x.actionState === "open");
  const s10Pay = openPaymentCollects(a);
  const s11Pay = openPaymentCollects(b);
  const s10Fam = falseOpenCandidates(a);
  const s11Fam = falseOpenCandidates(b);
  const s10Blocked = blockedAllocOpen(a);
  const s11Blocked = blockedAllocOpen(b);

  s10OpenTotal += s10Open.length;
  s11OpenTotal += s11Open.length;
  s10PayTotal += s10Pay.length;
  s11PayTotal += s11Pay.length;
  s10FalseFamily += s10Fam.length;
  s11FalseFamily += s11Fam.length;
  s10BlockedTotal += s10Blocked.length;
  s11BlockedTotal += s11Blocked.length;

  const focus = ["004", "006", "018"].includes(id);

  rows.push({
    id,
    title: a.title,
    focus,
    s10OpenAll: s10Open.length,
    s11OpenAll: s11Open.length,
    deltaOpenAll: s11Open.length - s10Open.length,
    s10OpenPay: s10Pay.length,
    s11OpenPay: s11Pay.length,
    s10BlockedAllocOpen: s10Blocked.length,
    s11BlockedAllocOpen: s11Blocked.length,
    s10BlockedTexts: summarizeActions(s10Blocked),
    s11BlockedTexts: summarizeActions(s11Blocked),
    s10FalseFamily: s10Fam.length,
    s11FalseFamily: s11Fam.length,
    s10FalseFamilyTexts: summarizeActions(s10Fam),
    s11FalseFamilyTexts: summarizeActions(s11Fam),
    s10Monitor: a.actionStateCounts?.monitor ?? 0,
    s11Monitor: b.actionStateCounts?.monitor ?? 0,
    s10Resolved: a.actionStateCounts?.resolved ?? 0,
    s11Resolved: b.actionStateCounts?.resolved ?? 0,
    briefingChanged: (a.aiSummaryBriefing || "") !== (b.aiSummaryBriefing || ""),
    s10Brief: (a.aiSummaryBriefing || "").slice(0, 220),
    s11Brief: (b.aiSummaryBriefing || "").slice(0, 220),
    sourceShaMatch:
      a.inputIntegrity?.sourceSha256 === b.inputIntegrity?.sourceSha256
  });
}

const report = {
  label: "RIVERTON SPRINT 10 → SPRINT 11 BLOCKED-ALLOCATION COMPARE",
  s10OpenTotal,
  s11OpenTotal,
  openNetChange: s11OpenTotal - s10OpenTotal,
  s10OpenPaymentCollectTotal: s10PayTotal,
  s11OpenPaymentCollectTotal: s11PayTotal,
  paymentCollectNetChange: s11PayTotal - s10PayTotal,
  s10BlockedAllocOpenTotal: s10BlockedTotal,
  s11BlockedAllocOpenTotal: s11BlockedTotal,
  blockedAllocOpenNetChange: s11BlockedTotal - s10BlockedTotal,
  s10FalseFamilyOpenTotal: s10FalseFamily,
  s11FalseFamilyOpenTotal: s11FalseFamily,
  falseFamilyNetChange: s11FalseFamily - s10FalseFamily,
  scenarios: rows
};

fs.writeFileSync(
  path.join(S11, "RIVERTON_SPRINT11_BLOCKED_ALLOC_COMPARE.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log("Sprint 10 OPEN total:", s10OpenTotal);
console.log("Sprint 11 OPEN total:", s11OpenTotal);
console.log("OPEN net change:", s11OpenTotal - s10OpenTotal);
console.log("Blocked/clarify OPEN S10→S11:", s10BlockedTotal, "→", s11BlockedTotal);
console.log("Payment collect OPEN S10→S11:", s10PayTotal, "→", s11PayTotal);
console.log("False-family OPEN S10→S11:", s10FalseFamily, "→", s11FalseFamily);
console.log("");
rows.forEach((r) => {
  if (r.focus || r.deltaOpenAll !== 0 || r.briefingChanged) {
    console.log(
      (r.focus ? "*" : " ") + r.id,
      "open",
      r.s10OpenAll,
      "→",
      r.s11OpenAll,
      "| blocked",
      r.s10BlockedAllocOpen,
      "→",
      r.s11BlockedAllocOpen,
      "| monitor",
      r.s10Monitor,
      "→",
      r.s11Monitor,
      r.briefingChanged ? "| briefing changed" : ""
    );
    if (r.focus) {
      if (r.s10BlockedTexts.length) console.log("  S10 blocked:", r.s10BlockedTexts.join(" || "));
      if (r.s11BlockedTexts.length) console.log("  S11 blocked:", r.s11BlockedTexts.join(" || "));
    }
  }
});
console.log("\nWrote RIVERTON_SPRINT11_BLOCKED_ALLOC_COMPARE.json");
