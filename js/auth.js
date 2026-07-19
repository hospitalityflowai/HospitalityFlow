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
        return Promise.reject(new Error("Could not connect to Supabase. Check your configuration."));
      }
      return client;
    });
  }

  function getSession() {
    return ensureClient().then(function (client) {
      return client.auth.getSession().then(function (result) {
        return result.data.session || null;
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
    });
  }

  function signUp(email, password) {
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
    });
  }

  function signOut() {
    return ensureClient().then(function (client) {
      return client.auth.signOut();
    });
  }

  function requestPasswordReset(email) {
    return ensureClient().then(function (client) {
      return client.auth.resetPasswordForEmail(email, {
        redirectTo: getPageUrl(ROUTES.resetPassword)
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

  function waitForRecoverySession(client, timeoutMs) {
    var timeout = timeoutMs || 4000;

    return new Promise(function (resolve) {
      var settled = false;
      var subscription = null;
      var timer = null;

      function finish(session, isRecovery) {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        if (subscription && subscription.unsubscribe) {
          subscription.unsubscribe();
        }
        resolve({ session: session, isRecovery: isRecovery });
      }

      subscription = client.auth.onAuthStateChange(function (event, session) {
        if (event === "PASSWORD_RECOVERY" && session) {
          finish(session, true);
          return;
        }
        if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
          var hashType = "";
          if (global.location.hash) {
            hashType = new URLSearchParams(global.location.hash.replace(/^#/, "")).get("type") || "";
          }
          if (hashType === "recovery" || event === "PASSWORD_RECOVERY") {
            finish(session, true);
          }
        }
      });

      client.auth.getSession().then(function (result) {
        var session = result.data.session;
        if (!session) return;

        var hashType = "";
        if (global.location.hash) {
          hashType = new URLSearchParams(global.location.hash.replace(/^#/, "")).get("type") || "";
        }
        if (hashType === "recovery") {
          finish(session, true);
        }
      });

      timer = setTimeout(function () {
        client.auth.getSession().then(function (result) {
          var session = result.data.session;
          var hashType = "";
          if (global.location.hash) {
            hashType = new URLSearchParams(global.location.hash.replace(/^#/, "")).get("type") || "";
          }
          finish(session, hashType === "recovery" && !!session);
        });
      }, timeout);
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
    if (/signup is disabled/i.test(msg)) {
      return "Account registration is not enabled. Please contact support.";
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

          showAlert(alertEl, "success", "Signed in successfully. Redirecting…");
          setTimeout(function () {
            redirect(getRedirectTarget(ROUTES.account));
          }, 400);
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
            "If an account exists for that email, we have sent a password reset link. Check your inbox and spam folder."
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
      return waitForRecoverySession(client).then(function (result) {
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
      });
    }).catch(function (err) {
      if (loadingEl) loadingEl.classList.add("hidden");
      if (contentEl) contentEl.classList.remove("hidden");
      showAlert(alertEl, "error", formatError(err));
    });
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
    showLoginResetSuccess: showLoginResetSuccess
  };
})(window);
