/**
 * Hospitality Flow — Early Access applications & founding hotel availability
 *
 * Requires js/supabase-config.js and js/supabase-client.js (loaded first).
 * Public visitors may only read aggregate availability via RPC — never application rows.
 * Applications are submitted through the submit-early-access-application Edge Function,
 * which saves the row and triggers internal email delivery server-side.
 */
(function (global) {
  "use strict";

  var FOUNDING_TOTAL = 10;
  var FALLBACK_MESSAGE = "10 pilot places currently available.";
  var SUBMIT_FUNCTION_NAME = "submit-early-access-application";

  function formatAvailabilityMessage(remaining) {
    if (remaining <= 0) {
      return "Founding Pilot Programme is currently full.";
    }
    if (remaining === 1) {
      return "1 pilot place remaining.";
    }
    if (remaining >= FOUNDING_TOTAL) {
      return FOUNDING_TOTAL + " pilot places currently available.";
    }
    return remaining + " pilot places remaining.";
  }

  function parseRemainingPlaces(data) {
    if (!data || data.remaining_places == null) {
      return null;
    }
    var remaining = typeof data.remaining_places === "number"
      ? data.remaining_places
      : parseInt(data.remaining_places, 10);
    if (isNaN(remaining)) {
      return null;
    }
    return Math.max(0, remaining);
  }

  function loadFoundingAvailability() {
    var supabaseApi = global.HospitalityFlowSupabase;
    if (!supabaseApi || !supabaseApi.isConfigured()) {
      return Promise.resolve({ ok: false, message: FALLBACK_MESSAGE });
    }

    return supabaseApi.initClient().then(function (client) {
      if (!client) {
        return { ok: false, message: FALLBACK_MESSAGE };
      }

      return client.rpc("get_founding_hotel_availability").then(function (result) {
        var remaining = parseRemainingPlaces(result.data);
        if (result.error || remaining === null) {
          return { ok: false, message: FALLBACK_MESSAGE };
        }
        return {
          ok: true,
          remaining: remaining,
          message: formatAvailabilityMessage(remaining)
        };
      });
    }).catch(function () {
      return { ok: false, message: FALLBACK_MESSAGE };
    });
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function parseRoomCount(value) {
    if (value == null || value === "") return null;
    var parsed = parseInt(String(value), 10);
    return isNaN(parsed) ? null : parsed;
  }

  function submitApplication(data) {
    var supabaseApi = global.HospitalityFlowSupabase;
    if (!supabaseApi || !supabaseApi.isConfigured()) {
      try {
        sessionStorage.setItem("hf_early_access_application", JSON.stringify(data));
      } catch (err) {
        /* storage unavailable */
      }
      return Promise.resolve({ ok: true, offline: true });
    }

    return supabaseApi.initClient().then(function (client) {
      if (!client) {
        return { ok: false };
      }

      return client.functions.invoke(SUBMIT_FUNCTION_NAME, {
        body: {
          firstName: String(data.firstName || "").trim(),
          email: normalizeEmail(data.email),
          propertyName: String(data.propertyName || "").trim(),
          propertyType: String(data.propertyType || "").trim(),
          roomCount: parseRoomCount(data.roomCount),
          role: String(data.role || "").trim(),
          source: data.source || "early-access-programme"
        }
      }).then(function (fnResult) {
        if (fnResult.error) {
          console.error("[early-access] Submit function invoke failed:", fnResult.error);
          return { ok: false, error: fnResult.error };
        }

        var payload = fnResult.data || {};
        if (payload.ok === false) {
          console.error("[early-access] Submit function error:", payload.error);
          return { ok: false, error: payload.error || "Application could not be saved." };
        }

        return {
          ok: true,
          applicationSaved: payload.applicationSaved !== false,
          emailWarning: !!payload.emailWarning
        };
      }).catch(function (err) {
        console.error("[early-access] Submit function request failed:", err);
        return { ok: false, error: err };
      });
    }).catch(function () {
      return { ok: false };
    });
  }

  function initAvailabilityDisplay(elementId) {
    var el = document.getElementById(elementId);
    if (!el) {
      return;
    }

    el.classList.add("is-loading");
    el.textContent = "Checking availability\u2026";

    loadFoundingAvailability().then(function (result) {
      el.classList.remove("is-loading");
      el.textContent = result.message;
    });
  }

  global.HospitalityFlowEarlyAccess = {
    FOUNDING_TOTAL: FOUNDING_TOTAL,
    FALLBACK_MESSAGE: FALLBACK_MESSAGE,
    formatAvailabilityMessage: formatAvailabilityMessage,
    loadFoundingAvailability: loadFoundingAvailability,
    submitApplication: submitApplication,
    initAvailabilityDisplay: initAvailabilityDisplay
  };
})(window);
