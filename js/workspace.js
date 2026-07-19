/**
 * Hospitality Flow — Hotel workspace (Phase 3)
 * Create and load hotel workspaces via Supabase hotels + hotel_members tables.
 */
(function (global) {
  "use strict";

  var PROPERTY_TYPES = [
    { value: "independent-hotel", label: "Independent hotel" },
    { value: "boutique-hotel", label: "Boutique hotel" },
    { value: "small-hotel-group", label: "Small hotel group (2–10 hotels)" },
    { value: "guest-house", label: "Guest house" },
    { value: "serviced-apartment", label: "Serviced apartment" },
    { value: "hotel-opening-soon", label: "Hotel opening soon" },
    { value: "other", label: "Other" }
  ];

  var PROPERTY_TYPE_LABELS = PROPERTY_TYPES.reduce(function (acc, item) {
    acc[item.value] = item.label;
    return acc;
  }, {});

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
    if (/not authenticated/i.test(msg)) {
      return "Your session has expired. Please sign in again.";
    }
    if (/row-level security|permission denied|42501/i.test(msg)) {
      return "Workspace creation is not permitted. Run the Phase 3 SQL migration in Supabase (see SUPABASE_SETUP.md).";
    }
    if (/city|country|number_of_rooms|property_type/i.test(msg) && /column|schema|42703/i.test(msg)) {
      return "Database setup incomplete. Run supabase/migrations/phase3_hotel_workspace.sql in Supabase.";
    }

    return global.HFAuth.formatError(error);
  }

  function getUserWorkspace() {
    return ensureClient().then(function (client) {
      return client.auth.getUser().then(function (result) {
        var user = result.data.user;
        if (!user) return null;

        return client
          .from("hotel_members")
          .select("role, hotels ( id, name, property_type, number_of_rooms, city, country, created_at )")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(function (response) {
            if (response.error) {
              return Promise.reject(response.error);
            }
            if (!response.data || !response.data.hotels) {
              return null;
            }
            return {
              role: response.data.role,
              hotel: response.data.hotels
            };
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
        return getUserWorkspace();
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
    var dashboardEl = document.getElementById("workspace-dashboard");
    var hotelNameEl = document.getElementById("workspace-hotel-name");
    var hotelMetaEl = document.getElementById("workspace-hotel-meta");
    var roleEl = document.getElementById("workspace-user-role");
    var headingEl = document.getElementById("account-heading");

    setWorkspacePanelVisible(createEl, false);
    setWorkspacePanelVisible(dashboardEl, true);
    if (headingEl) headingEl.textContent = "Your hotel workspace";

    var hotel = workspace.hotel;
    if (hotelNameEl) {
      hotelNameEl.textContent = hotel.name || "Your hotel";
    }
    if (hotelMetaEl) {
      var parts = [
        formatPropertyType(hotel.property_type),
        hotel.number_of_rooms ? hotel.number_of_rooms + " rooms" : null,
        hotel.city,
        hotel.country
      ].filter(Boolean);
      hotelMetaEl.textContent = parts.join(" · ");
    }
    if (roleEl) {
      roleEl.textContent = "Your role: " + formatRole(workspace.role);
    }
  }

  function renderWorkspaceCreateForm() {
    var createEl = document.getElementById("workspace-create");
    var dashboardEl = document.getElementById("workspace-dashboard");
    var headingEl = document.getElementById("account-heading");

    setWorkspacePanelVisible(dashboardEl, false);
    setWorkspacePanelVisible(createEl, true);
    if (headingEl) headingEl.textContent = "Create your hotel workspace";
  }

  function initAccountPage() {
    var alertEl = document.getElementById("auth-alert");
    var emailEl = document.getElementById("account-email");
    var logoutBtn = document.getElementById("logout-btn");
    var loadingEl = document.getElementById("auth-loading");
    var contentEl = document.getElementById("auth-content");
    var form = document.getElementById("workspace-form");
    var submitBtn = document.getElementById("workspace-submit");

    global.HFAuth.requireAuth().then(function (session) {
      if (!session) return;

      if (emailEl) {
        var email = session.user && session.user.email ? session.user.email : "your account";
        emailEl.innerHTML = "Signed in as <strong>" + escapeHtml(email) + "</strong>";
      }

      global.HFAuth.initChangePasswordSection(session);

      return getUserWorkspace().then(function (workspace) {
        if (loadingEl) loadingEl.classList.add("hidden");
        if (contentEl) contentEl.classList.remove("hidden");

        if (workspace) {
          renderWorkspaceDashboard(workspace);
        } else {
          renderWorkspaceCreateForm();
        }

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

            if (!name) {
              showAlert(alertEl, "error", "Please enter your hotel name.");
              return;
            }
            if (!propertyType) {
              showAlert(alertEl, "error", "Please select a property type.");
              return;
            }
            if (!roomCount || roomCount < 1) {
              showAlert(alertEl, "error", "Please enter a valid number of rooms.");
              return;
            }
            if (!city) {
              showAlert(alertEl, "error", "Please enter a city.");
              return;
            }
            if (!country) {
              showAlert(alertEl, "error", "Please enter a country.");
              return;
            }

            setFormLoading(form, true, submitBtn, "Creating workspace…", "Create hotel workspace");

            createWorkspace({
              name: name,
              propertyType: propertyType,
              roomCount: roomCount,
              city: city,
              country: country
            }).then(function (workspace) {
              showAlert(alertEl, "success", "Hotel workspace created successfully.");
              renderWorkspaceDashboard(workspace);
              form.reset();
              setFormLoading(form, false, submitBtn, "Creating workspace…", "Create hotel workspace");
            }).catch(function (err) {
              showAlert(alertEl, "error", formatWorkspaceError(err));
              setFormLoading(form, false, submitBtn, "Creating workspace…", "Create hotel workspace");
            });
          });
        }

        if (logoutBtn) {
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
      });
    }).catch(function (err) {
      if (loadingEl) loadingEl.classList.add("hidden");
      if (contentEl) contentEl.classList.remove("hidden");
      showAlert(alertEl, "error", formatWorkspaceError(err));
    });
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  global.HFWorkspace = {
    PROPERTY_TYPES: PROPERTY_TYPES,
    getUserWorkspace: getUserWorkspace,
    createWorkspace: createWorkspace,
    initAccountPage: initAccountPage
  };
})(window);
