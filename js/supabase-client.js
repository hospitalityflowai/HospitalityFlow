/**
 * Hospitality Flow — Supabase client (Phase 1)
 *
 * Reusable browser client for customer accounts and authentication only.
 * Requires:
 *   1. js/supabase-config.js (local, not committed)
 *   2. @supabase/supabase-js loaded from CDN before or when getClient() is first called
 *
 * Usage (auth and account pages):
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *   <script src="js/supabase-config.js"></script>
 *   <script src="js/supabase-client.js"></script>
 */
(function (global) {
  "use strict";

  var PLACEHOLDER_URL = "YOUR_SUPABASE_PROJECT_URL";
  var PLACEHOLDER_KEY = "YOUR_SUPABASE_ANON_KEY";
  var SUPABASE_CDN =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";

  var clientInstance = null;
  var clientInitPromise = null;
  var cdnLoadPromise = null;

  function getConfig() {
    return global.HF_SUPABASE_CONFIG || null;
  }

  function isPlaceholder(value) {
    if (!value || typeof value !== "string") return true;
    var trimmed = value.trim();
    if (!trimmed) return true;
    if (trimmed === PLACEHOLDER_URL || trimmed === PLACEHOLDER_KEY) return true;
    if (/^YOUR_/i.test(trimmed) || /YOUR_SUPABASE/i.test(trimmed)) return true;
    if (/PASTE_YOUR/i.test(trimmed)) return true;
    if (/example\.supabase\.co/i.test(trimmed)) return true;
    if (/eyJexample/i.test(trimmed)) return true;
    return false;
  }

  function isConfigured() {
    var config = getConfig();
    if (!config) return false;
    return !isPlaceholder(config.url) && !isPlaceholder(config.anonKey);
  }

  function isSupabaseLibLoaded() {
    return !!(global.supabase && typeof global.supabase.createClient === "function");
  }

  function loadSupabaseCdn() {
    if (isSupabaseLibLoaded()) {
      return Promise.resolve();
    }

    if (cdnLoadPromise) {
      return cdnLoadPromise;
    }

    cdnLoadPromise = new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-hf-supabase="true"]');
      if (existing) {
        existing.addEventListener("load", function () { resolve(); });
        existing.addEventListener("error", function () {
          reject(new Error("Failed to load Supabase JS library."));
        });
        if (isSupabaseLibLoaded()) resolve();
        return;
      }

      var script = document.createElement("script");
      script.src = SUPABASE_CDN;
      script.async = true;
      script.setAttribute("data-hf-supabase", "true");
      script.onload = function () { resolve(); };
      script.onerror = function () {
        reject(new Error("Failed to load Supabase JS library."));
      };
      document.head.appendChild(script);
    });

    return cdnLoadPromise;
  }

  function createClientInstance() {
    if (!isConfigured()) {
      return null;
    }

    if (!isSupabaseLibLoaded()) {
      return null;
    }

    var config = getConfig();
    return global.supabase.createClient(config.url.trim(), config.anonKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  function getClient() {
    if (clientInstance) {
      return clientInstance;
    }

    clientInstance = createClientInstance();
    return clientInstance;
  }

  function resetClient() {
    clientInstance = null;
    clientInitPromise = null;
  }

  /**
   * Ensures the Supabase CDN is loaded and returns a ready client, or null if
   * configuration is missing or invalid.
   */
  function initClient() {
    if (!isConfigured()) {
      return Promise.resolve(null);
    }

    if (clientInstance) {
      return Promise.resolve(clientInstance);
    }

    if (clientInitPromise) {
      return clientInitPromise;
    }

    clientInitPromise = loadSupabaseCdn().then(function () {
      if (!isSupabaseLibLoaded()) {
        return null;
      }
      if (!clientInstance) {
        clientInstance = createClientInstance();
      }
      return clientInstance;
    }).catch(function () {
      return null;
    }).finally(function () {
      clientInitPromise = null;
    });

    return clientInitPromise;
  }

  global.HospitalityFlowSupabase = {
    isConfigured: isConfigured,
    isSupabaseLibLoaded: isSupabaseLibLoaded,
    getClient: getClient,
    initClient: initClient,
    resetClient: resetClient
  };
})(window);
