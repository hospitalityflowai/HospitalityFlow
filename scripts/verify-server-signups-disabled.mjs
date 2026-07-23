/**
 * Verify server-side Auth sign-ups are disabled on the linked Supabase project.
 * Run: node scripts/verify-server-signups-disabled.mjs
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PROJECT_REF = "aluxummorfhcswwpgqaf";

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

function readAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) {
    return process.env.SUPABASE_ACCESS_TOKEN;
  }

  const candidates = [
    path.join(process.env.LOCALAPPDATA || "", "supabase", "access-token"),
    path.join(process.env.APPDATA || "", "supabase", "access-token"),
    path.join(process.env.USERPROFILE || "", ".supabase", "access-token")
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, "utf8").trim();
    }
  }

  return null;
}

async function fetchAuthConfigFromManagementApi() {
  const token = readAccessToken();
  if (!token) return null;

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );

  if (!response.ok) {
    return { error: `Management API ${response.status}` };
  }

  return response.json();
}

async function probeSignupEndpoint(config) {
  const response = await fetch(`${config.url}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: `signup-probe-${Date.now()}@hospitalityflow.co.uk`,
      password: "RegressionProbe123!"
    })
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  return { status: response.status, body };
}

function readLocalAuthConfig() {
  const tomlPath = path.join(ROOT, "supabase/config.toml");
  const src = fs.readFileSync(tomlPath, "utf8");
  const globalDisabled = /\[auth\][\s\S]*?enable_signup\s*=\s*false/i.test(src);
  const emailDisabled = /\[auth\.email\][\s\S]*?enable_signup\s*=\s*false/i.test(src);
  return { globalDisabled, emailDisabled };
}

async function main() {
  let failed = false;
  const local = readLocalAuthConfig();

  if (!local.globalDisabled || !local.emailDisabled) {
    console.error("FAIL: supabase/config.toml must set auth.enable_signup = false");
    failed = true;
  } else {
    console.log("PASS: local config.toml disables public sign-ups");
  }

  const managementConfig = await fetchAuthConfigFromManagementApi();
  if (managementConfig && !managementConfig.error) {
    const disabled = managementConfig.enable_signup === false;
    console.log(
      "Management API enable_signup:",
      managementConfig.enable_signup,
      disabled ? "(disabled)" : "(ENABLED)"
    );
    if (!disabled) {
      console.error("FAIL: linked project still allows server-side sign-ups");
      failed = true;
    } else {
      console.log("PASS: linked project auth config has enable_signup = false");
    }
  } else {
    console.warn(
      "WARN: Could not read Management API auth config",
      managementConfig && managementConfig.error ? managementConfig.error : "(no access token)"
    );
    console.warn("WARN: Run `npx supabase login` then `npx supabase config push` if not yet applied.");
  }

  const config = readSupabaseConfig();
  const probe = await probeSignupEndpoint(config);
  const errorCode = probe.body && (probe.body.error_code || probe.body.code);
  const signupDisabled =
    errorCode === "signup_disabled" ||
    /signup.*not allowed|signups not allowed/i.test(JSON.stringify(probe.body || ""));

  console.log("Signup probe:", probe.status, JSON.stringify(probe.body));

  if (signupDisabled) {
    console.log("PASS: Auth signup endpoint rejects public registration");
  } else if (probe.status >= 200 && probe.status < 300 && probe.body && probe.body.id) {
    console.error("FAIL: Auth signup endpoint created a user — disable sign-ups in Dashboard/CLI");
    failed = true;
  } else if (errorCode === "email_address_invalid") {
    console.warn("WARN: Signup probe inconclusive (email validation rejected test address)");
  } else if (!failed) {
    console.warn("WARN: Signup probe inconclusive — confirm Dashboard setting manually");
  }

  try {
    execSync("npx supabase projects list", {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8"
    });
    console.log("PASS: Supabase CLI authenticated for linked project");
  } catch (err) {
    console.warn("WARN: Supabase CLI not authenticated:", err.message || err);
  }

  if (failed) process.exit(1);
  console.log("\nServer sign-up verification complete.");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
