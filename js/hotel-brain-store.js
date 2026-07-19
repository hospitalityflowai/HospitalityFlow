/**
 * Hospitality Flow — Hotel Brain cloud store (Phase 4)
 * One profile per hotel workspace in Supabase. Requires auth + hotel membership.
 */
(function (global) {
  "use strict";

  var TABLE_NAME = "hotel_brain_profiles";
  var PROFILE_SCHEMA_VERSION = 4;

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
    if (/row-level security|permission denied|42501/i.test(msg)) {
      return "Hotel Brain sync is not permitted. Run supabase/migrations/phase4_hotel_brain.sql in Supabase.";
    }
    if (/hotel_brain_profiles|relation.*does not exist|42P01/i.test(msg)) {
      return "Hotel Brain database setup incomplete. Run supabase/migrations/phase4_hotel_brain.sql in Supabase.";
    }

    return global.HFAuth.formatError(error);
  }

  function setCache(hotelId, profile) {
    cachedHotelId = hotelId || null;
    cachedProfile = profile ? JSON.parse(JSON.stringify(profile)) : null;
  }

  function getCached() {
    return cachedProfile ? JSON.parse(JSON.stringify(cachedProfile)) : null;
  }

  function getCachedHotelId() {
    return cachedHotelId;
  }

  function requireAuthAndWorkspace() {
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
      .single()
      .then(function (response) {
        if (response.error) {
          return Promise.reject(response.error);
        }
        return response.data.profile_data;
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
        if (err === "NOT_AUTHENTICATED" || err === "NO_WORKSPACE") {
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
      return { profile: null };
    });
  }

  global.HFHotelBrainStore = {
    PROFILE_SCHEMA_VERSION: PROFILE_SCHEMA_VERSION,
    TABLE_NAME: TABLE_NAME,
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
