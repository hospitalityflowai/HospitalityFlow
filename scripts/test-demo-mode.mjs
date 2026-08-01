/**
 * Demo Mode isolation + Oakwood consistency regression tests.
 * Run: node scripts/test-demo-mode.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message) {
  console.error("FAIL:", message);
  return false;
}

function pass(message) {
  console.log("PASS:", message);
  return true;
}

function loadDemoRuntime(options) {
  options = options || {};
  const localStore = {};
  const sessionStore = {};
  const tenantContext = options.publicVisitor
    ? null
    : { userId: "user-demo", workspaceId: "hotel-ws-1" };
  const locationState = { href: options.href || "account.html", reloadCount: 0 };
  const brainCalls = { save: 0, setCache: 0, load: 0 };
  const handoverCalls = {
    saveDraft: 0,
    clearDraft: 0,
    saveHandover: 0,
    deleteHandover: 0,
    loadDraft: 0
  };
  const maintenanceCalls = { createIssue: 0 };

  const userDraft = {
    hotelName: "Real Customer Hotel",
    preparedBy: "Alex Real",
    shift: "AM",
    date: "2026-07-30",
    notes: "USER DRAFT — must survive demo",
    hasGeneratedOutput: false,
    savedAt: "2026-07-30T10:00:00.000Z"
  };

  const userBrain = {
    schemaVersion: 4,
    savedAt: "2026-07-30T09:00:00.000Z",
    general: {
      hotelName: "Real Customer Hotel",
      hotelType: "Boutique",
      totalRooms: "40",
      city: "Manchester",
      country: "United Kingdom"
    },
    roomFacilities: [{ roomNo: "101", notes: "Customer room" }],
    operationalKnowledge: { knowledgeEntries: [], sampleDataRegistry: [], sampleDataLoaded: {} }
  };

  let cachedBrain = JSON.parse(JSON.stringify(userBrain));
  let storedDraft = JSON.parse(JSON.stringify(userDraft));
  let savedHandovers = [
    {
      id: "real-handover-1",
      hotelName: "Real Customer Hotel",
      preparedBy: "Alex Real",
      originalNotes: "Real saved handover"
    }
  ];
  let realIssues = [
    {
      id: "real-issue-1",
      title: "Real leak",
      roomNumber: "101",
      status: "open",
      priority: "medium",
      category: "plumbing",
      locationType: "guest_room",
      includeInHandover: true
    }
  ];

  const context = {
    window: {},
    console,
    Date,
    JSON,
    Promise,
    Object,
    Array,
    String,
    Math,
    Error,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: function (cb) {
      cb();
    },
    matchMedia: function () {
      return { matches: true };
    },
    sessionStorage: {
      getItem: function (key) {
        return Object.prototype.hasOwnProperty.call(sessionStore, key) ? sessionStore[key] : null;
      },
      setItem: function (key, value) {
        sessionStore[key] = String(value);
      },
      removeItem: function (key) {
        delete sessionStore[key];
      }
    },
    location: {
      get href() {
        return locationState.href;
      },
      set href(value) {
        locationState.href = String(value);
      },
      pathname: "/handover.html",
      search: options.search || "",
      hash: "",
      reload: function () {
        locationState.reloadCount += 1;
      }
    },
    history: {
      replaceState: function () {}
    },
    confirm: function () {
      return true;
    },
    document: {
      body: {
        appendChild: function () {},
        insertBefore: function () {},
        firstChild: null
      },
      createElement: function (tag) {
        var listeners = [];
        var children = [];
        var el = {
          id: "",
          className: "",
          hidden: true,
          isConnected: true,
          innerHTML: "",
          style: {},
          tagName: String(tag || "div").toUpperCase(),
          children: children,
          appendChild: function (child) {
            children.push(child);
            return child;
          },
          querySelector: function () {
            return el;
          },
          querySelectorAll: function () {
            return children.slice();
          },
          setAttribute: function () {},
          classList: {
            add: function () {},
            remove: function () {},
            toggle: function () {}
          },
          addEventListener: function (type, fn) {
            listeners.push({ type: type, fn: fn });
          }
        };
        return el;
      },
      getElementById: function () {
        return null;
      },
      documentElement: {
        classList: { add: function () {}, remove: function () {}, toggle: function () {} }
      }
    },
    CustomEvent: function (name, init) {
      this.name = name;
      this.detail = init && init.detail;
    }
  };
  context.window = context;
  context.globalThis = context;

  context.window.HFTenantStorage = {
    resolveScopeId: function (preferred) {
      if (preferred) return preferred;
      if (!tenantContext) return null;
      return tenantContext.workspaceId || ("user_" + tenantContext.userId);
    },
    readTenantContext: function () {
      return tenantContext;
    },
    getRaw: function (key, scopeId) {
      var scope = scopeId || (tenantContext
        ? (tenantContext.workspaceId || ("user_" + tenantContext.userId))
        : "public");
      return localStore[key + "_" + scope] || null;
    },
    setRaw: function (key, value, scopeId) {
      var scope = scopeId || (tenantContext
        ? (tenantContext.workspaceId || ("user_" + tenantContext.userId))
        : "public");
      localStore[key + "_" + scope] = value;
      return true;
    },
    remove: function (key, scopeId) {
      var scope = scopeId || (tenantContext
        ? (tenantContext.workspaceId || ("user_" + tenantContext.userId))
        : "public");
      delete localStore[key + "_" + scope];
    }
  };

  context.window.HFHotelBrainStore = {
    getCached: function () {
      return JSON.parse(JSON.stringify(cachedBrain));
    },
    load: function () {
      brainCalls.load += 1;
      return Promise.resolve({
        profile: JSON.parse(JSON.stringify(cachedBrain)),
        hotelId: "hotel-ws-1"
      });
    },
    save: function (profile) {
      brainCalls.save += 1;
      cachedBrain = JSON.parse(JSON.stringify(profile));
      return Promise.resolve({ profile: cachedBrain, hotelId: "hotel-ws-1" });
    },
    setCache: function (hotelId, profile) {
      brainCalls.setCache += 1;
      cachedBrain = JSON.parse(JSON.stringify(profile));
    },
    createEmptyProfile: function () {
      return { schemaVersion: 4, general: {} };
    }
  };

  context.window.HFHandoverStore = {
    getCachedDraft: function () {
      return storedDraft ? JSON.parse(JSON.stringify(storedDraft)) : null;
    },
    loadDraft: function () {
      handoverCalls.loadDraft += 1;
      return Promise.resolve(storedDraft ? JSON.parse(JSON.stringify(storedDraft)) : null);
    },
    saveDraft: function (payload) {
      handoverCalls.saveDraft += 1;
      storedDraft = payload ? JSON.parse(JSON.stringify(payload)) : null;
      return Promise.resolve({ cloud: true, local: true });
    },
    clearDraft: function () {
      handoverCalls.clearDraft += 1;
      storedDraft = null;
      return Promise.resolve({ cloud: true });
    },
    getSavedHandovers: function () {
      return savedHandovers.slice();
    },
    saveHandover: function (record) {
      handoverCalls.saveHandover += 1;
      var copy = JSON.parse(JSON.stringify(record));
      copy.id = "cloud-" + savedHandovers.length;
      savedHandovers.unshift(copy);
      return Promise.resolve({ cloud: true, record: copy });
    },
    deleteHandover: function (id) {
      handoverCalls.deleteHandover += 1;
      savedHandovers = savedHandovers.filter(function (item) {
        return item.id !== id;
      });
      return Promise.resolve({ cloud: true });
    }
  };

  context.window.HFMaintenanceStore = {
    getCachedIssues: function () {
      return realIssues.slice();
    },
    listIssues: function () {
      return realIssues.slice();
    },
    getIssue: function (id) {
      return realIssues.find(function (item) {
        return item.id === id;
      }) || null;
    },
    getMetrics: function () {
      return { openIssues: realIssues.length, highPriority: 0, inProgress: 0, completedToday: 0 };
    },
    createIssue: function () {
      maintenanceCalls.createIssue += 1;
      return Promise.resolve({ issue: {} });
    },
    applyFilters: function (issues) {
      return issues.slice();
    },
    computeMetrics: function (issues) {
      return {
        openIssues: issues.filter(function (i) { return i.status !== "completed"; }).length,
        highPriority: issues.filter(function (i) {
          return i.priority === "high" || i.priority === "urgent";
        }).length,
        inProgress: issues.filter(function (i) { return i.status === "in_progress"; }).length,
        completedToday: 0
      };
    }
  };

  vm.runInNewContext(read("js/demo-sample-data.js"), context, { filename: "demo-sample-data.js" });
  vm.runInNewContext(read("js/demo-mode.js"), context, { filename: "demo-mode.js" });

  return {
    context,
    localStore,
    sessionStore,
    locationState,
    brainCalls,
    handoverCalls,
    maintenanceCalls,
    getStoredDraft: function () {
      return storedDraft;
    },
    getCachedBrain: function () {
      return cachedBrain;
    },
    getSavedHandovers: function () {
      return savedHandovers;
    },
    getRealIssues: function () {
      return realIssues;
    },
    userDraft,
    userBrain
  };
}

async function run() {
  let ok = true;

  // --- Static: landing / account visibility & routing wiring ---
  const indexHtml = read("index.html");
  const accountHtml = read("account.html");
  const workspaceSrc = read("js/workspace.js");
  const handoverHtml = read("handover.html");
  const maintenanceHtml = read("maintenance.html");

  if (!/id="interactive-demo"/.test(indexHtml) || !/id="try-interactive-demo"/.test(indexHtml)) {
    ok = fail("Landing page must expose Interactive Demo CTA (#interactive-demo / #try-interactive-demo)") && ok;
  } else {
    ok = pass("Landing page has public Interactive Demo CTA") && ok;
  }
  if (!/See Hospitality Flow in action/.test(indexHtml) || !/No account required\. Sample data is never saved/.test(indexHtml)) {
    ok = fail("Landing demo CTA copy missing") && ok;
  } else {
    ok = pass("Landing demo CTA copy present") && ok;
  }
  if (!/Oakwood Mayfair/.test(indexHtml) || !/AI Shift Handover/.test(indexHtml) || !/Hotel Brain/.test(indexHtml)) {
    ok = fail("Landing demo must mention Oakwood Mayfair, Handover and Hotel Brain") && ok;
  } else {
    ok = pass("Landing demo mentions Mayfair + Handover + Hotel Brain") && ok;
  }
  if (/interactive-demo[\s\S]{0,800}maintenance issues/i.test(indexHtml)) {
    ok = fail("Landing Interactive Demo CTA must not market Maintenance") && ok;
  } else {
    ok = pass("Landing Interactive Demo CTA omits Maintenance") && ok;
  }
  if (/id="handover-demo"|id="demo-generate"|Try AI Shift Handover/.test(indexHtml)) {
    ok = fail("Landing page must not keep the duplicate on-page Interactive Demo preview") && ok;
  } else {
    ok = pass("Landing page has a single Interactive Demo entry point") && ok;
  }
  const demoCtaCount = (indexHtml.match(/id="try-interactive-demo"/g) || []).length;
  if (demoCtaCount !== 1) {
    ok = fail("Expected exactly one Try Interactive Demo button, found " + demoCtaCount) && ok;
  } else {
    ok = pass("Exactly one primary Try Interactive Demo button") && ok;
  }
  if (!/operational memory of your hotel/i.test(indexHtml)) {
    ok = fail("Landing Hotel Brain wording must describe growing operational memory") && ok;
  } else {
    ok = pass("Landing Hotel Brain wording reflects operational memory") && ok;
  }
  if (!/bindPublicEntryControl/.test(indexHtml) || !/demo-mode\.js/.test(indexHtml)) {
    ok = fail("Landing page must load demo-mode and bind public entry") && ok;
  } else {
    ok = pass("Landing page binds public Demo Mode entry") && ok;
  }
  if (/hfDemoModeHost/.test(accountHtml)) {
    ok = fail("account.html must not host Interactive Demo card for hotel workspaces") && ok;
  } else {
    ok = pass("Normal hotel account has no Demo Mode host") && ok;
  }
  if (!/hfOperatorDemoHost/.test(accountHtml) || !/mountOperatorDemoAccess/.test(workspaceSrc)) {
    ok = fail("Operator section must retain Open Demo Mode access") && ok;
  } else {
    ok = pass("Operator section can mount Open Demo Mode link") && ok;
  }
  if (/hfDemoModeHost/.test(workspaceSrc) || /mountAccountToggle/.test(workspaceSrc)) {
    ok = fail("workspace dashboard must not mount hotel Demo card") && ok;
  } else {
    ok = pass("Hotel workspace dashboard does not mount Demo card") && ok;
  }
  if (!/resolveGuestSession/.test(handoverHtml)) {
    ok = fail("handover must allow Demo Mode without login via resolveGuestSession") && ok;
  } else {
    ok = pass("Handover allows public Demo Mode guest boot") && ok;
  }
  if (!/href="maintenance\.html"/.test(accountHtml)) {
    ok = fail("Authenticated hotel account must still link to Maintenance") && ok;
  } else {
    ok = pass("Authenticated hotel workspace still includes Maintenance") && ok;
  }

  // --- Static: no Zetter coupling / public demo scope ---
  const demoModeSrc = read("js/demo-mode.js");
  const demoSampleSrc = read("js/demo-sample-data.js");
  if (/Open maintenance|href="maintenance\.html"/.test(demoModeSrc)) {
    ok = fail("Demo Mode banner/nav must not include Maintenance") && ok;
  } else {
    ok = pass("Public Demo Mode navigation has no Maintenance link") && ok;
  }
  if (!/AI Shift Handover/.test(demoModeSrc) || !/Hotel Brain/.test(demoModeSrc) || !/hotel-profile\.html/.test(demoModeSrc)) {
    ok = fail("Demo Mode nav must include AI Shift Handover and Hotel Brain") && ok;
  } else {
    ok = pass("Public Demo Mode navigation is Handover + Hotel Brain only") && ok;
  }
  if (!/location\.replace\(["']handover\.html["']\)/.test(maintenanceHtml)) {
    ok = fail("maintenance.html should redirect Demo Mode visitors to handover") && ok;
  } else {
    ok = pass("Demo Mode visitors are redirected away from Maintenance") && ok;
  }
  if (!/id="handoverMeta"[\s\S]*id="shiftGlance"[\s\S]*id="summaryCard"[\s\S]*id="hotelStatusCard"[\s\S]*id="timelineCard"[\s\S]*id="sectionsGrid"[\s\S]*id="shiftIntelligenceCard"/.test(handoverHtml)) {
    ok = fail("Handover results order must be Snapshot → Briefing → Hotel Status → Timeline → Sections → Recommendations") && ok;
  } else {
    ok = pass("Handover results order is Snapshot → Briefing → Status → Timeline → Sections → Recommendations") && ok;
  }
  if (!/Today's Briefing/.test(handoverHtml) || !/buildHandoverIntelligenceExperience/.test(handoverHtml)) {
    ok = fail("Handover must render Today's Briefing from shared engine experience") && ok;
  } else {
    ok = pass("Today's Briefing uses shared Intelligence Experience pipeline") && ok;
  }
  if (
    !/function setHandoverOutputChrome/.test(handoverHtml) ||
    !/id="handoverOutputActions"[\s\S]*hidden/.test(handoverHtml) ||
    !/id="outputSection"[\s\S]*hidden/.test(handoverHtml) ||
    !/has-handover-output/.test(handoverHtml)
  ) {
    ok = fail("Handover must hide output actions until generation via setHandoverOutputChrome") && ok;
  } else {
    ok = pass("Handover hides output chrome until generation") && ok;
  }
  if (!/title:\s*"Operational Notes"/.test(handoverHtml) || !/isUsefulOperationalNote/.test(handoverHtml)) {
    ok = fail("General section must be Operational Notes with junk filtering") && ok;
  } else {
    ok = pass("Operational Notes section and filter present") && ok;
  }
  if (!/roomsAvailable/.test(handoverHtml) || !/stayovers/.test(handoverHtml) || !/revpar/.test(handoverHtml)) {
    ok = fail("Hotel Snapshot must include RevPAR, Rooms Available, and Stayovers") && ok;
  } else {
    ok = pass("Hotel Snapshot includes expanded operational KPIs") && ok;
  }
  if (!/priority-low/.test(handoverHtml)) {
    ok = fail("Recommendations UI must support low priority") && ok;
  } else {
    ok = pass("Recommendations UI supports low priority") && ok;
  }
  if (
    !/Oakwood Mayfair/.test(demoSampleSrc) ||
    !/Independent boutique hotel/.test(demoSampleSrc) ||
    !/TOTAL_ROOMS\s*=\s*80/.test(demoSampleSrc) ||
    !/address:\s*"Mayfair"/.test(demoSampleSrc) ||
    !/city:\s*"London"/.test(demoSampleSrc)
  ) {
    ok = fail("Demo hotel must be The Oakwood Mayfair: independent boutique, 80 rooms, Mayfair, London") && ok;
  } else {
    ok = pass("Demo hotel identity is The Oakwood Mayfair (80 rooms, Mayfair, London)") && ok;
  }
  if (/Zetter|loadZetterSample|HotelProfileZetterSample/i.test(demoModeSrc)) {
    ok = fail("demo-mode.js must not reference Zetter sample loading") && ok;
  } else {
    ok = pass("demo-mode.js has no Zetter coupling") && ok;
  }
  if (/\bZetter\b|\bMarylebone\b/i.test(demoSampleSrc)) {
    ok = fail("demo-sample-data.js must not reference Zetter or Marylebone") && ok;
  } else {
    ok = pass("demo-sample-data.js is Oakwood Mayfair-only") && ok;
  }
  if (!/Oakwood Mayfair/.test(demoSampleSrc)) {
    ok = fail("demo-sample-data.js must define The Oakwood Mayfair") && ok;
  } else {
    ok = pass("Oakwood Mayfair hotel identity present") && ok;
  }
  if (!/Sophie Chen · Night Manager/.test(demoSampleSrc)) {
    ok = fail("preparedBy identity missing") && ok;
  } else {
    ok = pass("Sophie Chen · Night Manager prepared-by identity present") && ok;
  }

  // --- Pack consistency ---
  const packCtx = {
    window: {},
    console,
    Date,
    JSON,
    Promise,
    Object,
    Array,
    String,
    Math,
    Error
  };
  packCtx.window = packCtx;
  packCtx.globalThis = packCtx;
  vm.runInNewContext(demoSampleSrc, packCtx, { filename: "demo-sample-data.js" });
  const Sample = packCtx.HFDemoSampleData;
  const pack = Sample.buildPack("hotel-ws-1");
  const validation = Sample.validatePackConsistency(pack);
  if (!validation.ok) {
    ok = fail("Pack consistency errors:\n - " + validation.errors.join("\n - ")) && ok;
  } else {
    ok = pass("Oakwood pack consistency validation passed") && ok;
  }

  const inventory = Sample.buildRoomInventory();
  if (inventory.length !== 80) {
    ok = fail("Inventory length expected 80, got " + inventory.length) && ok;
  } else {
    ok = pass("Canonical inventory has 80 rooms") && ok;
  }

  const twinRooms = inventory.filter(function (r) { return r.twinCapable; }).map(function (r) { return r.roomNo; });
  const quietRooms = inventory.filter(function (r) { return r.quiet; }).map(function (r) { return r.roomNo; });
  const interconnects = inventory.filter(function (r) { return r.connectingRoom; });
  if (twinRooms.indexOf("12") === -1 || twinRooms.indexOf("25") === -1) {
    ok = fail("Expected twin-capable rooms 12 and 25") && ok;
  } else {
    ok = pass("Twin-capable rooms include 12 and 25") && ok;
  }
  if (quietRooms.indexOf("42") === -1) {
    ok = fail("VIP Room 42 must be quiet") && ok;
  } else {
    ok = pass("VIP Room 42 is quiet") && ok;
  }
  const pair1415 = interconnects.some(function (r) {
    return r.roomNo === "14" && r.connectingRoom === "15";
  });
  if (!pair1415) {
    ok = fail("Rooms 14↔15 must interconnect") && ok;
  } else {
    ok = pass("Interconnecting pair 14↔15 present") && ok;
  }

  // --- Isolation runtime ---
  const rt = loadDemoRuntime();
  const Demo = rt.context.HFDemoSampleData && rt.context.HFDemoMode;
  if (!rt.context.HFDemoMode) {
    console.error("FAIL: HFDemoMode failed to load");
    process.exit(1);
  }

  const beforeDraft = JSON.stringify(rt.getStoredDraft());
  const beforeBrain = JSON.stringify(rt.getCachedBrain());
  const beforeSaved = JSON.stringify(rt.getSavedHandovers());
  const beforeIssues = JSON.stringify(rt.getRealIssues());

  const enable1 = await rt.context.HFDemoMode.enable({ force: true });
  if (!enable1.ok) {
    ok = fail("enable() failed: " + JSON.stringify(enable1)) && ok;
  } else {
    ok = pass("enable() succeeded (overlay-only)") && ok;
  }

  if (rt.brainCalls.save !== 0) {
    ok = fail("Hotel Brain save() was called during Demo Mode enable (" + rt.brainCalls.save + ")") && ok;
  } else {
    ok = pass("No Hotel Brain save() during enable") && ok;
  }
  if (rt.handoverCalls.saveDraft !== 0 || rt.handoverCalls.saveHandover !== 0) {
    ok = fail("Handover cloud/local writes occurred during enable") && ok;
  } else {
    ok = pass("No handover draft/report writes during enable") && ok;
  }
  if (rt.maintenanceCalls.createIssue !== 0) {
    ok = fail("Maintenance createIssue called during enable") && ok;
  } else {
    ok = pass("No maintenance writes during enable") && ok;
  }
  if (JSON.stringify(rt.getStoredDraft()) !== beforeDraft) {
    ok = fail("User draft mutated during enable") && ok;
  } else {
    ok = pass("User draft unchanged during enable") && ok;
  }
  if (JSON.stringify(rt.getCachedBrain()) !== beforeBrain) {
    ok = fail("Real Hotel Brain cache mutated during enable") && ok;
  } else {
    ok = pass("Real Hotel Brain cache unchanged during enable") && ok;
  }

  const overlayDraft = rt.context.HFHandoverStore.getCachedDraft();
  if (!overlayDraft || !overlayDraft.isDemoData || overlayDraft.hotelName !== "The Oakwood Mayfair") {
    ok = fail("Demo draft overlay missing or incorrect") && ok;
  } else {
    ok = pass("Draft overlay returns Oakwood demo draft") && ok;
  }
  if (!overlayDraft.notes || !/24 ac broken maint aware fan guest/i.test(overlayDraft.notes)) {
    ok = fail("Demo first entry must prefill messy shift notes") && ok;
  } else {
    ok = pass("Demo first entry prefills messy shift notes") && ok;
  }
  if (
    overlayDraft.hasGeneratedOutput ||
    (overlayDraft.organisedHandover && Object.keys(overlayDraft.organisedHandover).length) ||
    overlayDraft.aiSummary ||
    (Array.isArray(overlayDraft.recommendations) && overlayDraft.recommendations.length)
  ) {
    ok = fail("Demo first entry must not restore generated handover output") && ok;
  } else {
    ok = pass("Demo first entry has no generated handover output") && ok;
  }
  if (overlayDraft.savedAt) {
    ok = fail("Demo draft must not expose savedAt draft-status chrome") && ok;
  } else {
    ok = pass("Demo draft has no savedAt draft status") && ok;
  }
  if (!/isDemoModeActive/.test(handoverHtml) || !/Prefilling the demo pack is not a restored user draft/.test(handoverHtml)) {
    ok = fail("Handover must suppress Previous draft restored in Demo Mode") && ok;
  } else {
    ok = pass("Handover suppresses Previous draft restored in Demo Mode") && ok;
  }

  // Generate-in-demo must not persist organised output into the overlay draft
  const generatedAttempt = await rt.context.HFHandoverStore.saveDraft({
    hotelName: "The Oakwood Mayfair",
    notes: overlayDraft.notes,
    hotelSnapshot: overlayDraft.hotelSnapshot,
    hasGeneratedOutput: true,
    organisedHandover: { urgent: [{ text: "Room 24 – AC not cooling." }] },
    aiSummary: "Busy night",
    recommendations: [{ text: "Chase AC", department: "Maintenance", priority: "high" }],
    generatedTime: "10:00",
    isDemoData: true
  });
  if (!generatedAttempt.blocked) {
    ok = fail("Demo saveDraft must remain blocked") && ok;
  } else {
    ok = pass("Demo saveDraft remains blocked after generate attempt") && ok;
  }
  const afterGenerateDraft = rt.context.HFHandoverStore.getCachedDraft();
  if (
    afterGenerateDraft.hasGeneratedOutput ||
    (afterGenerateDraft.organisedHandover && Object.keys(afterGenerateDraft.organisedHandover).length) ||
    afterGenerateDraft.aiSummary
  ) {
    ok = fail("Demo must not keep generated output in overlay draft memory") && ok;
  } else {
    ok = pass("Demo overlay draft stays pre-generate after blocked saveDraft") && ok;
  }

  // Exit + re-enter resets to clean pre-generate state
  await rt.context.HFDemoMode.disable({ confirm: false });
  await rt.context.HFDemoMode.enable({ force: true });
  const reenteredDraft = rt.context.HFHandoverStore.getCachedDraft();
  if (
    !reenteredDraft ||
    reenteredDraft.hasGeneratedOutput ||
    !/24 ac broken maint aware fan guest/i.test(reenteredDraft.notes || "") ||
    (reenteredDraft.organisedHandover && Object.keys(reenteredDraft.organisedHandover).length)
  ) {
    ok = fail("Exit + re-enter Demo must reset to pre-generate prefilled notes") && ok;
  } else {
    ok = pass("Exit + re-enter Demo resets to pre-generate state") && ok;
  }

  const overlayBrain = rt.context.HFHotelBrainStore.getCached();
  if (!overlayBrain || overlayBrain.general.hotelName !== "The Oakwood Mayfair") {
    ok = fail("Brain overlay missing Oakwood profile") && ok;
  } else {
    ok = pass("Brain overlay returns Oakwood profile") && ok;
  }
  if (!/operational memory|becoming more useful|builds context/i.test(
    JSON.stringify(overlayBrain.hotelKnowledge || {}) + " " + (overlayBrain.general && overlayBrain.general.description || "")
  )) {
    ok = fail("Demo Hotel Brain wording should describe growing operational memory") && ok;
  } else {
    ok = pass("Demo Hotel Brain wording reflects growing operational memory") && ok;
  }

  const saveBlocked = await rt.context.HFHotelBrainStore.save(overlayBrain).then(
    function () { return { blocked: false }; },
    function (err) { return { blocked: true, message: String(err && err.message || err) }; }
  );
  if (!saveBlocked.blocked || saveBlocked.message.indexOf("DEMO_MODE_READ_ONLY") === -1) {
    ok = fail("Brain save must reject while Demo Mode is active") && ok;
  } else {
    ok = pass("Brain save rejected while Demo Mode active") && ok;
  }
  if (JSON.stringify(rt.getCachedBrain()) !== beforeBrain) {
    ok = fail("Brain save rejection still mutated real cache") && ok;
  } else {
    ok = pass("Rejected Brain save left real cache untouched") && ok;
  }

  const draftSave = await rt.context.HFHandoverStore.saveDraft(overlayDraft);
  if (!draftSave.blocked || rt.handoverCalls.saveDraft !== 0) {
    ok = fail("saveDraft must be blocked in Demo Mode") && ok;
  } else {
    ok = pass("saveDraft blocked in Demo Mode") && ok;
  }
  if (JSON.stringify(rt.getStoredDraft()) !== beforeDraft) {
    ok = fail("Blocked saveDraft still overwrote user draft") && ok;
  } else {
    ok = pass("User draft preserved despite demo saveDraft attempt") && ok;
  }

  const handoverSave = await rt.context.HFHandoverStore.saveHandover(
    rt.context.HFDemoMode.getDemoHandover()
  );
  if (!handoverSave.blocked || rt.handoverCalls.saveHandover !== 0) {
    ok = fail("saveHandover must be blocked in Demo Mode") && ok;
  } else {
    ok = pass("saveHandover blocked in Demo Mode") && ok;
  }

  try {
    await rt.context.HFMaintenanceStore.createIssue({ title: "x" });
    ok = fail("createIssue should reject in Demo Mode") && ok;
  } catch (err) {
    if (String(err && err.message || err).indexOf("DEMO_MODE_READ_ONLY") === -1) {
      ok = fail("createIssue rejected with unexpected error") && ok;
    } else {
      ok = pass("createIssue rejected in Demo Mode") && ok;
    }
  }

  const listed = rt.context.HFMaintenanceStore.listIssues();
  const demoCount = listed.filter(function (i) { return i.isDemoData; }).length;
  if (demoCount < 5) {
    ok = fail("Expected demo maintenance issues in overlay list") && ok;
  } else {
    ok = pass("Maintenance overlay includes demo issues") && ok;
  }

  const savedListed = rt.context.HFHandoverStore.getSavedHandovers();
  if (!savedListed[0] || !savedListed[0].isDemoData) {
    ok = fail("Saved handovers overlay should prepend demo handover") && ok;
  } else {
    ok = pass("Saved handovers overlay prepends demo handover") && ok;
  }
  if (JSON.stringify(rt.getSavedHandovers()) !== beforeSaved) {
    ok = fail("Underlying saved handover storage mutated") && ok;
  } else {
    ok = pass("Underlying saved handover storage unchanged") && ok;
  }

  // Flag-only storage
  const flagKeys = Object.keys(rt.localStore).filter(function (k) {
    return k.indexOf("hf_demo_mode_") === 0;
  });
  if (flagKeys.length !== 1) {
    ok = fail("Expected exactly one demo flag key in localStorage mock, got " + flagKeys.length) && ok;
  } else {
    ok = pass("Only demo flag persisted in localStorage") && ok;
  }

  const disable1 = await rt.context.HFDemoMode.disable({ confirm: false });
  if (!disable1.ok) {
    ok = fail("disable() failed") && ok;
  } else {
    ok = pass("disable() succeeded") && ok;
  }

  if (rt.handoverCalls.clearDraft !== 0) {
    ok = fail("clearDraft must never run on demo exit") && ok;
  } else {
    ok = pass("User draft not cleared on exit") && ok;
  }
  if (JSON.stringify(rt.getStoredDraft()) !== beforeDraft) {
    ok = fail("User draft not restored exactly after exit") && ok;
  } else {
    ok = pass("User draft intact after exit") && ok;
  }
  if (JSON.stringify(rt.getCachedBrain()) !== beforeBrain) {
    ok = fail("Hotel Brain changed after exit") && ok;
  } else {
    ok = pass("Hotel Brain unchanged after exit") && ok;
  }
  if (JSON.stringify(rt.getSavedHandovers()) !== beforeSaved) {
    ok = fail("Saved handovers changed after exit") && ok;
  } else {
    ok = pass("Saved handovers unchanged after exit") && ok;
  }
  if (JSON.stringify(rt.getRealIssues()) !== beforeIssues) {
    ok = fail("Maintenance issues changed after exit") && ok;
  } else {
    ok = pass("Maintenance store unchanged after exit") && ok;
  }

  const postDraft = rt.context.HFHandoverStore.getCachedDraft();
  if (!postDraft || postDraft.notes !== rt.userDraft.notes) {
    ok = fail("After exit, draft overlay must restore real draft") && ok;
  } else {
    ok = pass("After exit, getCachedDraft returns real user draft") && ok;
  }
  const postBrain = rt.context.HFHotelBrainStore.getCached();
  if (!postBrain || postBrain.general.hotelName !== "Real Customer Hotel") {
    ok = fail("After exit, Brain getCached must return real profile") && ok;
  } else {
    ok = pass("After exit, Brain getCached returns real profile") && ok;
  }
  if (Object.keys(rt.localStore).some(function (k) { return k.indexOf("hf_demo_mode_") === 0; })) {
    ok = fail("Demo flag must be removed after exit") && ok;
  } else {
    ok = pass("Demo flag removed after exit") && ok;
  }
  if (rt.context.HFDemoMode.isEnabled()) {
    ok = fail("isEnabled must be false after exit") && ok;
  } else {
    ok = pass("isEnabled false after exit") && ok;
  }

  // Idempotent enter/exit cycles
  for (var cycle = 0; cycle < 3; cycle++) {
    const en = await rt.context.HFDemoMode.enable({ force: true });
    const dis = await rt.context.HFDemoMode.disable({ confirm: false });
    if (!en.ok || !dis.ok) {
      ok = fail("Cycle " + cycle + " enable/disable failed") && ok;
      break;
    }
  }
  if (
    rt.brainCalls.save === 0 &&
    rt.handoverCalls.saveDraft === 0 &&
    rt.handoverCalls.saveHandover === 0 &&
    rt.handoverCalls.clearDraft === 0 &&
    rt.maintenanceCalls.createIssue === 0 &&
    JSON.stringify(rt.getStoredDraft()) === beforeDraft &&
    JSON.stringify(rt.getCachedBrain()) === beforeBrain &&
    JSON.stringify(rt.getSavedHandovers()) === beforeSaved
  ) {
    ok = pass("Three enter/exit cycles are idempotent with no persistence") && ok;
  } else {
    ok = fail("Enter/exit cycles left side effects or writes") && ok;
  }

  // Metrics math
  const metrics = Sample.buildMetrics();
  const expectedOcc = (metrics.roomsSold / metrics.totalRooms) * 100;
  const expectedRevpar = Math.round(metrics.adrValue * (expectedOcc / 100) * 100) / 100;
  if (metrics.occupancyValue !== expectedOcc || metrics.revparValue !== expectedRevpar) {
    ok = fail("Metrics occupancy/RevPAR math failed") && ok;
  } else {
    ok = pass("Occupancy and RevPAR are mathematically consistent") && ok;
  }

  // UX realism polish — messy notes → clean operational handover
  const sourceNotes = String(pack.sourceNotes || "");
  if (!/24 ac broken maint aware fan guest/i.test(sourceNotes) || !/adapter 15 \+16/i.test(sourceNotes) || !/shower drip rm31/i.test(sourceNotes)) {
    ok = fail("Demo source notes should look like messy real staff notes") && ok;
  } else {
    ok = pass("Demo source notes use messy staff style") && ok;
  }
  const urgentText = JSON.stringify((pack.organisedHandover && pack.organisedHandover.urgent) || []);
  const maintText = JSON.stringify((pack.organisedHandover && pack.organisedHandover.maintenance) || []);
  if (!/AC not cooling/i.test(urgentText) || !/Guest provided with a fan/i.test(urgentText) || !/Follow up next shift/i.test(urgentText)) {
    ok = fail("Organised urgent items should be short operational lines") && ok;
  } else {
    ok = pass("Organised urgent items are short and operational") && ok;
  }
  if (!/Shower mixer dripping/i.test(maintText) || !/HK reported/i.test(maintText)) {
    ok = fail("Organised maintenance should use operational shower wording") && ok;
  } else {
    ok = pass("Organised maintenance uses operational wording") && ok;
  }
  const snap = pack.hotelSnapshot || {};
  if (
    snap.occupancy == null || snap.adr == null || snap.revpar == null ||
    snap.roomsSold == null || snap.roomsAvailable == null ||
    snap.arrivals == null || snap.departures == null || snap.stayovers == null ||
    snap.inHouse == null || snap.adults == null || snap.children == null
  ) {
    ok = fail("Demo hotelSnapshot must include expanded KPIs") && ok;
  } else {
    ok = pass("Demo hotelSnapshot includes expanded KPIs") && ok;
  }
  if (!/HOTEL_SNAPSHOT_GROUPS/.test(handoverHtml) || !/hotel-snapshot-group-label/.test(handoverHtml)) {
    ok = fail("Hotel Snapshot must render Operations / Inventory / Revenue groups") && ok;
  } else {
    ok = pass("Hotel Snapshot uses Operations / Inventory / Revenue groups") && ok;
  }
  const recs = pack.recommendations || [];
  const recDepts = {};
  const recPri = {};
  recs.forEach(function (r) {
    recDepts[r.department || ""] = true;
    recPri[r.priority || ""] = true;
  });
  const expectedDepts = ["Reception", "Maintenance", "Housekeeping", "Finance", "Duty Manager", "Night Team", "Guest Services"];
  const missingDepts = expectedDepts.filter(function (d) { return !recDepts[d]; });
  if (missingDepts.length || !recPri.high || !recPri.normal || !recPri.low) {
    ok = fail("Demo recommendations must cover hotel departments and priorities; missing: " + missingDepts.join(", ")) && ok;
  } else {
    ok = pass("Demo recommendations cover hotel departments and priorities") && ok;
  }
  if (!recs.every(function (r) { return r.text; })) {
    ok = fail("Demo recommendations must use text field for UI") && ok;
  } else {
    ok = pass("Demo recommendations provide text for UI") && ok;
  }
  const generalNotes = (pack.organisedHandover && pack.organisedHandover.general) || [];
  if (generalNotes.length < 4 || generalNotes.length > 8) {
    ok = fail("Operational Notes should have about 4–8 meaningful items, got " + generalNotes.length) && ok;
  } else {
    ok = pass("Operational Notes has a believable 4–8 item count") && ok;
  }
  if (!/Operational Notes|title:\s*"Operational Notes"/.test(handoverHtml)) {
    ok = fail("UI must label section Operational Notes") && ok;
  } else {
    ok = pass("UI labels section Operational Notes") && ok;
  }

  // --- Public visitor entry (no login / no tenant scope) ---
  const publicRt = loadDemoRuntime({ publicVisitor: true, href: "index.html" });
  const publicEnable = await publicRt.context.HFDemoMode.enable({
    force: true,
    redirectTo: "handover.html",
    returnTo: "index.html"
  });
  if (!publicEnable.ok) {
    ok = fail("Public visitor enable() failed") && ok;
  } else {
    ok = pass("Public visitor can enter Demo Mode without login") && ok;
  }
  if (publicRt.context.HFDemoMode.resolveDemoScope() !== "public") {
    ok = fail("Public visitor demo scope must be 'public'") && ok;
  } else {
    ok = pass("Public visitor uses public demo scope") && ok;
  }
  if (publicRt.sessionStore.hf_demo_return !== "index.html") {
    ok = fail("Public enter must store returnTo index.html") && ok;
  } else {
    ok = pass("Public enter stores landing-page return path") && ok;
  }
  if (publicRt.locationState.href !== "handover.html") {
    ok = fail("Public enter must redirect to handover.html, got " + publicRt.locationState.href) && ok;
  } else {
    ok = pass("Public enter redirects to demo handover page") && ok;
  }
  if (!publicRt.localStore.hf_demo_mode_public) {
    ok = fail("Public demo flag missing under hf_demo_mode_public") && ok;
  } else {
    ok = pass("Public demo flag persisted under public scope") && ok;
  }

  const publicBrainLoad = await publicRt.context.HFHotelBrainStore.load();
  if (
    publicRt.brainCalls.load !== 0 ||
    !publicBrainLoad ||
    !publicBrainLoad.demoOverlay ||
    !publicBrainLoad.profile ||
    publicBrainLoad.profile.general.hotelName !== "The Oakwood Mayfair"
  ) {
    ok = fail("Public demo must serve Oakwood overlay without loading real Hotel Brain") && ok;
  } else {
    ok = pass("Public demo serves Oakwood without real Hotel Brain load") && ok;
  }
  if (/Zetter/i.test(JSON.stringify(publicBrainLoad.profile))) {
    ok = fail("Public demo profile must not contain Zetter data") && ok;
  } else {
    ok = pass("Public demo profile has no Zetter/tenant data") && ok;
  }

  const publicExit = await publicRt.context.HFDemoMode.disable({
    confirm: false,
    redirectTo: publicRt.context.HFDemoMode.getReturnTo()
  });
  if (!publicExit.ok || publicRt.locationState.href !== "index.html") {
    ok = fail("Public Exit Demo must return to landing page") && ok;
  } else {
    ok = pass("Public Exit Demo returns to landing page") && ok;
  }
  if (publicRt.context.HFDemoMode.isEnabled() || publicRt.localStore.hf_demo_mode_public) {
    ok = fail("Public exit must clear demo flag/state") && ok;
  } else {
    ok = pass("Public exit clears demo state") && ok;
  }

  // --- Authenticated operator exit returns to account.html ---
  const operatorRt = loadDemoRuntime({ href: "account.html" });
  const operatorEnable = await operatorRt.context.HFDemoMode.enable({
    force: true,
    redirectTo: "handover.html",
    returnTo: "account.html"
  });
  if (!operatorEnable.ok || operatorRt.sessionStore.hf_demo_return !== "account.html") {
    ok = fail("Operator enter must store returnTo account.html") && ok;
  } else {
    ok = pass("Operator enter stores account.html return path") && ok;
  }
  const operatorExit = await operatorRt.context.HFDemoMode.disable({
    confirm: false,
    redirectTo: operatorRt.context.HFDemoMode.getReturnTo()
  });
  if (!operatorExit.ok || operatorRt.locationState.href !== "account.html") {
    ok = fail("Operator Exit Demo must return to account.html") && ok;
  } else {
    ok = pass("Authenticated operator Exit Demo returns to account.html") && ok;
  }

  // Guest session helper for protected pages
  const guestRt = loadDemoRuntime({ publicVisitor: true, search: "?demo=1" });
  guestRt.context.location.search = "?demo=1";
  const guestSession = await guestRt.context.HFDemoMode.resolveGuestSession({
    banner: false,
    returnTo: "index.html"
  });
  if (!guestSession || !guestSession.demoGuest || !guestRt.context.HFDemoMode.isEnabled()) {
    ok = fail("resolveGuestSession(?demo=1) must enable Demo Mode for public visitors") && ok;
  } else {
    ok = pass("resolveGuestSession enables Demo Mode from ?demo=1") && ok;
  }

  if (!ok) {
    console.error("\nDemo Mode regression tests FAILED");
    process.exit(1);
  }
  console.log("\nAll Demo Mode regression tests passed");
}

run().catch(function (err) {
  console.error(err);
  process.exit(1);
});
