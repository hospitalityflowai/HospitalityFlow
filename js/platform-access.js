/**
 * Hospitality Flow — invitation-only platform access checks (Phase 10)
 * Fail-closed: missing RPC, check errors, or denied status never grant access.
 * Suspension (reason SUSPENDED) is a global deny even when hotel_members exists.
 */
(function (global) {
  "use strict";

  var NOT_APPROVED_MESSAGE =
    "Your Hospitality Flow access has not been approved yet.";

  var SUSPENDED_MESSAGE =
    "Your Hospitality Flow access has been suspended. Contact hello@hospitalityflow.co.uk if you believe this is a mistake.";

  function deniedAccess(reason) {
    return {
      allowed: false,
      accessStatus: null,
      hasMembership: false,
      isOperator: false,
      reason: reason || "ACCESS_CHECK_FAILED"
    };
  }

  function ensureClient() {
    return global.HFAuth.ensureClient();
  }

  function parseAccessResult(data) {
    data = data || {};
    return {
      allowed: data.allowed === true,
      accessStatus: data.access_status || null,
      hasMembership: data.has_membership === true,
      // Independent of access_status when not suspended — hotel members who are
      // also operators keep "active" while is_operator reports true.
      isOperator: data.is_operator === true,
      reason: data.reason || null
    };
  }

  function denyMessage(access) {
    if (!access) return NOT_APPROVED_MESSAGE;
    if (
      access.reason === "SUSPENDED" ||
      access.accessStatus === "suspended"
    ) {
      return SUSPENDED_MESSAGE;
    }
    return NOT_APPROVED_MESSAGE;
  }

  /** Clear in-memory / tenant workspace identity after an access deny. */
  function clearWorkspaceIdentity() {
    if (global.HFWorkspace && global.HFWorkspace.clearCachedWorkspace) {
      global.HFWorkspace.clearCachedWorkspace();
    }
    if (global.HFTenantStorage) {
      var ctx = global.HFTenantStorage.readTenantContext
        ? global.HFTenantStorage.readTenantContext()
        : null;
      if (ctx && ctx.userId && global.HFTenantStorage.writeTenantContext) {
        global.HFTenantStorage.writeTenantContext({
          userId: ctx.userId,
          workspaceId: null
        });
      }
    }
    if (global.HFHotelBrainStore && global.HFHotelBrainStore.invalidateLoads) {
      global.HFHotelBrainStore.invalidateLoads();
    } else if (global.HFHotelBrainStore && global.HFHotelBrainStore.clearTenantCache) {
      global.HFHotelBrainStore.clearTenantCache();
    }
    if (global.HFHandoverStore && global.HFHandoverStore.clearTenantCache) {
      global.HFHandoverStore.clearTenantCache();
    }
  }

  function checkPlatformAccess() {
    if (!global.HFAuth || !global.HFAuth.ensureClient) {
      return Promise.resolve(deniedAccess("MODULE_MISSING"));
    }

    if (!global.HospitalityFlowSupabase || !global.HospitalityFlowSupabase.isConfigured()) {
      return Promise.resolve(deniedAccess("SUPABASE_NOT_CONFIGURED"));
    }

    return ensureClient().then(function (client) {
      return client.rpc("get_my_platform_access").then(function (result) {
        if (result.error) {
          var errMsg = result.error.message || "";
          var errCode = String(result.error.code || "");
          if (
            errCode === "PGRST202" ||
            errCode === "42883" ||
            /function.*does not exist|PGRST202|42883|schema cache|could not find the function/i.test(errMsg)
          ) {
            return deniedAccess("MIGRATION_PENDING");
          }
          return deniedAccess("ACCESS_CHECK_FAILED");
        }
        return parseAccessResult(result.data);
      });
    }).catch(function () {
      return deniedAccess("ACCESS_CHECK_FAILED");
    });
  }

  function isPasswordResetAllowed(email) {
    return ensureClient().then(function (client) {
      return client.functions.invoke("request-password-reset", {
        body: {
          email: String(email || "").trim(),
          redirectTo: global.HFAuth.getPasswordResetRedirectUrl
            ? global.HFAuth.getPasswordResetRedirectUrl()
            : undefined
        }
      }).then(function (result) {
        if (result.error) {
          return Promise.reject(result.error);
        }
        return result.data || {};
      });
    });
  }

  function requireApprovedAccess(options) {
    options = options || {};

    return global.HFAuth.requireAuth().then(function (session) {
      if (!session) return null;

      return checkPlatformAccess().then(function (access) {
        if (access.allowed) {
          return session;
        }

        clearWorkspaceIdentity();

        if (options.signOutOnDeny !== false && global.HFAuth.signOut) {
          return global.HFAuth.signOut().then(function () {
            redirectToPending(options.redirect, access);
            return null;
          });
        }

        redirectToPending(options.redirect, access);
        return null;
      });
    });
  }

  function redirectToPending(url, access) {
    var suspended =
      access &&
      (access.reason === "SUSPENDED" || access.accessStatus === "suspended");

    // Always land on allowlisted account.html — never honour arbitrary url targets.
    var target = suspended
      ? "account.html?access=suspended"
      : "account.html?access=pending";

    if (
      !suspended &&
      url &&
      global.HFSafeRedirect &&
      typeof global.HFSafeRedirect.resolveInternalRedirect === "function"
    ) {
      var resolved = global.HFSafeRedirect.resolveInternalRedirect(url, {
        fallback: "account.html",
        isOperator: false
      });
      if (resolved === "account.html") {
        target = "account.html?access=pending";
      }
    }

    global.location.href = target;
  }

  function guardSignInResult(result) {
    if (!result || result.error || !result.data || !result.data.session) {
      return Promise.resolve(result);
    }

    return checkPlatformAccess().then(function (access) {
      if (access.allowed) {
        return result;
      }

      clearWorkspaceIdentity();

      return global.HFAuth.signOut().then(function () {
        return {
          data: { user: null, session: null },
          error: new Error(denyMessage(access))
        };
      });
    });
  }

  function formatWorkspaceError(error) {
    var msg = error && (error.message || String(error));
    if (/platform access is suspended|access has been suspended/i.test(msg || "")) {
      return SUSPENDED_MESSAGE;
    }
    if (/platform access has not been approved/i.test(msg || "")) {
      return NOT_APPROVED_MESSAGE;
    }
    return msg || NOT_APPROVED_MESSAGE;
  }

  global.HFPlatformAccess = {
    NOT_APPROVED_MESSAGE: NOT_APPROVED_MESSAGE,
    SUSPENDED_MESSAGE: SUSPENDED_MESSAGE,
    checkPlatformAccess: checkPlatformAccess,
    isPasswordResetAllowed: isPasswordResetAllowed,
    requireApprovedAccess: requireApprovedAccess,
    guardSignInResult: guardSignInResult,
    formatWorkspaceError: formatWorkspaceError,
    denyMessage: denyMessage,
    clearWorkspaceIdentity: clearWorkspaceIdentity
  };
})(window);
