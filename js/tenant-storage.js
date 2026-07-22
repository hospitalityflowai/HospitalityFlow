/**
 * Hospitality Flow — tenant-scoped browser storage
 *
 * Prevents cross-account data leaks by namespacing localStorage keys with
 * workspace_id (preferred) or user_id, and clearing all tenant data on sign-out.
 */
(function (global) {
  "use strict";

  var TENANT_SESSION_KEY = "hf_active_tenant";

  var LEGACY_LOCAL_KEYS = [
    "hospitalityFlow_hotelProfile",
    "hf_saved_handovers",
    "hf_handover_draft_v1",
    "hf_handover_last_backup",
    "hospitalityFlowSopDraft",
    "hf-rota-generator-draft-v1",
    "hf-rota-generator-draft-v2"
  ];

  var SCOPED_PREFIXES = [
    "hospitalityFlow_hotelProfile_",
    "hf_saved_handovers_",
    "hf_handover_draft_v1_",
    "hf_handover_last_backup_",
    "hospitalityFlowSopDraft_",
    "hf-rota-generator-draft-v2_"
  ];

  var LEGACY_SESSION_KEYS = [
    "hf_early_access_application"
  ];

  function readTenantContext() {
    try {
      var raw = sessionStorage.getItem(TENANT_SESSION_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return {
        userId: parsed.userId || null,
        workspaceId: parsed.workspaceId || null
      };
    } catch (err) {
      return null;
    }
  }

  function writeTenantContext(ctx) {
    try {
      if (!ctx || !ctx.userId) {
        sessionStorage.removeItem(TENANT_SESSION_KEY);
        return;
      }
      sessionStorage.setItem(
        TENANT_SESSION_KEY,
        JSON.stringify({
          userId: ctx.userId,
          workspaceId: ctx.workspaceId || null
        })
      );
    } catch (err) {
      /* sessionStorage unavailable */
    }
  }

  function updateTenantWorkspace(workspaceId) {
    var ctx = readTenantContext();
    if (!ctx || !ctx.userId) return;
    ctx.workspaceId = workspaceId || null;
    writeTenantContext(ctx);
  }

  function resolveScopeId(preferredWorkspaceId) {
    if (preferredWorkspaceId) return preferredWorkspaceId;
    var ctx = readTenantContext();
    if (!ctx) return null;
    if (ctx.workspaceId) return ctx.workspaceId;
    if (ctx.userId) return "user_" + ctx.userId;
    return null;
  }

  function scopedKey(baseKey, scopeId) {
    if (!baseKey) return null;
    var scope = resolveScopeId(scopeId);
    if (!scope) return null;
    return baseKey + "_" + scope;
  }

  function getRaw(baseKey, scopeId) {
    var key = scopedKey(baseKey, scopeId);
    if (!key) return null;
    try {
      return localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function setRaw(baseKey, rawValue, scopeId) {
    var key = scopedKey(baseKey, scopeId);
    if (!key || rawValue == null) return false;
    try {
      localStorage.setItem(key, rawValue);
      return true;
    } catch (err) {
      return false;
    }
  }

  function remove(baseKey, scopeId) {
    var key = scopedKey(baseKey, scopeId);
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch (err) {
      /* ignore */
    }
  }

  function clearLegacyKeys() {
    LEGACY_LOCAL_KEYS.forEach(function (key) {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        /* ignore */
      }
    });

    LEGACY_SESSION_KEYS.forEach(function (key) {
      try {
        sessionStorage.removeItem(key);
      } catch (err) {
        /* ignore */
      }
    });
  }

  function clearAllScopedLocalKeys() {
    try {
      var toRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key) continue;
        for (var j = 0; j < SCOPED_PREFIXES.length; j++) {
          if (key.indexOf(SCOPED_PREFIXES[j]) === 0) {
            toRemove.push(key);
            break;
          }
        }
      }
      toRemove.forEach(function (key) {
        localStorage.removeItem(key);
      });
    } catch (err) {
      /* ignore */
    }
  }

  function clearAllTenantData() {
    clearLegacyKeys();
    clearAllScopedLocalKeys();
    try {
      sessionStorage.removeItem(TENANT_SESSION_KEY);
    } catch (err) {
      /* ignore */
    }
  }

  global.HFTenantStorage = {
    TENANT_SESSION_KEY: TENANT_SESSION_KEY,
    LEGACY_LOCAL_KEYS: LEGACY_LOCAL_KEYS,
    readTenantContext: readTenantContext,
    writeTenantContext: writeTenantContext,
    updateTenantWorkspace: updateTenantWorkspace,
    resolveScopeId: resolveScopeId,
    scopedKey: scopedKey,
    getRaw: getRaw,
    setRaw: setRaw,
    remove: remove,
    clearLegacyKeys: clearLegacyKeys,
    clearAllTenantData: clearAllTenantData
  };
})(window);
