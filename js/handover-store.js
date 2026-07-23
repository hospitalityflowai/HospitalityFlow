/**
 * Hospitality Flow — Shift Handover cloud store (Phase 7)
 * Saved handovers and workspace drafts in Supabase. Local storage remains as offline fallback.
 */
(function (global) {
  "use strict";

  var TABLE_NAME = "handover_reports";
  var STATUS_SAVED = "saved";
  var STATUS_DRAFT = "draft";
  var LOCAL_SAVED_KEY = "hf_saved_handovers";
  var LOCAL_DRAFT_KEY = "hf_handover_draft_v1";
  var LAST_BACKUP_KEY = "hf_handover_last_backup";

  var cachedWorkspaceId = null;
  var cachedUserId = null;
  var cachedSavedHandovers = [];
  var cloudSyncActive = false;
  var lastCloudError = null;
  var syncStatusListeners = [];
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

  function notifySyncStatus() {
    syncStatusListeners.forEach(function (listener) {
      try {
        listener(getSyncStatus());
      } catch (err) {
        /* ignore listener errors */
      }
    });
  }

  function setCloudSyncActive(active, error) {
    cloudSyncActive = !!active;
    lastCloudError = error || null;
    notifySyncStatus();
  }

  function formatError(error) {
    if (!error) return "Something went wrong. Please try again.";
    if (typeof error === "string") return error;

    var msg = error.message || String(error);

    if (error === "NOT_AUTHENTICATED") {
      return "Sign in to sync handovers to your hotel workspace.";
    }
    if (error === "NOT_APPROVED") {
      return global.HFPlatformAccess && global.HFPlatformAccess.NOT_APPROVED_MESSAGE
        ? global.HFPlatformAccess.NOT_APPROVED_MESSAGE
        : "Your Hospitality Flow access has not been approved yet.";
    }
    if (error === "NO_WORKSPACE") {
      return "Create your hotel workspace on the Account page before cloud handover sync.";
    }
    if (error === "SUPABASE_NOT_CONFIGURED") {
      return "Supabase is not configured. Copy js/supabase-config.example.js to js/supabase-config.js and add your project keys.";
    }
    if (/row-level security|permission denied|42501/i.test(msg)) {
      return "Handover sync is not permitted. Run supabase/migrations/phase7_handover_reports.sql in Supabase.";
    }
    if (/handover_reports|relation.*does not exist|42P01/i.test(msg)) {
      return "Handover database setup incomplete. Run supabase/migrations/phase7_handover_reports.sql in Supabase.";
    }
    if (/JWT expired|invalid JWT|session/i.test(msg)) {
      return "Your session has expired. Please sign in again.";
    }

    return global.HFAuth.formatError(error);
  }

  function tenantStorage() {
    return global.HFTenantStorage || null;
  }

  function readLocalSaved(workspaceId) {
    if (!workspaceId) return [];
    var ts = tenantStorage();
    if (!ts) return [];
    try {
      var raw = ts.getRaw(LOCAL_SAVED_KEY, workspaceId);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function writeLocalSaved(list, workspaceId) {
    if (!workspaceId) return;
    var ts = tenantStorage();
    if (!ts) return;
    try {
      ts.setRaw(LOCAL_SAVED_KEY, JSON.stringify(list), workspaceId);
    } catch (err) {
      /* localStorage unavailable */
    }
  }

  function readLocalDraft(workspaceId) {
    if (!workspaceId) return null;
    var ts = tenantStorage();
    if (!ts) return null;
    try {
      var raw = ts.getRaw(LOCAL_DRAFT_KEY, workspaceId);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (err) {
      return null;
    }
  }

  function writeLocalDraft(workspaceId, draft) {
    if (!workspaceId) return;
    var ts = tenantStorage();
    if (!ts) return;
    if (!draft) {
      ts.remove(LOCAL_DRAFT_KEY, workspaceId);
      return;
    }
    try {
      ts.setRaw(LOCAL_DRAFT_KEY, JSON.stringify(draft), workspaceId);
    } catch (err) {
      /* localStorage unavailable */
    }
  }

  function readLastBackup(workspaceId) {
    if (!workspaceId) return null;
    var ts = tenantStorage();
    return ts ? ts.getRaw(LAST_BACKUP_KEY, workspaceId) : null;
  }

  function writeLastBackup(workspaceId, value) {
    if (!workspaceId || value == null) return;
    var ts = tenantStorage();
    if (ts) ts.setRaw(LAST_BACKUP_KEY, value, workspaceId);
  }

  function clearTenantCache() {
    cachedWorkspaceId = null;
    cachedUserId = null;
    cachedSavedHandovers = [];
    cloudSyncActive = false;
    lastCloudError = null;
    initPromise = null;
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
        : Promise.resolve({ allowed: true });

      return accessPromise.then(function (access) {
        if (!access.allowed) {
          return Promise.reject("NOT_APPROVED");
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

  function rowToRecord(row) {
    if (!row) return null;

    var generated = row.generated_handover && typeof row.generated_handover === "object"
      ? row.generated_handover
      : {};
    var metrics = row.metrics && typeof row.metrics === "object" ? row.metrics : {};

    return {
      id: row.id,
      cloudId: row.id,
      hotelName: row.hotel_name || generated.hotelName || "Not specified",
      department: row.department || "Not specified",
      preparedBy: row.prepared_by || "Not specified",
      shift: row.shift || "AM",
      date: row.handover_date || generated.date || "",
      dateDisplay: generated.dateDisplay || "",
      originalNotes: row.source_notes || generated.originalNotes || "",
      aiSummary: generated.aiSummary || "",
      dashboardMetrics: metrics.dashboardMetrics || generated.dashboardMetrics || {},
      organisedHandover: generated.organisedHandover || {},
      hotelSnapshot: metrics.hotelSnapshot || generated.hotelSnapshot || {},
      recommendations: Array.isArray(row.recommendation_state) ? row.recommendation_state : [],
      shiftIntelligenceChecklist: Array.isArray(row.checklist_state) ? row.checklist_state : [],
      timestamp: row.created_at || generated.timestamp || row.updated_at || new Date().toISOString(),
      updatedAt: row.updated_at || null,
      status: row.status || STATUS_SAVED,
      _source: "cloud"
    };
  }

  function sectionItemTexts(organised, sectionId) {
    var items = organised && organised[sectionId] ? organised[sectionId] : [];
    return items.map(function (item) {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object") return "";
      return item.text || item.original || item.content || item.label || "";
    }).filter(Boolean);
  }

  function buildMetricsPayload(record) {
    var snapshot = record.hotelSnapshot && typeof record.hotelSnapshot === "object"
      ? record.hotelSnapshot
      : {};
    var organised = record.organisedHandover && typeof record.organisedHandover === "object"
      ? record.organisedHandover
      : {};

    return {
      dashboardMetrics: record.dashboardMetrics || {},
      hotelSnapshot: snapshot,
      arrivals: snapshot.arrivals != null ? snapshot.arrivals : null,
      departures: snapshot.departures != null ? snapshot.departures : null,
      inHouseGuests: snapshot.inHouse != null ? snapshot.inHouse : null,
      occupancy: snapshot.occupancy != null ? snapshot.occupancy : null,
      adr: snapshot.adr != null ? snapshot.adr : null,
      roomsSold: snapshot.roomsSold != null ? snapshot.roomsSold : null,
      sections: {
        urgentIssues: sectionItemTexts(organised, "urgent"),
        vipGuests: sectionItemTexts(organised, "guest"),
        maintenanceIssues: sectionItemTexts(organised, "maintenance"),
        paymentIssues: sectionItemTexts(organised, "payments"),
        outstandingTasks: sectionItemTexts(organised, "tasks"),
        events: sectionItemTexts(organised, "events"),
        generalNotes: sectionItemTexts(organised, "general")
      }
    };
  }

  function recordToRow(record, ctx, status) {
    var generated = {
      organisedHandover: record.organisedHandover || {},
      aiSummary: record.aiSummary || "",
      dateDisplay: record.dateDisplay || "",
      timestamp: record.timestamp || new Date().toISOString(),
      dashboardMetrics: record.dashboardMetrics || {},
      hotelSnapshot: record.hotelSnapshot || {},
      originalNotes: record.originalNotes || "",
      date: record.date || null,
      sections: buildMetricsPayload(record).sections
    };

    if (record.id && !record.cloudId) {
      generated._migration = {
        localId: record.id,
        timestamp: record.timestamp || null
      };
    }

    return {
      workspace_id: ctx.workspaceId,
      user_id: ctx.userId,
      hotel_name: record.hotelName || null,
      department: record.department || null,
      shift: record.shift || null,
      handover_date: record.date || null,
      prepared_by: record.preparedBy || null,
      metrics: buildMetricsPayload(record),
      source_notes: record.originalNotes || null,
      generated_handover: generated,
      checklist_state: Array.isArray(record.shiftIntelligenceChecklist)
        ? record.shiftIntelligenceChecklist
        : [],
      recommendation_state: Array.isArray(record.recommendations)
        ? record.recommendations
        : [],
      status: status || STATUS_SAVED
    };
  }

  function draftPayloadToRow(payload, ctx) {
    return {
      workspace_id: ctx.workspaceId,
      user_id: ctx.userId,
      hotel_name: payload.hotelName || null,
      department: payload.department || null,
      shift: payload.shift || null,
      handover_date: payload.date || null,
      prepared_by: payload.preparedBy || null,
      metrics: {
        hotelSnapshot: payload.hotelSnapshot || {},
        dashboardMetrics: payload.dashboardMetrics || {}
      },
      source_notes: payload.notes || null,
      generated_handover: {
        hasGeneratedOutput: !!payload.hasGeneratedOutput,
        organisedHandover: payload.organisedHandover || {},
        aiSummary: payload.aiSummary || "",
        generatedTime: payload.generatedTime || "",
        savedAt: payload.savedAt || new Date().toISOString(),
        date: payload.date || null
      },
      checklist_state: Array.isArray(payload.shiftIntelligenceChecklist)
        ? payload.shiftIntelligenceChecklist
        : [],
      recommendation_state: Array.isArray(payload.recommendations)
        ? payload.recommendations
        : [],
      status: STATUS_DRAFT
    };
  }

  function rowToDraftPayload(row) {
    if (!row) return null;

    var generated = row.generated_handover && typeof row.generated_handover === "object"
      ? row.generated_handover
      : {};
    var metrics = row.metrics && typeof row.metrics === "object" ? row.metrics : {};

    return {
      savedAt: generated.savedAt || row.updated_at || row.created_at || new Date().toISOString(),
      hotelName: row.hotel_name || "",
      department: row.department || "",
      preparedBy: row.prepared_by || "",
      shift: row.shift || "AM",
      date: row.handover_date || generated.date || "",
      notes: row.source_notes || "",
      hotelSnapshot: metrics.hotelSnapshot || {},
      aiSummary: generated.aiSummary || "",
      generatedTime: generated.generatedTime || "",
      recommendations: Array.isArray(row.recommendation_state) ? row.recommendation_state : [],
      shiftIntelligenceChecklist: Array.isArray(row.checklist_state) ? row.checklist_state : [],
      hasGeneratedOutput: !!generated.hasGeneratedOutput,
      organisedHandover: generated.organisedHandover || {},
      dashboardMetrics: metrics.dashboardMetrics || generated.dashboardMetrics || {},
      _source: "cloud"
    };
  }

  function fetchSavedHandovers(client, workspaceId) {
    return client
      .from(TABLE_NAME)
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", STATUS_SAVED)
      .order("created_at", { ascending: false })
      .then(function (response) {
        if (response.error) {
          console.error("[HFHandoverStore] fetchSavedHandovers failed:", {
            workspaceId: workspaceId,
            message: response.error.message || String(response.error),
            code: response.error.code || null,
            details: response.error.details || null
          });
          return Promise.reject(response.error);
        }
        return (response.data || []).map(rowToRecord);
      });
  }

  function fetchDraft(client, workspaceId) {
    return client
      .from(TABLE_NAME)
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", STATUS_DRAFT)
      .maybeSingle()
      .then(function (response) {
        if (response.error) {
          return Promise.reject(response.error);
        }
        return response.data ? rowToDraftPayload(response.data) : null;
      });
  }

  function upsertDraft(client, workspaceId, payload, ctx) {
    return client
      .from(TABLE_NAME)
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("status", STATUS_DRAFT)
      .maybeSingle()
      .then(function (existingResponse) {
        if (existingResponse.error) {
          return Promise.reject(existingResponse.error);
        }

        var row = draftPayloadToRow(payload, ctx);
        if (existingResponse.data && existingResponse.data.id) {
          return client
            .from(TABLE_NAME)
            .update(row)
            .eq("id", existingResponse.data.id)
            .select("*")
            .maybeSingle()
            .then(function (updateResponse) {
              if (updateResponse.error) {
                return Promise.reject(updateResponse.error);
              }
              setCloudSyncActive(true);
              return rowToDraftPayload(updateResponse.data);
            });
        }

        return client
          .from(TABLE_NAME)
          .insert(row)
          .select("*")
          .maybeSingle()
          .then(function (insertResponse) {
            if (insertResponse.error) {
              return Promise.reject(insertResponse.error);
            }
            setCloudSyncActive(true);
            return rowToDraftPayload(insertResponse.data);
          });
      });
  }

  function deleteDraftFromCloud(client, workspaceId) {
    return client
      .from(TABLE_NAME)
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("status", STATUS_DRAFT)
      .then(function (response) {
        if (response.error) {
          return Promise.reject(response.error);
        }
        return true;
      });
  }

  function isDuplicateUpload(existingRecords, localRecord) {
    return existingRecords.some(function (existing) {
      var generated = existing.generated_handover && typeof existing.generated_handover === "object"
        ? existing.generated_handover
        : {};
      var migration = generated._migration;

      if (migration && migration.localId && migration.localId === localRecord.id) {
        return true;
      }

      var sameDate = (existing.handover_date || "") === (localRecord.date || "");
      var sameShift = (existing.shift || "") === (localRecord.shift || "");
      var sameDept = (existing.department || "") === (localRecord.department || "");
      var samePrepared = (existing.prepared_by || "") === (localRecord.preparedBy || "");

      if (!sameDate || !sameShift || !sameDept || !samePrepared) {
        return false;
      }

      if (migration && migration.timestamp && migration.timestamp === localRecord.timestamp) {
        return true;
      }

      if (generated.timestamp && localRecord.timestamp && generated.timestamp === localRecord.timestamp) {
        return true;
      }

      return false;
    });
  }

  function init(options) {
    options = options || {};
    if (initPromise && !options.force) {
      return initPromise;
    }

    initPromise = requireAuthAndWorkspace()
      .then(function (ctx) {
        cachedWorkspaceId = ctx.workspaceId;
        cachedUserId = ctx.userId;

        return ensureClient().then(function (client) {
          return Promise.all([
            fetchSavedHandovers(client, ctx.workspaceId),
            fetchDraft(client, ctx.workspaceId)
          ]).then(function (results) {
            cachedSavedHandovers = results[0] || [];
            setCloudSyncActive(true);
            return {
              workspaceId: ctx.workspaceId,
              savedHandovers: cachedSavedHandovers.slice(),
              draft: results[1] || null,
              cloud: true
            };
          });
        });
      })
      .catch(function (err) {
        clearTenantCache();
        setCloudSyncActive(false, err);
        if (err === "NOT_AUTHENTICATED" || err === "NO_WORKSPACE" || err === "NOT_APPROVED" || err === "SUPABASE_NOT_CONFIGURED") {
          return {
            workspaceId: null,
            savedHandovers: [],
            draft: null,
            cloud: false,
            error: err
          };
        }

        console.error("[HFHandoverStore] load history failed:", {
          message: formatError(err),
          error: err
        });
        return {
          workspaceId: null,
          savedHandovers: [],
          draft: null,
          cloud: false,
          error: err
        };
      })
      .finally(function () {
        initPromise = null;
      });

    return initPromise;
  }

  function reloadForWorkspace() {
    cachedSavedHandovers = [];
    return init({ force: true });
  }

  function getSavedHandovers() {
    if (cloudSyncActive) {
      return cachedSavedHandovers.slice();
    }
    if (cachedSavedHandovers.length) {
      return cachedSavedHandovers.slice();
    }
    if (cachedWorkspaceId) {
      return readLocalSaved(cachedWorkspaceId);
    }
    return [];
  }

  function getCachedDraft() {
    return readLocalDraft(cachedWorkspaceId);
  }

  function saveLocalFallback(localRecord) {
    if (!cachedWorkspaceId) return;
    var localList = readLocalSaved(cachedWorkspaceId);
    localList.unshift(localRecord);
    writeLocalSaved(localList, cachedWorkspaceId);

    if (!cloudSyncActive || !cachedSavedHandovers.length) {
      cachedSavedHandovers = localList.slice();
    } else {
      var exists = cachedSavedHandovers.some(function (item) { return item.id === localRecord.id; });
      if (!exists) cachedSavedHandovers.unshift(localRecord);
    }
  }

  var CLOUD_HANDOVER_ID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function resolveCloudHandoverId(record) {
    if (!record) return null;
    if (record.cloudId && CLOUD_HANDOVER_ID_RE.test(String(record.cloudId))) {
      return String(record.cloudId);
    }
    if (record.id && CLOUD_HANDOVER_ID_RE.test(String(record.id))) {
      return String(record.id);
    }
    return null;
  }

  function upsertCachedSavedRecord(savedRecord, previousId) {
    var replaced = false;
    cachedSavedHandovers = cachedSavedHandovers.map(function (item) {
      if (item.id === savedRecord.id || (previousId && item.id === previousId)) {
        replaced = true;
        return savedRecord;
      }
      return item;
    });
    if (!replaced) {
      cachedSavedHandovers.unshift(savedRecord);
    }
  }

  function saveHandover(record) {
    if (!record) {
      return Promise.resolve({ cloud: false, record: null, message: "Nothing to save." });
    }

    var localRecord = Object.assign({}, record);
    var cloudId = resolveCloudHandoverId(localRecord);
    if (cloudId) {
      localRecord.id = cloudId;
      localRecord.cloudId = cloudId;
    } else if (!localRecord.id) {
      localRecord.id = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    }

    return requireAuthAndWorkspace()
      .then(function (ctx) {
        cachedWorkspaceId = ctx.workspaceId;
        cachedUserId = ctx.userId;

        return ensureClient().then(function (client) {
          var row = recordToRow(localRecord, ctx, STATUS_SAVED);
          var previousId = localRecord.id;
          var query = cloudId
            ? client
              .from(TABLE_NAME)
              .update(row)
              .eq("id", cloudId)
              .eq("workspace_id", ctx.workspaceId)
              .eq("status", STATUS_SAVED)
            : client
              .from(TABLE_NAME)
              .insert(row);

          return query
            .select("*")
            .maybeSingle()
            .then(function (response) {
              if (response.error) {
                console.error("[HFHandoverStore] save handover failed:", {
                  workspaceId: ctx.workspaceId,
                  userId: ctx.userId,
                  cloudId: cloudId,
                  message: response.error.message || String(response.error),
                  code: response.error.code || null,
                  details: response.error.details || null
                });
                return Promise.reject(response.error);
              }

              var savedRecord = rowToRecord(response.data);
              upsertCachedSavedRecord(savedRecord, previousId);

              var localList = readLocalSaved(ctx.workspaceId);
              var replaced = false;
              localList = localList.map(function (item) {
                if (item.id === savedRecord.id || item.id === previousId) {
                  replaced = true;
                  return Object.assign({}, savedRecord);
                }
                return item;
              });
              if (!replaced) {
                localList.unshift(savedRecord);
              }
              writeLocalSaved(localList, ctx.workspaceId);

              setCloudSyncActive(true);

              return {
                cloud: true,
                record: savedRecord,
                updated: !!cloudId,
                message: cloudId ? "Updated in cloud" : "Saved to cloud"
              };
            });
        });
      })
      .catch(function (err) {
        console.error("[HFHandoverStore] saveHandover failed:", {
          message: formatError(err),
          error: err
        });
        setCloudSyncActive(false, err);
        saveLocalFallback(localRecord);

        return {
          cloud: false,
          record: localRecord,
          message: "Saved locally — not yet synced",
          error: err
        };
      });
  }

  function deleteHandover(id) {
    if (cachedWorkspaceId) {
      var localList = readLocalSaved(cachedWorkspaceId).filter(function (item) { return item.id !== id; });
      writeLocalSaved(localList, cachedWorkspaceId);
    }
    cachedSavedHandovers = cachedSavedHandovers.filter(function (item) {
      return item.id !== id && item.cloudId !== id;
    });

    if (!cloudSyncActive || !cachedWorkspaceId) {
      return Promise.resolve({ cloud: false });
    }

    return ensureClient()
      .then(function (client) {
        return client
          .from(TABLE_NAME)
          .delete()
          .eq("id", id)
          .eq("workspace_id", cachedWorkspaceId)
          .eq("status", STATUS_SAVED)
          .then(function (response) {
            if (response.error) {
              return Promise.reject(response.error);
            }
            setCloudSyncActive(true);
            return { cloud: true };
          });
      })
      .catch(function (err) {
        console.error("[HFHandoverStore] deleteHandover failed:", formatError(err));
        setCloudSyncActive(false, err);
        return { cloud: false, error: err };
      });
  }

  function saveDraft(payload, workspaceIdOverride) {
    var workspaceId = workspaceIdOverride || cachedWorkspaceId;
    writeLocalDraft(workspaceId, payload);

    if (!payload) {
      if (workspaceId && cloudSyncActive) {
        return ensureClient()
          .then(function (client) {
            return deleteDraftFromCloud(client, workspaceId);
          })
          .catch(function (err) {
            console.error("[HFHandoverStore] clearDraft cloud failed:", formatError(err));
            setCloudSyncActive(false, err);
            return { cloud: false };
          });
      }
      return Promise.resolve({ cloud: false, local: true });
    }

    return requireAuthAndWorkspace()
      .then(function (ctx) {
        cachedWorkspaceId = ctx.workspaceId;
        cachedUserId = ctx.userId;
        writeLocalDraft(ctx.workspaceId, payload);

        return ensureClient().then(function (client) {
          return upsertDraft(client, ctx.workspaceId, payload, ctx).then(function (savedDraft) {
            return { cloud: true, draft: savedDraft };
          });
        });
      })
      .catch(function (err) {
        if (err !== "NOT_AUTHENTICATED" && err !== "NO_WORKSPACE" && err !== "SUPABASE_NOT_CONFIGURED") {
          console.error("[HFHandoverStore] saveDraft failed:", formatError(err));
        }
        setCloudSyncActive(false, err);
        return { cloud: false, local: true, error: err };
      });
  }

  function loadDraft(options) {
    options = options || {};

    if (cloudSyncActive && cachedWorkspaceId && !options.preferLocal) {
      return ensureClient()
        .then(function (client) {
          return fetchDraft(client, cachedWorkspaceId).then(function (cloudDraft) {
            if (cloudDraft) {
              writeLocalDraft(cachedWorkspaceId, cloudDraft);
              return cloudDraft;
            }
            return readLocalDraft(cachedWorkspaceId);
          });
        })
        .catch(function () {
          return readLocalDraft(cachedWorkspaceId);
        });
    }

    return Promise.resolve(readLocalDraft(cachedWorkspaceId));
  }

  function clearDraft() {
    writeLocalDraft(cachedWorkspaceId, null);
    if (!cachedWorkspaceId || !cloudSyncActive) {
      return Promise.resolve({ cloud: false });
    }

    return ensureClient()
      .then(function (client) {
        return deleteDraftFromCloud(client, cachedWorkspaceId);
      })
      .then(function () {
        setCloudSyncActive(true);
        return { cloud: true };
      })
      .catch(function (err) {
        console.error("[HFHandoverStore] clearDraft failed:", formatError(err));
        setCloudSyncActive(false, err);
        return { cloud: false, error: err };
      });
  }

  function uploadLocalHandovers() {
    return requireAuthAndWorkspace()
      .then(function (ctx) {
        var localRecords = readLocalSaved(ctx.workspaceId);
        if (!localRecords.length) {
          return Promise.resolve({
            uploaded: 0,
            skipped: 0,
            cloud: true,
            message: "No local handovers to upload."
          });
        }

        return ensureClient().then(function (client) {
          return client
            .from(TABLE_NAME)
            .select("id, handover_date, shift, department, prepared_by, generated_handover")
            .eq("workspace_id", ctx.workspaceId)
            .eq("status", STATUS_SAVED)
            .then(function (existingResponse) {
              if (existingResponse.error) {
                return Promise.reject(existingResponse.error);
              }

              var existingRows = existingResponse.data || [];
              var toUpload = [];
              var skipped = 0;

              localRecords.forEach(function (localRecord) {
                if (isDuplicateUpload(existingRows, localRecord)) {
                  skipped += 1;
                  return;
                }
                toUpload.push(recordToRow(localRecord, ctx, STATUS_SAVED));
              });

              if (!toUpload.length) {
                setCloudSyncActive(true);
                return {
                  uploaded: 0,
                  skipped: skipped,
                  cloud: true,
                  message: skipped
                    ? skipped + " local handover(s) already in your workspace."
                    : "No new local handovers to upload."
                };
              }

              return client
                .from(TABLE_NAME)
                .insert(toUpload)
                .select("*")
                .then(function (insertResponse) {
                  if (insertResponse.error) {
                    return Promise.reject(insertResponse.error);
                  }

                  var inserted = (insertResponse.data || []).map(rowToRecord);
                  inserted.forEach(function (record) {
                    cachedSavedHandovers.unshift(record);
                  });
                  setCloudSyncActive(true);

                  return {
                    uploaded: inserted.length,
                    skipped: skipped,
                    cloud: true,
                    message: inserted.length + " handover(s) uploaded to your hotel workspace."
                      + (skipped ? " " + skipped + " duplicate(s) skipped." : "")
                  };
                });
            });
        });
      })
      .catch(function (err) {
        console.error("[HFHandoverStore] uploadLocalHandovers failed:", formatError(err));
        setCloudSyncActive(false, err);
        return Promise.reject(err);
      });
  }

  function getSyncStatus() {
    return {
      cloud: cloudSyncActive,
      label: cloudSyncActive ? "Cloud sync active" : "Offline mode — saved on this device",
      error: lastCloudError ? formatError(lastCloudError) : null,
      workspaceId: cachedWorkspaceId
    };
  }

  function onSyncStatusChange(listener) {
    if (typeof listener === "function") {
      syncStatusListeners.push(listener);
    }
  }

  function saveAllLocal(list) {
    if (!cachedWorkspaceId) return;
    writeLocalSaved(Array.isArray(list) ? list : [], cachedWorkspaceId);
    if (!cloudSyncActive) {
      cachedSavedHandovers = readLocalSaved(cachedWorkspaceId);
    }
  }

  function loadAllLocal() {
    if (!cachedWorkspaceId) return [];
    return readLocalSaved(cachedWorkspaceId);
  }

  global.HFHandoverStore = {
    TABLE_NAME: TABLE_NAME,
    LOCAL_SAVED_KEY: LOCAL_SAVED_KEY,
    LAST_BACKUP_KEY: LAST_BACKUP_KEY,
    init: init,
    reloadForWorkspace: reloadForWorkspace,
    getSavedHandovers: getSavedHandovers,
    saveHandover: saveHandover,
    deleteHandover: deleteHandover,
    saveDraft: saveDraft,
    loadDraft: loadDraft,
    clearDraft: clearDraft,
    uploadLocalHandovers: uploadLocalHandovers,
    getSyncStatus: getSyncStatus,
    onSyncStatusChange: onSyncStatusChange,
    saveAllLocal: saveAllLocal,
    loadAllLocal: loadAllLocal,
    readLastBackup: readLastBackup,
    writeLastBackup: writeLastBackup,
    clearTenantCache: clearTenantCache,
    formatError: formatError
  };
})(window);
