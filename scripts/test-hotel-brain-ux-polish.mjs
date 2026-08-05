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
const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

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

console.log("\n1. Three-pillar Hotel Brain hero without duplicated progress cards");
assert(profileHtml.includes('id="hotelBrainSetupCard"'), "setup card id preserved");
assert(profileHtml.includes("brain-status-shell"), "status shell present");
assert(profileHtml.includes("brain-pillars"), "three-pillar grid present");
assert(profileHtml.includes("Hotel Intelligence"), "Hotel Intelligence pillar present");
assert(profileHtml.includes("Guest Intelligence"), "Guest Intelligence pillar present");
assert(
  /brain-pillar--handover[\s\S]*?AI Shift Handover/.test(profileHtml) ||
    profileHtml.includes("Uses both intelligence layers every shift"),
  "AI Shift Handover pillar present"
);
assert(profileHtml.includes('id="essentialProgressPanel"'), "core progress retained internally");
assert(profileHtml.includes('id="profileProgressPanel"'), "knowledge progress retained internally");
assert(/brain-status-grid[^>]*visually-hidden/.test(profileHtml), "legacy progress cards relocated/hidden");
assert(profileHtml.includes('id="essentialProgressCount"'), "core count retained");
assert(profileHtml.includes('id="profileProgressCount"'), "knowledge count retained");
assert(profileHtml.includes('id="lastSavedLine"'), "last saved retained");
assert(profileHtml.includes('id="hotelBrainStatus"'), "hotel brain status retained");
assert(profileHtml.includes('id="hotelBrainPageSubtitle"'), "page subtitle retained");
assert(profileHtml.includes('id="hotelBrainSetupIntro"'), "setup explanation retained");
assert(profileHtml.includes("Teach Hospitality Flow how your hotel operates"), "teach-once description present");
assert(!/class="progress-stats"/.test(profileHtml), "equal competing four-stat grid removed");

console.log("\n2. Complete state avoids full green card background");
const completeCss = profileHtml.match(
  /\.essential-progress-panel\.is-complete\s*\{([^}]*)\}/
);
assert(!!completeCss || profileHtml.includes("essential-progress-panel.is-complete"), "complete-state CSS rule exists");
assert(
  !/essential-progress-panel\.is-complete\s*\{[^}]*green-50/.test(profileHtml) &&
    !/essential-progress-panel\.is-complete\s*\{[^}]*var\(--green/.test(profileHtml),
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
assert(progress && progress.length === 7, "knowledge coverage tracks 7 sections");
assert(
  essential && progress && essential.every((id) => progress.includes(id)),
  "core sections are a subset of knowledge coverage sections"
);
assert(knowledgeJs.includes("Ready for AI Shift Handover"), "core ready uses manager-facing wording");
assert(knowledgeJs.includes("Essentials optional") || knowledgeJs.includes("grows over time"), "core incomplete uses living-memory wording");
assert(knowledgeJs.includes("hotelKnowledgeFoundationLabel"), "hotel knowledge foundation helper present");
assert(knowledgeJs.includes("Hotel Intelligence ready"), "foundation-complete wording present");
assert(knowledgeJs.includes("Growing Hotel Intelligence"), "foundation-building wording present");
assert(knowledgeJs.includes("Add knowledge anytime") || knowledgeJs.includes("operational memory"), "growth encouragement present");
assert(profileHtml.includes("Growing Hotel Intelligence"), "Growing Hotel Intelligence retained for internal status");
assert(profileHtml.includes("Add another occasion"), "special occasions Add another action present");
assert(profileHtml.includes("Add another amenity"), "amenities Add another action present");
assert(/id="demoModePanel"[^>]*\bhidden\b/.test(profileHtml), "Demo Mode section removed from Settings UI");
assert(/hotelBrainSetupTitle[^>]*>[\s\S]*?visually-hidden/.test(profileHtml) ||
  /setup-intro-title visually-hidden/.test(profileHtml), "duplicate Hotel Brain hero heading hidden");
assert(!knowledgeJs.includes("All knowledge areas available"), "complete-knowledge wording removed");
assert(!knowledgeJs.includes("knowledge areas ready"), "knowledge-areas-ready wording removed");
assert(profileHtml.includes("Essentials optional") || profileHtml.includes("grows over time"), "core status placeholder present");
assert(profileHtml.includes("Hotel Knowledge"), "Hotel Knowledge label present");
assert(profileHtml.includes("Add knowledge anytime") || profileHtml.includes("grows over time"), "growth copy in markup");
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
assert(profileHtml.includes("Guest Intelligence"), "guest intelligence section present");
assert(profileHtml.includes("Hotel Terminology"), "hotel terminology label present");
assert(/id="operational-knowledge"[^>]*\bhidden\b/.test(profileHtml), "shift procedures section hidden from main UX");
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
assert(profileHtml.includes('id="sectionNav"') || profileHtml.includes("section-nav"), "sidebar init retained");
assert(profileHtml.includes("bindDisclosureCards") || profileHtml.includes("disclosure-card"), "disclosure accordions retained");
assert(profileHtml.includes("profile-card") && profileHtml.includes("collapse-toggle"), "collapsible section cards retained");
assert(profileHtml.includes('id="sectionNav"'), "section nav retained");
assert(profileHtml.includes("Core Setup") || profileHtml.includes("core"), "Core Setup nav group retained");
assert(profileHtml.includes("Knowledge"), "Knowledge nav group retained");

console.log("\n9. No schema or Hotel Brain data-contract changes");
assert(storeJs.includes("SCHEMA_V3") || storeJs.includes("schemaVersion"), "SCHEMA_V3 marker retained");
assert(storeJs.includes("HFHotelBrainStore") || storeJs.includes("hotel-brain"), "store module retained");
assert(!profileHtml.includes("schema migration"), "no schema migration language introduced");

console.log("\n10. Copy positions Hotel Brain as operational memory");
assert(profileHtml.includes("Teach Hospitality Flow"), "page description updated");
assert(profileHtml.includes("intelligence grow"), "setup explanation updated");
assert(knowledgeJs.includes("Ready for AI Shift Handover"), "calm complete message present");
assert(profileHtml.includes("brain-status-bar-sr"), "completion percentage bars de-emphasised");

console.log("\n11. Visual consistency with AI Shift Handover");
assert(/nav-badge/.test(profileHtml) && !/\.nav-badge\s*\{[^}]*purple/.test(profileHtml), "Hotel Brain badge uses blue/navy language");
assert(!/\.nav-badge\s*\{[^}]*purple/.test(profileHtml), "Hotel Brain badge is not purple");
assert(profileHtml.includes("nav-badge-dot"), "badge dot matches handover blue");
assert(profileHtml.includes("--shadow") || profileHtml.includes("box-shadow"), "shared card shadow token present");
assert(profileHtml.includes("backdrop-filter") || profileHtml.includes("topnav"), "nav blur matches handover");
assert(profileHtml.includes("btn-save") || profileHtml.includes(":focus"), "primary save focus state present");

console.log("\n12. Landing page tells the same three-pillar story");
assert(indexHtml.includes("Hotel Intelligence"), "landing Hotel Intelligence present");
assert(indexHtml.includes("Guest Intelligence"), "landing Guest Intelligence present");
assert(indexHtml.includes("AI Shift Handover"), "landing AI Shift Handover present");
assert(indexHtml.includes("learns your hotel and your guests") || indexHtml.includes("learns how your hotel operates"), "landing teach-once story present");
assert(indexHtml.includes("foundation-stack"), "landing pillar stack present");
assert(!indexHtml.includes("One Intelligent Foundation"), "old foundation heading removed");
assert(!indexHtml.includes("foundation-connector"), "old two-tier connector removed");

console.log("\n13. Shared design system unifies product pages");
const designCss = fs.readFileSync(path.join(ROOT, "css", "hf-design-system.css"), "utf8");
const handoverHtml = fs.readFileSync(path.join(ROOT, "handover.html"), "utf8");
assert(designCss.includes("--hf-shadow-elevated"), "design system elevated shadow token present");
assert(designCss.includes(".brain-pillar") && designCss.includes(".hf-pillar"), "signature pillar styles shared");
assert(profileHtml.includes('href="css/hf-design-system.css"'), "Hotel Brain loads design system");
assert(handoverHtml.includes('href="css/hf-design-system.css"'), "Handover loads design system");
assert(!handoverHtml.includes("hf-pillars--compact"), "Handover does not repeat three pillar cards");
assert(handoverHtml.includes("Powered by Hotel Brain"), "Handover keeps Powered by Hotel Brain card");
assert(handoverHtml.includes("Explore Hotel Brain"), "Handover keeps Explore Hotel Brain action");
assert(profileHtml.includes("brain-pillars"), "Hotel Brain retains three pillar cards");

console.log("\n─── Results ───");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed) process.exit(1);
