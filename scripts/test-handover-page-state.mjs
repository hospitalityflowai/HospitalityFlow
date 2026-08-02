/**
 * AI Shift Handover page-state workflow regressions.
 * Run: node scripts/test-handover-page-state.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const handoverHtml = fs.readFileSync(path.join(ROOT, "handover.html"), "utf8");
const savedJs = fs.readFileSync(path.join(ROOT, "handover-saved.js"), "utf8");
const engineJs = fs.readFileSync(path.join(ROOT, "shift-intelligence-engine.js"), "utf8");
const writingJs = fs.readFileSync(path.join(ROOT, "ai-writing-engine.js"), "utf8");

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

console.log("\nHandover page-state workflow\n");

(function pageStateModel() {
  assert(/HANDOVER_PAGE_STATE\s*=\s*\{/.test(handoverHtml), "explicit HANDOVER_PAGE_STATE model exists");
  assert(/INPUT:\s*"input"/.test(handoverHtml), "input state defined");
  assert(/GENERATED:\s*"generated"/.test(handoverHtml), "generated state defined");
  assert(/SAVED_VIEW:\s*"saved-view"/.test(handoverHtml), "saved-view state defined");
  assert(/function setHandoverPageState/.test(handoverHtml), "setHandoverPageState authority exists");
  assert(/data-handover-page-state/.test(handoverHtml), "state written to data-handover-page-state");
})();

(function inputStateOnOpen() {
  assert(/id="handoverInputWorkspace"/.test(handoverHtml), "input workspace wrapper present");
  assert(/id="outputSection"[\s\S]*?hidden/.test(handoverHtml), "output section starts hidden");
  assert(/id="handoverOutputActions"[\s\S]*?hidden/.test(handoverHtml), "output actions start hidden");
  assert(/finishHandoverPageInit[\s\S]*?setHandoverPageState\(HANDOVER_PAGE_STATE\.INPUT\)/.test(handoverHtml),
    "page init enters input state");
  assert(/html\[data-handover-page-state="input"\] #outputSection/.test(handoverHtml),
    "CSS hides generated UI in input state");
  assert(/Generate Shift Handover/.test(handoverHtml), "Generate Shift Handover CTA present");
})();

(function draftDoesNotAutoOpenGenerated() {
  assert(/must never auto-open the generated report/.test(handoverHtml),
    "draft restore documents no auto-open");
  const applyDraft = handoverHtml.match(/function applyDraftPayload\([\s\S]*?\n      \}/);
  assert(!!applyDraft, "applyDraftPayload found");
  assert(applyDraft && /setHandoverPageState\(HANDOVER_PAGE_STATE\.INPUT\)/.test(applyDraft[0]),
    "draft restore forces input state");
  assert(applyDraft && !/setHandoverPageState\(HANDOVER_PAGE_STATE\.GENERATED\)/.test(applyDraft[0]),
    "draft restore does not enter generated state");
  assert(applyDraft && !/setHandoverOutputChrome\(true\)/.test(applyDraft[0]),
    "draft restore does not force output chrome on");
})();

(function generateSwitchesToGenerated() {
  assert(/generateHandover\([\s\S]*?setHandoverPageState\(HANDOVER_PAGE_STATE\.GENERATED/.test(handoverHtml),
    "Generate switches to generated state");
  assert(/html\[data-handover-page-state="generated"\] \.handover-input-workspace/.test(handoverHtml),
    "generated state hides expanded input form");
  assert(/html\[data-handover-page-state="generated"\] #generateBtn/.test(handoverHtml),
    "generated state hides Generate button");
})();

(function editNotesPreservesValues() {
  assert(/id="editNotesBtn"/.test(handoverHtml), "Edit Notes control exists");
  assert(/function editNotesFromGenerated/.test(handoverHtml), "Edit Notes handler exists");
  assert(/editNotesFromGenerated[\s\S]*?setHandoverPageState\(HANDOVER_PAGE_STATE\.INPUT/.test(handoverHtml),
    "Edit Notes returns to input state");
  assert(/editNotesBtn\.addEventListener\("click",\s*editNotesFromGenerated\)/.test(handoverHtml),
    "Edit Notes is wired");
})();

(function newHandoverClearsCurrentWork() {
  assert(/function startNewHandover/.test(handoverHtml), "New Handover handler exists");
  assert(/startNewHandover[\s\S]*?resetHandoverForm\(\)/.test(handoverHtml),
    "New Handover resets the form");
  assert(/startNewHandover[\s\S]*?clearDraftStorage\(\)/.test(handoverHtml),
    "New Handover clears draft storage");
  assert(/unsaved handover work/.test(handoverHtml), "New Handover warns when unsaved work exists");
  assert(/setHandoverPageState\(HANDOVER_PAGE_STATE\.INPUT/.test(handoverHtml),
    "New Handover returns to input state");
})();

(function saveKeepsGeneratedVisible() {
  assert(/function applyCloudSavedHandoverId/.test(handoverHtml), "save completion hook exists");
  assert(/applyCloudSavedHandoverId[\s\S]*?setHandoverPageState\(HANDOVER_PAGE_STATE\.GENERATED\)/.test(handoverHtml),
    "successful save keeps generated state");
  assert(/setPreviousHandoversExpanded\(true\)/.test(handoverHtml),
    "save expands Previous Handovers list");
  assert(/editingSavedHandoverId/.test(handoverHtml) && /isEditingExistingSavedHandover\s*=\s*true/.test(handoverHtml),
    "save updates existing id to avoid duplicate creates");
})();

(function previousHandoversIntentional() {
  assert(/saved-handovers-section is-collapsed/.test(handoverHtml),
    "Previous Handovers starts collapsed");
  assert(/id="savedHandoversToggle"/.test(handoverHtml), "Previous Handovers toggle exists");
  assert(/function openSavedHandoverView/.test(handoverHtml), "Open uses saved-view path");
  assert(/function editSavedHandover/.test(handoverHtml), "Edit uses intentional editable path");
  assert(/onOpen:\s*openSavedHandoverView/.test(handoverHtml), "archive Open wired to saved-view");
  assert(/onEdit:\s*editSavedHandover/.test(handoverHtml), "archive Edit wired separately");
  assert(/id="backToCurrentHandoverBtn"/.test(handoverHtml), "Back to current handover exists");
  assert(/id="savedViewNewHandoverBtn"/.test(handoverHtml), "saved-view New Handover exists");
  assert(/dateLabel/.test(savedJs) && /Saved /.test(savedJs),
    "archive rows show date / saved time metadata");
})();

(function demoModeSameFlow() {
  assert(/hf-demo-mode-reset[\s\S]*?setHandoverPageState\(HANDOVER_PAGE_STATE\.INPUT\)/.test(handoverHtml),
    "Demo reset returns to input state");
  assert(/hf-demo-mode-change[\s\S]*?applyDemoWorkspaceChrome\(\)[\s\S]*?setHandoverOutputChrome/.test(handoverHtml),
    "Demo mode change keeps chrome restore path");
  assert(/newHandoverBtn\.hidden = demo/.test(handoverHtml) ||
    /newHandoverBtn\.hidden = demo \|\|/.test(handoverHtml),
    "Demo still hides New Handover write path");
  assert(/Demo Mode does not save handovers/.test(handoverHtml),
    "Demo save restriction preserved");
})();

(function noEngineOrWritingBehaviourChanges() {
  /* This suite must not require engine/writing edits; assert page-state lives in handover UI only. */
  assert(!/setHandoverPageState/.test(engineJs), "engine has no page-state coupling");
  assert(!/setHandoverPageState/.test(writingJs), "writing engine has no page-state coupling");
  assert(/function setHandoverOutputChrome/.test(handoverHtml),
    "legacy output chrome helper retained for Demo/Pilot compatibility");
})();

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
