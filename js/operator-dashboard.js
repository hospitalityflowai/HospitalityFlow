/**
 * Hospitality Flow — Operator Dashboard (Founding Pilot applications)
 * Fail-closed: only users with isOperator (platform_operators) may load private data.
 * Lists via list-pilot-applications; invites via invite-pilot-applicant.
 * Never queries early_access_applications / platform_access directly.
 */
(function (global) {
  "use strict";

  var LIST_FUNCTION = "list-pilot-applications";
  var INVITE_FUNCTION = "invite-pilot-applicant";

  var inviteBusy = false;
  var pendingInviteApp = null;
  var pilotLabBusy = false;
  var pilotLabBound = false;

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
  }

  function formatDate(value) {
    if (!value) return "—";
    var date = new Date(value);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatPropertyType(value) {
    if (!value) return "—";
    return String(value).replace(/-/g, " ").replace(/\b\w/g, function (ch) {
      return ch.toUpperCase();
    });
  }

  function formatRole(value) {
    if (!value) return "—";
    return String(value).replace(/-/g, " ").replace(/\b\w/g, function (ch) {
      return ch.toUpperCase();
    });
  }

  /**
   * Display badge. founding_status and access_status can disagree
   * (e.g. accepted + invited, accepted + active). Prefer declined /
   * suspended / active / invited from the authoritative fields.
   */
  function resolveDisplayStatus(app) {
    var founding = String(app.founding_status || "").toLowerCase();
    var access = String(app.access_status || "").toLowerCase();

    if (founding === "declined") return "declined";
    if (access === "suspended") return "suspended";
    if (access === "active") return "active";
    if (access === "invited") return "invited";
    return "pending";
  }

  function canInvite(app) {
    var status = resolveDisplayStatus(app);
    return status === "pending";
  }

  function sectionKey(app) {
    var status = resolveDisplayStatus(app);
    if (status === "pending") return "pending";
    if (status === "invited") return "invited";
    if (status === "active") return "active";
    if (status === "suspended") return "suspended";
    return "declined";
  }

  function badgeHtml(status) {
    var labels = {
      pending: "Pending",
      invited: "Invited",
      active: "Active",
      suspended: "Suspended",
      declined: "Declined"
    };
    var label = labels[status] || "Pending";
    return (
      '<span class="operator-badge operator-badge--' +
      escapeHtml(status) +
      '">' +
      escapeHtml(label) +
      "</span>"
    );
  }

  function showAlert(type, message) {
    if (global.HFAuth && global.HFAuth.showAlert) {
      global.HFAuth.showAlert(document.getElementById("auth-alert"), type, message);
    }
  }

  function hideAlert() {
    if (global.HFAuth && global.HFAuth.hideAlert) {
      global.HFAuth.hideAlert(document.getElementById("auth-alert"));
    }
  }

  function setVisible(el, visible) {
    if (!el) return;
    el.classList.toggle("hidden", !visible);
    el.hidden = !visible;
  }

  function showAccessDenied(message) {
    var loadingEl = document.getElementById("auth-loading");
    var contentEl = document.getElementById("auth-content");
    var deniedEl = document.getElementById("operator-denied");
    var dashboardEl = document.getElementById("operator-dashboard");

    setVisible(loadingEl, false);
    setVisible(contentEl, true);
    setVisible(dashboardEl, false);
    setVisible(deniedEl, true);

    if (message) {
      showAlert("error", message);
    }
  }

  function showDashboard() {
    var loadingEl = document.getElementById("auth-loading");
    var contentEl = document.getElementById("auth-content");
    var deniedEl = document.getElementById("operator-denied");
    var dashboardEl = document.getElementById("operator-dashboard");

    setVisible(loadingEl, false);
    setVisible(contentEl, true);
    setVisible(deniedEl, false);
    setVisible(dashboardEl, true);
  }

  function showPilotLabAlert(type, message) {
    var el = document.getElementById("operator-pilot-lab-alert");
    if (!el) return;
    if (global.HFAuth && global.HFAuth.showAlert) {
      global.HFAuth.showAlert(el, type, message);
      return;
    }
    el.textContent = message || "";
    el.className = "auth-alert" + (type ? " auth-alert--" + type : "");
  }

  function hidePilotLabAlert() {
    var el = document.getElementById("operator-pilot-lab-alert");
    if (!el) return;
    if (global.HFAuth && global.HFAuth.hideAlert) {
      global.HFAuth.hideAlert(el);
      return;
    }
    el.textContent = "";
    el.className = "auth-alert";
  }

  function setPilotLabCreating(creating) {
    pilotLabBusy = !!creating;
    var btn = document.getElementById("operator-pilot-lab-create-btn");
    var label = btn ? btn.querySelector(".operator-pilot-lab-btn-label") : null;
    var spinner = btn ? btn.querySelector(".operator-pilot-lab-spinner") : null;

    if (btn) {
      btn.disabled = !!creating;
      btn.setAttribute("aria-busy", creating ? "true" : "false");
    }
    if (label) {
      label.textContent = creating ? "Creating…" : "Create Pilot Lab";
    }
    setVisible(spinner, !!creating);
  }

  function renderPilotLabState(state) {
    var createEl = document.getElementById("operator-pilot-lab-create-state");
    var activeEl = document.getElementById("operator-pilot-lab-active-state");
    var blockedEl = document.getElementById("operator-pilot-lab-blocked-state");
    var cardEl = document.getElementById("operator-pilot-lab-card");

    setVisible(cardEl, true);
    setVisible(createEl, state === "create");
    setVisible(activeEl, state === "active");
    setVisible(blockedEl, state === "blocked");

    if (state !== "create") {
      setPilotLabCreating(false);
    }
  }

  /**
   * Fail-closed Pilot Lab status for the signed-in operator.
   * Only membership that is the Pilot Lab counts as active.
   * A different hotel membership blocks creation (no multi-workspace).
   */
  function loadPilotLabState() {
    if (!global.HFWorkspace ||
        typeof global.HFWorkspace.getUserWorkspace !== "function" ||
        typeof global.HFWorkspace.isPilotLabWorkspace !== "function") {
      renderPilotLabState("create");
      showPilotLabAlert(
        "error",
        "Pilot Lab checks are unavailable. Reload the page or contact support."
      );
      return Promise.resolve({ state: "unavailable" });
    }

    return global.HFWorkspace.getUserWorkspace()
      .then(function (workspace) {
        if (!workspace) {
          renderPilotLabState("create");
          return { state: "create", workspace: null };
        }

        if (global.HFWorkspace.isPilotLabWorkspace(workspace)) {
          renderPilotLabState("active");
          return { state: "active", workspace: workspace };
        }

        renderPilotLabState("blocked");
        return { state: "blocked", workspace: workspace };
      })
      .catch(function (err) {
        // Fail closed: never claim Pilot Lab is active when status is unknown.
        renderPilotLabState("create");
        showPilotLabAlert(
          "error",
          (err && err.message) || "Could not verify Pilot Lab status."
        );
        return { state: "error", error: err };
      });
  }

  function handleCreatePilotLab() {
    if (pilotLabBusy) return;

    if (!global.HFWorkspace ||
        typeof global.HFWorkspace.createOperatorPilotLab !== "function") {
      showPilotLabAlert(
        "error",
        "Pilot Lab provisioning is unavailable. Reload the page or contact support."
      );
      return;
    }

    hidePilotLabAlert();
    hideAlert();
    setPilotLabCreating(true);

    global.HFWorkspace.createOperatorPilotLab()
      .then(function (workspace) {
        if (!workspace || !global.HFWorkspace.isPilotLabWorkspace(workspace)) {
          throw new Error("Pilot Lab workspace could not be confirmed after creation.");
        }
        // Reload operator Pilot Lab state after success.
        return loadPilotLabState().then(function () {
          showAlert("success", "Hospitality Flow Pilot Lab is ready.");
        });
      })
      .catch(function (err) {
        setPilotLabCreating(false);
        var message = err && err.message ? String(err.message) : "";
        if (/already belongs to a hotel workspace/i.test(message)) {
          message = "You already belong to a hotel workspace.";
        } else if (/only platform operators may provision/i.test(message)) {
          message = "Only platform operators may create the Pilot Lab workspace.";
        } else if (/create_operator_pilot_lab_workspace|function.*does not exist|42883/i.test(message)) {
          message =
            "Database setup incomplete. Run supabase/migrations/phase16_operator_pilot_lab.sql in Supabase.";
        } else if (global.HFAuth && global.HFAuth.formatError) {
          message = global.HFAuth.formatError(err);
        }
        showPilotLabAlert("error", message || "Could not create Pilot Lab.");
        return loadPilotLabState();
      });
  }

  function bindPilotLabEvents() {
    if (pilotLabBound) return;
    pilotLabBound = true;

    var createBtn = document.getElementById("operator-pilot-lab-create-btn");
    if (createBtn) {
      createBtn.addEventListener("click", function () {
        handleCreatePilotLab();
      });
    }
  }

  function refreshOperatorState(options) {
    options = options || {};
    return Promise.all([
      loadPilotLabState(),
      refreshApplications({
        silent: options.silent === true,
        successMessage: options.successMessage
      })
    ]);
  }

  function parseSuccessPayload(data) {
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (e) {
        return { ok: false, error: "Unexpected response from server." };
      }
    }
    return data || { ok: false, error: "Empty response from server." };
  }

  function extractErrorPayload(result) {
    var fallback = {
      ok: false,
      error: (result.error && result.error.message) || "Request failed."
    };

    if (!result.error || !result.error.context) {
      return Promise.resolve(fallback);
    }

    var context = result.error.context;
    if (typeof context.json === "function") {
      return context.json().then(function (body) {
        if (body && typeof body === "object") return body;
        return fallback;
      }).catch(function () {
        return fallback;
      });
    }

    return Promise.resolve(fallback);
  }

  function listApplications() {
    return global.HFAuth.ensureClient().then(function (client) {
      return client.functions.invoke(LIST_FUNCTION, { body: {} }).then(function (result) {
        if (result.error) {
          return extractErrorPayload(result).then(function (payload) {
            return Promise.reject(new Error(payload.error || "Could not load applications."));
          });
        }
        var payload = parseSuccessPayload(result.data);
        if (payload.ok === false) {
          return Promise.reject(new Error(payload.error || "Could not load applications."));
        }
        return Array.isArray(payload.applications) ? payload.applications : [];
      });
    });
  }

  function inviteApplication(applicationId) {
    return global.HFAuth.ensureClient().then(function (client) {
      return client.functions.invoke(INVITE_FUNCTION, {
        body: { applicationId: applicationId }
      }).then(function (result) {
        if (result.error) {
          return extractErrorPayload(result).then(function (payload) {
            // alreadyInvited can still arrive as ok:true on 200; non-2xx stays an error.
            if (payload && payload.ok === true) return payload;
            return Promise.reject(Object.assign(
              new Error(payload.error || "Invitation failed."),
              { payload: payload }
            ));
          });
        }

        var payload = parseSuccessPayload(result.data);
        if (payload && payload.ok === false) {
          return Promise.reject(Object.assign(new Error(payload.error || "Invitation failed."), {
            payload: payload
          }));
        }
        return payload;
      });
    });
  }

  function renderEmpty(container, label) {
    container.innerHTML =
      '<p class="account-note operator-empty">No ' + escapeHtml(label) + " applications.</p>";
  }

  function renderApplicationCard(app) {
    var status = resolveDisplayStatus(app);
    var inviteAction = "";

    if (canInvite(app)) {
      inviteAction =
        '<button type="button" class="btn btn-primary operator-invite-btn" data-invite-id="' +
        escapeHtml(app.id) +
        '" data-invite-email="' +
        escapeHtml(app.email || "") +
        '">Approve &amp; Send Invite</button>';
    } else if (status === "invited") {
      inviteAction = '<p class="operator-already">Already invited</p>';
    } else if (status === "active" || status === "suspended") {
      inviteAction =
        '<p class="operator-already">Invitation not available (' +
        escapeHtml(status) +
        ")</p>";
    }

    return (
      '<article class="operator-app-card" data-application-id="' +
      escapeHtml(app.id) +
      '">' +
      '<div class="operator-app-header">' +
      '<div class="operator-app-title">' +
      "<h3>" +
      escapeHtml(app.property_name || "Untitled property") +
      "</h3>" +
      badgeHtml(status) +
      "</div>" +
      '<p class="operator-app-meta">' +
      escapeHtml(app.first_name || "—") +
      " · " +
      escapeHtml(app.email || "—") +
      "</p>" +
      "</div>" +
      '<dl class="operator-app-details">' +
      "<div><dt>Property type</dt><dd>" +
      escapeHtml(formatPropertyType(app.property_type)) +
      "</dd></div>" +
      "<div><dt>Rooms</dt><dd>" +
      escapeHtml(app.room_count != null ? String(app.room_count) : "—") +
      "</dd></div>" +
      "<div><dt>Role</dt><dd>" +
      escapeHtml(formatRole(app.role)) +
      "</dd></div>" +
      "<div><dt>Founding status</dt><dd>" +
      escapeHtml(app.founding_status || "—") +
      "</dd></div>" +
      "<div><dt>Access status</dt><dd>" +
      escapeHtml(app.access_status || "—") +
      "</dd></div>" +
      "<div><dt>Submitted</dt><dd>" +
      escapeHtml(formatDate(app.created_at)) +
      "</dd></div>" +
      "</dl>" +
      '<div class="operator-app-actions">' +
      inviteAction +
      "</div>" +
      "</article>"
    );
  }

  function renderSection(containerId, apps, emptyLabel) {
    var container = document.getElementById(containerId);
    var countEl = document.getElementById(containerId + "-count");
    if (!container) return;

    if (countEl) countEl.textContent = String(apps.length);

    if (!apps.length) {
      renderEmpty(container, emptyLabel);
      return;
    }

    container.innerHTML = apps.map(renderApplicationCard).join("");
  }

  function renderApplications(applications) {
    var groups = {
      pending: [],
      invited: [],
      active: [],
      suspended: [],
      declined: []
    };

    (applications || []).forEach(function (app) {
      var key = sectionKey(app);
      if (!groups[key]) groups[key] = [];
      groups[key].push(app);
    });

    renderSection("operator-pending-list", groups.pending, "pending");
    renderSection("operator-invited-list", groups.invited, "invited");
    renderSection("operator-active-list", groups.active, "active");
    renderSection("operator-suspended-list", groups.suspended, "suspended");
    renderSection("operator-declined-list", groups.declined, "declined");

    var suspendedSection = document.getElementById("operator-suspended-section");
    setVisible(suspendedSection, groups.suspended.length > 0);
  }

  function refreshApplications(options) {
    options = options || {};
    var refreshBtn = document.getElementById("operator-refresh-btn");

    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = "Refreshing…";
    }

    return listApplications()
      .then(function (applications) {
        renderApplications(applications);
        if (options.successMessage) {
          showAlert("success", options.successMessage);
        } else if (!options.silent) {
          hideAlert();
        }
      })
      .catch(function (err) {
        showAlert("error", err.message || "Could not load applications.");
      })
      .then(function () {
        if (refreshBtn) {
          refreshBtn.disabled = false;
          refreshBtn.textContent = "Refresh list";
        }
      });
  }

  function openInviteModal(app) {
    pendingInviteApp = app;
    var modal = document.getElementById("invite-confirm-modal");
    var textEl = document.getElementById("invite-confirm-text");
    if (textEl) {
      textEl.textContent =
        "Send a Hospitality Flow invitation to " + (app.email || "this applicant") + "?";
    }
    if (modal) {
      modal.hidden = false;
      modal.classList.remove("hidden");
    }
  }

  function closeInviteModal() {
    pendingInviteApp = null;
    var modal = document.getElementById("invite-confirm-modal");
    if (modal) {
      modal.hidden = true;
      modal.classList.add("hidden");
    }
  }

  function setInviteProcessing(processing) {
    inviteBusy = processing;
    var confirmBtn = document.getElementById("invite-confirm-btn");
    var cancelBtn = document.getElementById("invite-cancel-btn");
    if (confirmBtn) {
      confirmBtn.disabled = processing;
      confirmBtn.textContent = processing ? "Sending…" : "Approve & Send Invite";
    }
    if (cancelBtn) cancelBtn.disabled = processing;

    var inviteButtons = document.querySelectorAll(".operator-invite-btn");
    for (var i = 0; i < inviteButtons.length; i++) {
      inviteButtons[i].disabled = processing;
    }
  }

  function handleInviteConfirm() {
    if (inviteBusy || !pendingInviteApp) return;

    var applicationId = pendingInviteApp.id;
    var email = pendingInviteApp.email || "";
    setInviteProcessing(true);
    hideAlert();

    inviteApplication(applicationId)
      .then(function (payload) {
        closeInviteModal();
        setInviteProcessing(false);

        if (payload && payload.alreadyInvited) {
          return refreshApplications({
            successMessage: "Already invited — no duplicate invitation was sent."
          });
        }

        if (payload && payload.alreadyRegistered) {
          return refreshApplications({
            successMessage:
              "Applicant already had an Auth account. Marked invited. Ask them to use the prior invite or password reset."
          });
        }

        return refreshApplications({
          successMessage:
            "Invitation sent to " + (email || "applicant") + ". Status updated."
        });
      })
      .catch(function (err) {
        setInviteProcessing(false);
        // Fail closed for local status: do not mutate cards; refresh only after success.
        showAlert("error", err.message || "Invitation failed.");
      });
  }

  function bindEvents() {
    var listRoot = document.getElementById("operator-dashboard");
    if (listRoot) {
      listRoot.addEventListener("click", function (event) {
        var button = event.target.closest("[data-invite-id]");
        if (!button || inviteBusy) return;

        openInviteModal({
          id: button.getAttribute("data-invite-id"),
          email: button.getAttribute("data-invite-email")
        });
      });
    }

    var refreshBtn = document.getElementById("operator-refresh-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", function () {
        if (inviteBusy) return;
        refreshApplications();
      });
    }

    var confirmBtn = document.getElementById("invite-confirm-btn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", handleInviteConfirm);
    }

    var modal = document.getElementById("invite-confirm-modal");
    if (modal) {
      modal.addEventListener("click", function (event) {
        var closer = event.target.closest("[data-close-modal]");
        if (closer && !inviteBusy) {
          closeInviteModal();
        }
      });
    }

    var logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        logoutBtn.disabled = true;
        logoutBtn.textContent = "Signing out…";
        global.HFAuth.signOut().then(function (result) {
          if (result.error) {
            showAlert("error", global.HFAuth.formatError(result.error));
            logoutBtn.disabled = false;
            logoutBtn.textContent = "Sign out";
            return;
          }
          global.location.href = global.HFAuth.ROUTES.login;
        }).catch(function (err) {
          showAlert("error", global.HFAuth.formatError(err));
          logoutBtn.disabled = false;
          logoutBtn.textContent = "Sign out";
        });
      });
    }
  }

  function initOperatorPage() {
    var emailEl = document.getElementById("account-email");

    if (!global.HFAuth || !global.HFPlatformAccess) {
      showAccessDenied("Operator access checks are unavailable.");
      return;
    }

    global.HFAuth.requireAuth()
      .then(function (session) {
        if (!session) return null;

        if (emailEl) {
          var accountEmail =
            session.user && session.user.email ? session.user.email : "your account";
          emailEl.innerHTML =
            "Signed in as <strong>" + escapeHtml(accountEmail) + "</strong>";
        }

        return global.HFPlatformAccess.checkPlatformAccess().then(function (access) {
          // Fail closed: suspension is a global deny (including operators).
          // Server-side Edge Functions re-check platform_operators + suspension.
          if (
            access.reason === "SUSPENDED" ||
            access.accessStatus === "suspended" ||
            !access.allowed
          ) {
            if (global.HFPlatformAccess.clearWorkspaceIdentity) {
              global.HFPlatformAccess.clearWorkspaceIdentity();
            }
            var suspendedMsg =
              global.HFPlatformAccess.SUSPENDED_MESSAGE ||
              "Your Hospitality Flow access has been suspended.";
            showAccessDenied(
              access.reason === "SUSPENDED" || access.accessStatus === "suspended"
                ? suspendedMsg
                : "Access denied. Operator privileges are required."
            );
            global.setTimeout(function () {
              global.location.href =
                access.reason === "SUSPENDED" || access.accessStatus === "suspended"
                  ? "account.html?access=suspended"
                  : "account.html";
            }, 1200);
            return null;
          }

          if (access.isOperator !== true) {
            showAccessDenied("Access denied. Operator privileges are required.");
            // Soft redirect for non-operators with a short delay so the message is visible.
            global.setTimeout(function () {
              global.location.href = "account.html";
            }, 1200);
            return null;
          }

          showDashboard();
          bindEvents();
          bindPilotLabEvents();
          return refreshOperatorState({ silent: true });
        });
      })
      .catch(function (err) {
        showAccessDenied(err.message || "Could not verify operator access.");
      });
  }

  global.HFOperatorDashboard = {
    initOperatorPage: initOperatorPage,
    listApplications: listApplications,
    inviteApplication: inviteApplication,
    loadPilotLabState: loadPilotLabState,
    refreshOperatorState: refreshOperatorState,
    resolveDisplayStatus: resolveDisplayStatus,
    canInvite: canInvite,
    LIST_FUNCTION: LIST_FUNCTION,
    INVITE_FUNCTION: INVITE_FUNCTION
  };
})(window);
