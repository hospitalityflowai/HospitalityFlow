/**
 * Hospitality Flow — Hotel workspace (Phase 3)
 * Create and load hotel workspaces via Supabase hotels + hotel_members tables.
 */
(function (global) {
  "use strict";

  var PILOT_LAB_NAME = "Hospitality Flow Pilot Lab";
  var PILOT_LAB_PROPERTY_TYPE = "Internal testing workspace";

  var PROPERTY_TYPES = [
    { value: "independent-hotel", label: "Independent hotel" },
    { value: "boutique-hotel", label: "Boutique hotel" },
    { value: "small-hotel-group", label: "Small hotel group (2–10 hotels)" },
    { value: "guest-house", label: "Guest house" },
    { value: "serviced-apartment", label: "Serviced apartment" },
    { value: "hotel-opening-soon", label: "Hotel opening soon" },
    { value: "other", label: "Other" },
    { value: PILOT_LAB_PROPERTY_TYPE, label: "Internal testing workspace" }
  ];

  var PROPERTY_TYPE_LABELS = PROPERTY_TYPES.reduce(function (acc, item) {
    acc[item.value] = item.label;
    return acc;
  }, {});

  var cachedWorkspace = null;

  function clearCachedWorkspace() {
    cachedWorkspace = null;
  }

  function isOwnerRole(role) {
    return String(role || "").toLowerCase() === "owner";
  }

  function getCachedWorkspace() {
    return cachedWorkspace;
  }

  function getWorkspaceHotelName() {
    if (!cachedWorkspace || !cachedWorkspace.hotel) return null;
    var name = cachedWorkspace.hotel.name;
    return name && String(name).trim() ? String(name).trim() : null;
  }

  function resolveDisplayHotelName(profileHotelName) {
    var workspaceName = getWorkspaceHotelName();
    if (workspaceName) return workspaceName;
    if (profileHotelName == null) return "";
    return String(profileHotelName).trim();
  }

  function ensureClient() {
    return global.HFAuth.ensureClient();
  }

  function formatPropertyType(value) {
    return PROPERTY_TYPE_LABELS[value] || value || "—";
  }

  function formatRole(role) {
    if (!role) return "—";
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  function formatWorkspaceError(error) {
    if (!error) return "Something went wrong. Please try again.";
    var msg = error.message || String(error);

    if (/already belongs to a hotel workspace/i.test(msg)) {
      return "You already belong to a hotel workspace.";
    }
    if (/only platform operators may provision/i.test(msg)) {
      return "Only platform operators may create the Pilot Lab workspace.";
    }
    if (/create_operator_pilot_lab_workspace|function.*does not exist|42883/i.test(msg)) {
      return "Database setup incomplete. Run supabase/migrations/phase16_operator_pilot_lab.sql in Supabase.";
    }
    if (/not authenticated/i.test(msg)) {
      return "Your session has expired. Please sign in again.";
    }
    if (/row-level security|permission denied|42501/i.test(msg)) {
      return "Workspace changes are not permitted. Run the Supabase workspace migrations (see SUPABASE_SETUP.md).";
    }
    if (/city|country|number_of_rooms|property_type/i.test(msg) && /column|schema|42703/i.test(msg)) {
      return "Database setup incomplete. Run supabase/migrations/phase3_hotel_workspace.sql in Supabase.";
    }
    if (/cannot coerce the result to a single JSON object|PGRST116|JSON object requested, multiple/i.test(msg)) {
      return "Could not load your hotel workspace reliably. Refresh the page or contact support if this continues.";
    }
    if (/hotel details could not be updated|no rows/i.test(msg)) {
      return "Hotel details could not be updated. Confirm you are the workspace owner and try again.";
    }
    if (/update_hotel_workspace|function.*does not exist|42883/i.test(msg)) {
      return "Database setup incomplete. Run supabase/migrations/phase5_hotel_workspace_edit.sql in Supabase.";
    }
    if (/platform access has not been approved/i.test(msg)) {
      return global.HFPlatformAccess && global.HFPlatformAccess.NOT_APPROVED_MESSAGE
        ? global.HFPlatformAccess.NOT_APPROVED_MESSAGE
        : "Your Hospitality Flow access has not been approved yet.";
    }

    return global.HFAuth.formatError(error);
  }

  function normalizeMembershipRow(row) {
    if (!row || !row.hotels) return null;
    return {
      role: row.role,
      hotel: row.hotels
    };
  }

  function getUserWorkspace() {
    return ensureClient().then(function (client) {
      return client.auth.getUser().then(function (result) {
        var user = result.data.user;
        if (!user) return null;

        return client
          .from("hotel_members")
          .select("role, hotel_id, created_at, hotels ( id, name, property_type, number_of_rooms, city, country, created_at )")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .then(function (response) {
            if (response.error) {
              return Promise.reject(response.error);
            }

            var row = response.data && response.data.length ? response.data[0] : null;
            var workspace = normalizeMembershipRow(row);
            cachedWorkspace = workspace;
            if (global.HFTenantStorage && workspace && workspace.hotel && workspace.hotel.id) {
              global.HFTenantStorage.updateTenantWorkspace(workspace.hotel.id);
            }
            return workspace;
          });
      });
    });
  }

  function createWorkspace(payload) {
    return ensureClient().then(function (client) {
      return client.rpc("create_hotel_workspace", {
        p_name: payload.name,
        p_property_type: payload.propertyType,
        p_number_of_rooms: payload.roomCount,
        p_city: payload.city,
        p_country: payload.country
      }).then(function (response) {
        if (response.error) {
          return Promise.reject(response.error);
        }
        clearCachedWorkspace();
        return getUserWorkspace();
      });
    });
  }

  function isPilotLabWorkspace(workspace) {
    if (!workspace || !workspace.hotel) return false;
    var name = workspace.hotel.name ? String(workspace.hotel.name).trim() : "";
    var propertyType = workspace.hotel.property_type
      ? String(workspace.hotel.property_type).trim()
      : "";
    return name === PILOT_LAB_NAME || propertyType === PILOT_LAB_PROPERTY_TYPE;
  }

  function createOperatorPilotLab() {
    return ensureClient().then(function (client) {
      return client.rpc("create_operator_pilot_lab_workspace").then(function (response) {
        if (response.error) {
          return Promise.reject(response.error);
        }
        clearCachedWorkspace();
        return getUserWorkspace();
      });
    });
  }

  function validateWorkspacePayload(payload) {
    if (!payload.name) {
      return "Please enter your hotel name.";
    }
    if (!payload.propertyType) {
      return "Please select a property type.";
    }
    if (!payload.roomCount || payload.roomCount < 1) {
      return "Please enter a valid number of rooms.";
    }
    if (!payload.city) {
      return "Please enter a city.";
    }
    if (!payload.country) {
      return "Please enter a country.";
    }
    return null;
  }

  function updateWorkspace(hotelId, payload) {
    if (!cachedWorkspace || !isOwnerRole(cachedWorkspace.role)) {
      return Promise.reject(new Error("Only workspace owners can edit hotel details."));
    }
    if (!hotelId || !cachedWorkspace.hotel || cachedWorkspace.hotel.id !== hotelId) {
      return Promise.reject(new Error("Could not identify your hotel workspace."));
    }

    return ensureClient().then(function (client) {
      return client.auth.getUser().then(function (authResult) {
        var user = authResult.data.user;
        if (!user) {
          return Promise.reject(new Error("Not authenticated"));
        }

        return client
          .from("hotel_members")
          .select("role, hotel_id")
          .eq("user_id", user.id)
          .eq("hotel_id", hotelId)
          .limit(1)
          .then(function (membershipResponse) {
            if (membershipResponse.error) {
              return Promise.reject(membershipResponse.error);
            }

            var membership = membershipResponse.data && membershipResponse.data.length
              ? membershipResponse.data[0]
              : null;

            if (!membership || !isOwnerRole(membership.role)) {
              return Promise.reject(new Error("Only workspace owners can edit hotel details."));
            }

            return client
              .rpc("update_hotel_workspace", {
                p_hotel_id: hotelId,
                p_name: payload.name,
                p_property_type: payload.propertyType,
                p_number_of_rooms: payload.roomCount,
                p_city: payload.city,
                p_country: payload.country
              })
              .then(function (updateResponse) {
                if (updateResponse.error) {
                  return Promise.reject(updateResponse.error);
                }

                var hotel = updateResponse.data;
                if (!hotel || !hotel.id) {
                  return Promise.reject(new Error("Hotel details could not be updated."));
                }

                cachedWorkspace = {
                  role: membership.role,
                  hotel: hotel
                };
                return cachedWorkspace;
              });
          });
      });
    });
  }

  function showAlert(el, type, message) {
    global.HFAuth.showAlert(el, type, message);
  }

  function hideAlert(el) {
    global.HFAuth.hideAlert(el);
  }

  function setFormLoading(form, loading, submitBtn, loadingText, defaultText) {
    global.HFAuth.setFormLoading(form, loading, submitBtn, loadingText, defaultText);
  }

  // Phase 3 allows one hotel workspace per user; multi-property support is a later phase.
  function setWorkspacePanelVisible(el, visible) {
    if (!el) return;
    el.classList.toggle("hidden", !visible);
    el.hidden = !visible;
  }

  function renderWorkspaceDashboard(workspace) {
    var createEl = document.getElementById("workspace-create");
    var pilotCreateEl = document.getElementById("operator-pilot-lab-create");
    var dashboardEl = document.getElementById("workspace-dashboard");
    var hotelNameEl = document.getElementById("workspace-hotel-name");
    var hotelMetaEl = document.getElementById("workspace-hotel-meta");
    var roleEl = document.getElementById("workspace-user-role");
    var purposeEl = document.getElementById("workspace-purpose-note");
    var headingEl = document.getElementById("account-heading");
    var editBtn = document.getElementById("workspace-edit-btn");
    var editPanel = document.getElementById("workspace-edit");
    var isLab = isPilotLabWorkspace(workspace);

    setWorkspacePanelVisible(createEl, false);
    setWorkspacePanelVisible(pilotCreateEl, false);
    setWorkspacePanelVisible(dashboardEl, true);
    if (headingEl) {
      headingEl.textContent = isLab ? "Your account" : "Your hotel workspace";
    }

    var hotel = workspace.hotel;
    if (hotelNameEl) {
      hotelNameEl.textContent = hotel.name || "Your hotel";
    }
    if (hotelMetaEl) {
      if (isLab) {
        hotelMetaEl.textContent = PILOT_LAB_PROPERTY_TYPE;
      } else {
        var parts = [
          formatPropertyType(hotel.property_type),
          hotel.number_of_rooms ? hotel.number_of_rooms + " rooms" : null,
          hotel.city,
          hotel.country
        ].filter(Boolean);
        hotelMetaEl.textContent = parts.join(" · ");
      }
    }
    if (roleEl) {
      roleEl.textContent = isLab ? "" : "Your role: " + formatRole(workspace.role);
      roleEl.hidden = isLab;
      roleEl.classList.toggle("hidden", isLab);
    }
    if (purposeEl) {
      if (isLab) {
        purposeEl.textContent =
          "Purpose: HF product testing, demo preparation and pilot validation.";
        setWorkspacePanelVisible(purposeEl, true);
      } else {
        purposeEl.textContent = "";
        setWorkspacePanelVisible(purposeEl, false);
      }
    }

    // Keep Pilot Lab identity stable — hide edit for internal lab workspaces.
    var canEdit = isOwnerRole(workspace.role) && !isLab;
    if (editBtn) {
      editBtn.classList.toggle("hidden", !canEdit);
      editBtn.hidden = !canEdit;
    }
    if (editPanel && !canEdit) {
      setWorkspacePanelVisible(editPanel, false);
    }
  }

  function mountOperatorDemoAccess() {
    if (!global.HFDemoMode || typeof global.HFDemoMode.mountOperatorDemoLink !== "function") {
      return;
    }
    var host = document.getElementById("hfOperatorDemoHost");
    if (!host) return;
    global.HFDemoMode.mountOperatorDemoLink(host);
  }

  function populateWorkspaceEditForm(workspace) {
    var hotel = workspace.hotel;
    var nameEl = document.getElementById("workspace-edit-name");
    var typeEl = document.getElementById("workspace-edit-property-type");
    var roomsEl = document.getElementById("workspace-edit-room-count");
    var cityEl = document.getElementById("workspace-edit-city");
    var countryEl = document.getElementById("workspace-edit-country");

    if (nameEl) nameEl.value = hotel.name || "";
    if (typeEl) typeEl.value = hotel.property_type || "";
    if (roomsEl) roomsEl.value = hotel.number_of_rooms != null ? hotel.number_of_rooms : "";
    if (cityEl) cityEl.value = hotel.city || "";
    if (countryEl) countryEl.value = hotel.country || "";
  }

  function initWorkspaceEdit(workspace, alertEl) {
    var editBtn = document.getElementById("workspace-edit-btn");
    var editPanel = document.getElementById("workspace-edit");
    var editForm = document.getElementById("workspace-edit-form");
    var editAlertEl = document.getElementById("workspace-edit-alert");
    var cancelBtn = document.getElementById("workspace-edit-cancel");
    var submitBtn = document.getElementById("workspace-edit-submit");

    if (!editBtn || !editPanel || !editForm || !isOwnerRole(workspace.role)) {
      return;
    }

    editBtn.addEventListener("click", function () {
      hideAlert(editAlertEl);
      populateWorkspaceEditForm(cachedWorkspace || workspace);
      setWorkspacePanelVisible(editPanel, true);
      editBtn.hidden = true;
      editBtn.classList.add("hidden");
    });

    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        hideAlert(editAlertEl);
        setWorkspacePanelVisible(editPanel, false);
        editBtn.hidden = false;
        editBtn.classList.remove("hidden");
      });
    }

    editForm.addEventListener("submit", function (e) {
      e.preventDefault();
      hideAlert(editAlertEl);
      hideAlert(alertEl);

      var payload = {
        name: document.getElementById("workspace-edit-name").value.trim(),
        propertyType: document.getElementById("workspace-edit-property-type").value,
        roomCount: parseInt(document.getElementById("workspace-edit-room-count").value, 10),
        city: document.getElementById("workspace-edit-city").value.trim(),
        country: document.getElementById("workspace-edit-country").value.trim()
      };

      var validationError = validateWorkspacePayload(payload);
      if (validationError) {
        showAlert(editAlertEl, "error", validationError);
        return;
      }

      setFormLoading(editForm, true, submitBtn, "Saving…", "Save hotel details");

      updateWorkspace((cachedWorkspace || workspace).hotel.id, payload).then(function (updated) {
        renderWorkspaceDashboard(updated);
        populateWorkspaceEditForm(updated);
        setWorkspacePanelVisible(editPanel, false);
        editBtn.hidden = false;
        editBtn.classList.remove("hidden");
        showAlert(alertEl, "success", "Hotel details updated successfully.");
        setFormLoading(editForm, false, submitBtn, "Saving…", "Save hotel details");
      }).catch(function (err) {
        showAlert(editAlertEl, "error", formatWorkspaceError(err));
        setFormLoading(editForm, false, submitBtn, "Saving…", "Save hotel details");
      });
    });
  }

  function renderWorkspaceCreateForm() {
    var createEl = document.getElementById("workspace-create");
    var dashboardEl = document.getElementById("workspace-dashboard");
    var headingEl = document.getElementById("account-heading");

    setWorkspacePanelVisible(dashboardEl, false);
    setWorkspacePanelVisible(createEl, true);
    if (headingEl) headingEl.textContent = "Create your hotel workspace";
  }

  function renderAccessPendingPanel(alertEl) {
    setWorkspacePanelVisible(document.getElementById("workspace-create"), false);
    setWorkspacePanelVisible(document.getElementById("workspace-dashboard"), false);
    setWorkspacePanelVisible(document.getElementById("operator-pilot-lab-create"), false);
    setWorkspacePanelVisible(document.getElementById("password-section"), false);
    setWorkspacePanelVisible(document.getElementById("password-recovery-section"), false);
    setWorkspacePanelVisible(document.getElementById("operator-account"), false);
    setWorkspacePanelVisible(document.getElementById("account-signout"), true);

    var pendingEl = document.getElementById("access-pending");
    if (pendingEl) {
      setWorkspacePanelVisible(pendingEl, true);
    }

    var headingEl = document.getElementById("account-heading");
    if (headingEl) headingEl.textContent = "Access pending approval";

    showAlert(
      alertEl,
      "error",
      global.HFPlatformAccess && global.HFPlatformAccess.NOT_APPROVED_MESSAGE
        ? global.HFPlatformAccess.NOT_APPROVED_MESSAGE
        : "Your Hospitality Flow access has not been approved yet."
    );
  }

  /**
   * Operator with no hotel membership: Operator card + Pilot Lab provision.
   * Regular hotel workspace-create stays hidden (fail closed for operators).
   */
  function renderOperatorWithoutWorkspace(alertEl, logoutBtn) {
    setWorkspacePanelVisible(document.getElementById("workspace-create"), false);
    setWorkspacePanelVisible(document.getElementById("workspace-dashboard"), false);
    setWorkspacePanelVisible(document.getElementById("access-pending"), false);
    setWorkspacePanelVisible(document.getElementById("password-recovery-section"), false);

    setOperatorSectionVisible(true);
    setWorkspacePanelVisible(document.getElementById("operator-pilot-lab-create"), true);
    setWorkspacePanelVisible(document.getElementById("account-signout"), true);
    mountOperatorDemoAccess();
    bindPilotLabCreateButton(alertEl);

    // Operators may change password; ordinary hotel create stays hidden.
    setWorkspacePanelVisible(document.getElementById("password-section"), true);

    var headingEl = document.getElementById("account-heading");
    if (headingEl) headingEl.textContent = "Your account";

    hideAlert(alertEl);
    bindLogoutButton(logoutBtn, alertEl);
  }

  function bindPilotLabCreateButton(alertEl) {
    var btn = document.getElementById("pilot-lab-create-btn");
    var labAlertEl = document.getElementById("pilot-lab-create-alert");
    if (!btn || btn.getAttribute("data-bound") === "1") return;
    btn.setAttribute("data-bound", "1");

    btn.addEventListener("click", function () {
      hideAlert(labAlertEl);
      hideAlert(alertEl);
      btn.disabled = true;
      var previous = btn.textContent;
      btn.textContent = "Creating…";

      createOperatorPilotLab()
        .then(function (workspace) {
          if (!workspace) {
            throw new Error("Pilot Lab workspace could not be loaded.");
          }
          setWorkspacePanelVisible(document.getElementById("operator-pilot-lab-create"), false);
          renderWorkspaceDashboard(workspace);
          setWorkspacePanelVisible(document.getElementById("account-signout"), true);
          showAlert(alertEl, "success", "Hospitality Flow Pilot Lab is ready.");
          if (global.HFHotelBrainStore && global.HFHotelBrainStore.preload) {
            global.HFHotelBrainStore.preload();
          }
        })
        .catch(function (err) {
          showAlert(labAlertEl || alertEl, "error", formatWorkspaceError(err));
        })
        .then(function () {
          btn.disabled = false;
          btn.textContent = previous || "Create Pilot Lab workspace";
        });
    });
  }

  /**
   * Operator privileges are independent of hotel workspace access.
   * Operator card stays outside the hotel workspace card.
   */
  function setOperatorSectionVisible(visible) {
    var operatorEl = document.getElementById("operator-account");
    setWorkspacePanelVisible(operatorEl, !!visible);
  }

  function initAccountPage() {
    var alertEl = document.getElementById("auth-alert");
    var emailEl = document.getElementById("account-email");
    var logoutBtn = document.getElementById("logout-btn");
    var loadingEl = document.getElementById("auth-loading");
    var contentEl = document.getElementById("auth-content");
    var form = document.getElementById("workspace-form");
    var submitBtn = document.getElementById("workspace-submit");

    global.HFAuth.ensureClient().then(function (client) {
      return global.HFAuth.detectPasswordRecovery(client);
    }).then(function (recoveryResult) {
      if (recoveryResult.isRecovery && recoveryResult.session) {
        if (loadingEl) loadingEl.classList.add("hidden");
        if (contentEl) contentEl.classList.remove("hidden");

        if (global.HFPlatformAccess && global.HFPlatformAccess.checkPlatformAccess) {
          return global.HFPlatformAccess.checkPlatformAccess().then(function (access) {
            if (!access.allowed) {
              return global.HFAuth.signOut().then(function () {
                global.HFAuth.initAccountRecoveryInvalid();
                showAlert(
                  document.getElementById("auth-alert"),
                  "error",
                  global.HFPlatformAccess.NOT_APPROVED_MESSAGE
                );
              });
            }
            global.HFAuth.initAccountRecoverySection(recoveryResult.session);
          });
        }

        return global.HFAuth.signOut().then(function () {
          global.HFAuth.initAccountRecoveryInvalid();
          showAlert(
            document.getElementById("auth-alert"),
            "error",
            "Platform access checks are unavailable. Reload the page or contact support."
          );
        });
      }

      if (recoveryResult.recoveryAttempt && !recoveryResult.session) {
        if (loadingEl) loadingEl.classList.add("hidden");
        if (contentEl) contentEl.classList.remove("hidden");
        global.HFAuth.initAccountRecoveryInvalid();
        return;
      }

      return initSignedInAccountPage(
        recoveryResult.session,
        alertEl,
        emailEl,
        logoutBtn,
        loadingEl,
        contentEl,
        form,
        submitBtn
      );
    }).catch(function (err) {
      if (loadingEl) loadingEl.classList.add("hidden");
      if (contentEl) contentEl.classList.remove("hidden");
      showAlert(alertEl, "error", formatWorkspaceError(err));
    });
  }

  function initSignedInAccountPage(session, alertEl, emailEl, logoutBtn, loadingEl, contentEl, form, submitBtn) {
    var authPromise = session
      ? Promise.resolve(session)
      : global.HFAuth.requireAuth();

    return authPromise.then(function (activeSession) {
      if (!activeSession) return;

      if (emailEl) {
        var accountEmail = activeSession.user && activeSession.user.email ? activeSession.user.email : "your account";
        emailEl.innerHTML = "Signed in as <strong>" + escapeHtml(accountEmail) + "</strong>";
      }

      if (global.HFPlatformAccess && global.HFPlatformAccess.checkPlatformAccess) {
        return global.HFPlatformAccess.checkPlatformAccess().then(function (access) {
          if (!access.allowed) {
            if (loadingEl) loadingEl.classList.add("hidden");
            if (contentEl) contentEl.classList.remove("hidden");
            renderAccessPendingPanel(alertEl);
            bindLogoutButton(logoutBtn, alertEl);
            return;
          }

          global.HFAuth.initChangePasswordSection(activeSession);

          // Operator-only accounts (no hotel membership): Operator card + Pilot Lab provision.
          // Ordinary hotel workspace-create stays hidden for operators.
          if (access.isOperator && !access.hasMembership) {
            if (loadingEl) loadingEl.classList.add("hidden");
            if (contentEl) contentEl.classList.remove("hidden");
            renderOperatorWithoutWorkspace(alertEl, logoutBtn);
            return;
          }

          if (global.HFHotelBrainStore) {
            global.HFHotelBrainStore.preload();
          }

          return loadSignedInWorkspace(
            alertEl,
            logoutBtn,
            loadingEl,
            contentEl,
            form,
            submitBtn
          ).then(function () {
            // Hotel members never see the Operator card unless they are platform operators.
            setOperatorSectionVisible(!!access.isOperator);
            setWorkspacePanelVisible(document.getElementById("operator-pilot-lab-create"), false);
            setWorkspacePanelVisible(document.getElementById("account-signout"), true);
            if (access.isOperator) {
              mountOperatorDemoAccess();
            }
          });
        });
      }

      if (loadingEl) loadingEl.classList.add("hidden");
      if (contentEl) contentEl.classList.remove("hidden");
      renderAccessPendingPanel(alertEl);
      bindLogoutButton(logoutBtn, alertEl);
      showAlert(
        alertEl,
        "error",
        "Platform access checks are unavailable. Reload the page or contact support."
      );
    });
  }

  function bindLogoutButton(logoutBtn, alertEl) {
    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", function () {
      hideAlert(alertEl);
      logoutBtn.disabled = true;
      logoutBtn.textContent = "Signing out…";

      global.HFAuth.signOut().then(function (result) {
        if (result.error) {
          showAlert(alertEl, "error", global.HFAuth.formatError(result.error));
          logoutBtn.disabled = false;
          logoutBtn.textContent = "Sign out";
          return;
        }
        global.location.href = global.HFAuth.ROUTES.login;
      }).catch(function (err) {
        showAlert(alertEl, "error", global.HFAuth.formatError(err));
        logoutBtn.disabled = false;
        logoutBtn.textContent = "Sign out";
      });
    });
  }

  function loadSignedInWorkspace(alertEl, logoutBtn, loadingEl, contentEl, form, submitBtn) {
    return getUserWorkspace().then(function (workspace) {
        if (loadingEl) loadingEl.classList.add("hidden");
        if (contentEl) contentEl.classList.remove("hidden");

        setWorkspacePanelVisible(document.getElementById("operator-pilot-lab-create"), false);

        if (workspace) {
          renderWorkspaceDashboard(workspace);
          if (!isPilotLabWorkspace(workspace)) {
            initWorkspaceEdit(workspace, alertEl);
          }
        } else {
          renderWorkspaceCreateForm();
        }

        setWorkspacePanelVisible(document.getElementById("account-signout"), true);

        // Creation form is only mounted for users without a hotel_members row (Phase 3).
        if (form && !workspace) {
          form.addEventListener("submit", function (e) {
            e.preventDefault();
            hideAlert(alertEl);

            var name = document.getElementById("workspace-name").value.trim();
            var propertyType = document.getElementById("workspace-property-type").value;
            var roomCount = parseInt(document.getElementById("workspace-room-count").value, 10);
            var city = document.getElementById("workspace-city").value.trim();
            var country = document.getElementById("workspace-country").value.trim();

            var validationError = validateWorkspacePayload({
              name: name,
              propertyType: propertyType,
              roomCount: roomCount,
              city: city,
              country: country
            });
            if (validationError) {
              showAlert(alertEl, "error", validationError);
              return;
            }

            setFormLoading(form, true, submitBtn, "Creating workspace…", "Create hotel workspace");

            createWorkspace({
              name: name,
              propertyType: propertyType,
              roomCount: roomCount,
              city: city,
              country: country
            }).then(function (createdWorkspace) {
              showAlert(alertEl, "success", "Hotel workspace created successfully.");
              renderWorkspaceDashboard(createdWorkspace);
              initWorkspaceEdit(createdWorkspace, alertEl);
              form.reset();
              setFormLoading(form, false, submitBtn, "Creating workspace…", "Create hotel workspace");
            }).catch(function (err) {
              showAlert(alertEl, "error", formatWorkspaceError(err));
              setFormLoading(form, false, submitBtn, "Creating workspace…", "Create hotel workspace");
            });
          });
        }

        if (logoutBtn) {
          bindLogoutButton(logoutBtn, alertEl);
        }
      });
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  global.HFWorkspace = {
    PROPERTY_TYPES: PROPERTY_TYPES,
    PILOT_LAB_NAME: PILOT_LAB_NAME,
    PILOT_LAB_PROPERTY_TYPE: PILOT_LAB_PROPERTY_TYPE,
    getUserWorkspace: getUserWorkspace,
    getCachedWorkspace: getCachedWorkspace,
    clearCachedWorkspace: clearCachedWorkspace,
    getWorkspaceHotelName: getWorkspaceHotelName,
    resolveDisplayHotelName: resolveDisplayHotelName,
    isPilotLabWorkspace: isPilotLabWorkspace,
    createWorkspace: createWorkspace,
    createOperatorPilotLab: createOperatorPilotLab,
    updateWorkspace: updateWorkspace,
    initAccountPage: initAccountPage
  };
})(window);
