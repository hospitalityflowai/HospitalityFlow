/**
 * Hospitality Flow — Demo Mode (isolated overlay)
 *
 * Interactive Demo for The Oakwood Mayfair.
 * Public demo focuses on AI Shift Handover + Hotel Brain only.
 * Sample data lives only in memory + a minimal localStorage flag.
 * Never writes Hotel Brain, handover drafts/saved reports, or maintenance
 * issues into Supabase or over the user's real local draft.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "hf_demo_mode";
  var EVENT_NAME = "hf-demo-mode-change";
  /** Flag scope when no signed-in tenant context exists (public landing visitors). */
  var PUBLIC_SCOPE = "public";
  /** sessionStorage key for where Exit Demo should return. */
  var RETURN_KEY = "hf_demo_return";
  var DEFAULT_RETURN_TO = "index.html";

  var ENABLE_STEPS = [
    { key: "brain", label: "Loading Oakwood Hotel Brain…" },
    { key: "guests", label: "Staging VIP arrivals and guest follow-ups…" },
    { key: "context", label: "Building operational context…" },
    { key: "payments", label: "Preparing open balances and payment checks…" },
    { key: "handover", label: "Preparing AI Shift Handover…" },
    { key: "finish", label: "Opening Interactive Demo…" }
  ];

  var state = {
    enabled: false,
    packId: null,
    seededAt: null,
    transitioning: false
  };

  /** In-memory demo pack for the active session (never persisted). */
  var activePack = null;
  var activeDraft = null;
  var activeHandover = null;
  var activeBrain = null;
  var activePriorShiftHistory = null;

  var overlaysInstalled = false;
  var originalBrain = null;
  var originalHandover = null;
  var originalMaintenance = null;

  var overlayEl = null;
  var bannerEl = null;

  function tenantStorage() {
    return global.HFTenantStorage || null;
  }

  function resolveScope() {
    var ts = tenantStorage();
    return ts ? ts.resolveScopeId() : null;
  }

  /** Tenant scope when signed in; otherwise the public visitor scope. */
  function resolveDemoScope() {
    return resolveScope() || PUBLIC_SCOPE;
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function setReturnTo(url) {
    var target = String(url || DEFAULT_RETURN_TO).trim() || DEFAULT_RETURN_TO;
    try {
      global.sessionStorage.setItem(RETURN_KEY, target);
    } catch (err) {
      /* ignore */
    }
    return target;
  }

  function getReturnTo() {
    try {
      var saved = global.sessionStorage.getItem(RETURN_KEY);
      if (saved && typeof saved === "string" && saved.trim()) return saved.trim();
    } catch (err) {
      /* ignore */
    }
    return DEFAULT_RETURN_TO;
  }

  function clearReturnTo() {
    try {
      global.sessionStorage.removeItem(RETURN_KEY);
    } catch (err) {
      /* ignore */
    }
  }

  function readFlag() {
    var ts = tenantStorage();
    var scope = resolveDemoScope();
    if (!ts || !scope) return null;
    try {
      var raw = ts.getRaw(STORAGE_KEY, scope);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (err) {
      return null;
    }
  }

  function writeFlag(next) {
    var ts = tenantStorage();
    var scope = resolveDemoScope();
    if (!ts || !scope) return false;
    state.enabled = !!(next && next.enabled);
    state.packId = next && next.packId ? next.packId : null;
    state.seededAt = next && next.seededAt ? next.seededAt : null;
    try {
      return ts.setRaw(STORAGE_KEY, JSON.stringify({
        enabled: !!state.enabled,
        packId: state.packId,
        seededAt: state.seededAt
      }), scope);
    } catch (err) {
      return false;
    }
  }

  function clearFlag() {
    var ts = tenantStorage();
    var scope = resolveDemoScope();
    if (ts && scope) ts.remove(STORAGE_KEY, scope);
    state.enabled = false;
    state.packId = null;
    state.seededAt = null;
  }

  function prefersReducedMotion() {
    try {
      return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (err) {
      return false;
    }
  }

  function delay(ms) {
    if (prefersReducedMotion()) return Promise.resolve();
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function dispatchChange() {
    try {
      global.dispatchEvent(new CustomEvent(EVENT_NAME, {
        detail: { enabled: isEnabled(), state: getState() }
      }));
    } catch (err) {
      /* ignore */
    }
  }

  function isEnabled() {
    return state.enabled === true;
  }

  function getState() {
    return {
      enabled: !!state.enabled,
      packId: state.packId,
      seededAt: state.seededAt,
      transitioning: !!state.transitioning,
      isolation: "overlay-only"
    };
  }

  function ensurePack() {
    if (activePack && activeDraft && activeHandover && activeBrain && activePriorShiftHistory) {
      return activePack;
    }
    if (!global.HFDemoSampleData) return null;
    var pack = global.HFDemoSampleData.buildPack(resolveScope());
    activePack = pack;
    activeDraft = global.HFDemoSampleData.buildDraftPayload(pack);
    activeHandover = global.HFDemoSampleData.buildHandoverRecord(pack);
    activeBrain = pack.hotelBrainProfile || global.HFDemoSampleData.buildHotelBrainProfile();
    activePriorShiftHistory = typeof global.HFDemoSampleData.buildPriorShiftHistory === "function"
      ? global.HFDemoSampleData.buildPriorShiftHistory(pack)
      : [];
    return pack;
  }

  function clearMemoryPack() {
    activePack = null;
    activeDraft = null;
    activeHandover = null;
    activeBrain = null;
    activePriorShiftHistory = null;
  }

  function getDemoIssues() {
    ensurePack();
    return activePack && activePack.maintenanceIssues
      ? clone(activePack.maintenanceIssues)
      : (global.HFDemoSampleData ? global.HFDemoSampleData.buildMaintenanceIssues(resolveScope()) : []);
  }

  function getDemoDraft() {
    ensurePack();
    return clone(activeDraft);
  }

  function getDemoHandover() {
    ensurePack();
    return clone(activeHandover);
  }

  function getDemoBrain() {
    ensurePack();
    return clone(activeBrain);
  }

  /**
   * Isolated Demo prior-shift history for OperationalMemory.
   * Never reads production/test workspace history. Cleared on exit/reset.
   */
  function getDemoPriorShiftHistory() {
    if (!isEnabled()) return [];
    ensurePack();
    if (!activePriorShiftHistory) {
      activePriorShiftHistory = global.HFDemoSampleData &&
        typeof global.HFDemoSampleData.buildPriorShiftHistory === "function"
        ? global.HFDemoSampleData.buildPriorShiftHistory(activePack || resolveScope())
        : [];
    }
    return clone(activePriorShiftHistory) || [];
  }

  function mergeIssues(real, demo) {
    var seen = {};
    var out = [];
    (demo || []).forEach(function (issue) {
      if (!issue || !issue.id) return;
      seen[String(issue.id)] = true;
      out.push(issue);
    });
    (real || []).forEach(function (issue) {
      if (!issue || !issue.id) return;
      if (seen[String(issue.id)]) return;
      out.push(issue);
    });
    return out;
  }

  function isDemoHandoverId(id) {
    if (!id) return false;
    var demoId = activeHandover && activeHandover.id;
    return String(id) === String(demoId) || String(id).indexOf("demo-handover-") === 0;
  }

  function installBrainOverlay() {
    var store = global.HFHotelBrainStore;
    if (!store || originalBrain) return;

    originalBrain = {
      getCached: store.getCached,
      load: store.load,
      save: store.save,
      setCache: store.setCache
    };

    store.getCached = function (expectedHotelId) {
      if (isEnabled()) return getDemoBrain();
      return originalBrain.getCached.call(store, expectedHotelId);
    };

    store.load = function (options) {
      if (!isEnabled()) return originalBrain.load.call(store, options);
      /* Never load or surface a real hotel profile while Demo Mode overlays are active. */
      return Promise.resolve({
        profile: getDemoBrain(),
        hotelId: null,
        demoOverlay: true
      });
    };

    store.save = function (profileData, options) {
      if (isEnabled()) {
        return Promise.reject(new Error("DEMO_MODE_READ_ONLY"));
      }
      return originalBrain.save.call(store, profileData, options);
    };

    store.setCache = function (hotelId, profile, userId) {
      if (isEnabled()) {
        /* Never write Brain cache (demo or import) while Demo Mode is active. */
        return;
      }
      return originalBrain.setCache.call(store, hotelId, profile, userId);
    };
  }

  function installHandoverOverlay() {
    var store = global.HFHandoverStore;
    if (!store || originalHandover) return;

    originalHandover = {
      getCachedDraft: store.getCachedDraft,
      loadDraft: store.loadDraft,
      saveDraft: store.saveDraft,
      clearDraft: store.clearDraft,
      getSavedHandovers: store.getSavedHandovers,
      saveHandover: store.saveHandover,
      deleteHandover: store.deleteHandover,
      saveAllLocal: store.saveAllLocal,
      saveAll: store.saveAll,
      uploadLocalHandovers: store.uploadLocalHandovers,
      writeLastBackupAt: store.writeLastBackupAt,
      writeLastBackup: store.writeLastBackup
    };

    store.getCachedDraft = function () {
      if (isEnabled()) return getDemoDraft();
      return originalHandover.getCachedDraft
        ? originalHandover.getCachedDraft.call(store)
        : null;
    };

    store.loadDraft = function (options) {
      if (isEnabled()) return Promise.resolve(getDemoDraft());
      return originalHandover.loadDraft.call(store, options);
    };

    store.saveDraft = function (payload, workspaceIdOverride) {
      if (isEnabled()) {
        /* Preserve the user's real draft — demo edits stay in memory only.
           Never keep generated handover output across Demo reloads/re-entry. */
        if (payload && payload.isDemoData) {
          var next = clone(payload);
          next.hasGeneratedOutput = false;
          next.organisedHandover = {};
          next.aiSummary = "";
          next.generatedTime = "";
          next.recommendations = [];
          next.shiftIntelligenceChecklist = [];
          next.savedAt = null;
          next.isDemoData = true;
          activeDraft = next;
        }
        return Promise.resolve({
          cloud: false,
          local: false,
          blocked: true,
          reason: "DEMO_MODE_READ_ONLY"
        });
      }
      return originalHandover.saveDraft.call(store, payload, workspaceIdOverride);
    };

    store.clearDraft = function () {
      if (isEnabled()) {
        return Promise.resolve({
          cloud: false,
          local: false,
          blocked: true,
          reason: "DEMO_MODE_READ_ONLY"
        });
      }
      return originalHandover.clearDraft.call(store);
    };

    store.getSavedHandovers = function () {
      if (isEnabled()) {
        /* Public Demo never surfaces real history or curated archive as a second truth. */
        return [];
      }
      return originalHandover.getSavedHandovers
        ? originalHandover.getSavedHandovers.call(store)
        : [];
    };

    function blockLocalHistoryWrite() {
      return {
        cloud: false,
        local: false,
        blocked: true,
        reason: "DEMO_MODE_READ_ONLY",
        message: "Demo Mode does not change saved history."
      };
    }

    if (typeof store.saveAllLocal === "function") {
      store.saveAllLocal = function () {
        if (isEnabled()) return blockLocalHistoryWrite();
        return originalHandover.saveAllLocal.apply(store, arguments);
      };
    }

    if (typeof store.saveAll === "function") {
      store.saveAll = function () {
        if (isEnabled()) return Promise.resolve(blockLocalHistoryWrite());
        return originalHandover.saveAll.apply(store, arguments);
      };
    }

    if (typeof store.uploadLocalHandovers === "function") {
      store.uploadLocalHandovers = function () {
        if (isEnabled()) {
          return Promise.resolve({
            uploaded: 0,
            blocked: true,
            reason: "DEMO_MODE_READ_ONLY",
            message: "Demo Mode does not upload handovers."
          });
        }
        return originalHandover.uploadLocalHandovers.apply(store, arguments);
      };
    }

    if (typeof store.writeLastBackupAt === "function") {
      store.writeLastBackupAt = function () {
        if (isEnabled()) return;
        return originalHandover.writeLastBackupAt.apply(store, arguments);
      };
    }

    if (typeof store.writeLastBackup === "function") {
      store.writeLastBackup = function () {
        if (isEnabled()) return blockLocalHistoryWrite();
        return originalHandover.writeLastBackup.apply(store, arguments);
      };
    }

    store.saveHandover = function (record) {
      if (isEnabled()) {
        return Promise.resolve({
          cloud: false,
          local: false,
          blocked: true,
          reason: "DEMO_MODE_READ_ONLY",
          record: record && record.isDemoData ? record : null,
          message: "Demo Mode does not save handovers to your workspace."
        });
      }
      return originalHandover.saveHandover.call(store, record);
    };

    store.deleteHandover = function (id) {
      if (isEnabled() && isDemoHandoverId(id)) {
        return Promise.resolve({ cloud: false, local: false, blocked: true });
      }
      if (isEnabled()) {
        return Promise.resolve({
          cloud: false,
          local: false,
          blocked: true,
          reason: "DEMO_MODE_READ_ONLY"
        });
      }
      return originalHandover.deleteHandover.call(store, id);
    };
  }

  function installMaintenanceOverlay() {
    var store = global.HFMaintenanceStore;
    if (!store || originalMaintenance) return;

    originalMaintenance = {
      listIssues: store.listIssues,
      getCachedIssues: store.getCachedIssues,
      getIssue: store.getIssue,
      getMetrics: store.getMetrics,
      createIssue: store.createIssue,
      updateStatus: store.updateStatus,
      updatePriority: store.updatePriority,
      updateIssueWithTimeline: store.updateIssueWithTimeline,
      refresh: store.refresh,
      init: store.init
    };

    /* Public Demo removes the standalone Maintenance module — never surface board issues. */
    store.getCachedIssues = function () {
      if (isEnabled()) return [];
      return originalMaintenance.getCachedIssues.call(store);
    };

    store.listIssues = function (filters) {
      if (!isEnabled()) return originalMaintenance.listIssues.call(store, filters);
      return [];
    };

    store.getIssue = function (issueId) {
      if (isEnabled()) return null;
      return originalMaintenance.getIssue.call(store, issueId);
    };

    store.getMetrics = function () {
      if (!isEnabled()) return originalMaintenance.getMetrics.call(store);
      if (typeof store.computeMetrics === "function") {
        return store.computeMetrics([]);
      }
      return {
        openIssues: 0,
        highPriority: 0,
        inProgress: 0,
        completedToday: 0
      };
    };

    function rejectMaintenanceWrite() {
      return Promise.reject(Object.assign(new Error("DEMO_MODE_READ_ONLY"), {
        code: "DEMO_MODE_READ_ONLY"
      }));
    }

    store.createIssue = function (payload) {
      if (isEnabled()) return rejectMaintenanceWrite();
      return originalMaintenance.createIssue.call(store, payload);
    };

    ["updateStatus", "updatePriority", "updateIssueWithTimeline"].forEach(function (key) {
      if (typeof store[key] !== "function" || !originalMaintenance[key]) return;
      store[key] = function () {
        if (isEnabled()) return rejectMaintenanceWrite();
        return originalMaintenance[key].apply(store, arguments);
      };
    });
  }

  function installOverlays() {
    ensurePack();
    installBrainOverlay();
    installHandoverOverlay();
    installMaintenanceOverlay();
    overlaysInstalled = true;
  }

  function uninstallOverlays() {
    if (originalBrain && global.HFHotelBrainStore) {
      global.HFHotelBrainStore.getCached = originalBrain.getCached;
      global.HFHotelBrainStore.load = originalBrain.load;
      global.HFHotelBrainStore.save = originalBrain.save;
      global.HFHotelBrainStore.setCache = originalBrain.setCache;
    }
    originalBrain = null;

    if (originalHandover && global.HFHandoverStore) {
      global.HFHandoverStore.getCachedDraft = originalHandover.getCachedDraft;
      global.HFHandoverStore.loadDraft = originalHandover.loadDraft;
      global.HFHandoverStore.saveDraft = originalHandover.saveDraft;
      global.HFHandoverStore.clearDraft = originalHandover.clearDraft;
      global.HFHandoverStore.getSavedHandovers = originalHandover.getSavedHandovers;
      global.HFHandoverStore.saveHandover = originalHandover.saveHandover;
      global.HFHandoverStore.deleteHandover = originalHandover.deleteHandover;
      if (originalHandover.saveAllLocal) {
        global.HFHandoverStore.saveAllLocal = originalHandover.saveAllLocal;
      }
      if (originalHandover.saveAll) {
        global.HFHandoverStore.saveAll = originalHandover.saveAll;
      }
      if (originalHandover.uploadLocalHandovers) {
        global.HFHandoverStore.uploadLocalHandovers = originalHandover.uploadLocalHandovers;
      }
      if (originalHandover.writeLastBackupAt) {
        global.HFHandoverStore.writeLastBackupAt = originalHandover.writeLastBackupAt;
      }
      if (originalHandover.writeLastBackup) {
        global.HFHandoverStore.writeLastBackup = originalHandover.writeLastBackup;
      }
    }
    originalHandover = null;

    if (originalMaintenance && global.HFMaintenanceStore) {
      global.HFMaintenanceStore.listIssues = originalMaintenance.listIssues;
      global.HFMaintenanceStore.getCachedIssues = originalMaintenance.getCachedIssues;
      global.HFMaintenanceStore.getIssue = originalMaintenance.getIssue;
      global.HFMaintenanceStore.getMetrics = originalMaintenance.getMetrics;
      global.HFMaintenanceStore.createIssue = originalMaintenance.createIssue;
      ["updateStatus", "updatePriority", "updateIssueWithTimeline", "refresh", "init"].forEach(function (key) {
        if (originalMaintenance[key]) {
          global.HFMaintenanceStore[key] = originalMaintenance[key];
        }
      });
    }
    originalMaintenance = null;
    overlaysInstalled = false;
  }

  function hydrate() {
    var saved = readFlag();
    if (saved && saved.enabled) {
      state.enabled = true;
      state.packId = saved.packId || null;
      state.seededAt = saved.seededAt || null;
      ensurePack();
      installOverlays();
    } else {
      state.enabled = false;
      clearMemoryPack();
    }
    return getState();
  }

  function ensureOverlay() {
    if (overlayEl && overlayEl.isConnected) return overlayEl;
    overlayEl = document.createElement("div");
    overlayEl.id = "hfDemoOverlay";
    overlayEl.className = "hf-demo-overlay";
    overlayEl.setAttribute("role", "status");
    overlayEl.setAttribute("aria-live", "polite");
    overlayEl.setAttribute("aria-busy", "true");
    overlayEl.hidden = true;
    overlayEl.innerHTML =
      '<div class="hf-demo-overlay-panel">' +
        '<div class="hf-demo-overlay-orb" aria-hidden="true"></div>' +
        '<p class="hf-demo-overlay-kicker">Interactive Demo</p>' +
        '<h2 class="hf-demo-overlay-title" id="hfDemoOverlayTitle">Preparing The Oakwood Mayfair</h2>' +
        '<p class="hf-demo-overlay-step" id="hfDemoOverlayStep"></p>' +
        '<ol class="hf-demo-overlay-steps" id="hfDemoOverlaySteps"></ol>' +
        '<div class="hf-demo-overlay-bar" aria-hidden="true"><span id="hfDemoOverlayBar"></span></div>' +
      "</div>";
    document.body.appendChild(overlayEl);

    var list = overlayEl.querySelector("#hfDemoOverlaySteps");
    ENABLE_STEPS.forEach(function (step, index) {
      var li = document.createElement("li");
      li.setAttribute("data-step", step.key);
      li.innerHTML = '<span class="hf-demo-step-mark"></span><span class="hf-demo-step-label">' + step.label + "</span>";
      if (index === 0) li.classList.add("is-active");
      list.appendChild(li);
    });
    return overlayEl;
  }

  function showOverlay(title) {
    var el = ensureOverlay();
    var titleEl = el.querySelector("#hfDemoOverlayTitle");
    if (titleEl && title) titleEl.textContent = title;
    el.hidden = false;
    requestAnimationFrame(function () {
      el.classList.add("is-visible");
    });
    document.documentElement.classList.add("hf-demo-transitioning");
  }

  function setOverlayProgress(stepIndex, customLabel) {
    var el = ensureOverlay();
    var steps = el.querySelectorAll("#hfDemoOverlaySteps li");
    var stepMeta = ENABLE_STEPS[stepIndex] || ENABLE_STEPS[ENABLE_STEPS.length - 1];
    var stepLabel = el.querySelector("#hfDemoOverlayStep");
    var bar = el.querySelector("#hfDemoOverlayBar");
    var pct = Math.round(((stepIndex + 1) / ENABLE_STEPS.length) * 100);
    if (stepLabel) stepLabel.textContent = customLabel || stepMeta.label;
    if (bar) bar.style.width = pct + "%";
    for (var i = 0; i < steps.length; i++) {
      steps[i].classList.remove("is-active", "is-done");
      if (i < stepIndex) steps[i].classList.add("is-done");
      else if (i === stepIndex) steps[i].classList.add("is-active");
    }
  }

  function hideOverlay() {
    if (!overlayEl) return Promise.resolve();
    overlayEl.classList.remove("is-visible");
    document.documentElement.classList.remove("hf-demo-transitioning");
    return delay(prefersReducedMotion() ? 0 : 320).then(function () {
      if (overlayEl) {
        overlayEl.hidden = true;
        overlayEl.setAttribute("aria-busy", "false");
      }
    });
  }

  function ensureBanner() {
    if (bannerEl && bannerEl.isConnected) return bannerEl;
    bannerEl = document.createElement("div");
    bannerEl.id = "hfDemoBanner";
    bannerEl.className = "hf-demo-banner";
    bannerEl.setAttribute("role", "region");
    bannerEl.setAttribute("aria-label", "Demo Mode");
    bannerEl.hidden = true;
    bannerEl.innerHTML =
      '<div class="hf-demo-banner-inner">' +
        '<div class="hf-demo-banner-copy">' +
          '<span class="hf-demo-banner-badge">Demo Mode</span>' +
          '<p class="hf-demo-banner-text">Demo Mode — changes are temporary and nothing is saved. The Oakwood Mayfair sample · AI Shift Handover &amp; Hotel Brain.</p>' +
        "</div>" +
        '<div class="hf-demo-banner-actions">' +
          '<a class="hf-demo-banner-link" href="handover.html">AI Shift Handover</a>' +
          '<a class="hf-demo-banner-link" href="hotel-profile.html">Hotel Brain</a>' +
          '<a class="hf-demo-banner-link" href="index.html#waitlist">Apply for pilot</a>' +
          '<button type="button" class="hf-demo-banner-reset" id="hfDemoBannerReset">Reset Demo</button>' +
          '<button type="button" class="hf-demo-banner-exit" id="hfDemoBannerExit">Exit Demo</button>' +
        "</div>" +
      "</div>";
    document.body.insertBefore(bannerEl, document.body.firstChild);
    var exitBtn = bannerEl.querySelector("#hfDemoBannerExit");
    if (exitBtn) {
      exitBtn.addEventListener("click", function () {
        disable({ confirm: true, redirectTo: getReturnTo() });
      });
    }
    var resetBtn = bannerEl.querySelector("#hfDemoBannerReset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        resetDemo({ confirm: true });
      });
    }
    return bannerEl;
  }

  /**
   * Restore original Oakwood sample notes/snapshot and clear generated output.
   * Keeps Demo Mode active.
   */
  function resetDemo(options) {
    options = options || {};
    if (!isEnabled()) return Promise.resolve({ ok: false, reason: "inactive" });
    if (options.confirm && global.confirm) {
      var ok = global.confirm(
        "Reset Demo?\n\nSample notes and snapshot will restore to the original Oakwood pack. Generated output and temporary edits will clear."
      );
      if (!ok) return Promise.resolve({ ok: false, reason: "cancelled" });
    }
    clearMemoryPack();
    ensurePack();
    try {
      global.dispatchEvent(new CustomEvent("hf-demo-mode-reset", {
        detail: { packId: activePack && activePack.packId }
      }));
    } catch (err) {
      /* ignore */
    }
    dispatchChange();
    return Promise.resolve({ ok: true, packId: activePack && activePack.packId });
  }

  function syncBanner() {
    var el = ensureBanner();
    if (isEnabled()) {
      el.hidden = false;
      document.documentElement.classList.add("hf-demo-active");
      requestAnimationFrame(function () {
        el.classList.add("is-visible");
      });
    } else {
      el.classList.remove("is-visible");
      document.documentElement.classList.remove("hf-demo-active");
      delay(prefersReducedMotion() ? 0 : 280).then(function () {
        if (!isEnabled() && bannerEl) bannerEl.hidden = true;
      });
    }
  }

  function enable(options) {
    options = options || {};
    if (state.transitioning) return Promise.resolve({ ok: false, reason: "busy" });
    if (isEnabled() && !options.force) {
      syncBanner();
      return Promise.resolve({ ok: true, already: true });
    }

    if (!global.HFDemoSampleData) {
      return Promise.resolve({ ok: false, error: "Sample pack unavailable." });
    }

    if (options.returnTo) {
      setReturnTo(options.returnTo);
    } else {
      try {
        if (!global.sessionStorage.getItem(RETURN_KEY)) {
          setReturnTo(DEFAULT_RETURN_TO);
        }
      } catch (err) {
        setReturnTo(DEFAULT_RETURN_TO);
      }
    }

    state.transitioning = true;
    showOverlay("Preparing The Oakwood Mayfair");
    setOverlayProgress(0);

    return delay(240)
      .then(function () {
        setOverlayProgress(0);
        clearMemoryPack();
        ensurePack();
        return delay(320);
      })
      .then(function () {
        setOverlayProgress(1);
        return delay(280);
      })
      .then(function () {
        setOverlayProgress(2);
        return delay(280);
      })
      .then(function () {
        setOverlayProgress(3);
        return delay(260);
      })
      .then(function () {
        setOverlayProgress(4);
        installOverlays();
        writeFlag({
          enabled: true,
          packId: activePack.packId,
          seededAt: new Date().toISOString()
        });
        state.enabled = true;
        return delay(300);
      })
      .then(function () {
        setOverlayProgress(5);
        return delay(280);
      })
      .then(function () {
        state.transitioning = false;
        return hideOverlay().then(function () {
          syncBanner();
          dispatchChange();
          if (options.redirectTo) {
            global.location.href = options.redirectTo;
          }
          return { ok: true, isolation: "overlay-only", packId: state.packId };
        });
      })
      .catch(function (err) {
        state.transitioning = false;
        uninstallOverlays();
        clearMemoryPack();
        clearFlag();
        return hideOverlay().then(function () {
          return { ok: false, error: err };
        });
      });
  }

  function disable(options) {
    options = options || {};
    if (state.transitioning) return Promise.resolve({ ok: false, reason: "busy" });

    if (options.confirm && global.confirm) {
      var ok = global.confirm(
        "Exit Demo Mode?\n\nSample Oakwood data will disappear. Your Hotel Brain, drafts and maintenance records are unchanged."
      );
      if (!ok) return Promise.resolve({ ok: false, reason: "cancelled" });
    }

    var exitTarget = options.redirectTo != null
      ? options.redirectTo
      : (options.reload ? null : getReturnTo());

    state.transitioning = true;
    showOverlay("Exiting Demo Mode");
    setOverlayProgress(5, "Removing sample overlay…");

    return delay(280)
      .then(function () {
        uninstallOverlays();
        clearMemoryPack();
        clearFlag();
        clearReturnTo();
        state.enabled = false;
        return delay(240);
      })
      .then(function () {
        state.transitioning = false;
        return hideOverlay().then(function () {
          syncBanner();
          dispatchChange();
          if (exitTarget) {
            global.location.href = exitTarget;
          } else if (options.reload) {
            global.location.reload();
          }
          return { ok: true, redirectedTo: exitTarget || null };
        });
      })
      .catch(function (err) {
        state.transitioning = false;
        uninstallOverlays();
        clearMemoryPack();
        clearFlag();
        clearReturnTo();
        state.enabled = false;
        return hideOverlay().then(function () {
          syncBanner();
          dispatchChange();
          return { ok: false, error: err };
        });
      });
  }

  /**
   * Operator QA entry — small text link only (not a hotel workspace card).
   */
  function mountOperatorDemoLink(container) {
    if (!container) return null;
    var existing = document.getElementById("hfOperatorDemoLink");
    if (existing) return existing;

    var link = document.createElement("a");
    link.id = "hfOperatorDemoLink";
    link.href = "handover.html?demo=1";
    link.className = "hf-demo-operator-link";
    link.textContent = "Open Demo Mode";
    link.addEventListener("click", function (event) {
      event.preventDefault();
      enable({
        redirectTo: "handover.html",
        returnTo: "account.html"
      }).then(function (result) {
        if (!result || !result.ok) {
          link.textContent = "Open Demo Mode (retry)";
        }
      });
    });
    container.appendChild(link);
    return link;
  }

  /**
   * Landing-page CTA — enters isolated Demo Mode and lands on the demo handover.
   */
  function bindPublicEntryControl(control) {
    if (!control || control.getAttribute("data-hf-demo-bound") === "1") return control;
    control.setAttribute("data-hf-demo-bound", "1");
    control.addEventListener("click", function (event) {
      event.preventDefault();
      if (control.disabled) return;
      control.disabled = true;
      var originalLabel = control.textContent;
      control.textContent = "Opening demo…";
      enable({
        redirectTo: "handover.html",
        returnTo: "index.html"
      }).then(function (result) {
        if (!result || !result.ok) {
          control.disabled = false;
          control.textContent = originalLabel || "Try Interactive Demo";
        }
      }).catch(function () {
        control.disabled = false;
        control.textContent = originalLabel || "Try Interactive Demo";
      });
    });
    return control;
  }

  function stripDemoQueryParam() {
    try {
      if (!global.history || !global.history.replaceState || !global.location) return;
      var url = new URL(global.location.href);
      if (!url.searchParams.has("demo")) return;
      url.searchParams.delete("demo");
      var next = url.pathname + (url.searchParams.toString() ? "?" + url.searchParams.toString() : "") + url.hash;
      global.history.replaceState({}, "", next);
    } catch (err) {
      /* ignore */
    }
  }

  function consumeDemoQueryEntry(options) {
    options = options || {};
    try {
      var params = new URLSearchParams(global.location.search || "");
      if (params.get("demo") !== "1") return Promise.resolve(null);
    } catch (err) {
      return Promise.resolve(null);
    }

    return enable({
      returnTo: options.returnTo || DEFAULT_RETURN_TO,
      redirectTo: null
    }).then(function (result) {
      stripDemoQueryParam();
      if (!result || !result.ok) return null;
      initPageChrome({ banner: options.banner !== false });
      return { demoGuest: true };
    });
  }

  /**
   * Public Demo is Handover + Hotel Brain only.
   * Standalone Maintenance redirects to the Handover demo.
   */
  function redirectDemoAwayFromMaintenance() {
    if (!isEnabled()) return false;
    try {
      var path = String((global.location && global.location.pathname) || "").toLowerCase();
      if (path.indexOf("maintenance.html") === -1) return false;
      global.location.replace("handover.html?demo=1");
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Protected pages call this before auth. When Demo Mode is active (or ?demo=1),
   * returns a guest session so the page can boot without login.
   */
  function resolveGuestSession(options) {
    options = options || {};
    hydrate();
    if (isEnabled()) {
      if (redirectDemoAwayFromMaintenance()) {
        return Promise.resolve({ demoGuest: true, redirected: true });
      }
      initPageChrome({ banner: options.banner !== false });
      return Promise.resolve({ demoGuest: true });
    }
    return consumeDemoQueryEntry(options).then(function (session) {
      if (session && redirectDemoAwayFromMaintenance()) {
        return { demoGuest: true, redirected: true };
      }
      return session;
    });
  }

  /** @deprecated Hotel workspace demo card removed — operators use mountOperatorDemoLink. */
  function mountAccountToggle(container) {
    return mountOperatorDemoLink(container);
  }

  function syncAccountToggle() {
    /* no-op: hotel Interactive Demo card removed */
  }

  function initPageChrome(options) {
    options = options || {};
    hydrate();
    if (redirectDemoAwayFromMaintenance()) return getState();
    if (options.banner !== false) syncBanner();
    if (isEnabled()) installOverlays();
    document.documentElement.classList.toggle("hf-demo-active", isEnabled());
    document.documentElement.classList.toggle("hf-demo-workspace", isEnabled());
    return getState();
  }

  function assertNoPersistenceApi() {
    return {
      savesBrain: false,
      savesHandoverDraft: false,
      savesHandoverReport: false,
      savesMaintenance: false,
      clearsUserDraft: false,
      storageKeys: [STORAGE_KEY]
    };
  }

  global.HFDemoMode = {
    STORAGE_KEY: STORAGE_KEY,
    EVENT_NAME: EVENT_NAME,
    PUBLIC_SCOPE: PUBLIC_SCOPE,
    RETURN_KEY: RETURN_KEY,
    DEFAULT_RETURN_TO: DEFAULT_RETURN_TO,
    hydrate: hydrate,
    isEnabled: isEnabled,
    getState: getState,
    enable: enable,
    disable: disable,
    resetDemo: resetDemo,
    initPageChrome: initPageChrome,
    resolveGuestSession: resolveGuestSession,
    mountOperatorDemoLink: mountOperatorDemoLink,
    bindPublicEntryControl: bindPublicEntryControl,
    mountAccountToggle: mountAccountToggle,
    syncAccountToggle: syncAccountToggle,
    setReturnTo: setReturnTo,
    getReturnTo: getReturnTo,
    clearReturnTo: clearReturnTo,
    resolveDemoScope: resolveDemoScope,
    syncBanner: syncBanner,
    getDemoIssues: getDemoIssues,
    getDemoDraft: getDemoDraft,
    getDemoHandover: getDemoHandover,
    getDemoBrain: getDemoBrain,
    getDemoPriorShiftHistory: getDemoPriorShiftHistory,
    ensurePack: ensurePack,
    installOverlays: installOverlays,
    uninstallOverlays: uninstallOverlays,
    assertNoPersistenceApi: assertNoPersistenceApi
  };
})(typeof window !== "undefined" ? window : globalThis);
