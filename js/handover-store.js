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
  var LOCAL_DRAFT_PREFIX = "hf_handover_draft_v1";
  var LEGACY_DRAFT_KEY = "hf_handover_draft_v1";

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

  function readLocalSaved() {
    try {
      var raw = localStorage.getItem(LOCAL_SAVED_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function writeLocalSaved(list) {
    try {
      localStorage.setItem(LOCAL_SAVED_KEY, JSON.stringify(list));
    } catch (err) {
      /* localStorage unavailable */
    }
  }

  function draftStorageKey(workspaceId) {
    if (workspaceId) return LOCAL_DRAFT_PREFIX + "_" + workspaceId;
    return LEGACY_DRAFT_KEY;
  }

  function readLocalDraft(workspaceId) {
    try {
      var key = draftStorageKey(workspaceId);
      var raw = localStorage.getItem(key);
      if (!raw && workspaceId) {
        raw = localStorage.getItem(LEGACY_DRAFT_KEY);
      }
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (err) {
      return null;
    }
  }

  function writeLocalDraft(workspaceId, draft) {
    try {
      if (!draft) {
        localStorage.removeItem(draftStorageKey(workspaceId));
        if (workspaceId) localStorage.removeItem(LEGACY_DRAFT_KEY);
        return;
      }
      localStorage.setItem(draftStorageKey(workspaceId), JSON.stringify(draft));
    } catch (err) {
      /* localStorage unavailable */
    }
  }

  function requireAuthAndWorkspace() {
    if (global.HospitalityFlowSupabase && !global.HospitalityFlowSupabase.isConfigured()) {
      return Promise.reject("SUPABASE_NOT_CONFIGURED");
    }

    return getSession().then(function (session) {
      if (!session || !session.user) {
        return Promise.reject("NOT_AUTHENTICATED");
      }
      return getWorkspace().then(function (workspace) {
        if (!workspace || !workspace.hotel || !workspace.hotel.id) {
          return Promise.reject("NO_WORKSPACE");
        }
        return {
          session: session,
          workspace: workspace,
          workspaceId: workspace.hotel.id,
          userId: session.user.id
        };
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

  function recordToRow(record, ctx, status) {
    var generated = {
      organisedHandover: record.organisedHandover || {},
      aiSummary: record.aiSummary || "",
      dateDisplay: record.dateDisplay || "",
      timestamp: record.timestamp || new Date().toISOString(),
      dashboardMetrics: record.dashboardMetrics || {},
      hotelSnapshot: record.hotelSnapshot || {},
      originalNotes: record.originalNotes || "",
      date: record.date || null
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
      metrics: {
        dashboardMetrics: record.dashboardMetrics || {},
        hotelSnapshot: record.hotelSnapshot || {}
      },
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
        if (err === "NOT_AUTHENTICATED" || err === "NO_WORKSPACE" || err === "SUPABASE_NOT_CONFIGURED") {
          cachedWorkspaceId = null;
          cachedUserId = null;
          cachedSavedHandovers = readLocalSaved();
          setCloudSyncActive(false, err);
          return {
            workspaceId: null,
            savedHandovers: cachedSavedHandovers.slice(),
            draft: readLocalDraft(null),
            cloud: false,
            error: err
          };
        }

        console.error("[HFHandoverStore] init failed:", formatError(err));
        cachedSavedHandovers = readLocalSaved();
        setCloudSyncActive(false, err);
        return {
          workspaceId: cachedWorkspaceId,
          savedHandovers: cachedSavedHandovers.slice(),
          draft: readLocalDraft(cachedWorkspaceId),
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
    return readLocalSaved();
  }

  function getCachedDraft() {
    return readLocalDraft(cachedWorkspaceId);
  }

  function saveHandover(record) {
    if (!record) {
      return Promise.resolve({ cloud: false, record: null, message: "Nothing to save." });
    }

    var localRecord = Object.assign({}, record);
    if (!localRecord.id) {
      localRecord.id = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    }

    var localList = readLocalSaved();
    localList.unshift(localRecord);
    writeLocalSaved(localList);

    return requireAuthAndWorkspace()
      .then(function (ctx) {
        cachedWorkspaceId = ctx.workspaceId;
        cachedUserId = ctx.userId;

        return ensureClient().then(function (client) {
          var row = recordToRow(localRecord, ctx, STATUS_SAVED);
          return client
            .from(TABLE_NAME)
            .insert(row)
            .select("*")
            .maybeSingle()
            .then(function (response) {
              if (response.error) {
                return Promise.reject(response.error);
              }

              var savedRecord = rowToRecord(response.data);
              cachedSavedHandovers.unshift(savedRecord);

              var localList = readLocalSaved();
              var replaced = false;
              localList = localList.map(function (item) {
                if (item.id === localRecord.id) {
                  replaced = true;
                  return Object.assign({}, savedRecord);
                }
                return item;
              });
              if (!replaced) {
                localList.unshift(savedRecord);
              }
              writeLocalSaved(localList);

              setCloudSyncActive(true);

              return {
                cloud: true,
                record: savedRecord,
                message: "Saved to your hotel workspace"
              };
            });
        });
      })
      .catch(function (err) {
        console.error("[HFHandoverStore] saveHandover failed:", formatError(err));
        setCloudSyncActive(false, err);

        if (!cachedSavedHandovers.length) {
          cachedSavedHandovers = localList.slice();
        } else {
          var exists = cachedSavedHandovers.some(function (item) { return item.id === localRecord.id; });
          if (!exists) cachedSavedHandovers.unshift(localRecord);
        }

        return {
          cloud: false,
          record: localRecord,
          message: "Saved on this device. Cloud sync unavailable.",
          error: err
        };
      });
  }

  function deleteHandover(id) {
    var localList = readLocalSaved().filter(function (item) { return item.id !== id; });
    writeLocalSaved(localList);
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
    var localRecords = readLocalSaved();
    if (!localRecords.length) {
      return Promise.resolve({ uploaded: 0, skipped: 0, cloud: false, message: "No local handovers to upload." });
    }

    return requireAuthAndWorkspace()
      .then(function (ctx) {
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
    writeLocalSaved(Array.isArray(list) ? list : []);
    if (!cloudSyncActive) {
      cachedSavedHandovers = readLocalSaved();
    }
  }

  function loadAllLocal() {
    return readLocalSaved();
  }

  global.HFHandoverStore = {
    TABLE_NAME: TABLE_NAME,
    LOCAL_SAVED_KEY: LOCAL_SAVED_KEY,
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
    formatError: formatError
  };
})(window);
