/**
 * Regression checks for handover Hotel Brain global fix and Supabase client singleton.
 * Run: node scripts/test-handover-browser-fixes.mjs
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

function simulateRoomFacilitiesGuard(profile, windowRef) {
  if (
    profile.roomFacilities &&
    profile.roomFacilities.length &&
    windowRef.HotelProfileOperational &&
    typeof windowRef.HotelProfileOperational.summarizeRoomFacilitiesForContext === "function"
  ) {
    return windowRef.HotelProfileOperational.summarizeRoomFacilitiesForContext(profile.roomFacilities);
  }
  return "";
}

function loadSupabaseClientModule() {
  var source = read("js/supabase-client.js").replace(/\}\)\(window\);[\s\S]*$/, "})(globalThis);");
  var createClientCalls = 0;
  var clients = [];

  globalThis.HF_SUPABASE_CONFIG = {
    url: "https://example-project.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-signature"
  };
  globalThis.supabase = {
    createClient: function (url, key, options) {
      createClientCalls += 1;
      var client = {
        __call: createClientCalls,
        url: url,
        key: key,
        options: options
      };
      clients.push(client);
      return client;
    }
  };
  globalThis.document = {
    querySelector: function () {
      return null;
    },
    head: {
      appendChild: function () {}
    }
  };

  vm.runInContext(source, vm.createContext(globalThis));

  return {
    api: globalThis.HospitalityFlowSupabase,
    getCreateClientCalls: function () {
      return createClientCalls;
    },
    getClients: function () {
      return clients.slice();
    },
    cleanup: function () {
      delete globalThis.HospitalityFlowSupabase;
      delete globalThis.HF_SUPABASE_CONFIG;
      delete globalThis.supabase;
      delete globalThis.document;
    }
  };
}

async function main() {
  var handover = read("handover.html");
  var supabaseClient = read("js/supabase-client.js");
  var failed = false;

  function fail(message) {
    console.error("FAIL:", message);
    failed = true;
  }

  function pass(message) {
    console.log("PASS:", message);
  }

  if (/global\.HotelProfileOperational/.test(handover)) {
    fail("handover.html must not reference global.HotelProfileOperational");
  } else {
    pass("handover.html uses window instead of bare global for HotelProfileOperational");
  }

  if (!/window\.HotelProfileOperational/.test(handover)) {
    fail("handover.html must reference window.HotelProfileOperational");
  } else {
    pass("window.HotelProfileOperational referenced in handover.html");
  }

  if (
    !/typeof window\.HotelProfileOperational\.summarizeRoomFacilitiesForContext === "function"/.test(
      handover
    )
  ) {
    fail("handover.html must guard summarizeRoomFacilitiesForContext with typeof");
  } else {
    pass("summarizeRoomFacilitiesForContext typeof guard present");
  }

  try {
    var missingFnResult = simulateRoomFacilitiesGuard(
      { roomFacilities: [{ roomNumber: "101" }] },
      { HotelProfileOperational: {} }
    );
    if (missingFnResult !== "") {
      fail("Missing summarizeRoomFacilitiesForContext should skip summary safely");
    } else {
      pass("Missing summarizeRoomFacilitiesForContext does not throw");
    }
  } catch (err) {
    fail("Missing summarizeRoomFacilitiesForContext threw: " + err.message);
  }

  if (!/if \(clientInstance\) \{[\s\S]*return Promise\.resolve\(clientInstance\)/.test(supabaseClient)) {
    fail("initClient must reuse existing clientInstance");
  } else {
    pass("initClient reuses existing clientInstance");
  }

  if (!/if \(clientInitPromise\)/.test(supabaseClient)) {
    fail("initClient must dedupe in-flight initialization");
  } else {
    pass("initClient dedupes in-flight initialization");
  }

  if (!/if \(!clientInstance\) \{[\s\S]*clientInstance = createClientInstance\(\)/.test(supabaseClient)) {
    fail("initClient must only create client when none exists");
  } else {
    pass("initClient creates client only when none exists");
  }

  var module = loadSupabaseClientModule();
  try {
    var first = await module.api.initClient();
    var second = await module.api.initClient();
    var third = await Promise.all([
      module.api.initClient(),
      module.api.initClient(),
      module.api.initClient()
    ]);

    if (!first || !second || third.some(function (client) { return !client; })) {
      fail("initClient should return a client for repeated calls");
    } else {
      pass("Repeated initClient() calls resolve successfully");
    }

    if (first !== second || third.some(function (client) { return client !== first; })) {
      fail("Repeated initClient() calls must return the same client instance");
    } else {
      pass("Repeated initClient() calls return the same client instance");
    }

    if (module.getCreateClientCalls() !== 1) {
      fail("Expected exactly one createClient() call, got " + module.getCreateClientCalls());
    } else {
      pass("Only one Supabase createClient() call occurs");
    }
  } catch (err) {
    fail("Supabase client singleton test failed: " + err.message);
  } finally {
    module.cleanup();
  }

  if (failed) process.exit(1);
  console.log("\nHandover browser fix checks passed.");
}

main();
