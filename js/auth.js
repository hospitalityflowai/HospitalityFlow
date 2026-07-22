/**
 * Hospitality Flow — Customer authentication (Phase 2)
 * Email/password auth via Supabase. Session persistence handled by Supabase client.
 */
(function (global) {
  "use strict";

  var ROUTES = {
    login: "login.html",
    signup: "signup.html",
    account: "account.html",
    forgotPassword: "forgot-password.html",
    resetPassword: "reset-password.html",
    home: "index.html"
  };

  var MIN_PASSWORD_LENGTH = 8;
  var RECOVERY_STORAGE_KEY = "hf_password_recovery_active";

  /** Set to true when subscriptions/payments launch public self-registration. */
  var PUBLIC_SIGNUP_ENABLED = false;

  function isPublicSignupEnabled() {
    return PUBLIC_SIGNUP_ENABLED === true;
  }

  function getPublicSignupDisabledMessage() {
    return "Hospitality Flow is currently invitation-only. Please use the invitation sent to your email.";
  }

  function redirect(url) {
    global.location.href = url;
  }

  function getPageUrl(filename) {
    var origin = global.location.origin;
    var basePath = global.location.pathname.replace(/[^/]*$/, "");
    return origin + basePath + filename;
  }

  function getRedirectTarget(fallback) {
    var params = new URLSearchParams(global.location.search);
    var target = params.get("redirect");
    if (!target || target.indexOf("login.html") !== -1 || target.indexOf("signup.html") !== -1) {
      return fallback || ROUTES.account;
    }
    return target;
  }

  function ensureClient() {
    if (!global.HospitalityFlowSupabase || !global.HospitalityFlowSupabase.isConfigured()) {
      return Promise.reject(new Error("Supabase is not configured. See SUPABASE_SETUP.md."));
    }
    return global.HospitalityFlowSupabase.initClient().then(function (client) {
      if (!client) {
        if (!global.HospitalityFlowSupabase.isSupabaseLibLoaded()) {
          return Promise.reject(new Error("Could not load the Supabase library. Check your connection and try again."));
        }
        return Promise.reject(new Error("Could not connect to Supabase. Check your configuration."));
      }
      return client;
    });
  }

  function syncAuthenticatedSession(session) {
    if (!session || !session.user || !global.HFTenantStorage) return;

    var userId = session.user.id;
    var ctx = global.HFTenantStorage.readTenantContext();

    if (ctx && ctx.userId && ctx.userId !== userId) {
      clearTenantData();
    } else if (global.HFTenantStorage) {
      global.HFTenantStorage.clearLegacyKeys();
    }

    global.HFTenantStorage.writeTenantContext({
      userId: userId,
      workspaceId: ctx && ctx.userId === userId ? ctx.workspaceId : null
    });
  }

  function clearTenantData() {
    if (global.HFTenantStorage) {
      global.HFTenantStorage.clearAllTenantData();
    }
    if (global.HFHotelBrainStore && global.HFHotelBrainStore.invalidateLoads) {
      global.HFHotelBrainStore.invalidateLoads();
    } else if (global.HFHotelBrainStore && global.HFHotelBrainStore.clearTenantCache) {
      global.HFHotelBrainStore.clearTenantCache();
    }
    if (global.HFHandoverStore && global.HFHandoverStore.clearTenantCache) {
      global.HFHandoverStore.clearTenantCache();
    }
    if (global.HFWorkspace && global.HFWorkspace.clearCachedWorkspace) {
      global.HFWorkspace.clearCachedWorkspace();
    }
    if (global.HospitalityFlowSupabase && global.HospitalityFlowSupabase.resetClient) {
      global.HospitalityFlowSupabase.resetClient();
    }
  }

  function getSession() {
    return ensureClient().then(function (client) {
      return client.auth.getSession().then(function (result) {
        var session = result.data.session || null;
        if (session) {
          syncAuthenticatedSession(session);
        }
        return session;
      });
    });
  }

  function requireGuest() {
    return getSession().then(function (session) {
      if (session) {
        redirect(getRedirectTarget(ROUTES.account));
        return true;
      }
      return false;
    }).catch(function () {
      return false;
    });
  }

  function requireAuth() {
    return getSession().then(function (session) {
      if (!session) {
        redirect(ROUTES.login + "?redirect=" + encodeURIComponent(global.location.pathname.split("/").pop() || ROUTES.account));
        return null;
      }
      return session;
    });
  }

  function signIn(email, password) {
    return ensureClient().then(function (client) {
      return client.auth.signInWithPassword({ email: email, password: password });
    }).then(function (result) {
      if (global.HFPlatformAccess && global.HFPlatformAccess.guardSignInResult) {
        return global.HFPlatformAccess.guardSignInResult(result);
      }
      return result;
    });
  }

  function signUp(email, password) {
    if (!isPublicSignupEnabled()) {
      return Promise.resolve({
        data: { user: null, session: null },
        error: new Error(getPublicSignupDisabledMessage())
      });
    }

    return ensureClient().then(function (client) {
      var redirectTo = getPageUrl(ROUTES.account);

      return client.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: redirectTo
        }
      });
    });
  }

  function signOut() {
    return ensureClient().then(function (client) {
      return client.auth.signOut();
    }).then(function (result) {
      clearTenantData();
      return result;
    });
  }

  function requestPasswordReset(email) {
    return ensureClient().then(function (client) {
      var invokeOptions = {
        body: {
          email: String(email || "").trim(),
          redirectTo: getPasswordResetRedirectUrl()
        }
      };

      // TEMPORARY DEVELOPMENT / QA ONLY — requires matching Edge Function secrets.
      // BEFORE PUBLIC LAUNCH: disable HF_DEV_FLAGS.PASSWORD_RESET_DEV_RELAXED.
      if (
        global.HF_DEV_FLAGS &&
        global.HF_DEV_FLAGS.PASSWORD_RESET_DEV_RELAXED === true &&
        global.HF_DEV_FLAGS.PASSWORD_RESET_DEV_KEY
      ) {
        invokeOptions.headers = {
          "X-HF-DEV-RESET-KEY": global.HF_DEV_FLAGS.PASSWORD_RESET_DEV_KEY
        };
      }

      return client.functions.invoke("request-password-reset", invokeOptions).then(function (result) {
        if (result.error) {
          return { data: null, error: result.error };
        }

        var payload = result.data || {};
        if (payload.ok === false) {
          return {
            data: null,
            error: new Error(payload.error || "Could not send password reset email.")
          };
        }

        return { data: payload, error: null };
      });
    });
  }

  function updatePassword(newPassword) {
    return ensureClient().then(function (client) {
      return client.auth.updateUser({ password: newPassword });
    });
  }

  function validateNewPassword(password, confirm) {
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return "Password must be at least " + MIN_PASSWORD_LENGTH + " characters.";
    }
    if (password !== confirm) {
      return "Passwords do not match.";
    }
    return null;
  }

  function getPasswordResetRedirectUrl() {
    return getPageUrl(ROUTES.resetPassword);
  }

  function markRecoveryActive() {
    try {
      sessionStorage.setItem(RECOVERY_STORAGE_KEY, "1");
    } catch (e) {
      /* sessionStorage unavailable */
    }
  }

  function clearRecoveryActive() {
    try {
      sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
    } catch (e) {
      /* sessionStorage unavailable */
    }
  }

  function isRecoveryActive() {
    try {
      return sessionStorage.getItem(RECOVERY_STORAGE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function hasRecoveryUrlHint() {
    var hash = global.location.hash.replace(/^#/, "");
    if (hash) {
      try {
        var hashParams = new URLSearchParams(hash);
        if (hashParams.get("type") === "recovery") return true;
      } catch (e) {
        /* ignore malformed hash */
      }
    }

    var search = global.location.search.replace(/^\?/, "");
    if (search) {
      try {
        var queryParams = new URLSearchParams(search);
        if (queryParams.get("type") === "recovery") return true;
      } catch (e) {
        /* ignore malformed query */
      }
    }

    return false;
  }

  function clearRecoveryUrlHash() {
    if (!global.history || !global.history.replaceState) return;
    global.history.replaceState({}, document.title, global.location.pathname + global.location.search);
  }

  function unsubscribeAuthListener(subscription) {
    if (!subscription) return;
    if (subscription.data && subscription.data.subscription && subscription.data.subscription.unsubscribe) {
      subscription.data.subscription.unsubscribe();
      return;
    }
    if (subscription.unsubscribe) {
      subscription.unsubscribe();
    }
  }

  function parseAuthHashError() {
    var hash = global.location.hash.replace(/^#/, "");
    if (!hash) return null;

    var params = new URLSearchParams(hash);
    var error = params.get("error_description") || params.get("error");
    if (!error) return null;

    try {
      return decodeURIComponent(error.replace(/\+/g, " "));
    } catch (e) {
      return error;
    }
  }

  function detectPasswordRecovery(client, timeoutMs) {
    var urlHint = hasRecoveryUrlHint();
    var recoveryAttempt = urlHint || isRecoveryActive();
    var timeout = timeoutMs || (urlHint ? 4000 : 0);

    return new Promise(function (resolve) {
      var settled = false;
      var subscription = null;
      var timer = null;

      function finish(isRecovery, session) {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        unsubscribeAuthListener(subscription);

        if (isRecovery) {
          markRecoveryActive();
          clearRecoveryUrlHash();
        } else if (!session) {
          clearRecoveryActive();
        }

        resolve({
          isRecovery: !!isRecovery,
          session: session || null,
          recoveryAttempt: recoveryAttempt
        });
      }

      subscription = client.auth.onAuthStateChange(function (event, session) {
        if (event === "PASSWORD_RECOVERY" && session) {
          finish(true, session);
        }
      });

      client.auth.getSession().then(function (result) {
        var session = result.data.session;

        if (isRecoveryActive() && session) {
          finish(true, session);
          return;
        }

        if (!urlHint) {
          finish(false, session);
        }
      });

      if (urlHint) {
        timer = setTimeout(function () {
          client.auth.getSession().then(function (result) {
            var session = result.data.session;
            finish(isRecoveryActive() && !!session, session);
          });
        }, timeout || 4000);
      }
    });
  }

  function formatError(error) {
    if (!error) return "Something went wrong. Please try again.";
    var msg = error.message || String(error);

    if (/invalid login credentials/i.test(msg)) {
      return "Incorrect email or password.";
    }
    if (/email not confirmed/i.test(msg)) {
      return "Please confirm your email before signing in.";
    }
    if (/user already registered|already been registered/i.test(msg)) {
      return "An account with this email already exists. Try signing in.";
    }
    if (/password should be at least|at least 6 characters/i.test(msg)) {
      return "Password must be at least 6 characters.";
    }
    if (/at least 8 characters/i.test(msg)) {
      return "Password must be at least " + MIN_PASSWORD_LENGTH + " characters.";
    }
    if (/same password|identical password|reuse/i.test(msg)) {
      return "Choose a different password from your current one.";
    }
    if (/session expired|invalid.*token|otp_expired|flow state/i.test(msg)) {
      return "This reset link has expired or is invalid. Please request a new one.";
    }
    if (/valid email/i.test(msg)) {
      return "Please enter a valid email address.";
    }
    if (/platform access has not been approved/i.test(msg)) {
      return global.HFPlatformAccess && global.HFPlatformAccess.NOT_APPROVED_MESSAGE
        ? global.HFPlatformAccess.NOT_APPROVED_MESSAGE
        : "Your Hospitality Flow access has not been approved yet.";
    }
    if (/not been approved yet/i.test(msg)) {
      return msg;
    }
    if (/signup is disabled|invitation-only|invitation only/i.test(msg)) {
      return getPublicSignupDisabledMessage();
    }
    if (/failed to load supabase|supabase js library/i.test(msg)) {
      return "Could not load Supabase. Please check your connection and try again.";
    }
    if (/invalid api key|invalid jwt|apikey/i.test(msg)) {
      return "Supabase configuration error. Please contact support.";
    }
    if (/rate limit|too many requests|email rate limit/i.test(msg)) {
      return "Too many reset attempts. Please wait a few minutes and try again.";
    }
    if (/redirect url|redirect_to/i.test(msg)) {
      return "Password reset is temporarily unavailable. Please contact hello@hospitalityflow.co.uk.";
    }

    return msg;
  }

  function showAlert(el, type, message) {
    if (!el) return;
    el.className = "auth-alert show auth-alert--" + type;
    el.textContent = message;
    el.setAttribute("role", type === "error" ? "alert" : "status");
  }

  function hideAlert(el) {
    if (!el) return;
    el.className = "auth-alert";
    el.textContent = "";
    el.removeAttribute("role");
  }

  function setFormLoading(form, loading, submitBtn, loadingText, defaultText) {
    if (!form || !submitBtn) return;
    var inputs = form.querySelectorAll("input, select, button");
    inputs.forEach(function (input) {
      input.disabled = loading;
    });
    submitBtn.textContent = loading ? loadingText : defaultText;
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function initLoginPage() {
    var form = document.getElementById("login-form");
    var alertEl = document.getElementById("auth-alert");
    var submitBtn = document.getElementById("login-submit");
    var loadingEl = document.getElementById("auth-loading");
    var contentEl = document.getElementById("auth-content");

    if (!form) return;

    requireGuest().then(function (wasRedirected) {
      if (loadingEl) loadingEl.classList.add("hidden");
      if (wasRedirected) return;
      if (contentEl) contentEl.classList.remove("hidden");

      showLoginResetSuccess();

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        hideAlert(alertEl);

        var email = document.getElementById("login-email").value.trim();
        var password = document.getElementById("login-password").value;

        if (!isValidEmail(email)) {
          showAlert(alertEl, "error", "Please enter a valid email address.");
          return;
        }

        if (!password) {
          showAlert(alertEl, "error", "Please enter your password.");
          return;
        }

        setFormLoading(form, true, submitBtn, "Signing in…", "Sign in");

        signIn(email, password).then(function (result) {
          if (result.error) {
            showAlert(alertEl, "error", formatError(result.error));
            setFormLoading(form, false, submitBtn, "Signing in…", "Sign in");
            return;
          }

          if (result.data && result.data.session) {
            syncAuthenticatedSession(result.data.session);
          }

          showAlert(alertEl, "success", "Signed in successfully. Redirecting…");

          var preloadPromise = global.HFHotelBrainStore
            ? global.HFHotelBrainStore.preload()
            : Promise.resolve();

          preloadPromise.finally(function () {
            setTimeout(function () {
              redirect(getRedirectTarget(ROUTES.account));
            }, 400);
          });
        }).catch(function (err) {
          showAlert(alertEl, "error", formatError(err));
          setFormLoading(form, false, submitBtn, "Signing in…", "Sign in");
        });
      });
    }).catch(function (err) {
      if (loadingEl) loadingEl.classList.add("hidden");
      if (contentEl) contentEl.classList.remove("hidden");
      showAlert(alertEl, "error", formatError(err));
    });
  }

  function showSignupInvitationOnly(form, alertEl) {
    var headingEl = document.querySelector(".auth-heading");
    var leadEl = document.querySelector(".auth-lead");
    var invitationEl = document.getElementById("signup-invitation-only");
    var footerEl = document.querySelector(".auth-footer-text");

    if (headingEl) headingEl.textContent = "Invitation only";
    if (leadEl) leadEl.textContent = getPublicSignupDisabledMessage();

    if (form) {
      form.classList.add("hidden");
      form.hidden = true;
      form.setAttribute("aria-hidden", "true");
    }

    if (invitationEl) {
      invitationEl.classList.remove("hidden");
      invitationEl.hidden = false;
    }

    if (footerEl) {
      footerEl.innerHTML = 'Already invited? <a href="' + ROUTES.login + '">Sign in</a>';
    }

    showAlert(alertEl, "info", getPublicSignupDisabledMessage());
  }

  function initSignupPage() {
    var form = document.getElementById("signup-form");
    var alertEl = document.getElementById("auth-alert");
    var submitBtn = document.getElementById("signup-submit");
    var loadingEl = document.getElementById("auth-loading");
    var contentEl = document.getElementById("auth-content");

    if (!form) return;

    requireGuest().then(function (wasRedirected) {
      if (loadingEl) loadingEl.classList.add("hidden");
      if (wasRedirected) return;
      if (contentEl) contentEl.classList.remove("hidden");

      if (!isPublicSignupEnabled()) {
        showSignupInvitationOnly(form, alertEl);
        return;
      }

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        hideAlert(alertEl);

        var email = document.getElementById("signup-email").value.trim();
        var password = document.getElementById("signup-password").value;
        var confirm = document.getElementById("signup-password-confirm").value;

        if (!isValidEmail(email)) {
          showAlert(alertEl, "error", "Please enter a valid email address.");
          return;
        }

        if (password.length < 6) {
          showAlert(alertEl, "error", "Password must be at least 6 characters.");
          return;
        }

        if (password !== confirm) {
          showAlert(alertEl, "error", "Passwords do not match.");
          return;
        }

        setFormLoading(form, true, submitBtn, "Creating account…", "Create account");

        signUp(email, password).then(function (result) {
          if (result.error) {
            showAlert(alertEl, "error", formatError(result.error));
            setFormLoading(form, false, submitBtn, "Creating account…", "Create account");
            return;
          }

          if (result.data.session) {
            showAlert(alertEl, "success", "Account created. Redirecting to your account…");
            setTimeout(function () {
              redirect(ROUTES.account);
            }, 500);
            return;
          }

          showAlert(
            alertEl,
            "success",
            "Account created. Please check your email to confirm your address, then sign in."
          );
          form.reset();
          setFormLoading(form, false, submitBtn, "Creating account…", "Create account");
        }).catch(function (err) {
          showAlert(alertEl, "error", formatError(err));
          setFormLoading(form, false, submitBtn, "Creating account…", "Create account");
        });
      });
    }).catch(function (err) {
      if (loadingEl) loadingEl.classList.add("hidden");
      if (contentEl) contentEl.classList.remove("hidden");
      showAlert(alertEl, "error", formatError(err));
    });
  }

  function initForgotPasswordPage() {
    var form = document.getElementById("forgot-form");
    var alertEl = document.getElementById("auth-alert");
    var submitBtn = document.getElementById("forgot-submit");
    var loadingEl = document.getElementById("auth-loading");
    var contentEl = document.getElementById("auth-content");

    if (!form) return;

    requireGuest().then(function (wasRedirected) {
      if (loadingEl) loadingEl.classList.add("hidden");
      if (wasRedirected) return;
      if (contentEl) contentEl.classList.remove("hidden");

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        hideAlert(alertEl);

        var email = document.getElementById("forgot-email").value.trim();

        if (!isValidEmail(email)) {
          showAlert(alertEl, "error", "Please enter a valid email address.");
          return;
        }

        setFormLoading(form, true, submitBtn, "Sending reset link…", "Send reset link");

        requestPasswordReset(email).then(function (result) {
          if (result.error) {
            showAlert(alertEl, "error", formatError(result.error));
            setFormLoading(form, false, submitBtn, "Sending reset link…", "Send reset link");
            return;
          }

          showAlert(
            alertEl,
            "success",
            (result.data && result.data.message) ||
              "If this email is eligible, a reset link will be sent shortly."
          );
          form.reset();
          setFormLoading(form, false, submitBtn, "Sending reset link…", "Send reset link");
        }).catch(function (err) {
          showAlert(alertEl, "error", formatError(err));
          setFormLoading(form, false, submitBtn, "Sending reset link…", "Send reset link");
        });
      });
    }).catch(function (err) {
      if (loadingEl) loadingEl.classList.add("hidden");
      if (contentEl) contentEl.classList.remove("hidden");
      showAlert(alertEl, "error", formatError(err));
    });
  }

  function bindResetPasswordForm(form, alertEl, submitBtn) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      hideAlert(alertEl);

      var password = document.getElementById("reset-password").value;
      var confirm = document.getElementById("reset-password-confirm").value;
      var validationError = validateNewPassword(password, confirm);

      if (validationError) {
        showAlert(alertEl, "error", validationError);
        return;
      }

      setFormLoading(form, true, submitBtn, "Updating password…", "Update password");

      updatePassword(password).then(function (result) {
        if (result.error) {
          showAlert(alertEl, "error", formatError(result.error));
          setFormLoading(form, false, submitBtn, "Updating password…", "Update password");
          return;
        }

        clearRecoveryActive();
        return signOut().then(function () {
          showAlert(alertEl, "success", "Password updated successfully. Redirecting to sign in…");
          setTimeout(function () {
            redirect(ROUTES.login + "?reset=success");
          }, 800);
        });
      }).catch(function (err) {
        showAlert(alertEl, "error", formatError(err));
        setFormLoading(form, false, submitBtn, "Updating password…", "Update password");
      });
    });
  }

  function initResetPasswordPage() {
    var form = document.getElementById("reset-form");
    var alertEl = document.getElementById("auth-alert");
    var submitBtn = document.getElementById("reset-submit");
    var loadingEl = document.getElementById("auth-loading");
    var contentEl = document.getElementById("auth-content");
    var invalidEl = document.getElementById("reset-invalid");

    if (!form) return;

    var hashError = parseAuthHashError();
    if (hashError) {
      if (loadingEl) loadingEl.classList.add("hidden");
      if (contentEl) contentEl.classList.remove("hidden");
      if (invalidEl) {
        invalidEl.classList.remove("hidden");
        invalidEl.hidden = false;
      }
      form.classList.add("hidden");
      form.hidden = true;
      showAlert(alertEl, "error", formatError({ message: hashError }));
      return;
    }

    ensureClient().then(function (client) {
      return detectPasswordRecovery(client).then(function (result) {
        if (loadingEl) loadingEl.classList.add("hidden");
        if (contentEl) contentEl.classList.remove("hidden");

        if (!result.session || !result.isRecovery) {
          if (invalidEl) {
            invalidEl.classList.remove("hidden");
            invalidEl.hidden = false;
          }
          form.classList.add("hidden");
          form.hidden = true;
          showAlert(
            alertEl,
            "error",
            "This reset link is invalid or has expired. Request a new password reset email."
          );
          return;
        }

        var accessPromise = global.HFPlatformAccess && global.HFPlatformAccess.checkPlatformAccess
          ? global.HFPlatformAccess.checkPlatformAccess()
          : Promise.resolve({ allowed: true });

        return accessPromise.then(function (access) {
          if (!access.allowed) {
            if (invalidEl) {
              invalidEl.classList.remove("hidden");
              invalidEl.hidden = false;
            }
            form.classList.add("hidden");
            form.hidden = true;
            return signOut().then(function () {
              showAlert(
                alertEl,
                "error",
                global.HFPlatformAccess && global.HFPlatformAccess.NOT_APPROVED_MESSAGE
                  ? global.HFPlatformAccess.NOT_APPROVED_MESSAGE
                  : "Your Hospitality Flow access has not been approved yet."
              );
            });
          }

          bindResetPasswordForm(form, alertEl, submitBtn);
        });
      });
    }).catch(function (err) {
      if (loadingEl) loadingEl.classList.add("hidden");
      if (contentEl) contentEl.classList.remove("hidden");
      showAlert(alertEl, "error", formatError(err));
    });
  }

  function setAccountPanelVisible(el, visible) {
    if (!el) return;
    el.classList.toggle("hidden", !visible);
    el.hidden = !visible;
  }

  function initAccountRecoveryInvalid() {
    var headingEl = document.getElementById("account-heading");
    var emailEl = document.getElementById("account-email");
    var alertEl = document.getElementById("auth-alert");
    var recoverySection = document.getElementById("password-recovery-section");
    var invalidEl = document.getElementById("recovery-password-invalid");

    setAccountPanelVisible(document.getElementById("workspace-create"), false);
    setAccountPanelVisible(document.getElementById("workspace-dashboard"), false);
    setAccountPanelVisible(document.getElementById("password-section"), false);
    setAccountPanelVisible(recoverySection, true);

    if (headingEl) headingEl.textContent = "Set new password";
    if (emailEl) emailEl.textContent = "";
    if (invalidEl) setAccountPanelVisible(invalidEl, true);

    var form = document.getElementById("recovery-password-form");
    if (form) setAccountPanelVisible(form, false);

    showAlert(
      alertEl,
      "error",
      "This reset link is invalid or has expired. Request a new password reset email."
    );
  }

  function initAccountRecoverySection(session) {
    var sectionEl = document.getElementById("password-recovery-section");
    var form = document.getElementById("recovery-password-form");
    var alertEl = document.getElementById("recovery-password-alert");
    var submitBtn = document.getElementById("recovery-password-submit");
    var headingEl = document.getElementById("account-heading");
    var emailEl = document.getElementById("account-email");
    var invalidEl = document.getElementById("recovery-password-invalid");

    setAccountPanelVisible(document.getElementById("workspace-create"), false);
    setAccountPanelVisible(document.getElementById("workspace-dashboard"), false);
    setAccountPanelVisible(document.getElementById("password-section"), false);
    setAccountPanelVisible(sectionEl, true);
    if (invalidEl) setAccountPanelVisible(invalidEl, false);

    if (headingEl) headingEl.textContent = "Set new password";
    if (emailEl && session && session.user && session.user.email) {
      emailEl.innerHTML = "Resetting password for <strong>" + escapeHtml(session.user.email) + "</strong>";
    }

    if (!form || !session) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      hideAlert(alertEl);
      hideAlert(document.getElementById("auth-alert"));

      var password = document.getElementById("recovery-password").value;
      var confirm = document.getElementById("recovery-password-confirm").value;
      var validationError = validateNewPassword(password, confirm);

      if (validationError) {
        showAlert(alertEl, "error", validationError);
        return;
      }

      setFormLoading(form, true, submitBtn, "Updating password…", "Set new password");

      updatePassword(password).then(function (result) {
        if (result.error) {
          showAlert(alertEl, "error", formatError(result.error));
          setFormLoading(form, false, submitBtn, "Updating password…", "Set new password");
          return;
        }

        clearRecoveryActive();
        setFormLoading(form, true, submitBtn, "Updating password…", "Set new password");
        form.querySelectorAll("input").forEach(function (input) {
          input.disabled = true;
        });

        showAlert(alertEl, "success", "Password updated successfully. Redirecting to sign in…");

        return signOut().then(function () {
          setTimeout(function () {
            redirect(ROUTES.login + "?reset=success");
          }, 1500);
        });
      }).catch(function (err) {
        showAlert(alertEl, "error", formatError(err));
        setFormLoading(form, false, submitBtn, "Updating password…", "Set new password");
      });
    });
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function initChangePasswordSection(session) {
    var sectionEl = document.getElementById("password-section");
    var form = document.getElementById("change-password-form");
    var alertEl = document.getElementById("password-alert");
    var submitBtn = document.getElementById("change-password-submit");

    if (!sectionEl || !form || !session) return;

    sectionEl.classList.remove("hidden");
    sectionEl.hidden = false;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      hideAlert(alertEl);

      var currentPassword = document.getElementById("change-password-current").value;
      var newPassword = document.getElementById("change-password-new").value;
      var confirm = document.getElementById("change-password-confirm").value;
      var email = session.user && session.user.email ? session.user.email : "";

      if (!currentPassword) {
        showAlert(alertEl, "error", "Please enter your current password.");
        return;
      }

      if (!email) {
        showAlert(alertEl, "error", "Could not verify your account email. Please sign in again.");
        return;
      }

      var validationError = validateNewPassword(newPassword, confirm);
      if (validationError) {
        showAlert(alertEl, "error", validationError);
        return;
      }

      if (currentPassword === newPassword) {
        showAlert(alertEl, "error", "Your new password must be different from your current password.");
        return;
      }

      setFormLoading(form, true, submitBtn, "Updating password…", "Update password");

      signIn(email, currentPassword).then(function (signInResult) {
        if (signInResult.error) {
          showAlert(alertEl, "error", "Current password is incorrect.");
          setFormLoading(form, false, submitBtn, "Updating password…", "Update password");
          return;
        }

        return updatePassword(newPassword).then(function (updateResult) {
          if (updateResult.error) {
            showAlert(alertEl, "error", formatError(updateResult.error));
            setFormLoading(form, false, submitBtn, "Updating password…", "Update password");
            return;
          }

          showAlert(alertEl, "success", "Password updated successfully.");
          form.reset();
          setFormLoading(form, false, submitBtn, "Updating password…", "Update password");
        });
      }).catch(function (err) {
        showAlert(alertEl, "error", formatError(err));
        setFormLoading(form, false, submitBtn, "Updating password…", "Update password");
      });
    });
  }

  function showLoginResetSuccess() {
    var params = new URLSearchParams(global.location.search);
    if (params.get("reset") !== "success") return;

    var alertEl = document.getElementById("auth-alert");
    if (alertEl) {
      showAlert(alertEl, "success", "Your password has been updated. You can sign in with your new password.");
    }

    if (global.history && global.history.replaceState) {
      global.history.replaceState({}, document.title, ROUTES.login);
    }
  }

  global.HFAuth = {
    ROUTES: ROUTES,
    MIN_PASSWORD_LENGTH: MIN_PASSWORD_LENGTH,
    PUBLIC_SIGNUP_ENABLED: PUBLIC_SIGNUP_ENABLED,
    isPublicSignupEnabled: isPublicSignupEnabled,
    getPublicSignupDisabledMessage: getPublicSignupDisabledMessage,
    ensureClient: ensureClient,
    getSession: getSession,
    requireGuest: requireGuest,
    requireAuth: requireAuth,
    signIn: signIn,
    signUp: signUp,
    signOut: signOut,
    requestPasswordReset: requestPasswordReset,
    updatePassword: updatePassword,
    validateNewPassword: validateNewPassword,
    formatError: formatError,
    showAlert: showAlert,
    hideAlert: hideAlert,
    setFormLoading: setFormLoading,
    initLoginPage: initLoginPage,
    initSignupPage: initSignupPage,
    initForgotPasswordPage: initForgotPasswordPage,
    initResetPasswordPage: initResetPasswordPage,
    initChangePasswordSection: initChangePasswordSection,
    initAccountRecoverySection: initAccountRecoverySection,
    initAccountRecoveryInvalid: initAccountRecoveryInvalid,
    detectPasswordRecovery: detectPasswordRecovery,
    showLoginResetSuccess: showLoginResetSuccess
  };
})(window);
