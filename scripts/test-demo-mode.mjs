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

function loadDemoRuntime() {
  const localStore = {};
  const tenantContext = { userId: "user-demo", workspaceId: "hotel-ws-1" };
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
    setTimeout,
    clearTimeout,
    requestAnimationFrame: function (cb) {
      cb();
    },
    matchMedia: function () {
      return { matches: true };
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
    resolveScopeId: function () {
      return tenantContext.workspaceId || ("user_" + tenantContext.userId);
    },
    readTenantContext: function () {
      return tenantContext;
    },
    getRaw: function (key, scopeId) {
      return localStore[key + "_" + scopeId] || null;
    },
    setRaw: function (key, value, scopeId) {
      localStore[key + "_" + scopeId] = value;
      return true;
    },
    remove: function (key, scopeId) {
      delete localStore[key + "_" + scopeId];
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

  // --- Static: no Zetter coupling in demo modules ---
  const demoModeSrc = read("js/demo-mode.js");
  const demoSampleSrc = read("js/demo-sample-data.js");
  if (/Zetter|loadZetterSample|HotelProfileZetterSample/i.test(demoModeSrc)) {
    ok = fail("demo-mode.js must not reference Zetter sample loading") && ok;
  } else {
    ok = pass("demo-mode.js has no Zetter coupling") && ok;
  }
  if (/Zetter/i.test(demoSampleSrc)) {
    ok = fail("demo-sample-data.js must not reference Zetter") && ok;
  } else {
    ok = pass("demo-sample-data.js is Oakwood-only") && ok;
  }
  if (!/Oakwood Marylebone/.test(demoSampleSrc)) {
    ok = fail("demo-sample-data.js must define The Oakwood Marylebone") && ok;
  } else {
    ok = pass("Oakwood Marylebone hotel identity present") && ok;
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
  if (inventory.length !== 24) {
    ok = fail("Inventory length expected 24, got " + inventory.length) && ok;
  } else {
    ok = pass("Canonical inventory has 24 rooms") && ok;
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
  if (!overlayDraft || !overlayDraft.isDemoData || overlayDraft.hotelName !== "The Oakwood Marylebone") {
    ok = fail("Demo draft overlay missing or incorrect") && ok;
  } else {
    ok = pass("Draft overlay returns Oakwood demo draft") && ok;
  }

  const overlayBrain = rt.context.HFHotelBrainStore.getCached();
  if (!overlayBrain || overlayBrain.general.hotelName !== "The Oakwood Marylebone") {
    ok = fail("Brain overlay missing Oakwood profile") && ok;
  } else {
    ok = pass("Brain overlay returns Oakwood profile") && ok;
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
