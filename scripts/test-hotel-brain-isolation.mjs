/**
 * Hotel Brain cross-account isolation checks (static + mocked runtime).
 * Run: node scripts/test-hotel-brain-isolation.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message) {
  console.error("FAIL:", message);
  return false;
}

function pass(message) {
  console.log("PASS:", message);
  return true;
}

function loadHotelBrainStore(options) {
  options = options || {};
  var sessionUserId = options.sessionUserId || "user-a";
  var workspace = options.workspace || null;
  var fetchRow = options.fetchRow || null;
  var upsertCalls = [];

  var tenantContext = { userId: sessionUserId, workspaceId: null };
  var localStore = {};

  var context = {
    window: {},
    console,
    Date,
    JSON,
    Promise,
    Object,
    Array,
    String,
    Math,
    Error
  };

  context.window.HFTenantStorage = {
    readTenantContext: function () {
      return tenantContext.userId
        ? { userId: tenantContext.userId, workspaceId: tenantContext.workspaceId }
        : null;
    },
    writeTenantContext: function (ctx) {
      tenantContext = ctx || { userId: null, workspaceId: null };
    },
    updateTenantWorkspace: function (workspaceId) {
      if (tenantContext.userId) tenantContext.workspaceId = workspaceId || null;
    },
    setRaw: function (key, value, scopeId) {
      localStore[key + "_" + scopeId] = value;
    },
    remove: function (key, scopeId) {
      delete localStore[key + "_" + scopeId];
    },
    clearLegacyKeys: function () {
      delete localStore.hospitalityFlow_hotelProfile;
    }
  };

  context.window.HFAuth = {
    ensureClient: function () {
      return Promise.resolve({
        from: function () {
          return {
            select: function () {
              return {
                eq: function () {
                  return {
                    maybeSingle: function () {
                      return Promise.resolve({ data: fetchRow, error: null });
                    }
                  };
                }
              };
            },
            upsert: function (payload) {
              upsertCalls.push(payload);
              return {
                select: function () {
                  return {
                    maybeSingle: function () {
                      return Promise.resolve({
                        data: { profile_data: payload.profile_data },
                        error: null
                      });
                    }
                  };
                }
              };
            }
          };
        }
      });
    },
    getSession: function () {
      return Promise.resolve(
        sessionUserId ? { user: { id: sessionUserId } } : null
      );
    }
  };

  context.window.HFWorkspace = {
    getUserWorkspace: function () {
      return Promise.resolve(workspace);
    }
  };

  context.window.HospitalityFlowSupabase = {
    isConfigured: function () {
      return true;
    }
  };

  vm.createContext(context);
  vm.runInContext(read("js/hotel-brain-store.js"), context);
  return {
    store: context.window.HFHotelBrainStore,
    upsertCalls: upsertCalls,
    localStore: localStore,
    setWorkspace: function (ws) {
      workspace = ws;
    },
    setFetchRow: function (row) {
      fetchRow = row;
    },
    setSessionUserId: function (id) {
      sessionUserId = id;
    },
    setTenantUser: function (id) {
      tenantContext = { userId: id, workspaceId: null };
    }
  };
}

async function testRuntimeIsolation() {
  var ok = true;
  var zetterProfile = {
    schemaVersion: 4,
    savedAt: "2026-01-01T00:00:00.000Z",
    general: { hotelName: "The Zetter Marylebone", totalRooms: "50" },
    departments: [{ name: "Night Team" }],
    rooms: [],
    terminology: [],
    hotelKnowledge: {},
    operationalKnowledge: { knowledgeEntries: [] }
  };

  var hotelA = {
    id: "hotel-zetter-id",
    name: "The Zetter Marylebone",
    property_type: "boutique-hotel",
    number_of_rooms: 50,
    city: "London",
    country: "UK"
  };
  var hotelB = {
    id: "hotel-55-id",
    name: "Hotel 55",
    property_type: "boutique-hotel",
    number_of_rooms: 15,
    city: "Paris",
    country: "France"
  };

  var env = loadHotelBrainStore({
    sessionUserId: "user-a",
    workspace: { role: "owner", hotel: hotelA },
    fetchRow: { profile_data: zetterProfile, updated_at: "2026-01-01T00:00:00.000Z" }
  });

  var resultA = await env.store.load();
  if (!resultA.profile || resultA.profile.general.hotelName !== "The Zetter Marylebone") {
    ok = fail("User A should load Zetter profile from Supabase") && ok;
  } else {
    pass("User A loads Zetter profile");
  }

  if (env.store.getCached("hotel-zetter-id") == null) {
    ok = fail("Expected cached Zetter profile for hotel-zetter-id") && ok;
  } else {
    pass("In-memory cache scoped to Zetter hotel id");
  }

  env.store.invalidateLoads();
  env.setSessionUserId("user-b");
  env.setTenantUser("user-b");
  env.setWorkspace({ role: "owner", hotel: hotelB });
  env.setFetchRow({
    profile_data: zetterProfile,
    updated_at: "2026-01-01T00:00:00.000Z"
  });

  var resultB = await env.store.load();
  if (env.store.getCached("hotel-zetter-id")) {
    ok = fail("User B must not retain User A in-memory cache") && ok;
  } else {
    pass("Account switch clears cross-hotel in-memory cache");
  }

  if (
    resultB.profile &&
    /zetter/i.test(resultB.profile.general && resultB.profile.general.hotelName)
  ) {
    ok = fail("User B must never receive Zetter profile content") && ok;
  } else {
    pass("Polluted Supabase row is discarded for User B workspace");
  }

  if (!resultB.profile || resultB.profile.general.hotelName !== "Hotel 55") {
    ok = fail("User B should receive a blank Hotel 55 profile") && ok;
  } else {
    pass("User B receives workspace-scoped blank profile");
  }

  if (env.store.getCached("hotel-55-id") == null) {
    ok = fail("User B cache should exist for hotel-55-id after load") && ok;
  } else {
    pass("User B cache keyed to hotel-55-id only");
  }

  if (env.store.getCached("hotel-zetter-id")) {
    ok = fail("getCached(hotel-zetter-id) must return null for User B") && ok;
  } else {
    pass("getCached rejects mismatched hotel id");
  }

  return ok;
}

function testStaticGuards() {
  var ok = true;
  var storeSrc = read("js/hotel-brain-store.js");

  if (/updateTenantWorkspace\(cachedHotelId\)/.test(storeSrc)) {
    ok = fail("setCache must not call updateTenantWorkspace(cachedHotelId)") && ok;
  } else {
    pass("setCache does not poison tenant workspace context");
  }

  if (!/invalidateLoads/.test(storeSrc) || !/loadGeneration/.test(storeSrc)) {
    ok = fail("Missing stale-load generation guards in hotel-brain-store.js") && ok;
  } else {
    pass("Stale in-flight load guards present");
  }

  if (/readLocalProfile/.test(storeSrc)) {
    ok = fail("Legacy readLocalProfile fallback must not exist in load path") && ok;
  } else {
    pass("No legacy local profile read in store");
  }

  var offenders = [];
  ["handover.html", "sop.html", "hotel-profile.html", "account.html"].forEach(function (file) {
    var src = read(file);
    if (/getCached\(\s*\)/.test(src)) {
      offenders.push(file);
    }
    if (/hotel-profile\.html\?/.test(src)) {
      offenders.push(file + " (query param hotel id)");
    }
  });

  if (offenders.length) {
    ok = fail("Unscoped getCached() or hotel id in URL: " + offenders.join(", ")) && ok;
  } else {
    pass("No unscoped getCached() in Hotel Brain entry pages");
  }

  if (!/invalidateLoads/.test(read("js/auth.js"))) {
    ok = fail("auth.js should invalidate Hotel Brain loads on tenant clear") && ok;
  } else {
    pass("Sign-out clears Hotel Brain in-memory state");
  }

  if (!/requireAuth\(\)/.test(read("hotel-profile.html"))) {
    ok = fail("hotel-profile.html must gate load behind requireAuth()") && ok;
  } else {
    pass("hotel-profile.html waits for auth before load()");
  }

  return ok;
}

async function main() {
  var ok = testStaticGuards();
  ok = (await testRuntimeIsolation()) && ok;

  if (ok) {
    console.log("\nAll Hotel Brain isolation checks passed.");
    process.exit(0);
  }

  console.error("\nHotel Brain isolation checks failed.");
  process.exit(1);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
