/**
 * Hospitality Flow — Demo Mode (isolated overlay)
 *
 * Interactive Demo for The Oakwood Marylebone.
 * Sample data lives only in memory + a minimal localStorage flag.
 * Never writes Hotel Brain, handover drafts/saved reports, or maintenance
 * issues into Supabase or over the user's real local draft.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "hf_demo_mode";
  var EVENT_NAME = "hf-demo-mode-change";

  var ENABLE_STEPS = [
    { key: "brain", label: "Loading Oakwood Hotel Brain…" },
    { key: "guests", label: "Staging VIP arrivals and guest follow-ups…" },
    { key: "maintenance", label: "Adding realistic maintenance issues…" },
    { key: "payments", label: "Preparing open balances and payment checks…" },
    { key: "handover", label: "Preparing AI shift handover…" },
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

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function readFlag() {
    var ts = tenantStorage();
    var scope = resolveScope();
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
    var scope = resolveScope();
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
    var scope = resolveScope();
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
    if (activePack && activeDraft && activeHandover && activeBrain) {
      return activePack;
    }
    if (!global.HFDemoSampleData) return null;
    var pack = global.HFDemoSampleData.buildPack(resolveScope());
    activePack = pack;
    activeDraft = global.HFDemoSampleData.buildDraftPayload(pack);
    activeHandover = global.HFDemoSampleData.buildHandoverRecord(pack);
    activeBrain = pack.hotelBrainProfile || global.HFDemoSampleData.buildHotelBrainProfile();
    return pack;
  }

  function clearMemoryPack() {
    activePack = null;
    activeDraft = null;
    activeHandover = null;
    activeBrain = null;
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
      return originalBrain.load.call(store, options).then(function (result) {
        /* Keep real cache untouched; callers that use returned.profile see Oakwood. */
        return {
          profile: getDemoBrain(),
          hotelId: result && result.hotelId ? result.hotelId : null,
          demoOverlay: true,
          error: result && result.error ? result.error : null
        };
      }).catch(function () {
        return { profile: getDemoBrain(), hotelId: null, demoOverlay: true };
      });
    };

    store.save = function (profileData, options) {
      if (isEnabled()) {
        return Promise.reject(new Error("DEMO_MODE_READ_ONLY"));
      }
      return originalBrain.save.call(store, profileData, options);
    };

    store.setCache = function (hotelId, profile, userId) {
      if (isEnabled() && profile && profile.isDemoData) {
        /* Never seed real cache with demo profile. */
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
      deleteHandover: store.deleteHandover
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
        /* Preserve the user's real draft — demo edits stay in the DOM only. */
        if (payload && payload.isDemoData) {
          activeDraft = clone(payload);
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
      var real = originalHandover.getSavedHandovers
        ? originalHandover.getSavedHandovers.call(store)
        : [];
      if (!isEnabled()) return real;
      var demo = getDemoHandover();
      var filtered = (real || []).filter(function (item) {
        return !item || !item.isDemoData;
      });
      return [demo].concat(filtered);
    };

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
      createIssue: store.createIssue
    };

    store.getCachedIssues = function () {
      var real = originalMaintenance.getCachedIssues.call(store);
      if (!isEnabled()) return real;
      return mergeIssues(real, getDemoIssues());
    };

    store.listIssues = function (filters) {
      if (!isEnabled()) return originalMaintenance.listIssues.call(store, filters);
      var merged = mergeIssues(
        originalMaintenance.getCachedIssues.call(store),
        getDemoIssues()
      );
      if (store.applyFilters) return store.applyFilters(merged, filters || {});
      return merged;
    };

    store.getIssue = function (issueId) {
      var id = String(issueId || "");
      if (isEnabled()) {
        var demo = getDemoIssues();
        for (var i = 0; i < demo.length; i++) {
          if (String(demo[i].id) === id) return demo[i];
        }
      }
      return originalMaintenance.getIssue.call(store, issueId);
    };

    store.getMetrics = function () {
      if (!isEnabled()) return originalMaintenance.getMetrics.call(store);
      var issues = store.getCachedIssues();
      if (typeof store.computeMetrics === "function") {
        return store.computeMetrics(issues);
      }
      return originalMaintenance.getMetrics.call(store);
    };

    store.createIssue = function (payload) {
      if (isEnabled()) {
        return Promise.reject(Object.assign(new Error("DEMO_MODE_READ_ONLY"), {
          code: "DEMO_MODE_READ_ONLY"
        }));
      }
      return originalMaintenance.createIssue.call(store, payload);
    };
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
    }
    originalHandover = null;

    if (originalMaintenance && global.HFMaintenanceStore) {
      global.HFMaintenanceStore.listIssues = originalMaintenance.listIssues;
      global.HFMaintenanceStore.getCachedIssues = originalMaintenance.getCachedIssues;
      global.HFMaintenanceStore.getIssue = originalMaintenance.getIssue;
      global.HFMaintenanceStore.getMetrics = originalMaintenance.getMetrics;
      global.HFMaintenanceStore.createIssue = originalMaintenance.createIssue;
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
        '<h2 class="hf-demo-overlay-title" id="hfDemoOverlayTitle">Preparing The Oakwood Marylebone</h2>' +
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
          '<p class="hf-demo-banner-text">Interactive Demo — The Oakwood Marylebone sample data (not saved to your workspace).</p>' +
        "</div>" +
        '<div class="hf-demo-banner-actions">' +
          '<a class="hf-demo-banner-link" href="handover.html">Open handover</a>' +
          '<a class="hf-demo-banner-link" href="maintenance.html">Open maintenance</a>' +
          '<button type="button" class="hf-demo-banner-exit" id="hfDemoBannerExit">Exit Demo</button>' +
        "</div>" +
      "</div>";
    document.body.insertBefore(bannerEl, document.body.firstChild);
    var exitBtn = bannerEl.querySelector("#hfDemoBannerExit");
    if (exitBtn) {
      exitBtn.addEventListener("click", function () {
        disable({ confirm: true, reload: true });
      });
    }
    return bannerEl;
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

    state.transitioning = true;
    showOverlay("Preparing The Oakwood Marylebone");
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

    state.transitioning = true;
    showOverlay("Exiting Demo Mode");
    setOverlayProgress(5, "Removing sample overlay…");

    return delay(280)
      .then(function () {
        uninstallOverlays();
        clearMemoryPack();
        clearFlag();
        state.enabled = false;
        return delay(240);
      })
      .then(function () {
        state.transitioning = false;
        return hideOverlay().then(function () {
          syncBanner();
          dispatchChange();
          if (options.reload) {
            global.location.reload();
          }
          return { ok: true };
        });
      })
      .catch(function (err) {
        state.transitioning = false;
        uninstallOverlays();
        clearMemoryPack();
        clearFlag();
        state.enabled = false;
        return hideOverlay().then(function () {
          syncBanner();
          dispatchChange();
          return { ok: false, error: err };
        });
      });
  }

  function mountAccountToggle(container) {
    if (!container) return null;
    var existing = document.getElementById("hfDemoModeCard");
    if (existing) {
      syncAccountToggle(existing);
      return existing;
    }

    var card = document.createElement("div");
    card.id = "hfDemoModeCard";
    card.className = "hf-demo-account-card";
    card.innerHTML =
      '<div class="hf-demo-account-copy">' +
        '<p class="hf-demo-account-label">Interactive Demo</p>' +
        '<p class="hf-demo-account-text">Explore The Oakwood Marylebone — a fictional 24-room boutique hotel with guests, maintenance, payments and an AI shift handover. Sample data is never saved to your workspace.</p>' +
        '<p class="hf-demo-account-status" id="hfDemoAccountStatus" aria-live="polite"></p>' +
      "</div>" +
      '<button type="button" class="btn btn-primary" id="hfDemoAccountToggle">Enter Demo Mode</button>';

    container.appendChild(card);
    syncAccountToggle(card);

    var btn = card.querySelector("#hfDemoAccountToggle");
    if (btn) {
      btn.addEventListener("click", function () {
        if (isEnabled()) {
          disable({ confirm: true, reload: true }).then(function () {
            syncAccountToggle(card);
          });
        } else {
          btn.disabled = true;
          enable({ redirectTo: "handover.html" }).then(function (result) {
            btn.disabled = false;
            syncAccountToggle(card);
            if (!result || !result.ok) {
              var status = card.querySelector("#hfDemoAccountStatus");
              if (status) status.textContent = "Could not start Demo Mode. Please try again.";
            }
          });
        }
      });
    }
    return card;
  }

  function syncAccountToggle(card) {
    card = card || document.getElementById("hfDemoModeCard");
    if (!card) return;
    var btn = card.querySelector("#hfDemoAccountToggle");
    var status = card.querySelector("#hfDemoAccountStatus");
    card.classList.toggle("is-active", isEnabled());
    if (btn) {
      btn.textContent = isEnabled() ? "Exit Demo Mode" : "Enter Demo Mode";
      btn.classList.toggle("btn-primary", !isEnabled());
      btn.classList.toggle("btn-secondary", isEnabled());
    }
    if (status) {
      status.textContent = isEnabled()
        ? "Demo Mode is on — Oakwood sample data is overlay-only and not saved to your workspace."
        : "";
    }
  }

  function initPageChrome(options) {
    options = options || {};
    hydrate();
    if (options.banner !== false) syncBanner();
    if (isEnabled()) installOverlays();
    document.documentElement.classList.toggle("hf-demo-active", isEnabled());
    if (isEnabled()) {
      requestAnimationFrame(function () {
        document.documentElement.classList.add("hf-demo-reveal");
      });
    }
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
    hydrate: hydrate,
    isEnabled: isEnabled,
    getState: getState,
    enable: enable,
    disable: disable,
    initPageChrome: initPageChrome,
    mountAccountToggle: mountAccountToggle,
    syncAccountToggle: syncAccountToggle,
    syncBanner: syncBanner,
    getDemoIssues: getDemoIssues,
    getDemoDraft: getDemoDraft,
    getDemoHandover: getDemoHandover,
    getDemoBrain: getDemoBrain,
    ensurePack: ensurePack,
    installOverlays: installOverlays,
    uninstallOverlays: uninstallOverlays,
    assertNoPersistenceApi: assertNoPersistenceApi
  };
})(typeof window !== "undefined" ? window : globalThis);
