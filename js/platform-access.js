/**
 * Hospitality Flow — invitation-only platform access checks (Phase 10)
 * Fail-closed: missing RPC, check errors, or denied status never grant access.
 */
(function (global) {
  "use strict";

  var NOT_APPROVED_MESSAGE =
    "Your Hospitality Flow access has not been approved yet.";

  function deniedAccess(reason) {
    return {
      allowed: false,
      accessStatus: null,
      hasMembership: false,
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
      reason: data.reason || null
    };
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

        if (options.signOutOnDeny !== false && global.HFAuth.signOut) {
          return global.HFAuth.signOut().then(function () {
            redirectToPending(options.redirect);
            return null;
          });
        }

        redirectToPending(options.redirect);
        return null;
      });
    });
  }

  function redirectToPending(url) {
    var target = url || "account.html?access=pending";
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

      return global.HFAuth.signOut().then(function () {
        return {
          data: { user: null, session: null },
          error: new Error(NOT_APPROVED_MESSAGE)
        };
      });
    });
  }

  function formatWorkspaceError(error) {
    var msg = error && (error.message || String(error));
    if (/platform access has not been approved/i.test(msg || "")) {
      return NOT_APPROVED_MESSAGE;
    }
    return msg || NOT_APPROVED_MESSAGE;
  }

  global.HFPlatformAccess = {
    NOT_APPROVED_MESSAGE: NOT_APPROVED_MESSAGE,
    checkPlatformAccess: checkPlatformAccess,
    isPasswordResetAllowed: isPasswordResetAllowed,
    requireApprovedAccess: requireApprovedAccess,
    guardSignInResult: guardSignInResult,
    formatWorkspaceError: formatWorkspaceError
  };
})(window);
