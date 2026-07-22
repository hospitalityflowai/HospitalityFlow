/**
 * Hospitality Flow — Hotel Brain cloud store (Phase 4)
 * One profile per hotel workspace in Supabase. Requires auth + hotel membership.
 * Local cache is scoped by workspace_id via HFTenantStorage.
 */
(function (global) {
  "use strict";

  var TABLE_NAME = "hotel_brain_profiles";
  var PROFILE_SCHEMA_VERSION = 4;
  var LOCAL_STORAGE_KEY = "hospitalityFlow_hotelProfile";

  var cachedProfile = null;
  var cachedHotelId = null;
  var cachedUserId = null;
  var loadPromise = null;
  var loadGeneration = 0;

  function tenantStorage() {
    return global.HFTenantStorage || null;
  }

  function ensureClient() {
    return global.HFAuth.ensureClient();
  }

  function getSession() {
    return global.HFAuth.getSession();
  }

  function getWorkspace() {
    return global.HFWorkspace.getUserWorkspace();
  }

  function trimText(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizeName(value) {
    return trimText(value).toLowerCase().replace(/\s+/g, " ");
  }

  function writeLocalProfile(profile, workspaceId) {
    if (!profile || typeof profile !== "object" || !workspaceId) return;
    var ts = tenantStorage();
    if (!ts) return;
    try {
      ts.setRaw(LOCAL_STORAGE_KEY, JSON.stringify(profile), workspaceId);
    } catch (err) {
      /* localStorage full or unavailable */
    }
  }

  function clearScopedLocalProfile(workspaceId) {
    var ts = tenantStorage();
    if (!ts || !workspaceId) return;
    ts.remove(LOCAL_STORAGE_KEY, workspaceId);
  }

  function profileHasContent(profile) {
    if (!profile || typeof profile !== "object") return false;
    if (profile.savedAt) return true;

    var general = profile.general || {};
    if (general.hotelName || general.hotelType || general.totalRooms) return true;
    if ((profile.departments || []).length) return true;
    if ((profile.rooms || []).length) return true;
    if ((profile.terminology || []).length) return true;

    var hk = profile.hotelKnowledge || {};
    if (Object.keys(hk).some(function (key) { return hk[key]; })) return true;

    var ok = profile.operationalKnowledge || {};
    if ((ok.knowledgeEntries || []).length) return true;
    if ((ok.handoverSources || []).length) return true;

    return false;
  }

  function namesRoughlyMatch(profileName, workspaceName) {
    var left = normalizeName(profileName);
    var right = normalizeName(workspaceName);
    if (!left || !right) return true;
    if (left === right) return true;
    if (left.indexOf(right) !== -1 || right.indexOf(left) !== -1) return true;
    return false;
  }

  function profileBelongsToWorkspace(profile, hotel) {
    if (!profile || !profileHasContent(profile)) return true;
    if (!hotel) return false;

    if (profile._workspaceHotelId && hotel.id && profile._workspaceHotelId !== hotel.id) {
      return false;
    }

    var profileName = profile.general && profile.general.hotelName;
    var workspaceName = hotel.name;
    if (!trimText(workspaceName)) return false;
    if (!trimText(profileName)) return false;

    return namesRoughlyMatch(profileName, workspaceName);
  }

  function stampProfileWorkspace(profile, hotelId) {
    var copy = JSON.parse(JSON.stringify(profile));
    copy._workspaceHotelId = hotelId;
    return copy;
  }

  function createEmptyProfile(hotel) {
    hotel = hotel || {};
    return stampProfileWorkspace({
      schemaVersion: PROFILE_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      general: {
        hotelName: hotel.name || "",
        hotelGroup: "",
        hotelCode: "",
        hotelType: hotel.property_type || "",
        starRating: "",
        totalRooms: hotel.number_of_rooms != null ? String(hotel.number_of_rooms) : "",
        totalFloors: "",
        address: "",
        city: hotel.city || "",
        country: hotel.country || "",
        phone: "",
        email: "",
        description: "",
        brandColor: "",
        logo: "",
        timezone: "",
        currency: "",
        brandVoice: "",
        operatingNotes: ""
      },
      rooms: [],
      petRooms: { room1: "", room2: "" },
      inventory: [],
      roomFacilities: [],
      departments: [],
      shifts: { pattern: "8hour", overnightSupport: "", rows: [] },
      terminology: [],
      aiPrefs: {
        tone: "professional",
        detail: "standard",
        language: "British English",
        dateFormat: "DD/MM/YYYY (24-hour)",
        instructions: ""
      },
      facilities: { checked: [], custom: "", customItems: [] },
      policies: {},
      policiesStructured: { guest: {}, payment: {}, operational: {}, custom: {} },
      otaPayment: {},
      otaChannels: [],
      guestServices: {
        loanItems: [],
        suppliers: []
      },
      supplies: [],
      operations: {
        morningEmailRecipients: []
      },
      operationsTrackers: [],
      academy: {
        enabled: false,
        contentSources: { sops: false, policies: false, rooms: false, operations: false }
      },
      hotelKnowledge: {},
      operationalKnowledge: {
        schemaVersion: 1,
        handoverSources: [],
        dailyMetrics: [],
        knowledgeEntries: [],
        shiftWorkflows: {},
        sampleDataRegistry: [],
        sampleDataLoaded: {}
      }
    }, hotel.id || "");
  }

  function formatError(error) {
    if (!error) return "Something went wrong. Please try again.";
    if (typeof error === "string") return error;

    var msg = error.message || String(error);

    if (error === "NOT_AUTHENTICATED") {
      return "Sign in to access Hotel Brain cloud sync.";
    }
    if (error === "NOT_APPROVED") {
      return global.HFPlatformAccess && global.HFPlatformAccess.NOT_APPROVED_MESSAGE
        ? global.HFPlatformAccess.NOT_APPROVED_MESSAGE
        : "Your Hospitality Flow access has not been approved yet.";
    }
    if (error === "NO_WORKSPACE") {
      return "Create your hotel workspace on the Account page before using Hotel Brain.";
    }
    if (error === "SUPABASE_NOT_CONFIGURED") {
      return "Supabase is not configured. Copy js/supabase-config.example.js to js/supabase-config.js and add your project keys.";
    }
    if (/row-level security|permission denied|42501/i.test(msg)) {
      return "Hotel Brain sync is not permitted. Run supabase/migrations/phase4_hotel_brain.sql in Supabase.";
    }
    if (/hotel_brain_profiles|relation.*does not exist|42P01/i.test(msg)) {
      return "Hotel Brain database setup incomplete. Run supabase/migrations/phase4_hotel_brain.sql in Supabase.";
    }
    if (/cannot coerce the result to a single JSON object|PGRST116|JSON object requested, multiple/i.test(msg)) {
      return "Hotel Brain saved but could not be confirmed from the server. Refresh the page to verify.";
    }

    return global.HFAuth.formatError(error);
  }

  function setCache(hotelId, profile, userId) {
    cachedHotelId = hotelId || null;
    cachedUserId = userId || null;
    cachedProfile = profile ? JSON.parse(JSON.stringify(profile)) : null;
    if (cachedProfile && cachedHotelId) {
      writeLocalProfile(cachedProfile, cachedHotelId);
    }
  }

  function getCached(expectedHotelId) {
    if (!cachedProfile || !cachedHotelId) {
      return null;
    }
    if (expectedHotelId && cachedHotelId !== expectedHotelId) {
      return null;
    }
    return JSON.parse(JSON.stringify(cachedProfile));
  }

  function getCachedHotelId() {
    return cachedHotelId;
  }

  function clearTenantCache() {
    cachedProfile = null;
    cachedHotelId = null;
    cachedUserId = null;
    loadPromise = null;
  }

  function invalidateLoads() {
    loadGeneration += 1;
    clearTenantCache();
  }

  function purgeLegacyStorage() {
    if (tenantStorage()) {
      tenantStorage().clearLegacyKeys();
    }
  }

  function requireAuthAndWorkspace() {
    if (global.HospitalityFlowSupabase && !global.HospitalityFlowSupabase.isConfigured()) {
      return Promise.reject("SUPABASE_NOT_CONFIGURED");
    }

    purgeLegacyStorage();

      return getSession().then(function (session) {
      if (!session) {
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
            workspaceId: null
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
          hotelId: workspace.hotel.id,
          hotel: workspace.hotel,
          userId: session.user.id
        };
      });
    });
    });
  }

  function upsertProfile(client, hotelId, profileData) {
    return client
      .from(TABLE_NAME)
      .upsert(
        {
          hotel_id: hotelId,
          profile_data: profileData,
          schema_version: profileData.schemaVersion || PROFILE_SCHEMA_VERSION
        },
        { onConflict: "hotel_id" }
      )
      .select("profile_data")
      .maybeSingle()
      .then(function (response) {
        if (response.error) {
          return Promise.reject(response.error);
        }
        if (response.data && response.data.profile_data) {
          return response.data.profile_data;
        }
        return profileData;
      });
  }

  function fetchProfile(client, hotelId) {
    return client
      .from(TABLE_NAME)
      .select("profile_data, schema_version, updated_at")
      .eq("hotel_id", hotelId)
      .maybeSingle()
      .then(function (response) {
        if (response.error) {
          return Promise.reject(response.error);
        }
        return response.data || null;
      });
  }

  function resolveProfileForWorkspace(ctx, row, client, generation) {
    if (generation !== loadGeneration) {
      return Promise.reject(new Error("STALE_LOAD"));
    }

    if (row && row.profile_data && typeof row.profile_data === "object") {
      if (profileBelongsToWorkspace(row.profile_data, ctx.hotel)) {
        var accepted = stampProfileWorkspace(row.profile_data, ctx.hotelId);
        setCache(ctx.hotelId, accepted, ctx.userId);
        return {
          profile: getCached(ctx.hotelId),
          hotelId: ctx.hotelId,
          created: false,
          updatedAt: row.updated_at || null,
          isolated: true
        };
      }

      console.warn(
        "[HFHotelBrainStore] Discarded cross-workspace profile for hotel",
        ctx.hotelId
      );
      clearScopedLocalProfile(ctx.hotelId);
    }

    var emptyProfile = createEmptyProfile(ctx.hotel);
    return upsertProfile(client, ctx.hotelId, emptyProfile).then(function (saved) {
      if (generation !== loadGeneration) {
        return Promise.reject(new Error("STALE_LOAD"));
      }
      var normalized = stampProfileWorkspace(saved || emptyProfile, ctx.hotelId);
      setCache(ctx.hotelId, normalized, ctx.userId);
      return {
        profile: getCached(ctx.hotelId),
        hotelId: ctx.hotelId,
        created: true,
        updatedAt: null,
        reset: !!(row && row.profile_data),
        isolated: true
      };
    });
  }

  function load(options) {
    options = options || {};
    if (loadPromise && !options.force) {
      return loadPromise;
    }

    var generation = ++loadGeneration;
    clearTenantCache();

    loadPromise = requireAuthAndWorkspace()
      .then(function (ctx) {
        if (generation !== loadGeneration) {
          return Promise.reject(new Error("STALE_LOAD"));
        }

        return ensureClient().then(function (client) {
          return fetchProfile(client, ctx.hotelId).then(function (row) {
            return resolveProfileForWorkspace(ctx, row, client, generation);
          });
        });
      })
      .catch(function (err) {
        if (generation === loadGeneration) {
          clearTenantCache();
        }
        if (err === "NOT_AUTHENTICATED" || err === "NO_WORKSPACE" || err === "NOT_APPROVED" || err === "SUPABASE_NOT_CONFIGURED") {
          return { profile: null, error: err };
        }
        if (err && err.message === "STALE_LOAD") {
          return { profile: null, error: "STALE_LOAD" };
        }
        return Promise.reject(err);
      })
      .finally(function () {
        loadPromise = null;
      });

    return loadPromise;
  }

  function save(profileData, options) {
    options = options || {};

    if (!profileData || typeof profileData !== "object") {
      return Promise.reject(new Error("Invalid Hotel Brain profile data."));
    }

    var payload = JSON.parse(JSON.stringify(profileData));
    if (!payload.savedAt) {
      payload.savedAt = new Date().toISOString();
    }
    if (payload.schemaVersion == null) {
      payload.schemaVersion = PROFILE_SCHEMA_VERSION;
    }

    return requireAuthAndWorkspace()
      .then(function (ctx) {
        if (!profileBelongsToWorkspace(payload, ctx.hotel)) {
          return Promise.reject(new Error("Profile does not belong to the current workspace."));
        }
        payload = stampProfileWorkspace(payload, ctx.hotelId);
        return ensureClient().then(function (client) {
          setCache(ctx.hotelId, payload, ctx.userId);
          return upsertProfile(client, ctx.hotelId, payload).then(function (saved) {
            var normalized = stampProfileWorkspace(saved || payload, ctx.hotelId);
            setCache(ctx.hotelId, normalized, ctx.userId);
            return {
              profile: getCached(ctx.hotelId),
              hotelId: ctx.hotelId
            };
          });
        });
      });
  }

  function preload() {
    return load().catch(function (err) {
      if (!err || err.message !== "STALE_LOAD") {
        clearTenantCache();
      }
      return { profile: null };
    });
  }

  global.HFHotelBrainStore = {
    PROFILE_SCHEMA_VERSION: PROFILE_SCHEMA_VERSION,
    TABLE_NAME: TABLE_NAME,
    LOCAL_STORAGE_KEY: LOCAL_STORAGE_KEY,
    load: load,
    save: save,
    preload: preload,
    getCached: getCached,
    getCachedHotelId: getCachedHotelId,
    setCache: setCache,
    clearTenantCache: clearTenantCache,
    invalidateLoads: invalidateLoads,
    createEmptyProfile: createEmptyProfile,
    profileHasContent: profileHasContent,
    profileBelongsToWorkspace: profileBelongsToWorkspace,
    formatError: formatError
  };
})(window);
