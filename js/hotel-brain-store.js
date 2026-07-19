/**
 * Hospitality Flow — Hotel Brain cloud store (Phase 4)
 * One profile per hotel workspace in Supabase. Requires auth + hotel membership.
 * Keeps hospitalityFlow_hotelProfile in localStorage as a cache for backwards compatibility.
 */
(function (global) {
  "use strict";

  var TABLE_NAME = "hotel_brain_profiles";
  var PROFILE_SCHEMA_VERSION = 4;
  var LOCAL_STORAGE_KEY = "hospitalityFlow_hotelProfile";

  var cachedProfile = null;
  var cachedHotelId = null;
  var loadPromise = null;

  function ensureClient() {
    return global.HFAuth.ensureClient();
  }

  function getSession() {
    return global.HFAuth.getSession();
  }

  function getWorkspace() {
    return global.HFWorkspace.getUserWorkspace();
  }

  function readLocalProfile() {
    try {
      var raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch (err) {
      return null;
    }
  }

  function writeLocalProfile(profile) {
    if (!profile || typeof profile !== "object") return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
    } catch (err) {
      /* localStorage full or unavailable */
    }
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

  function createEmptyProfile(hotel) {
    hotel = hotel || {};
    return {
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
    };
  }

  function formatError(error) {
    if (!error) return "Something went wrong. Please try again.";
    if (typeof error === "string") return error;

    var msg = error.message || String(error);

    if (error === "NOT_AUTHENTICATED") {
      return "Sign in to access Hotel Brain cloud sync.";
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

  function setCache(hotelId, profile) {
    cachedHotelId = hotelId || null;
    cachedProfile = profile ? JSON.parse(JSON.stringify(profile)) : null;
    if (cachedProfile) {
      writeLocalProfile(cachedProfile);
    }
  }

  function getCached() {
    if (cachedProfile) {
      return JSON.parse(JSON.stringify(cachedProfile));
    }
    return readLocalProfile();
  }

  function getCachedHotelId() {
    return cachedHotelId;
  }

  function requireAuthAndWorkspace() {
    if (global.HospitalityFlowSupabase && !global.HospitalityFlowSupabase.isConfigured()) {
      return Promise.reject("SUPABASE_NOT_CONFIGURED");
    }

    return getSession().then(function (session) {
      if (!session) {
        return Promise.reject("NOT_AUTHENTICATED");
      }
      return getWorkspace().then(function (workspace) {
        if (!workspace || !workspace.hotel || !workspace.hotel.id) {
          return Promise.reject("NO_WORKSPACE");
        }
        return {
          session: session,
          workspace: workspace,
          hotelId: workspace.hotel.id,
          hotel: workspace.hotel
        };
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

  function load(options) {
    options = options || {};
    if (loadPromise && !options.force) {
      return loadPromise;
    }

    loadPromise = requireAuthAndWorkspace()
      .then(function (ctx) {
        return ensureClient().then(function (client) {
          return fetchProfile(client, ctx.hotelId).then(function (row) {
            if (row && row.profile_data && typeof row.profile_data === "object") {
              setCache(ctx.hotelId, row.profile_data);
              return {
                profile: getCached(),
                hotelId: ctx.hotelId,
                created: false,
                updatedAt: row.updated_at || null
              };
            }

            var localProfile = readLocalProfile();
            if (profileHasContent(localProfile)) {
              return upsertProfile(client, ctx.hotelId, localProfile).then(function (saved) {
                setCache(ctx.hotelId, saved || localProfile);
                return {
                  profile: getCached(),
                  hotelId: ctx.hotelId,
                  created: false,
                  migratedFromLocal: true,
                  updatedAt: null
                };
              });
            }

            var emptyProfile = createEmptyProfile(ctx.hotel);
            return upsertProfile(client, ctx.hotelId, emptyProfile).then(function (saved) {
              setCache(ctx.hotelId, saved || emptyProfile);
              return {
                profile: getCached(),
                hotelId: ctx.hotelId,
                created: true,
                updatedAt: null
              };
            });
          });
        });
      })
      .catch(function (err) {
        if (err === "NOT_AUTHENTICATED" || err === "NO_WORKSPACE" || err === "SUPABASE_NOT_CONFIGURED") {
          var localProfile = readLocalProfile();
          if (localProfile) {
            setCache(null, localProfile);
            return { profile: getCached(), error: err, offline: true };
          }
          setCache(null, null);
          return { profile: null, error: err };
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

    writeLocalProfile(payload);

    return requireAuthAndWorkspace()
      .then(function (ctx) {
        return ensureClient().then(function (client) {
          setCache(ctx.hotelId, payload);
          return upsertProfile(client, ctx.hotelId, payload).then(function (saved) {
            setCache(ctx.hotelId, saved || payload);
            return {
              profile: getCached(),
              hotelId: ctx.hotelId
            };
          });
        });
      });
  }

  function preload() {
    return load().catch(function () {
      var localProfile = readLocalProfile();
      if (localProfile) {
        setCache(null, localProfile);
        return { profile: getCached(), offline: true };
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
    createEmptyProfile: createEmptyProfile,
    formatError: formatError
  };
})(window);
