/**
 * Hospitality Flow — Maintenance cloud store (M2)
 * Workspace-scoped issues and timeline updates via Supabase.
 * RLS is the authoritative boundary; never trust client-supplied workspace IDs.
 *
 * Creation note: after inserting maintenance_issues, a `created` timeline row is
 * inserted. If that second insert fails, the issue remains (client DELETE is
 * blocked by design). Callers receive a partial-success error and must not claim
 * full success. Do not use service-role credentials in the browser.
 */
(function (global) {
  "use strict";

  var ISSUES_TABLE = "maintenance_issues";
  var UPDATES_TABLE = "maintenance_updates";
  var LOCAL_CACHE_KEY = "hf_maintenance_issues_cache";

  var DEFAULT_DEPARTMENTS = [
    "Maintenance",
    "Reception",
    "Housekeeping",
    "Management",
    "Other"
  ];

  var PRIORITY_RANK = { urgent: 0, high: 1, medium: 4, low: 5 };
  var STATUS_LABELS = {
    open: "Open",
    in_progress: "In Progress",
    waiting_parts: "Waiting for Parts",
    waiting_contractor: "Waiting for Contractor",
    completed: "Completed"
  };
  var PRIORITY_LABELS = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent"
  };
  var CATEGORY_LABELS = {
    plumbing: "Plumbing",
    electrical: "Electrical",
    hvac: "HVAC",
    bathroom: "Bathroom",
    furniture: "Furniture",
    fixtures: "Fixtures",
    appliances: "Appliances",
    it_technology: "IT & Technology",
    safety: "Safety",
    public_area: "Public Area",
    kitchen: "Kitchen",
    other: "Other"
  };
  var LOCATION_TYPE_LABELS = {
    guest_room: "Guest Room",
    public_area: "Public Area",
    back_of_house: "Back of House"
  };
  var UPDATE_TYPE_LABELS = {
    created: "Issue reported",
    note: "Progress update",
    status_changed: "Status changed",
    priority_changed: "Priority changed",
    assignment_changed: "Assignment updated",
    resolution: "Resolved",
    reopened: "Reopened",
    hidden_from_handover: "Removed from handover",
    included_in_handover: "Included in handover"
  };

  var cachedWorkspaceId = null;
  var cachedUserId = null;
  var cachedIssues = [];
  var cloudAvailable = false;
  var lastCloudError = null;
  var cacheIsStale = false;
  var initPromise = null;

  function ensureClient() {
    return global.HFAuth.ensureClient();
  }

  function getSession() {
    return global.HFAuth.getSession();
  }

  function getWorkspace() {
    return global.HFWorkspace.getUserWorkspace();
  }

  function tenantStorage() {
    return global.HFTenantStorage || null;
  }

  function trimText(value) {
    return value == null ? "" : String(value).trim();
  }

  function formatError(error) {
    if (!error) return "Something went wrong. Please try again.";
    if (typeof error === "string") {
      if (error === "NOT_AUTHENTICATED") return "Sign in to access Maintenance.";
      if (error === "NOT_APPROVED") {
        return global.HFPlatformAccess && global.HFPlatformAccess.NOT_APPROVED_MESSAGE
          ? global.HFPlatformAccess.NOT_APPROVED_MESSAGE
          : "Your Hospitality Flow access has not been approved yet.";
      }
      if (error === "MODULE_MISSING") {
        return "Platform access checks are unavailable. Reload the page or contact support.";
      }
      if (error === "MIGRATION_PENDING") {
        return "Platform access setup is incomplete. Run the latest Supabase migrations.";
      }
      if (error === "ACCESS_CHECK_FAILED") {
        return "Could not verify platform access. Please try again.";
      }
      if (error === "NO_WORKSPACE") {
        return "Create your hotel workspace on the Account page before using Maintenance.";
      }
      if (error === "SUPABASE_NOT_CONFIGURED") {
        return "Supabase is not configured. Copy js/supabase-config.example.js to js/supabase-config.js.";
      }
      if (error === "OFFLINE") {
        return "Cloud sync is unavailable. Connect to the internet to report or refresh issues.";
      }
      if (error === "VALIDATION") return "Please check the highlighted fields and try again.";
      if (error === "TIMELINE_CREATE_FAILED") {
        return "The issue was updated, but its timeline entry could not be saved. Refresh and try adding a note.";
      }
      if (error === "BLANK_NOTE") {
        return "Enter a progress update before saving.";
      }
      if (error === "RESOLUTION_REQUIRED") {
        return "Add a short resolution note before completing this issue.";
      }
      if (error === "REOPEN_NOTE_REQUIRED") {
        return "Add a short explanation before reopening this issue.";
      }
      if (error === "INVALID_STATUS") {
        return "That status change is not allowed.";
      }
      if (error === "ISSUE_NOT_FOUND") {
        return "That maintenance issue could not be found in your workspace.";
      }
      return error;
    }

    var msg = error.message || String(error);
    if (/row-level security|permission denied|42501/i.test(msg)) {
      return "Maintenance sync is not permitted. Run supabase/migrations/phase15_maintenance.sql in Supabase.";
    }
    if (/maintenance_issues|maintenance_updates|relation.*does not exist|42P01/i.test(msg)) {
      return "Maintenance database setup incomplete. Run supabase/migrations/phase15_maintenance.sql in Supabase.";
    }
    if (/JWT expired|invalid JWT|session/i.test(msg)) {
      return "Your session has expired. Please sign in again.";
    }
    return global.HFAuth && global.HFAuth.formatError
      ? global.HFAuth.formatError(error)
      : msg;
  }

  function requireAuthAndWorkspace() {
    if (global.HospitalityFlowSupabase && !global.HospitalityFlowSupabase.isConfigured()) {
      return Promise.reject("SUPABASE_NOT_CONFIGURED");
    }

    return getSession().then(function (session) {
      if (!session || !session.user) {
        return Promise.reject("NOT_AUTHENTICATED");
      }

      var accessPromise = global.HFPlatformAccess && global.HFPlatformAccess.checkPlatformAccess
        ? global.HFPlatformAccess.checkPlatformAccess()
        : Promise.resolve({ allowed: false, reason: "MODULE_MISSING" });

      return accessPromise.then(function (access) {
        if (!access.allowed) {
          return Promise.reject(access.reason || "NOT_APPROVED");
        }

        if (tenantStorage() && session.user && session.user.id) {
          var ctx = tenantStorage().readTenantContext();
          if (!ctx || ctx.userId !== session.user.id) {
            tenantStorage().writeTenantContext({
              userId: session.user.id,
              workspaceId: ctx && ctx.userId === session.user.id ? ctx.workspaceId : null
            });
          }
        }

        return getWorkspace().then(function (workspace) {
          if (!workspace || !workspace.hotel || !workspace.hotel.id) {
            return Promise.reject("NO_WORKSPACE");
          }
          if (tenantStorage()) {
            tenantStorage().updateTenantWorkspace(workspace.hotel.id);
          }
          return {
            session: session,
            workspace: workspace,
            workspaceId: workspace.hotel.id,
            userId: session.user.id
          };
        });
      });
    });
  }

  function readLocalCache(workspaceId) {
    if (!workspaceId || !tenantStorage()) return [];
    try {
      var raw = tenantStorage().getRaw(LOCAL_CACHE_KEY, workspaceId);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function writeLocalCache(workspaceId, issues) {
    if (!workspaceId || !tenantStorage()) return;
    try {
      tenantStorage().setRaw(LOCAL_CACHE_KEY, JSON.stringify(issues || []), workspaceId);
    } catch (err) {
      /* localStorage unavailable */
    }
  }

  function clearTenantCache() {
    cachedWorkspaceId = null;
    cachedUserId = null;
    cachedIssues = [];
    cloudAvailable = false;
    lastCloudError = null;
    cacheIsStale = false;
    initPromise = null;
  }

  function locationLabel(issue) {
    if (!issue) return "Unknown location";
    if (issue.locationType === "guest_room" && issue.roomNumber) {
      var room = trimText(issue.roomNumber);
      if (/^room\s+/i.test(room)) return room;
      return "Room " + room;
    }
    if (issue.area) return trimText(issue.area);
    if (issue.roomNumber) return trimText(issue.roomNumber);
    return LOCATION_TYPE_LABELS[issue.locationType] || "Unknown location";
  }

  function rowToIssue(row) {
    if (!row) return null;
    var issue = {
      id: row.id,
      workspaceId: row.workspace_id,
      title: row.title || "",
      description: row.description || "",
      roomNumber: row.room_number || "",
      area: row.area || "",
      locationType: row.location_type,
      category: row.category,
      priority: row.priority,
      status: row.status,
      reportedByName: row.reported_by_name || "",
      assignedDepartment: row.assigned_department || "",
      dueAt: row.due_at || null,
      completedAt: row.completed_at || null,
      resolutionNotes: row.resolution_notes || "",
      includeInHandover: row.include_in_handover === true,
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null,
      locationLabel: "",
      priorityLabel: PRIORITY_LABELS[row.priority] || row.priority,
      statusLabel: STATUS_LABELS[row.status] || row.status,
      categoryLabel: CATEGORY_LABELS[row.category] || row.category,
      locationTypeLabel: LOCATION_TYPE_LABELS[row.location_type] || row.location_type
    };
    issue.locationLabel = locationLabel(issue);
    return issue;
  }

  function rowToUpdate(row) {
    if (!row) return null;
    return {
      id: row.id,
      issueId: row.issue_id,
      workspaceId: row.workspace_id,
      updateType: row.update_type,
      updateTypeLabel: UPDATE_TYPE_LABELS[row.update_type] || row.update_type,
      note: row.note || "",
      previousStatus: row.previous_status,
      newStatus: row.new_status,
      previousPriority: row.previous_priority,
      newPriority: row.new_priority,
      createdBy: row.created_by || null,
      createdAt: row.created_at || null
    };
  }

  function isUnresolved(issue) {
    return issue && issue.status !== "completed";
  }

  function sortRank(issue) {
    if (!issue || issue.status === "completed") return 100;
    if (issue.priority === "urgent") return 0;
    if (issue.priority === "high") return 1;
    if (issue.status === "in_progress") return 2;
    if (issue.status === "waiting_parts" || issue.status === "waiting_contractor") return 3;
    if (issue.priority === "medium") return 4;
    if (issue.priority === "low") return 5;
    return 6 + (PRIORITY_RANK[issue.priority] != null ? PRIORITY_RANK[issue.priority] : 9);
  }

  function sortIssues(list) {
    return list.slice().sort(function (a, b) {
      var ra = sortRank(a);
      var rb = sortRank(b);
      if (ra !== rb) return ra - rb;
      var aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      var bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (a.status === "completed" && b.status === "completed") {
        var ac = a.completedAt ? Date.parse(a.completedAt) : aTime;
        var bc = b.completedAt ? Date.parse(b.completedAt) : bTime;
        return bc - ac;
      }
      if (aTime !== bTime) return aTime - bTime;
      return String(a.id).localeCompare(String(b.id));
    });
  }

  function matchesSearch(issue, query) {
    if (!query) return true;
    var hay = [
      issue.roomNumber,
      issue.area,
      issue.title,
      issue.description,
      issue.category,
      issue.categoryLabel,
      issue.assignedDepartment,
      issue.locationLabel
    ].join(" ").toLowerCase();
    return hay.indexOf(query) !== -1;
  }

  function applyFilters(issues, filters) {
    filters = filters || {};
    var includeCompleted = filters.includeCompleted === true ||
      (filters.status && filters.status === "completed");
    var status = filters.status && filters.status !== "all" ? filters.status : null;
    var priority = filters.priority && filters.priority !== "all" ? filters.priority : null;
    var category = filters.category && filters.category !== "all" ? filters.category : null;
    var department = filters.department && filters.department !== "all"
      ? trimText(filters.department).toLowerCase()
      : null;
    var location = trimText(filters.location).toLowerCase();
    var search = trimText(filters.search).toLowerCase();

    var filtered = issues.filter(function (issue) {
      if (!includeCompleted && !status && !isUnresolved(issue)) return false;
      if (status && issue.status !== status) return false;
      if (priority && issue.priority !== priority) return false;
      if (category && issue.category !== category) return false;
      if (department && trimText(issue.assignedDepartment).toLowerCase() !== department) {
        return false;
      }
      if (location) {
        var locHay = [issue.roomNumber, issue.area, issue.locationLabel].join(" ").toLowerCase();
        if (locHay.indexOf(location) === -1) return false;
      }
      if (!matchesSearch(issue, search)) return false;
      return true;
    });

    return sortIssues(filtered);
  }

  function startOfLocalDay(date) {
    var d = date ? new Date(date) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function isCompletedToday(issue) {
    if (!issue || issue.status !== "completed" || !issue.completedAt) return false;
    var completed = new Date(issue.completedAt);
    if (isNaN(completed.getTime())) return false;
    var start = startOfLocalDay();
    var end = new Date(start.getTime());
    end.setDate(end.getDate() + 1);
    return completed >= start && completed < end;
  }

  function computeMetrics(issues) {
    var openIssues = 0;
    var highPriority = 0;
    var inProgress = 0;
    var completedToday = 0;

    (issues || []).forEach(function (issue) {
      if (isUnresolved(issue)) {
        openIssues += 1;
        if (issue.priority === "high" || issue.priority === "urgent") highPriority += 1;
        if (issue.status === "in_progress") inProgress += 1;
      }
      if (isCompletedToday(issue)) completedToday += 1;
    });

    return {
      openIssues: openIssues,
      highPriority: highPriority,
      inProgress: inProgress,
      completedToday: completedToday
    };
  }

  function validateCreatePayload(payload) {
    payload = payload || {};
    var errors = {};
    var locationType = trimText(payload.locationType);
    var title = trimText(payload.title);
    var description = trimText(payload.description);
    var category = trimText(payload.category);
    var priority = trimText(payload.priority) || "medium";
    var department = trimText(payload.assignedDepartment) || "Maintenance";
    var roomNumber = trimText(payload.roomNumber);
    var area = trimText(payload.area);

    if (!LOCATION_TYPE_LABELS[locationType]) {
      errors.locationType = "Select a location type.";
    }
    if (locationType === "guest_room" && !roomNumber) {
      errors.roomNumber = "Enter the room number.";
    }
    if ((locationType === "public_area" || locationType === "back_of_house") && !area) {
      errors.area = "Enter the area name.";
    }
    if (!title) errors.title = "Enter a short title.";
    if (!description) errors.description = "Add a brief description.";
    if (!CATEGORY_LABELS[category]) errors.category = "Select a category.";
    if (!PRIORITY_LABELS[priority]) errors.priority = "Select a priority.";
    if (!department) errors.assignedDepartment = "Select a department.";

    if (Object.keys(errors).length) {
      return { ok: false, errors: errors };
    }

    return {
      ok: true,
      row: {
        title: title.slice(0, 120),
        description: description.slice(0, 2000),
        room_number: locationType === "guest_room" ? roomNumber : (roomNumber || null),
        area: locationType !== "guest_room" ? area : (area || null),
        location_type: locationType,
        category: category,
        priority: priority,
        status: "open",
        reported_by_name: trimText(payload.reportedByName) || null,
        assigned_department: department,
        due_at: payload.dueAt ? payload.dueAt : null,
        include_in_handover: payload.includeInHandover === true
      }
    };
  }

  function fetchAllIssues(client, workspaceId) {
    return client
      .from(ISSUES_TABLE)
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .then(function (result) {
        if (result.error) return Promise.reject(result.error);
        return (result.data || []).map(rowToIssue);
      });
  }

  function init() {
    if (initPromise) return initPromise;

    initPromise = requireAuthAndWorkspace()
      .then(function (ctx) {
        cachedWorkspaceId = ctx.workspaceId;
        cachedUserId = ctx.userId;
        return ensureClient().then(function (client) {
          return fetchAllIssues(client, ctx.workspaceId).then(function (issues) {
            cachedIssues = issues;
            cloudAvailable = true;
            lastCloudError = null;
            cacheIsStale = false;
            writeLocalCache(ctx.workspaceId, issues);
            return {
              workspaceId: ctx.workspaceId,
              issues: sortIssues(issues),
              metrics: computeMetrics(issues),
              cloud: true,
              stale: false
            };
          });
        });
      })
      .catch(function (err) {
        lastCloudError = err;
        cloudAvailable = false;
        if (err === "NOT_AUTHENTICATED" || err === "NOT_APPROVED" || err === "NO_WORKSPACE" ||
            err === "SUPABASE_NOT_CONFIGURED" || err === "MODULE_MISSING" || err === "MIGRATION_PENDING") {
          return Promise.reject(err);
        }
        var local = cachedWorkspaceId ? readLocalCache(cachedWorkspaceId) : [];
        if (!cachedWorkspaceId) {
          return requireAuthAndWorkspace().then(function (ctx) {
            cachedWorkspaceId = ctx.workspaceId;
            cachedUserId = ctx.userId;
            local = readLocalCache(ctx.workspaceId);
            cachedIssues = local;
            cacheIsStale = local.length > 0;
            return {
              workspaceId: ctx.workspaceId,
              issues: sortIssues(local),
              metrics: computeMetrics(local),
              cloud: false,
              stale: cacheIsStale,
              error: err
            };
          }).catch(function (authErr) {
            return Promise.reject(authErr);
          });
        }
        cachedIssues = local;
        cacheIsStale = local.length > 0;
        return {
          workspaceId: cachedWorkspaceId,
          issues: sortIssues(local),
          metrics: computeMetrics(local),
          cloud: false,
          stale: cacheIsStale,
          error: err
        };
      })
      .finally(function () {
        initPromise = null;
      });

    return initPromise;
  }

  function refresh() {
    return init();
  }

  function getWorkspaceId() {
    return cachedWorkspaceId;
  }

  function isCloudAvailable() {
    return cloudAvailable === true;
  }

  function isCacheStale() {
    return cacheIsStale === true;
  }

  function getCachedIssues() {
    return cachedIssues.slice();
  }

  function listIssues(filters) {
    return applyFilters(cachedIssues, filters || {});
  }

  function getIssue(issueId) {
    var id = String(issueId || "");
    for (var i = 0; i < cachedIssues.length; i++) {
      if (String(cachedIssues[i].id) === id) return cachedIssues[i];
    }
    return null;
  }

  function getMetrics() {
    return computeMetrics(cachedIssues);
  }

  function listUpdates(issueId) {
    if (!cloudAvailable) {
      return Promise.reject("OFFLINE");
    }
    return requireAuthAndWorkspace().then(function (ctx) {
      return ensureClient().then(function (client) {
        return client
          .from(UPDATES_TABLE)
          .select("*")
          .eq("workspace_id", ctx.workspaceId)
          .eq("issue_id", issueId)
          .order("created_at", { ascending: true })
          .then(function (result) {
            if (result.error) return Promise.reject(result.error);
            return (result.data || []).map(rowToUpdate);
          });
      });
    });
  }

  function createIssue(payload) {
    if (!cloudAvailable) {
      return Promise.reject("OFFLINE");
    }

    var validated = validateCreatePayload(payload);
    if (!validated.ok) {
      var validationError = new Error("VALIDATION");
      validationError.code = "VALIDATION";
      validationError.fieldErrors = validated.errors;
      return Promise.reject(validationError);
    }

    return requireAuthAndWorkspace().then(function (ctx) {
      return ensureClient().then(function (client) {
        var insertRow = Object.assign({}, validated.row, {
          workspace_id: ctx.workspaceId
        });

        return client
          .from(ISSUES_TABLE)
          .insert(insertRow)
          .select("*")
          .single()
          .then(function (issueResult) {
            if (issueResult.error) return Promise.reject(issueResult.error);
            var issue = rowToIssue(issueResult.data);

            return client
              .from(UPDATES_TABLE)
              .insert({
                issue_id: issue.id,
                workspace_id: ctx.workspaceId,
                update_type: "created",
                note: "Issue reported"
              })
              .select("*")
              .single()
              .then(function (updateResult) {
                cachedIssues = cachedIssues.concat([issue]);
                writeLocalCache(ctx.workspaceId, cachedIssues);
                cloudAvailable = true;
                cacheIsStale = false;
                lastCloudError = null;

                if (updateResult.error) {
                  /* Issue exists; client cannot DELETE (M1.1). Surface partial success. */
                  if (typeof console !== "undefined" && console.warn) {
                    console.warn("[HFMaintenanceStore] Timeline create failed for issue", issue.id);
                  }
                  var partial = new Error("TIMELINE_CREATE_FAILED");
                  partial.code = "TIMELINE_CREATE_FAILED";
                  partial.issue = issue;
                  partial.partial = true;
                  return Promise.reject(partial);
                }

                return {
                  issue: issue,
                  update: rowToUpdate(updateResult.data)
                };
              });
          });
      });
    });
  }

  var UNRESOLVED_STATUSES = {
    open: true,
    in_progress: true,
    waiting_parts: true,
    waiting_contractor: true
  };

  var MAX_NOTE_LENGTH = 2000;

  function rejectCode(code, extra) {
    var err = new Error(code);
    err.code = code;
    if (extra) {
      Object.keys(extra).forEach(function (key) {
        err[key] = extra[key];
      });
    }
    return Promise.reject(err);
  }

  function replaceCachedIssue(issue) {
    if (!issue) return;
    var found = false;
    cachedIssues = cachedIssues.map(function (item) {
      if (String(item.id) === String(issue.id)) {
        found = true;
        return issue;
      }
      return item;
    });
    if (!found) cachedIssues = cachedIssues.concat([issue]);
    if (cachedWorkspaceId) writeLocalCache(cachedWorkspaceId, cachedIssues);
  }

  function fetchIssueRow(client, workspaceId, issueId) {
    return client
      .from(ISSUES_TABLE)
      .select("*")
      .eq("id", issueId)
      .eq("workspace_id", workspaceId)
      .maybeSingle()
      .then(function (result) {
        if (result.error) return Promise.reject(result.error);
        if (!result.data) return rejectCode("ISSUE_NOT_FOUND");
        return rowToIssue(result.data);
      });
  }

  /**
   * Update issue then insert timeline. Not a DB transaction.
   * If timeline insert fails after issue update, returns TIMELINE_CREATE_FAILED
   * partial error. Client DELETE is blocked — no unsafe rollback.
   * Future: optional SECURITY DEFINER RPC for atomic write.
   */
  function updateIssueWithTimeline(issueId, buildPatch, buildTimeline) {
    if (!cloudAvailable) return Promise.reject("OFFLINE");
    var id = trimText(issueId);
    if (!id) return rejectCode("ISSUE_NOT_FOUND");

    return requireAuthAndWorkspace().then(function (ctx) {
      return ensureClient().then(function (client) {
        return fetchIssueRow(client, ctx.workspaceId, id).then(function (current) {
          var patchResult = buildPatch(current);
          if (patchResult && patchResult.error) {
            return rejectCode(patchResult.error);
          }
          if (patchResult && patchResult.noop) {
            return { issue: current, noop: true };
          }

          var rowPatch = patchResult.row || {};
          /* Never accept workspace_id from callers — scope only via ctx. */
          delete rowPatch.workspace_id;
          delete rowPatch.id;

          return client
            .from(ISSUES_TABLE)
            .update(rowPatch)
            .eq("id", id)
            .eq("workspace_id", ctx.workspaceId)
            .select("*")
            .single()
            .then(function (upd) {
              if (upd.error) return Promise.reject(upd.error);
              var issue = rowToIssue(upd.data);
              replaceCachedIssue(issue);

              var timeline = buildTimeline(current, issue) || {};
              var timelineRow = {
                issue_id: issue.id,
                workspace_id: ctx.workspaceId,
                update_type: timeline.update_type,
                note: timeline.note || null,
                previous_status: timeline.previous_status || null,
                new_status: timeline.new_status || null,
                previous_priority: timeline.previous_priority || null,
                new_priority: timeline.new_priority || null
              };

              return client
                .from(UPDATES_TABLE)
                .insert(timelineRow)
                .select("*")
                .single()
                .then(function (tRes) {
                  if (tRes.error) {
                    if (typeof console !== "undefined" && console.warn) {
                      console.warn("[HFMaintenanceStore] Timeline insert failed", {
                        issueId: issue.id,
                        updateType: timeline.update_type
                      });
                    }
                    return rejectCode("TIMELINE_CREATE_FAILED", {
                      issue: issue,
                      partial: true
                    });
                  }
                  return {
                    issue: issue,
                    update: rowToUpdate(tRes.data)
                  };
                });
            });
        });
      });
    });
  }

  function normaliseNote(note, options) {
    options = options || {};
    var text = trimText(note);
    if (!text) {
      return { ok: false, error: options.requiredCode || "BLANK_NOTE" };
    }
    if (text.length > MAX_NOTE_LENGTH) text = text.slice(0, MAX_NOTE_LENGTH);
    return { ok: true, text: text };
  }

  function addUpdate(issueId, note) {
    var checked = normaliseNote(note);
    if (!checked.ok) return rejectCode(checked.error);

    return updateIssueWithTimeline(
      issueId,
      function (current) {
        /* Touch row so updated_at refreshes for card age display. */
        return {
          row: {
            assigned_department: current.assignedDepartment || "Maintenance"
          }
        };
      },
      function () {
        return { update_type: "note", note: checked.text };
      }
    );
  }

  function updateStatus(issueId, newStatus, note) {
    var status = trimText(newStatus);
    if (!UNRESOLVED_STATUSES[status]) {
      return rejectCode("INVALID_STATUS");
    }
    var optionalNote = trimText(note);
    if (optionalNote.length > MAX_NOTE_LENGTH) optionalNote = optionalNote.slice(0, MAX_NOTE_LENGTH);

    return updateIssueWithTimeline(
      issueId,
      function (current) {
        if (current.status === "completed") {
          return { error: "INVALID_STATUS" };
        }
        if (current.status === status) return { noop: true };
        return { row: { status: status } };
      },
      function (before, after) {
        return {
          update_type: "status_changed",
          previous_status: before.status,
          new_status: after.status,
          note: optionalNote || null
        };
      }
    );
  }

  function updatePriority(issueId, newPriority, note) {
    var priority = trimText(newPriority);
    if (!PRIORITY_LABELS[priority]) return rejectCode("VALIDATION");
    var optionalNote = trimText(note);
    if (optionalNote.length > MAX_NOTE_LENGTH) optionalNote = optionalNote.slice(0, MAX_NOTE_LENGTH);

    return updateIssueWithTimeline(
      issueId,
      function (current) {
        if (current.priority === priority) return { noop: true };
        return { row: { priority: priority } };
      },
      function (before, after) {
        return {
          update_type: "priority_changed",
          previous_priority: before.priority,
          new_priority: after.priority,
          note: optionalNote || null
        };
      }
    );
  }

  function updateAssignment(issueId, department, note) {
    var dept = trimText(department);
    if (!dept) return rejectCode("VALIDATION");
    var optionalNote = trimText(note);
    if (optionalNote.length > MAX_NOTE_LENGTH) optionalNote = optionalNote.slice(0, MAX_NOTE_LENGTH);

    return updateIssueWithTimeline(
      issueId,
      function (current) {
        if (trimText(current.assignedDepartment) === dept) return { noop: true };
        return { row: { assigned_department: dept } };
      },
      function (before, after) {
        var auto =
          "Assigned department changed from " +
          (before.assignedDepartment || "—") +
          " to " +
          (after.assignedDepartment || "—") +
          ".";
        return {
          update_type: "assignment_changed",
          note: optionalNote || auto
        };
      }
    );
  }

  function updateDueDate(issueId, dueAt, note) {
    var optionalNote = trimText(note);
    if (optionalNote.length > MAX_NOTE_LENGTH) optionalNote = optionalNote.slice(0, MAX_NOTE_LENGTH);
    var nextDue = dueAt ? dueAt : null;
    if (nextDue && isNaN(Date.parse(nextDue))) return rejectCode("VALIDATION");

    return updateIssueWithTimeline(
      issueId,
      function (current) {
        var prev = current.dueAt || null;
        var prevKey = prev ? Date.parse(prev) : null;
        var nextKey = nextDue ? Date.parse(nextDue) : null;
        if (prevKey === nextKey || (!prev && !nextDue)) return { noop: true };
        return { row: { due_at: nextDue } };
      },
      function (before, after) {
        function label(iso) {
          if (!iso) return "none";
          var d = new Date(iso);
          if (isNaN(d.getTime())) return "none";
          return d.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric"
          });
        }
        var auto =
          "Due date changed from " + label(before.dueAt) + " to " + label(after.dueAt) + ".";
        return {
          update_type: "note",
          note: optionalNote || auto
        };
      }
    );
  }

  function completeIssue(issueId, resolutionNote) {
    var checked = normaliseNote(resolutionNote, { requiredCode: "RESOLUTION_REQUIRED" });
    if (!checked.ok) return rejectCode(checked.error);

    return updateIssueWithTimeline(
      issueId,
      function (current) {
        if (current.status === "completed") return { noop: true };
        return {
          row: {
            status: "completed",
            resolution_notes: checked.text
          }
        };
      },
      function (before, after) {
        return {
          update_type: "resolution",
          previous_status: before.status,
          new_status: after.status,
          note: checked.text
        };
      }
    );
  }

  function reopenIssue(issueId, note) {
    var checked = normaliseNote(note, { requiredCode: "REOPEN_NOTE_REQUIRED" });
    if (!checked.ok) return rejectCode(checked.error);

    return updateIssueWithTimeline(
      issueId,
      function (current) {
        if (current.status !== "completed") return { error: "INVALID_STATUS" };
        return {
          row: {
            status: "open"
          }
        };
      },
      function (before, after) {
        return {
          update_type: "reopened",
          previous_status: before.status,
          new_status: after.status,
          note: checked.text
        };
      }
    );
  }

  function setHandoverInclusion(issueId, include, note) {
    var next = include === true;
    var optionalNote = trimText(note);
    if (optionalNote.length > MAX_NOTE_LENGTH) optionalNote = optionalNote.slice(0, MAX_NOTE_LENGTH);

    return updateIssueWithTimeline(
      issueId,
      function (current) {
        if (current.includeInHandover === next) return { noop: true };
        return { row: { include_in_handover: next } };
      },
      function () {
        return {
          update_type: next ? "included_in_handover" : "hidden_from_handover",
          note: optionalNote || null
        };
      }
    );
  }

  function formatTimelineAction(update) {
    if (!update) return "Update";
    var type = update.updateType;
    if (type === "created") return "Issue reported.";
    if (type === "note") return "Progress update added.";
    if (type === "status_changed") {
      var fromS = STATUS_LABELS[update.previousStatus] || update.previousStatus || "—";
      var toS = STATUS_LABELS[update.newStatus] || update.newStatus || "—";
      return "Status changed from " + fromS + " to " + toS + ".";
    }
    if (type === "priority_changed") {
      var fromP = PRIORITY_LABELS[update.previousPriority] || update.previousPriority || "—";
      var toP = PRIORITY_LABELS[update.newPriority] || update.newPriority || "—";
      return "Priority changed from " + fromP + " to " + toP + ".";
    }
    if (type === "assignment_changed") return "Assigned department changed.";
    if (type === "resolution") return "Issue completed.";
    if (type === "reopened") return "Issue reopened.";
    if (type === "included_in_handover") return "Marked for inclusion in the next handover.";
    if (type === "hidden_from_handover") return "Removed from handover inclusion.";
    return UPDATE_TYPE_LABELS[type] || "Update";
  }

  function resolveDepartments(profile) {
    var names = [];
    var seen = {};

    function add(name) {
      var cleaned = trimText(name);
      if (!cleaned) return;
      var key = cleaned.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      names.push(cleaned);
    }

    if (profile && Array.isArray(profile.departments)) {
      profile.departments.forEach(function (dept) {
        if (typeof dept === "string") add(dept);
        else if (dept && typeof dept === "object") add(dept.name);
      });
    }

    DEFAULT_DEPARTMENTS.forEach(add);

    if (!seen.maintenance) {
      names.unshift("Maintenance");
    } else {
      names = ["Maintenance"].concat(names.filter(function (n) {
        return n.toLowerCase() !== "maintenance";
      }));
    }

    return names;
  }

  function loadDepartments() {
    var fallback = resolveDepartments(null);
    if (!global.HFHotelBrainStore) {
      return Promise.resolve(fallback);
    }

    var cached = null;
    try {
      cached = global.HFHotelBrainStore.getCached(cachedWorkspaceId || undefined);
    } catch (err) {
      cached = null;
    }
    if (cached) return Promise.resolve(resolveDepartments(cached));

    return global.HFHotelBrainStore.load().then(function (result) {
      return resolveDepartments(result && result.profile ? result.profile : null);
    }).catch(function () {
      return fallback;
    });
  }

  global.HFMaintenanceStore = {
    ISSUES_TABLE: ISSUES_TABLE,
    UPDATES_TABLE: UPDATES_TABLE,
    DEFAULT_DEPARTMENTS: DEFAULT_DEPARTMENTS.slice(),
    STATUS_LABELS: STATUS_LABELS,
    PRIORITY_LABELS: PRIORITY_LABELS,
    CATEGORY_LABELS: CATEGORY_LABELS,
    LOCATION_TYPE_LABELS: LOCATION_TYPE_LABELS,
    UPDATE_TYPE_LABELS: UPDATE_TYPE_LABELS,
    UNRESOLVED_STATUSES: Object.keys(UNRESOLVED_STATUSES),
    MAX_NOTE_LENGTH: MAX_NOTE_LENGTH,
    init: init,
    refresh: refresh,
    getWorkspaceId: getWorkspaceId,
    listIssues: listIssues,
    getIssue: getIssue,
    getCachedIssues: getCachedIssues,
    createIssue: createIssue,
    listUpdates: listUpdates,
    getMetrics: getMetrics,
    isCloudAvailable: isCloudAvailable,
    isCacheStale: isCacheStale,
    loadDepartments: loadDepartments,
    formatError: formatError,
    clearTenantCache: clearTenantCache,
    validateCreatePayload: validateCreatePayload,
    addUpdate: addUpdate,
    updateStatus: updateStatus,
    updatePriority: updatePriority,
    updateAssignment: updateAssignment,
    updateDueDate: updateDueDate,
    completeIssue: completeIssue,
    reopenIssue: reopenIssue,
    setHandoverInclusion: setHandoverInclusion,
    formatTimelineAction: formatTimelineAction
  };
})(typeof window !== "undefined" ? window : globalThis);
