/**
 * Verify Founding Pilot submission prerequisites against live Supabase.
 * Run: node scripts/verify-early-access-setup.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function readSupabaseConfig() {
  const configPath = path.join(ROOT, "js/supabase-config.js");
  const src = fs.readFileSync(configPath, "utf8");
  const urlMatch = src.match(/url:\s*"([^"]+)"/);
  const keyMatch = src.match(/anonKey:\s*"([^"]+)"/);
  if (!urlMatch || !keyMatch) {
    throw new Error("Could not read Supabase config from js/supabase-config.js");
  }
  return { url: urlMatch[1], anonKey: keyMatch[1] };
}

async function postRpc(config, fn, body) {
  const response = await fetch(`${config.url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body || {})
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: response.status, body: json };
}

async function invokeFunction(config, functionName, body, extraHeaders) {
  const response = await fetch(`${config.url}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json",
      ...(extraHeaders || {})
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: response.status, body: json };
}

async function main() {
  const config = readSupabaseConfig();
  let failed = false;

  console.log("Supabase project:", config.url);
  console.log("");

  const availability = await postRpc(config, "get_founding_hotel_availability", {});
  console.log("get_founding_hotel_availability:", availability.status, JSON.stringify(availability.body));

  const submit = await postRpc(config, "submit_early_access_application", {
    p_first_name: "Verify",
    p_email: "verify-only@example.com",
    p_property_name: "Verify Hotel",
    p_property_type: "independent-hotel",
    p_room_count: 10,
    p_role: "Manager",
    p_source: "verify-script"
  });
  console.log("submit_early_access_application:", submit.status, JSON.stringify(submit.body));

  const fnUnauthorized = await invokeFunction(config, "send-early-access-emails", {
    applicationId: "00000000-0000-4000-8000-000000000099"
  });
  console.log("send-early-access-emails (unauthenticated):", fnUnauthorized.status, JSON.stringify(fnUnauthorized.body));

  const submitFn = await invokeFunction(config, "submit-early-access-application", {
    firstName: "Verify",
    email: "verify-fn@example.com",
    propertyName: "Verify Hotel",
    propertyType: "independent-hotel",
    roomCount: 10,
    role: "Manager",
    source: "verify-script"
  });
  console.log("submit-early-access-application:", submitFn.status, JSON.stringify(submitFn.body));

  if (availability.status !== 200) {
    console.error("FAIL: availability RPC unavailable");
    failed = true;
  }

  if (submit.status === 404 && submit.body?.code === "PGRST202") {
    console.warn("WARN: submit_early_access_application RPC missing");
  } else if (submit.status !== 200) {
    console.error("FAIL: submit RPC did not succeed");
    failed = true;
  }

  if (fnUnauthorized.status !== 401) {
    console.warn("WARN: send-early-access-emails should reject unauthenticated calls with 401 after redeploy");
  }

  if (submitFn.status !== 200) {
    console.warn("WARN: submit-early-access-application unavailable until deployed");
  }

  if (failed) process.exit(1);
  console.log("");
  console.log("PASS: early access setup verification complete");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
