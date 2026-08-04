/**
 * Hospitality Flow — Operator Dashboard (Founding Pilot applications)
 * Fail-closed: only users with isOperator (platform_operators) may load private data.
 * Lists via list-pilot-applications.
 * Mutations via invite-pilot-applicant, decline-pilot-applicant, delete-pilot-applicant.
 * Never queries early_access_applications / platform_access directly.
 */
(function (global) {
  "use strict";

  var LIST_FUNCTION = "list-pilot-applications";
  var INVITE_FUNCTION = "invite-pilot-applicant";
  var DECLINE_FUNCTION = "decline-pilot-applicant";
  var DELETE_FUNCTION = "delete-pilot-applicant";

  var inviteBusy = false;
  var declineBusy = false;
  var deleteBusy = false;
  var pendingInviteApp = null;
  var pendingDeclineApp = null;
  var pendingDeleteApp = null;
  var pilotLabBusy = false;
  var pilotLabBound = false;
  var eventsBound = false;

  function anyActionBusy() {
    return inviteBusy || declineBusy || deleteBusy || pilotLabBusy;
  }

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

  function canDecline(app) {
    var status = resolveDisplayStatus(app);
    return status === "pending" || status === "invited";
  }

  function canDeleteTestApplication(app) {
    return resolveDisplayStatus(app) === "declined";
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

  function coercePayloadObject(value) {
    if (value == null) return null;
    if (typeof value === "object") return value;
    if (typeof value !== "string") return null;
    var trimmed = value.trim();
    if (!trimmed) return null;
    try {
      var parsed = JSON.parse(trimmed);
      return parsed && typeof parsed === "object" ? parsed : { error: trimmed };
    } catch (e) {
      return { error: trimmed };
    }
  }

  function extractHttpStatus(result) {
    if (!result || !result.error) return null;
    var err = result.error;
    if (typeof err.status === "number") return err.status;
    if (err.context && typeof err.context.status === "number") return err.context.status;
    return null;
  }

  function extractErrorPayload(result) {
    var fallback = {
      ok: false,
      error: (result.error && result.error.message) || "Request failed."
    };

    function enrich(body) {
      var parsed = coercePayloadObject(body);
      if (!parsed) return fallback;
      var message = parsed.error || parsed.message || fallback.error;
      if (Array.isArray(parsed.blockers) && parsed.blockers.length) {
        message += " (" + parsed.blockers.join(", ") + ")";
      }
      return Object.assign({}, parsed, { ok: false, error: message });
    }

    // supabase-js may already expose the non-2xx JSON on result.data.
    var fromData = coercePayloadObject(result && result.data);
    if (fromData && (fromData.error || fromData.message || fromData.code)) {
      return Promise.resolve(enrich(fromData));
    }

    if (!result.error || !result.error.context) {
      return Promise.resolve(fallback);
    }

    var context = result.error.context;

    if (typeof context.json === "function") {
      return context.json().then(enrich).catch(function () {
        if (typeof context.text === "function") {
          return context.text().then(function (text) {
            return text ? enrich(text) : fallback;
          }).catch(function () {
            return fallback;
          });
        }
        return fallback;
      });
    }

    if (typeof context.text === "function") {
      return context.text().then(function (text) {
        return text ? enrich(text) : fallback;
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

  function formatOperatorError(payload, fallbackError, httpStatus) {
    var message = (payload && (payload.error || payload.message)) || fallbackError;
    var parts = [message];
    if (payload && payload.code) {
      parts.push("code=" + payload.code);
    }
    if (httpStatus != null && httpStatus !== "") {
      parts.push("status=" + httpStatus);
    }
    if (payload && Array.isArray(payload.blockers) && payload.blockers.length) {
      parts.push("blockers=" + payload.blockers.join(","));
    }
    return parts.join(" | ");
  }

  function invokeOperatorFunction(functionName, body, fallbackError, invokeOptions) {
    var options = invokeOptions || {};
    return global.HFAuth.ensureClient().then(function (client) {
      var invokeArgs = { body: body };
      if (options.headers) {
        invokeArgs.headers = options.headers;
      }

      return client.functions.invoke(functionName, invokeArgs).then(function (result) {
        var httpStatus = extractHttpStatus(result);

        if (result.error) {
          return extractErrorPayload(result).then(function (payload) {
            if (payload && payload.ok === true) return payload;
            if (httpStatus == null && payload && typeof payload.statusCode === "number") {
              httpStatus = payload.statusCode;
            }
            var message = formatOperatorError(payload, fallbackError, httpStatus);
            return Promise.reject(Object.assign(new Error(message), {
              payload: payload,
              httpStatus: httpStatus
            }));
          });
        }

        var payload = parseSuccessPayload(result.data);
        if (payload && payload.ok === false) {
          var errMessage = formatOperatorError(payload, fallbackError, httpStatus);
          return Promise.reject(Object.assign(new Error(errMessage), {
            payload: payload,
            httpStatus: httpStatus
          }));
        }
        return payload;
      });
    });
  }

  function inviteApplication(applicationId) {
    return invokeOperatorFunction(
      INVITE_FUNCTION,
      { applicationId: applicationId },
      "Invitation failed."
    );
  }

  function declineApplication(applicationId) {
    return global.HFAuth.getSession().then(function (session) {
      var accessToken = session && session.access_token ? session.access_token : "";
      if (!accessToken) {
        return Promise.reject(Object.assign(
          new Error("Not signed in. Sign in again, then retry Decline."),
          {
            payload: { ok: false, error: "Not signed in.", code: "NO_SESSION" },
            httpStatus: null
          }
        ));
      }

      return invokeOperatorFunction(
        DECLINE_FUNCTION,
        { applicationId: applicationId },
        "Decline failed.",
        {
          headers: {
            Authorization: "Bearer " + accessToken
          }
        }
      );
    });
  }

  function deleteApplication(applicationId) {
    return invokeOperatorFunction(
      DELETE_FUNCTION,
      { applicationId: applicationId, confirm: "DELETE" },
      "Delete failed."
    );
  }

  function renderEmpty(container, label) {
    container.innerHTML =
      '<p class="account-note operator-empty">No ' + escapeHtml(label) + " applications.</p>";
  }

  function renderApplicationCard(app) {
    var status = resolveDisplayStatus(app);
    var actions = [];

    if (canInvite(app)) {
      actions.push(
        '<button type="button" class="btn btn-primary operator-invite-btn" data-invite-id="' +
          escapeHtml(app.id) +
          '" data-invite-email="' +
          escapeHtml(app.email || "") +
          '">Approve &amp; Send Invite</button>'
      );
    }

    if (status === "invited") {
      actions.push('<p class="operator-already">Already invited</p>');
    }

    if (status === "active") {
      actions.push('<p class="operator-already">Workspace active</p>');
    } else if (status === "suspended") {
      actions.push('<p class="operator-already">Access suspended</p>');
    }

    if (canDecline(app)) {
      actions.push(
        '<button type="button" class="btn btn-warning operator-decline-btn" data-decline-id="' +
          escapeHtml(app.id) +
          '" data-decline-email="' +
          escapeHtml(app.email || "") +
          '" data-decline-property="' +
          escapeHtml(app.property_name || "") +
          '">Decline</button>'
      );
    }

    if (canDeleteTestApplication(app)) {
      actions.push(
        '<button type="button" class="btn btn-danger operator-delete-btn" data-delete-id="' +
          escapeHtml(app.id) +
          '" data-delete-email="' +
          escapeHtml(app.email || "") +
          '" data-delete-property="' +
          escapeHtml(app.property_name || "") +
          '">Permanently Delete Test Application</button>'
      );
    }

    return (
      '<article class="operator-app-card" data-application-id="' +
      escapeHtml(app.id) +
      '" data-display-status="' +
      escapeHtml(status) +
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
      actions.join("") +
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

  function openModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
      modal.hidden = false;
      modal.classList.remove("hidden");
    }
  }

  function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
      modal.hidden = true;
      modal.classList.add("hidden");
    }
  }

  function openInviteModal(app) {
    pendingInviteApp = app;
    var textEl = document.getElementById("invite-confirm-text");
    if (textEl) {
      textEl.textContent =
        "Send a Hospitality Flow invitation to " + (app.email || "this applicant") + "?";
    }
    openModal("invite-confirm-modal");
  }

  function closeInviteModal() {
    pendingInviteApp = null;
    closeModal("invite-confirm-modal");
  }

  function showDeclineModalError(message) {
    var errorEl = document.getElementById("decline-confirm-error");
    if (!errorEl) return;
    errorEl.textContent = message || "Decline failed.";
    errorEl.hidden = false;
    errorEl.classList.remove("hidden");
  }

  function hideDeclineModalError() {
    var errorEl = document.getElementById("decline-confirm-error");
    if (!errorEl) return;
    errorEl.textContent = "";
    errorEl.hidden = true;
    errorEl.classList.add("hidden");
  }

  function openDeclineModal(app) {
    pendingDeclineApp = app;
    var textEl = document.getElementById("decline-confirm-text");
    if (textEl) {
      textEl.textContent =
        "Decline the application for " +
        (app.property || "this property") +
        " (" +
        (app.email || "no email") +
        ")? The applicant will be blocked from platform access. Their Auth account is preserved.";
    }
    hideDeclineModalError();
    openModal("decline-confirm-modal");
  }

  function closeDeclineModal() {
    pendingDeclineApp = null;
    hideDeclineModalError();
    closeModal("decline-confirm-modal");
  }

  function syncDeleteConfirmButton() {
    var input = document.getElementById("delete-confirm-input");
    var confirmBtn = document.getElementById("delete-confirm-btn");
    if (!confirmBtn) return;
    var typed = input ? String(input.value || "").trim() : "";
    confirmBtn.disabled = deleteBusy || typed !== "DELETE";
  }

  function showDeleteModalError(message) {
    var errorEl = document.getElementById("delete-confirm-error");
    if (!errorEl) return;
    errorEl.textContent = message || "Delete failed.";
    errorEl.hidden = false;
    errorEl.classList.remove("hidden");
  }

  function hideDeleteModalError() {
    var errorEl = document.getElementById("delete-confirm-error");
    if (!errorEl) return;
    errorEl.textContent = "";
    errorEl.hidden = true;
    errorEl.classList.add("hidden");
  }

  function openDeleteModal(app) {
    pendingDeleteApp = app;
    var textEl = document.getElementById("delete-confirm-text");
    var input = document.getElementById("delete-confirm-input");
    if (textEl) {
      textEl.textContent =
        "Permanently delete the declined test application for " +
        (app.property || "this property") +
        " (" +
        (app.email || "no email") +
        ")? This cannot be undone. Type DELETE (exact, uppercase) to confirm.";
    }
    if (input) input.value = "";
    hideDeleteModalError();
    syncDeleteConfirmButton();
    openModal("delete-confirm-modal");
    if (input) input.focus();
  }

  function closeDeleteModal() {
    pendingDeleteApp = null;
    var input = document.getElementById("delete-confirm-input");
    if (input) input.value = "";
    hideDeleteModalError();
    syncDeleteConfirmButton();
    closeModal("delete-confirm-modal");
  }

  function setActionButtonsDisabled(disabled) {
    var selectors = [
      ".operator-invite-btn",
      ".operator-decline-btn",
      ".operator-delete-btn",
      "#operator-refresh-btn"
    ];
    for (var s = 0; s < selectors.length; s++) {
      var nodes = document.querySelectorAll(selectors[s]);
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].disabled = disabled;
      }
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
    setActionButtonsDisabled(anyActionBusy());
  }

  function setDeclineProcessing(processing) {
    declineBusy = processing;
    var confirmBtn = document.getElementById("decline-confirm-btn");
    var cancelBtn = document.getElementById("decline-cancel-btn");
    if (confirmBtn) {
      confirmBtn.disabled = processing;
      confirmBtn.textContent = processing ? "Declining…" : "Decline";
    }
    if (cancelBtn) cancelBtn.disabled = processing;
    setActionButtonsDisabled(anyActionBusy());
  }

  function setDeleteProcessing(processing) {
    deleteBusy = processing;
    var cancelBtn = document.getElementById("delete-cancel-btn");
    var confirmBtn = document.getElementById("delete-confirm-btn");
    if (cancelBtn) cancelBtn.disabled = processing;
    if (confirmBtn) {
      confirmBtn.textContent = processing ? "Deleting…" : "Permanently Delete";
    }
    syncDeleteConfirmButton();
    setActionButtonsDisabled(anyActionBusy());
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

  function formatDeclineFailureMessage(err) {
    var message = (err && err.message) || "Decline failed.";
    var status = err && err.httpStatus;
    var payload = err && err.payload;
    var code = payload && payload.code;

    if (
      status === 404 ||
      code === "NOT_FOUND" ||
      /requested function was not found/i.test(message) ||
      /function not found/i.test(message)
    ) {
      return (
        "decline-pilot-applicant is not deployed on this Supabase project " +
        "(HTTP 404). Deploy that Edge Function, hard-refresh, then retry. " +
        "Server: " +
        message
      );
    }

    return message;
  }

  function handleDeclineConfirm() {
    if (declineBusy) return;

    if (!pendingDeclineApp) {
      showDeclineModalError("Decline session expired. Close this dialog and click Decline again.");
      return;
    }

    var applicationId = pendingDeclineApp.id;
    var email = pendingDeclineApp.email || "";
    if (!applicationId) {
      showDeclineModalError("Missing application id. Close this dialog and try again.");
      return;
    }

    setDeclineProcessing(true);
    hideDeclineModalError();
    hideAlert();

    declineApplication(applicationId)
      .then(function (payload) {
        closeDeclineModal();
        setDeclineProcessing(false);
        return refreshApplications({
          successMessage:
            "Application declined for " +
            (email || (payload && payload.email) || "applicant") +
            ". Access suspended."
        });
      })
      .catch(function (err) {
        setDeclineProcessing(false);
        var message = formatDeclineFailureMessage(err);
        console.error("[operator-dashboard] decline-pilot-applicant rejected:", {
          message: message,
          httpStatus: (err && err.httpStatus) || null,
          payload: (err && err.payload) || null
        });
        // Keep modal open — page alerts sit under the overlay.
        showDeclineModalError(message);
        showAlert("error", message);
      });
  }

  function handleDeleteConfirm() {
    if (deleteBusy || !pendingDeleteApp) return;
    var input = document.getElementById("delete-confirm-input");
    if (!input || String(input.value || "").trim() !== "DELETE") {
      showDeleteModalError("Type DELETE exactly (uppercase) to enable permanent deletion.");
      return;
    }

    var applicationId = pendingDeleteApp.id;
    var email = pendingDeleteApp.email || "";
    if (!applicationId) {
      showDeleteModalError("Missing application id. Close this dialog and try again.");
      return;
    }

    setDeleteProcessing(true);
    hideDeleteModalError();
    hideAlert();

    deleteApplication(applicationId)
      .then(function () {
        closeDeleteModal();
        setDeleteProcessing(false);
        return refreshApplications({
          successMessage:
            "Test application permanently deleted for " + (email || "applicant") + "."
        });
      })
      .catch(function (err) {
        setDeleteProcessing(false);
        var message = err.message || "Delete failed.";
        // Keep modal open and show the error here — page alerts sit under the overlay.
        showDeleteModalError(message);
        showAlert("error", message);
      });
  }

  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;

    var listRoot = document.getElementById("operator-dashboard");
    if (listRoot) {
      listRoot.addEventListener("click", function (event) {
        if (anyActionBusy()) return;

        var inviteButton = event.target.closest("[data-invite-id]");
        if (inviteButton) {
          openInviteModal({
            id: inviteButton.getAttribute("data-invite-id"),
            email: inviteButton.getAttribute("data-invite-email")
          });
          return;
        }

        var declineButton = event.target.closest("[data-decline-id]");
        if (declineButton) {
          openDeclineModal({
            id: declineButton.getAttribute("data-decline-id"),
            email: declineButton.getAttribute("data-decline-email"),
            property: declineButton.getAttribute("data-decline-property")
          });
          return;
        }

        var deleteButton = event.target.closest("[data-delete-id]");
        if (deleteButton) {
          openDeleteModal({
            id: deleteButton.getAttribute("data-delete-id"),
            email: deleteButton.getAttribute("data-delete-email"),
            property: deleteButton.getAttribute("data-delete-property")
          });
        }
      });
    }

    var refreshBtn = document.getElementById("operator-refresh-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", function () {
        if (anyActionBusy()) return;
        refreshApplications();
      });
    }

    var inviteConfirmBtn = document.getElementById("invite-confirm-btn");
    if (inviteConfirmBtn) {
      inviteConfirmBtn.addEventListener("click", handleInviteConfirm);
    }

    var declineConfirmBtn = document.getElementById("decline-confirm-btn");
    if (declineConfirmBtn) {
      declineConfirmBtn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        handleDeclineConfirm();
      });
    }

    var deleteConfirmBtn = document.getElementById("delete-confirm-btn");
    if (deleteConfirmBtn) {
      deleteConfirmBtn.addEventListener("click", handleDeleteConfirm);
    }

    var deleteInput = document.getElementById("delete-confirm-input");
    if (deleteInput) {
      deleteInput.addEventListener("input", syncDeleteConfirmButton);
      deleteInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          handleDeleteConfirm();
        }
      });
    }

    ["invite-confirm-modal", "decline-confirm-modal", "delete-confirm-modal"].forEach(
      function (modalId) {
        var modal = document.getElementById(modalId);
        if (!modal) return;
        modal.addEventListener("click", function (event) {
          var closer = event.target.closest("[data-close-modal]");
          if (!closer || anyActionBusy()) return;
          var which = closer.getAttribute("data-close-modal");
          if (which === "invite") closeInviteModal();
          if (which === "decline") closeDeclineModal();
          if (which === "delete") closeDeleteModal();
        });
      }
    );

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
    declineApplication: declineApplication,
    deleteApplication: deleteApplication,
    loadPilotLabState: loadPilotLabState,
    refreshOperatorState: refreshOperatorState,
    resolveDisplayStatus: resolveDisplayStatus,
    canInvite: canInvite,
    canDecline: canDecline,
    canDeleteTestApplication: canDeleteTestApplication,
    LIST_FUNCTION: LIST_FUNCTION,
    INVITE_FUNCTION: INVITE_FUNCTION,
    DECLINE_FUNCTION: DECLINE_FUNCTION,
    DELETE_FUNCTION: DELETE_FUNCTION
  };
})(window);
