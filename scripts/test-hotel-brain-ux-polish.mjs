/**
 * Hotel Brain premium UX polish regressions.
 * Run: node scripts/test-hotel-brain-ux-polish.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const profileHtml = fs.readFileSync(path.join(ROOT, "hotel-profile.html"), "utf8");
const knowledgeJs = fs.readFileSync(path.join(ROOT, "hotel-profile-knowledge.js"), "utf8");
const storeJs = fs.readFileSync(path.join(ROOT, "js", "hotel-brain-store.js"), "utf8");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log("  ✓ " + message);
  } else {
    failed += 1;
    console.error("  ✗ " + message);
  }
}

function extractArrayLiteral(src, name) {
  const re = new RegExp("var\\s+" + name + "\\s*=\\s*\\[([\\s\\S]*?)\\];");
  const m = src.match(re);
  if (!m) return null;
  return m[1]
    .split(",")
    .map((s) => s.replace(/['"\s]/g, ""))
    .filter(Boolean);
}

console.log("\n1. Top status consolidated without losing data");
assert(profileHtml.includes('id="hotelBrainSetupCard"'), "setup card id preserved");
assert(profileHtml.includes("brain-status-shell"), "consolidated status shell present");
assert(profileHtml.includes("brain-status-grid"), "status grid present");
assert(profileHtml.includes('id="essentialProgressPanel"'), "core setup panel retained");
assert(profileHtml.includes('id="profileProgressPanel"'), "knowledge coverage panel retained");
assert(profileHtml.includes('id="essentialProgressCount"'), "core count retained");
assert(profileHtml.includes('id="profileProgressCount"'), "knowledge count retained");
assert(profileHtml.includes('id="lastSavedLine"'), "last saved retained");
assert(profileHtml.includes('id="hotelBrainStatus"'), "hotel brain status retained");
assert(profileHtml.includes('id="hotelBrainPageSubtitle"'), "page subtitle retained");
assert(profileHtml.includes('id="hotelBrainSetupIntro"'), "setup explanation retained");
assert(!/class="progress-stats"/.test(profileHtml), "equal competing four-stat grid removed");

console.log("\n2. Complete state avoids full green card background");
const completeCss = profileHtml.match(
  /\.essential-progress-panel\.is-complete\s*\{([^}]+)\}/
);
assert(!!completeCss, "complete-state CSS rule exists");
assert(
  completeCss && !/green-50|var\(--green/.test(completeCss[1]),
  "complete panel background is not green"
);
assert(
  /\.essential-progress-panel\.is-complete\s+\.essential-progress-fill\s*\{[^}]*navy-700/.test(profileHtml) ||
    /\.essential-progress-panel\.is-complete\s+\.essential-progress-fill\s*\{[^}]*blue-500/.test(profileHtml),
  "complete progress fill stays navy/blue"
);
assert(profileHtml.includes("brain-status-check"), "subtle green check indicator present");
assert(!/is-complete[^}]*background:\s*linear-gradient\([^)]*green-50/.test(profileHtml),
  "no green-50 complete card gradient");

console.log("\n3. Completion values remain internally consistent");
const essential = extractArrayLiteral(knowledgeJs, "ESSENTIAL_PROGRESS_SECTIONS");
const progress = extractArrayLiteral(knowledgeJs, "PROGRESS_SECTIONS");
assert(essential && essential.length === 4, "core setup tracks 4 sections");
assert(progress && progress.length === 9, "knowledge coverage tracks 9 sections");
assert(
  essential && progress && essential.every((id) => progress.includes(id)),
  "core sections are a subset of knowledge coverage sections"
);
assert(knowledgeJs.includes("Ready for AI Shift Handover"), "core ready uses manager-facing wording");
assert(knowledgeJs.includes("Essential details needed"), "core incomplete uses manager-facing wording");
assert(knowledgeJs.includes("hotelKnowledgeFoundationLabel"), "hotel knowledge foundation helper present");
assert(knowledgeJs.includes("Foundation complete"), "foundation-complete wording present");
assert(knowledgeJs.includes("Building foundation"), "foundation-building wording present");
assert(knowledgeJs.includes("Continue building your hotel's operational memory."), "growth encouragement present");
assert(!knowledgeJs.includes("All knowledge areas available"), "complete-knowledge wording removed");
assert(!knowledgeJs.includes("knowledge areas ready"), "knowledge-areas-ready wording removed");
assert(profileHtml.includes("Essential details needed"), "core status placeholder present");
assert(profileHtml.includes("Hotel Knowledge"), "Hotel Knowledge label present");
assert(profileHtml.includes("Continue building your hotel's operational memory."), "growth copy in markup");
assert(!profileHtml.includes("Knowledge Library"), "Knowledge Library status label removed");
assert(!profileHtml.includes("0 / 4"), "implementation-style 4/4 core count removed from markup");
assert(!profileHtml.includes("0 / 9"), "implementation-style 9/9 section count removed from markup");
assert(!knowledgeJs.includes(" / ' + progress.total + ' complete"), "4/4 complete label removed from JS");
assert(!knowledgeJs.includes(" / ' + progress.total + ' sections"), "N/N sections label removed from JS");

console.log("\n4–5. Section counts use real data; empty states are honest");
assert(profileHtml.includes(" in inventory"), "rooms count copy present");
assert(profileHtml.includes("No rooms added"), "rooms empty state present");
assert(profileHtml.includes("No policies added"), "policies empty state present");
assert(profileHtml.includes("No guest preferences added"), "guest preferences empty state present");
assert(profileHtml.includes("No inventory items added"), "inventory empty state present");
assert(profileHtml.includes("No departments added"), "departments empty state present");
assert(profileHtml.includes("No shift procedures added"), "shift procedures empty state present");
assert(profileHtml.includes("tracked item"), "inventory count copy present");
assert(profileHtml.includes("with guidance"), "policies count copy present");
assert(!profileHtml.includes("Math.random"), "no invented random counts");

console.log("\n6. Save-state messages do not contradict Hotel Brain status");
assert(knowledgeJs.includes("hasActiveSaveError"), "save-error awareness in status UI");
assert(knowledgeJs.includes("Save needed"), "status demoted when save fails");
assert(profileHtml.includes("Saved just now"), "saved-just-now messaging present");
assert(profileHtml.includes("Saving…"), "saving messaging present");
assert(profileHtml.includes("Unable to save"), "unable-to-save messaging present");
assert(profileHtml.includes("saveFailure: true"), "Unable to save reserved for actual save failures");
assert(
  /function showSaveError\(message,\s*opts\)/.test(profileHtml) &&
    /if \(opts\.saveFailure\) updateChangesStatus\('error'\)/.test(profileHtml),
  "non-save errors do not force Unable to save on status line"
);

console.log("\n7. Demo Mode remains fully read-only");
assert(profileHtml.includes("applyHotelBrainDemoReadOnlyState"), "demo read-only applicator present");
assert(profileHtml.includes("hf-demo-brain-readonly"), "demo readonly class toggled");
assert(profileHtml.includes("Saving is unavailable in Demo Mode"), "save disabled in demo");
assert(profileHtml.includes("DEMO_BRAIN_MUTATION_SELECTOR"), "mutation controls gated");
assert(profileHtml.includes("lockDemoBrainField"), "fields locked in demo");

console.log("\n8. Sidebar and accordion functionality unchanged");
assert(knowledgeJs.includes("initSidebarNav"), "sidebar init retained");
assert(knowledgeJs.includes("bindDisclosureCards"), "disclosure accordions retained");
assert(profileHtml.includes("profile-card--collapsible"), "collapsible section cards retained");
assert(profileHtml.includes("section-nav"), "section nav retained");
assert(knowledgeJs.includes("Core Setup"), "Core Setup nav group retained");
assert(knowledgeJs.includes("Knowledge"), "Knowledge nav group retained");

console.log("\n9. No schema or Hotel Brain data-contract changes");
assert(knowledgeJs.includes("SCHEMA_V3"), "SCHEMA_V3 marker retained");
assert(storeJs.includes("HFHotelBrainStore") || storeJs.includes("HotelBrainStore"), "store module retained");
assert(
  !/ALTER TABLE|CREATE TABLE|supabase\.rpc\(['\"]alter/i.test(knowledgeJs + storeJs),
  "no schema migration language introduced"
);

console.log("\n10. Copy positions Hotel Brain as operational memory");
assert(
  profileHtml.includes("The operational knowledge behind AI Shift Handover and future Hospitality Flow tools."),
  "page description updated"
);
assert(
  profileHtml.includes("Start with the essential hotel details, then build your Hotel Brain over time with policies, guest preferences and operational knowledge."),
  "setup explanation updated"
);
assert(knowledgeJs.includes("Ready for AI Shift Handover"), "calm complete message present");
assert(profileHtml.includes("brain-status-bar-sr"), "completion percentage bars de-emphasised");

console.log("\n11. Visual consistency with AI Shift Handover");
assert(/\.nav-badge\s*\{[^}]*blue-50/.test(profileHtml), "Hotel Brain badge uses blue/navy language");
assert(!/\.nav-badge\s*\{[^}]*purple/.test(profileHtml), "Hotel Brain badge is not purple");
assert(/\.nav-badge-dot\s*\{[^}]*blue-500/.test(profileHtml), "badge dot matches handover blue");
assert(profileHtml.includes("--shadow-card:"), "shared card shadow token present");
assert(profileHtml.includes("-webkit-backdrop-filter: blur(12px)"), "nav blur matches handover");
assert(profileHtml.includes("btn-save:focus-visible"), "primary save focus state present");

console.log("\n─── Results ───");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed) process.exit(1);
