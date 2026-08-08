/**
 * Score Meridian Gate first-run baseline against frozen Human Expected Truth.
 * Writes MERIDIAN_BASELINE_FAILURE_MAP.json — does not modify engines or scenarios.
 *
 * Verdicts are human review of first-run artefacts (Clear / Partial / Material).
 *
 * Run: node testing/meridian-gate/baseline-validation/score-meridian-baseline.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = __dirname;

function load(id) {
  return JSON.parse(
    fs.readFileSync(path.join(OUT_DIR, "scenario-" + id + "-baseline.json"), "utf8")
  );
}

function openActs(p) {
  return (p.canonicalActions || []).filter((a) => a.actionState === "open");
}

function summarizeOpen(p) {
  return openActs(p).map(
    (a) =>
      "[" +
      (a.facetKey || "") +
      "] " +
      (a.actionText || "") +
      (a.room ? " rm=" + a.room : "")
  );
}

/**
 * Human first-run verdicts vs frozen HET (authoring-time truth).
 * Engine not modified; this is scoring only.
 */
const VERDICTS = {
  "001": {
    verdict: "PARTIAL PASS",
    notes:
      "Quiet briefing / no canonical OPEN is directionally correct. False recommendation on tagged LP sunglasses; M304 MONITOR not surfaced.",
    families: ["false_recommendation", "missing_monitor", "quiet_control_soft"],
  },
  "002": {
    verdict: "MATERIAL FAIL",
    notes:
      "Missing OPEN timed shuttle meet/keys for Langs+Keita. Wrong quiet-shift briefing. Invented 18:30 wake-up. Prepaid non-collect OK.",
    families: [
      "missing_open",
      "meridian_shuttle_unrecognised",
      "false_recommendation",
      "wrong_quiet_shift",
    ],
  },
  "003": {
    verdict: "MATERIAL FAIL",
    notes:
      "CX12 soft mitigated drain + tomorrow look became OPEN maintenance chase (should MONITOR). Company bill non-collect OK. Crew wake surfaced in recs only.",
    families: [
      "wrong_state_open_vs_monitor",
      "soft_maint_not_monitor",
      "sprint10_style_gap",
    ],
  },
  "004": {
    verdict: "PARTIAL PASS",
    notes:
      "Partial Trent luggage/shuttle staging. Missing material annex VD prioritisation + CX03 Acc Okonkwo hold path; dual-building pressure largely unrecognised.",
    families: [
      "missing_open",
      "meridian_annex_unrecognised",
      "meridian_room_id_gap",
      "partial_shuttle",
    ],
  },
  "005": {
    verdict: "MATERIAL FAIL",
    notes:
      "Reopened DONE iron as OPEN. Missing spa day→overnight conversion clarify for Linden. MS03 soft ready ignored.",
    families: [
      "reopened_done",
      "missing_open",
      "meridian_spa_day_guest_unrecognised",
      "sprint10_done_gap",
    ],
  },
  "006": {
    verdict: "MATERIAL FAIL",
    notes:
      "Silent: no OPEN reallocate for Patel off crew-blocked M212; quiet briefing. Contractual crew hold not protected as work.",
    families: [
      "missing_open",
      "silent_on_conflict",
      "meridian_crew_block_unrecognised",
      "wrong_quiet_shift",
    ],
  },
  "007": {
    verdict: "MATERIAL FAIL",
    notes:
      "Silent on valet tickets / park-full OPEN for Shore. Pavilion tomorrow correctly not chased, but primary valet work absent.",
    families: ["missing_open", "meridian_valet_unrecognised", "wrong_quiet_shift"],
  },
  "008": {
    verdict: "CLEAR PASS",
    notes:
      "Truly quiet: no OPEN, quiet briefing, Cho DONE as information. Acceptable absence of hard M304 MONITOR on empty night.",
    families: ["quiet_control_ok"],
  },
  "009": {
    verdict: "MATERIAL FAIL",
    notes:
      "Silent on CX07 stayover vs checkout/vacant-dirty contradiction (Sprint 11-style conflict). Company £95 correctly not collected. Adeyemi DONE OK.",
    families: [
      "missing_open",
      "silent_on_conflict",
      "meridian_room_id_gap",
      "sprint11_blocked_alloc_gap",
    ],
  },
  "010": {
    verdict: "MATERIAL FAIL",
    notes:
      "False OPEN payment:collect on wedding master account + invented £40 minibar collect. Missing cake/valet/CX16 hold OPEN. Payment fail-closed regression-like.",
    families: [
      "false_open_payment",
      "invention",
      "missing_open",
      "sprint9_payment_concern",
      "meridian_pavilion_unrecognised",
    ],
  },
  "011": {
    verdict: "MATERIAL FAIL",
    notes:
      "No canonical OPEN for MA02 Acc Shah or M115 interconnect readiness / 12:50 shuttle. Weak low-priority interconnect rec framed as tomorrow.",
    families: [
      "missing_open",
      "meridian_room_id_gap",
      "meridian_accessible_unrecognised",
      "temporal_misfire",
    ],
  },
  "012": {
    verdict: "CLEAR PASS",
    notes:
      "MONITOR tomorrow inspect for mitigated comfort; towels DONE resolved; no false OPEN. Information-heavy quiet night succeeds.",
    families: ["quiet_control_ok", "monitor_ok", "done_ok"],
  },
  "013": {
    verdict: "MATERIAL FAIL",
    notes:
      "Silent on TR-2 treatment-room-as-bedroom invalid allocation / Crowe reallocate. Cancelled flowers not falsely OPEN. Novel spa inventory failure.",
    families: [
      "missing_open",
      "silent_on_conflict",
      "meridian_treatment_room_unrecognised",
      "invention_risk_absent_but_silent",
    ],
  },
  "014": {
    verdict: "MATERIAL FAIL",
    notes:
      "Genuine £64.80 Calder collect MISSING as OPEN; instead dual OPEN maintenance. Prepaid/company resolved. Sprint 9 true-positive gap + false maint OPEN.",
    families: [
      "missing_open_payment",
      "false_open_maintenance",
      "sprint9_payment_concern",
      "wrong_state_open_vs_monitor",
    ],
  },
  "015": {
    verdict: "MATERIAL FAIL",
    notes:
      "Misframed Okonkwo accessible shuttle conflict as EA/luggage OPEN; missing transport clarify. False 07:20 wake rec. 05:45 DONE not reopened as work (OK).",
    families: [
      "wrong_open_framing",
      "missing_open",
      "meridian_shuttle_unrecognised",
      "false_recommendation",
      "entity_binding_error",
    ],
  },
  "016": {
    verdict: "PARTIAL PASS",
    notes:
      "Twin OPEN for Nwosu correct; champagne conditional→unresolved appropriate. Fruit+welcome card not clearly OPEN (bundled/soft). Balloons not reopened.",
    families: ["amenity_partial", "conditional_ok", "twin_ok"],
  },
  "017": {
    verdict: "MATERIAL FAIL",
    notes:
      "Silent on M213 priority turn, valet tickets before 23:00, and 21:15 shuttle. Wrong quiet briefing into lean Night handoff.",
    families: [
      "missing_open",
      "meridian_crew_block_unrecognised",
      "meridian_valet_unrecognised",
      "meridian_shuttle_unrecognised",
      "wrong_quiet_shift",
    ],
  },
  "018": {
    verdict: "MATERIAL FAIL",
    notes:
      "Does not OPEN-clarify invalid Main+Annex interconnect (M152+CX10). Seats generic 'reserve interconnect tomorrow' without naming impossibility.",
    families: [
      "missing_open",
      "silent_on_conflict",
      "meridian_annex_unrecognised",
      "temporal_misfire",
      "invention_soft",
    ],
  },
  "019": {
    verdict: "CLEAR PASS",
    notes:
      "Quiet control: no urgent OPEN, settled folios non-collect, declined flowers not prepped, quiet briefing.",
    families: ["quiet_control_ok", "payment_fail_closed_ok", "done_ok"],
  },
  "020": {
    verdict: "PARTIAL PASS",
    notes:
      "Holt £42.50 collect OPEN preserved (Sprint 9 TP). Quill/Opera noise not collected. Briefing wrongly leads with leak chase (should MONITOR controlled stain); wake 04:30 present.",
    families: [
      "payment_collect_ok",
      "wrong_state_open_vs_monitor",
      "priority_seating_error",
      "false_friend_noise_mostly_ok",
    ],
  },
};

const familyFreq = {};
const rows = [];
let clear = 0;
let partial = 0;
let material = 0;

for (let n = 1; n <= 20; n++) {
  const id = String(n).padStart(3, "0");
  const p = load(id);
  const v = VERDICTS[id];
  if (v.verdict === "CLEAR PASS") clear += 1;
  else if (v.verdict === "PARTIAL PASS") partial += 1;
  else material += 1;
  (v.families || []).forEach((f) => {
    familyFreq[f] = (familyFreq[f] || 0) + 1;
  });
  rows.push({
    scenarioId: id,
    title: p.title,
    shift: p.scenarioMeta.shift,
    load: p.scenarioMeta.operationalLoad,
    verdict: v.verdict,
    notes: v.notes,
    families: v.families,
    gitCommit: p.gitCommit,
    scenarioFileSha256: p.inputIntegrity.scenarioFileSha256,
    sourceSha256: p.inputIntegrity.sourceSha256,
    actionStateCounts: p.actionStateCounts,
    openActionsObserved: summarizeOpen(p),
    hetOpen: p.humanExpectedTruth.open || [],
    hetMonitor: p.humanExpectedTruth.monitor || [],
    briefingLead: String(p.aiSummaryBriefing || "").split("\n").slice(0, 4).join(" | "),
    recommendationCount: (p.recommendations || []).length,
    openPaymentCollectCount: openActs(p).filter((a) =>
      /payment:collect/i.test(a.facetKey || "")
    ).length,
  });
}

const familySorted = Object.keys(familyFreq)
  .map((k) => ({ family: k, count: familyFreq[k] }))
  .sort((a, b) => b.count - a.count);

const report = {
  label: "MERIDIAN GATE FIRST-RUN BASELINE FAILURE MAP",
  hotel: "The Meridian Gate Hotel & Spa (fictional)",
  engineCommit: rows[0] && rows[0].gitCommit,
  scoredAt: new Date().toISOString(),
  freezeStatus: "FROZEN BEFORE FIRST HF RUN — scenarios unchanged",
  totals: {
    clearPass: clear,
    partialPass: partial,
    materialFail: material,
    scored: 20,
  },
  rivertonSprint8BaselineCompareNote:
    "Riverton Sprint 8 first human benchmark was approximately Clear/Partial/Material 1/5/14. Meridian first-run at Sprint 11 HEAD scores " +
    clear +
    "/" +
    partial +
    "/" +
    material +
    ". Slightly more Clear on quiet controls, but Material still dominates — engine does not yet generalise confidently to Meridian-native ops.",
  sprint9to11ContractSignals: {
    paymentFalseOpen: ["010"],
    paymentMissingGenuineOpen: ["014"],
    paymentTruePositivePreserved: ["020"],
    softMaintShouldMonitorButOpen: ["003", "020"],
    blockedAllocSilentOnMeridianIds: ["006", "009", "013", "018"],
    doneReopened: ["005"],
  },
  topSuspectedRootCauses: [
    "Unfamiliar Meridian room tokens (M/CX/MS/MA/TR) not bound like numeric city rooms — allocation/conflict paths stay silent",
    "Shuttle / valet / spa-day / crew-block / pavilion ops absent from canonical action vocabulary — missing OPEN on native work",
    "Quiet-shift over-trigger when Meridian cues are not recognised as actionable",
    "Payment fail-closed incomplete on event master-account / unposted minibar (010) and missed genuine £ amount (014)",
    "Soft/mitigated maintenance still OPEN in some Night shapes (003) despite MONITOR language",
    "DONE amenity reopen risk remains in at least one case (005 iron)",
  ],
  generalisesBetterThanRivertonSprint8Baseline:
    "Marginally on quiet-control Clear count (3 vs ~1), not on operational generalisation — Material remains majority; Meridian-native failures are new, not Riverton retreads.",
  failureFamilyFrequency: familySorted,
  scenarios: rows,
};

fs.writeFileSync(
  path.join(OUT_DIR, "MERIDIAN_BASELINE_FAILURE_MAP.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log("Totals Clear/Partial/Material:", clear, partial, material);
console.log("");
rows.forEach((r) => {
  console.log(r.scenarioId, r.verdict, "|", r.title);
});
console.log("\nTop families:");
familySorted.slice(0, 12).forEach((f) => console.log(" ", f.count, f.family));
console.log("\nWrote MERIDIAN_BASELINE_FAILURE_MAP.json");
