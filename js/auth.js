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
    home: "index.html"
  };

  function redirect(url) {
    global.location.href = url;
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
      var origin = global.location.origin;
      var basePath = global.location.pathname.replace(/[^/]*$/, "");
      var redirectTo = origin + basePath + ROUTES.account;

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
    var inputs = form.querySelectorAll("input, button");
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

  function initAccountPage() {
    var alertEl = document.getElementById("auth-alert");
    var emailEl = document.getElementById("account-email");
    var logoutBtn = document.getElementById("logout-btn");
    var loadingEl = document.getElementById("auth-loading");
    var contentEl = document.getElementById("auth-content");

    requireAuth().then(function (session) {
      if (!session) return;

      if (loadingEl) loadingEl.classList.add("hidden");
      if (contentEl) contentEl.classList.remove("hidden");

      if (emailEl) {
        var email = session.user && session.user.email ? session.user.email : "your account";
        emailEl.innerHTML = "Signed in as <strong>" + escapeHtml(email) + "</strong>";
      }

      if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
          hideAlert(alertEl);
          logoutBtn.disabled = true;
          logoutBtn.textContent = "Signing out…";

          signOut().then(function (result) {
            if (result.error) {
              showAlert(alertEl, "error", formatError(result.error));
              logoutBtn.disabled = false;
              logoutBtn.textContent = "Sign out";
              return;
            }

            redirect(ROUTES.login);
          }).catch(function (err) {
            showAlert(alertEl, "error", formatError(err));
            logoutBtn.disabled = false;
            logoutBtn.textContent = "Sign out";
          });
        });
      }
    }).catch(function (err) {
      if (loadingEl) loadingEl.classList.add("hidden");
      showAlert(alertEl, "error", formatError(err));
    });
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  global.HFAuth = {
    ROUTES: ROUTES,
    ensureClient: ensureClient,
    getSession: getSession,
    requireGuest: requireGuest,
    requireAuth: requireAuth,
    signIn: signIn,
    signUp: signUp,
    signOut: signOut,
    formatError: formatError,
    initLoginPage: initLoginPage,
    initSignupPage: initSignupPage,
    initAccountPage: initAccountPage
  };
})(window);
