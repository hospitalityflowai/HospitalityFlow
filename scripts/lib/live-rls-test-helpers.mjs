/**
 * Helpers for live RLS isolation tests.
 * Uses Supabase Auth + PostgREST over fetch (no service_role in browser code).
 * Never logs secrets, passwords, JWTs, or service-role keys.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..");

/** Known production project ref — suite must never target this. */
export const PRODUCTION_PROJECT_REFS = Object.freeze(["aluxummorfhcswwpgqaf"]);

export const HOTEL_NAME_PREFIX = "HF_RLS_TEST_";
export const MARKER_PREFIX = "hf-rls-isolation";

const REQUIRED_ENV = [
  "HF_RLS_TEST_ENV",
  "HF_RLS_TEST_SUPABASE_URL",
  "HF_RLS_TEST_ANON_KEY",
  "HF_RLS_TEST_SERVICE_ROLE_KEY",
  "HF_RLS_TEST_HOTEL_A_OWNER_EMAIL",
  "HF_RLS_TEST_HOTEL_A_OWNER_PASSWORD",
  "HF_RLS_TEST_HOTEL_B_OWNER_EMAIL",
  "HF_RLS_TEST_HOTEL_B_OWNER_PASSWORD",
  "HF_RLS_TEST_OPERATOR_EMAIL",
  "HF_RLS_TEST_OPERATOR_PASSWORD",
  "HF_RLS_TEST_REVOKED_EMAIL",
  "HF_RLS_TEST_REVOKED_PASSWORD"
];

const OPTIONAL_ENV = [
  "HF_RLS_TEST_HOTEL_A_STAFF_EMAIL",
  "HF_RLS_TEST_HOTEL_A_STAFF_PASSWORD"
];

export function loadEnvFiles(extraPaths = []) {
  const candidates = [
    path.join(REPO_ROOT, ".env.rls-test"),
    path.join(REPO_ROOT, ".env.rls-test.local"),
    path.join(REPO_ROOT, ".env.local"),
    ...extraPaths
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const text = fs.readFileSync(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null || process.env[key] === "") {
        process.env[key] = value;
      }
    }
  }
}

export function maskSecret(value) {
  if (value == null || value === "") return "(empty)";
  const s = String(value);
  if (s.length <= 8) return "********";
  return s.slice(0, 3) + "…" + s.slice(-2) + ` (len=${s.length})`;
}

export function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname;
    const match = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return match ? match[1].toLowerCase() : host;
  } catch {
    return "";
  }
}

export function assertSafeTestEnvironment(env = process.env) {
  const errors = [];

  const envFlag = String(env.HF_RLS_TEST_ENV || "").trim();
  if (envFlag !== "non-production") {
    errors.push(
      envFlag
        ? `HF_RLS_TEST_ENV must be exactly "non-production" (got a non-matching value). Refusing to run.`
        : 'HF_RLS_TEST_ENV must be exactly "non-production". Refusing to run against an unmarked project.'
    );
  }

  for (const key of REQUIRED_ENV) {
    if (key === "HF_RLS_TEST_ENV") continue;
    if (!String(env[key] || "").trim()) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  const url = String(env.HF_RLS_TEST_SUPABASE_URL || "").trim();
  if (url) {
    if (!/^https:\/\//i.test(url)) {
      errors.push("HF_RLS_TEST_SUPABASE_URL must be an https:// URL.");
    }
    const ref = projectRefFromUrl(url);
    if (PRODUCTION_PROJECT_REFS.includes(ref)) {
      errors.push(
        `Refusing production project ref "${ref}". Use a dedicated non-production Supabase project.`
      );
    }
    // Never silently fall back to js/supabase-config.js / production build env.
    if (env.SUPABASE_URL && String(env.SUPABASE_URL).trim() === url) {
      // Same URL as build env is allowed only when HF_RLS_TEST_ENV gate passed and
      // production ref denylist passed — still warn via return value.
    }
  }

  const anon = String(env.HF_RLS_TEST_ANON_KEY || "");
  const service = String(env.HF_RLS_TEST_SERVICE_ROLE_KEY || "");
  if (anon && service && anon === service) {
    errors.push(
      "HF_RLS_TEST_ANON_KEY and HF_RLS_TEST_SERVICE_ROLE_KEY must be different keys."
    );
  }

  if (errors.length) {
    const err = new Error(errors.join("\n"));
    err.code = "HF_RLS_ENV_UNSAFE";
    err.errors = errors;
    throw err;
  }

  return {
    url,
    anonKey: String(env.HF_RLS_TEST_ANON_KEY).trim(),
    serviceRoleKey: String(env.HF_RLS_TEST_SERVICE_ROLE_KEY).trim(),
    projectRef: projectRefFromUrl(url),
    accounts: {
      hotelAOwner: {
        email: env.HF_RLS_TEST_HOTEL_A_OWNER_EMAIL.trim(),
        password: env.HF_RLS_TEST_HOTEL_A_OWNER_PASSWORD
      },
      hotelBOwner: {
        email: env.HF_RLS_TEST_HOTEL_B_OWNER_EMAIL.trim(),
        password: env.HF_RLS_TEST_HOTEL_B_OWNER_PASSWORD
      },
      operator: {
        email: env.HF_RLS_TEST_OPERATOR_EMAIL.trim(),
        password: env.HF_RLS_TEST_OPERATOR_PASSWORD
      },
      revoked: {
        email: env.HF_RLS_TEST_REVOKED_EMAIL.trim(),
        password: env.HF_RLS_TEST_REVOKED_PASSWORD
      },
      hotelAStaff:
        env.HF_RLS_TEST_HOTEL_A_STAFF_EMAIL && env.HF_RLS_TEST_HOTEL_A_STAFF_PASSWORD
          ? {
              email: env.HF_RLS_TEST_HOTEL_A_STAFF_EMAIL.trim(),
              password: env.HF_RLS_TEST_HOTEL_A_STAFF_PASSWORD
            }
          : null
    }
  };
}

export function extractErrorFields(body) {
  if (body == null) return { code: "", message: "" };
  if (typeof body === "string") {
    return { code: "", message: body.slice(0, 180) };
  }
  const code = String(
    body.code || body.error_code || body.error || body.statusCode || ""
  );
  const message = String(
    body.message ||
      body.msg ||
      body.error_description ||
      body.msg_code ||
      (typeof body.error === "string" ? body.error : "") ||
      ""
  );
  return { code, message };
}

export function summarizeHttpError(status, body) {
  const { code, message } = extractErrorFields(body);
  const parts = [`HTTP ${status == null ? "?" : status}`];
  if (code) parts.push(`[${code}]`);
  if (message) parts.push(String(message).slice(0, 160));
  return parts.join(" ");
}

/** Redacted diagnostic for harness logs — never includes secrets/JWTs/passwords. */
export function formatResultDiagnostic(result, label = "request") {
  if (!result) return `${label}: no result object`;
  const status = result.status == null ? "?" : result.status;
  const { code, message } = extractErrorFields(result.body);
  const bits = [
    `${label}`,
    `status=${status}`,
    code ? `code=${code}` : null,
    message ? `message=${JSON.stringify(String(message).slice(0, 160))}` : null,
    result.networkError ? "networkError=true" : null,
    result.ok === true ? "ok=true" : "ok=false"
  ].filter(Boolean);
  return bits.join(" ");
}

export class HarnessSetupError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "HarnessSetupError";
    this.code = "HF_RLS_HARNESS_SETUP";
    this.details = details || null;
  }
}

function normalizeAuthUser(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.id && (payload.email != null || payload.phone != null)) {
    return payload;
  }
  if (payload.user && payload.user.id) return payload.user;
  return null;
}

function emailDomain(email) {
  const parts = String(email || "").split("@");
  return parts.length === 2 ? parts[1] : "(unknown)";
}

export function isRlsDenial(result) {
  if (!result) return false;
  if (result.ok === false) {
    const status = result.status;
    if (status === 401 || status === 403) return true;
    const body = result.body || {};
    const code = String(body.code || body.error_code || "");
    const msg = String(body.message || body.msg || body.error || "").toLowerCase();
    if (code === "42501" || code === "PGRST301") return true;
    if (/row-level security|permission denied|not authorized|jwt/i.test(msg)) return true;
  }
  return false;
}

export function isEmptySelect(result) {
  return !!(result && result.ok && Array.isArray(result.body) && result.body.length === 0);
}

export function isDeniedOrEmpty(result) {
  return isRlsDenial(result) || isEmptySelect(result);
}

/**
 * Minimal Supabase Auth + PostgREST client for Node.
 * accessToken: user JWT or service role key.
 */
export function createRestClient({ url, apikey, accessToken }) {
  const base = String(url || "").replace(/\/$/, "");
  const token = accessToken || apikey;

  async function request(method, pathname, options = {}) {
    const headers = {
      apikey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    let target = `${base}${pathname}`;
    if (options.query) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(options.query)) {
        if (v == null) continue;
        qs.set(k, String(v));
      }
      const s = qs.toString();
      if (s) target += (target.includes("?") ? "&" : "?") + s;
    }

    let response;
    try {
      response = await fetch(target, {
        method,
        headers,
        body: options.body != null ? JSON.stringify(options.body) : undefined
      });
    } catch (networkErr) {
      const body = {
        message: networkErr && networkErr.message
          ? networkErr.message
          : "Network request failed"
      };
      return {
        ok: false,
        networkError: true,
        status: 0,
        body,
        summary: summarizeHttpError(0, body)
      };
    }

    const text = await response.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { message: text.slice(0, 300) };
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      body,
      summary: summarizeHttpError(response.status, body)
    };
  }

  async function adminListUsersPage(page, perPage) {
    return request(
      "GET",
      `/auth/v1/admin/users?page=${page}&per_page=${perPage}`
    );
  }

  async function adminFindUserByEmail(email) {
    const normalized = String(email).trim().toLowerCase();
    const perPage = 200;
    const maxPages = 25;
    let scanned = 0;

    for (let page = 1; page <= maxPages; page += 1) {
      const list = await adminListUsersPage(page, perPage);
      if (!list.ok) {
        throw new HarnessSetupError(
          `Admin list users failed while searching for an existing account (@${emailDomain(normalized)}).`,
          formatResultDiagnostic(list, "admin.listUsers")
        );
      }

      const users = (list.body && list.body.users) || [];
      if (!Array.isArray(users) || users.length === 0) {
        break;
      }

      scanned += users.length;
      const match = users.find(
        (u) => String(u.email || "").toLowerCase() === normalized
      );
      if (match) {
        return { user: match, scanned, page };
      }

      if (users.length < perPage) break;
    }

    return { user: null, scanned, page: null };
  }

  return {
    url: base,
    async validateAdminAccess() {
      const probe = await adminListUsersPage(1, 1);
      if (!probe.ok) {
        if (probe.networkError || probe.status === 0) {
          let host = "(invalid-url)";
          try {
            host = new URL(base).host;
          } catch {
            /* ignore */
          }
          throw new HarnessSetupError(
            `Cannot reach Supabase Auth admin API at host "${host}". Check HF_RLS_TEST_SUPABASE_URL (Project Settings → API → Project URL) and network/DNS.`,
            formatResultDiagnostic(probe, "admin.validate")
          );
        }
        throw new HarnessSetupError(
          "Service-role/admin Auth access failed. Confirm HF_RLS_TEST_SERVICE_ROLE_KEY is the test project's service_role key (not anon).",
          formatResultDiagnostic(probe, "admin.validate")
        );
      }
      const users = (probe.body && probe.body.users) || [];
      if (!Array.isArray(users)) {
        throw new HarnessSetupError(
          "Admin list users returned an unexpected payload shape (expected { users: [] }).",
          formatResultDiagnostic(probe, "admin.validate")
        );
      }
      return {
        ok: true,
        sampleCount: users.length,
        diagnostic: "admin.listUsers status=200 ok=true"
      };
    },

    async signInWithPassword(email, password) {
      const result = await request("POST", "/auth/v1/token?grant_type=password", {
        body: { email, password }
      });
      if (!result.ok) {
        throw new HarnessSetupError(
          `Sign-in failed for test account (@${emailDomain(email)}).`,
          formatResultDiagnostic(result, "auth.signIn")
        );
      }
      const accessTokenJwt = result.body && result.body.access_token;
      const user = result.body && result.body.user;
      if (!accessTokenJwt || !user || !user.id) {
        throw new HarnessSetupError(
          `Sign-in response missing access_token or user.id (@${emailDomain(email)}).`,
          formatResultDiagnostic(result, "auth.signIn")
        );
      }
      return {
        accessToken: accessTokenJwt,
        user,
        client: createRestClient({ url: base, apikey, accessToken: accessTokenJwt })
      };
    },

    /**
     * Lookup-first Auth user ensure.
     * Reuses existing users; creates only when genuinely absent.
     * Returns { user, created, reused }.
     */
    async adminEnsureUser(email, password) {
      const normalized = String(email).trim().toLowerCase();
      const domain = emailDomain(normalized);

      const found = await adminFindUserByEmail(normalized);
      let existing = found.user;
      let created = false;

      if (existing) {
        // Align password with suite env so later sign-in is deterministic.
        const updated = await request("PUT", `/auth/v1/admin/users/${existing.id}`, {
          body: {
            password,
            email_confirm: true,
            user_metadata: Object.assign({}, existing.user_metadata || {}, {
              hf_rls_test: true
            })
          }
        });
        if (!updated.ok) {
          throw new HarnessSetupError(
            `Found existing Auth user (@${domain}) but admin password/confirm update failed.`,
            formatResultDiagnostic(updated, "admin.updateUser")
          );
        }
        const updatedUser = normalizeAuthUser(updated.body) || existing;
        return {
          user: updatedUser,
          created: false,
          reused: true,
          userId: updatedUser.id,
          emailDomain: domain
        };
      }

      const createResult = await request("POST", "/auth/v1/admin/users", {
        body: {
          email: normalized,
          password,
          email_confirm: true,
          user_metadata: { hf_rls_test: true }
        }
      });

      if (createResult.ok) {
        const createdUser = normalizeAuthUser(createResult.body);
        if (!createdUser || !createdUser.id) {
          throw new HarnessSetupError(
            `Admin create user succeeded but response had no user id (@${domain}).`,
            formatResultDiagnostic(createResult, "admin.createUser")
          );
        }
        created = true;
        return {
          user: createdUser,
          created: true,
          reused: false,
          userId: createdUser.id,
          emailDomain: domain
        };
      }

      const fields = extractErrorFields(createResult.body);
      const already =
        createResult.status === 422 ||
        createResult.status === 409 ||
        /already|exists|registered|duplicate/i.test(fields.message || fields.code || "");

      if (already) {
        // Race / filter miss: re-scan and reuse.
        const again = await adminFindUserByEmail(normalized);
        if (again.user) {
          return {
            user: again.user,
            created: false,
            reused: true,
            userId: again.user.id,
            emailDomain: domain
          };
        }
        throw new HarnessSetupError(
          `Admin create reported existing user (@${domain}), but lookup still found no match after scanning Auth users.`,
          formatResultDiagnostic(createResult, "admin.createUser")
        );
      }

      throw new HarnessSetupError(
        `Admin create user failed (@${domain}).`,
        formatResultDiagnostic(createResult, "admin.createUser")
      );
    },

    async adminEnsureOperator(userId, email) {
      const existing = await request("GET", "/rest/v1/platform_operators", {
        query: {
          select: "user_id",
          user_id: `eq.${userId}`
        }
      });
      if (existing.ok && Array.isArray(existing.body) && existing.body.length) {
        return existing.body[0];
      }
      if (!existing.ok) {
        throw new HarnessSetupError(
          "Failed to query platform_operators during harness setup.",
          formatResultDiagnostic(existing, "platform_operators.select")
        );
      }
      const inserted = await request("POST", "/rest/v1/platform_operators", {
        headers: { Prefer: "return=representation" },
        body: { user_id: userId, email: String(email).toLowerCase() }
      });
      if (!inserted.ok) {
        throw new HarnessSetupError(
          "Insert platform_operators failed during harness setup.",
          formatResultDiagnostic(inserted, "platform_operators.insert")
        );
      }
      return Array.isArray(inserted.body) ? inserted.body[0] : inserted.body;
    },

    async adminEnsurePlatformAccess(userId, email, status = "active") {
      const byUser = await request("GET", "/rest/v1/platform_access", {
        query: { select: "id,user_id,access_status", user_id: `eq.${userId}` }
      });
      if (!byUser.ok) {
        throw new HarnessSetupError(
          "Failed to query platform_access during harness setup.",
          formatResultDiagnostic(byUser, "platform_access.select")
        );
      }
      if (Array.isArray(byUser.body) && byUser.body.length) {
        const row = byUser.body[0];
        if (row.access_status !== status) {
          const patched = await request("PATCH", `/rest/v1/platform_access?id=eq.${row.id}`, {
            body: { access_status: status, email: String(email).toLowerCase() }
          });
          if (!patched.ok) {
            throw new HarnessSetupError(
              "Failed to update platform_access during harness setup.",
              formatResultDiagnostic(patched, "platform_access.patch")
            );
          }
        }
        return row;
      }

      const inserted = await request("POST", "/rest/v1/platform_access", {
        headers: { Prefer: "return=representation" },
        body: {
          user_id: userId,
          email: String(email).toLowerCase(),
          access_status: status
        }
      });
      if (!inserted.ok) {
        // Unique email conflict — patch by email.
        const byEmail = await request("GET", "/rest/v1/platform_access", {
          query: {
            select: "id,user_id,access_status",
            email: `eq.${String(email).toLowerCase()}`
          }
        });
        if (byEmail.ok && Array.isArray(byEmail.body) && byEmail.body[0]) {
          const id = byEmail.body[0].id;
          const patched = await request("PATCH", `/rest/v1/platform_access?id=eq.${id}`, {
            body: {
              user_id: userId,
              access_status: status,
              email: String(email).toLowerCase()
            }
          });
          if (!patched.ok) {
            throw new HarnessSetupError(
              "Failed to link platform_access by email during harness setup.",
              formatResultDiagnostic(patched, "platform_access.patchByEmail")
            );
          }
          return byEmail.body[0];
        }
        throw new HarnessSetupError(
          "Insert platform_access failed during harness setup.",
          formatResultDiagnostic(inserted, "platform_access.insert")
        );
      }
      return Array.isArray(inserted.body) ? inserted.body[0] : inserted.body;
    },

    rest: request,

    async select(table, query = {}) {
      return request("GET", `/rest/v1/${table}`, {
        query: { select: "*", ...query }
      });
    },

    async insert(table, row, options = {}) {
      return request("POST", `/rest/v1/${table}`, {
        headers: {
          Prefer: options.returnRepresentation === false
            ? "return=minimal"
            : "return=representation",
          ...(options.headers || {})
        },
        body: row
      });
    },

    async update(table, filters, patch) {
      const query = { ...filters };
      return request("PATCH", `/rest/v1/${table}`, {
        headers: { Prefer: "return=representation" },
        query,
        body: patch
      });
    },

    async delete(table, filters) {
      return request("DELETE", `/rest/v1/${table}`, {
        headers: { Prefer: "return=representation" },
        query: filters
      });
    },

    async rpc(fnName, args = {}) {
      return request("POST", `/rest/v1/rpc/${fnName}`, { body: args });
    }
  };
}

export function createReporter() {
  const results = [];

  function record(scenario, expected, actual, passed, detail = "") {
    const row = {
      scenario,
      expected,
      actual,
      status: passed ? "PASS" : "FAIL",
      detail: detail || ""
    };
    results.push(row);
    const line = [
      row.status,
      scenario,
      `| expected: ${expected}`,
      `| actual: ${actual}`,
      detail ? `| ${detail}` : ""
    ]
      .filter(Boolean)
      .join(" ");
    if (passed) console.log(line);
    else console.error(line);
    return passed;
  }

  function pass(scenario, expected, actual, detail) {
    return record(scenario, expected, actual, true, detail);
  }

  function fail(scenario, expected, actual, detail) {
    return record(scenario, expected, actual, false, detail);
  }

  function assert(scenario, expected, actual, condition, detail) {
    return condition
      ? pass(scenario, expected, actual, detail)
      : fail(scenario, expected, actual, detail);
  }

  function summary() {
    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;
    return { passed, failed, total: results.length, results };
  }

  return { record, pass, fail, assert, summary, results };
}

export function makeRunId() {
  const now = new Date();
  const stamp = now
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${stamp}_${rand}`;
}

export function hotelName(kind, runId) {
  return `${HOTEL_NAME_PREFIX}${kind}_${runId}`;
}

export function marker(kind, runId) {
  return `${MARKER_PREFIX}:${kind}:${runId}`;
}

/**
 * Configuration check for password-reset DEV mode.
 * Does not call Edge Functions or print secret values.
 */
export function verifyPasswordResetDevModeConfig(env = process.env) {
  const findings = [];

  // Explicit env flags (names only — values never printed if secret-like).
  const relaxedEnvKeys = [
    "PASSWORD_RESET_DEV_RELAXED",
    "HF_PASSWORD_RESET_DEV_RELAXED",
    "PASSWORD_RESET_DEV_MODE"
  ];
  let envEnabled = false;
  let envUnset = true;
  for (const key of relaxedEnvKeys) {
    if (env[key] == null || env[key] === "") continue;
    envUnset = false;
    const val = String(env[key]).trim().toLowerCase();
    if (val === "true" || val === "1" || val === "yes") {
      envEnabled = true;
      findings.push(`${key} is set to an enabling value`);
    } else if (val === "false" || val === "0" || val === "no") {
      findings.push(`${key} is explicitly false`);
    } else {
      findings.push(`${key} is set (non-boolean)`);
    }
  }

  const keyEnvKeys = ["PASSWORD_RESET_DEV_KEY", "HF_PASSWORD_RESET_DEV_KEY"];
  for (const key of keyEnvKeys) {
    if (env[key] != null && String(env[key]).trim() !== "") {
      envUnset = false;
      findings.push(`${key} is present in the local environment`);
      // Presence of a non-empty key alone is suspicious for production machines.
      if (!envEnabled) {
        findings.push(`${key} present without relaxed=false confirmation`);
      }
    }
  }

  // Local browser flag file (gitignored).
  const flagsPath = path.join(REPO_ROOT, "js", "dev-flags.js");
  let flagsState = "absent";
  if (fs.existsSync(flagsPath)) {
    const src = fs.readFileSync(flagsPath, "utf8");
    if (/PASSWORD_RESET_DEV_RELAXED\s*:\s*true/.test(src)) {
      flagsState = "enabled";
      envEnabled = true;
      findings.push("js/dev-flags.js sets PASSWORD_RESET_DEV_RELAXED: true");
    } else if (/PASSWORD_RESET_DEV_RELAXED\s*:\s*false/.test(src)) {
      flagsState = "disabled";
      findings.push("js/dev-flags.js sets PASSWORD_RESET_DEV_RELAXED: false");
    } else {
      flagsState = "present-unknown";
      findings.push("js/dev-flags.js exists but relaxed flag could not be parsed");
    }
  } else {
    findings.push("js/dev-flags.js absent (good for production builds)");
  }

  // Edge Function secrets cannot be read without Management API credentials.
  const canVerifyEdgeSecrets = !!(
    env.SUPABASE_ACCESS_TOKEN ||
    env.HF_RLS_TEST_SUPABASE_ACCESS_TOKEN
  );
  let edgeState = "cannot_verify";
  if (!canVerifyEdgeSecrets) {
    findings.push(
      "Edge Function secrets (PASSWORD_RESET_DEV_RELAXED / PASSWORD_RESET_DEV_KEY) cannot be verified automatically without a Supabase management access token"
    );
  } else {
    findings.push(
      "Management token present — Edge secret verification is out of band for this suite (manual dashboard check still required)"
    );
    edgeState = "cannot_verify";
  }

  let verdict;
  if (envEnabled || flagsState === "enabled") {
    verdict = "enabled — launch blocker";
  } else if (!canVerifyEdgeSecrets) {
    // Local signals look safe, but production Edge secrets are unknown.
    verdict =
      envUnset && flagsState === "absent"
        ? "cannot verify automatically"
        : "cannot verify automatically";
  } else {
    verdict = "cannot verify automatically";
  }

  // If local flags explicitly false/absent and no enabling env — report safely unset for *local* only.
  if (
    !envEnabled &&
    (flagsState === "absent" || flagsState === "disabled") &&
    envUnset
  ) {
    // Still cannot prove Edge secrets — prefer cannot verify unless HF_RLS_TEST_ASSUME_LOCAL_ONLY=1
    if (String(env.HF_RLS_TEST_ASSUME_LOCAL_DEV_FLAGS_ONLY || "") === "1") {
      verdict = "safely unset";
    } else {
      verdict = "cannot verify automatically";
      findings.push(
        "Local DEV flags appear unset; set HF_RLS_TEST_ASSUME_LOCAL_DEV_FLAGS_ONLY=1 to treat local-only check as safely unset (Edge secrets still need a manual dashboard check)"
      );
    }
  }

  return {
    verdict,
    flagsState,
    edgeState,
    findings,
    // Never include secret values
    checkedKeys: [...relaxedEnvKeys, ...keyEnvKeys, "js/dev-flags.js"]
  };
}

export function describeConfigSafely(config) {
  return {
    env: "non-production",
    projectRef: config.projectRef,
    urlHost: (() => {
      try {
        return new URL(config.url).host;
      } catch {
        return "(invalid)";
      }
    })(),
    anonKey: maskSecret(config.anonKey),
    serviceRoleKey: maskSecret(config.serviceRoleKey),
    accounts: Object.fromEntries(
      Object.entries(config.accounts).map(([k, v]) => [
        k,
        v ? { emailDomain: String(v.email).split("@")[1] || "(none)", hasPassword: !!v.password } : null
      ])
    )
  };
}

export { REQUIRED_ENV, OPTIONAL_ENV };
