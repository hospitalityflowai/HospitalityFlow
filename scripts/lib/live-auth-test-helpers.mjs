/**
 * Helpers for the live Authentication Lifecycle Launch Gate (Audit 2 / F-03).
 * Reuses safety gates, redaction, and REST clients from the live RLS suite.
 * Never logs passwords, JWTs, refresh tokens, or API keys.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  REPO_ROOT,
  PRODUCTION_PROJECT_REFS,
  loadEnvFiles,
  maskSecret,
  projectRefFromUrl,
  assertSafeTestEnvironment,
  createRestClient,
  createReporter,
  makeRunId,
  isDeniedOrEmpty,
  isEmptySelect,
  isRlsDenial,
  HarnessSetupError,
  formatResultDiagnostic,
  describeConfigSafely,
  verifyPasswordResetDevModeConfig
} from "./live-rls-test-helpers.mjs";
import {
  resolveInternalRedirect,
  DEFAULT_POST_AUTH_ROUTE
} from "./safe-redirect.mjs";

export {
  REPO_ROOT,
  PRODUCTION_PROJECT_REFS,
  loadEnvFiles,
  maskSecret,
  projectRefFromUrl,
  assertSafeTestEnvironment,
  createRestClient,
  makeRunId,
  isDeniedOrEmpty,
  isEmptySelect,
  isRlsDenial,
  HarnessSetupError,
  formatResultDiagnostic,
  describeConfigSafely,
  verifyPasswordResetDevModeConfig
};

export const AUTH_HOTEL_PREFIX = "HF_AUTH_TEST_";
export const AUTH_EMAIL_LOCAL_PREFIX = "hf.auth.lifecycle";
export const EXPECTED_TEST_PROJECT_REF = "ozxfqyuihoxokwdqollm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function authHotelName(kind, runId) {
  return `${AUTH_HOTEL_PREFIX}${kind}_${runId}`;
}

export function authMarker(kind, runId) {
  return `hf-auth-lifecycle:${kind}:${runId}`;
}

/** Suite emails reuse the fixture domain; never invent production addresses. */
export function suiteEmail(baseEmail, tag, runId) {
  const raw = String(baseEmail || "").trim().toLowerCase();
  const at = raw.indexOf("@");
  if (at < 1) {
    throw new HarnessSetupError("Cannot derive suite email domain from fixture account.");
  }
  const local = raw.slice(0, at).replace(/\+/g, ".");
  const domain = raw.slice(at + 1);
  const safeTag = String(tag || "user").replace(/[^a-z0-9]/gi, "").slice(0, 12) || "user";
  const safeRun = String(runId || "run").replace(/[^a-z0-9_]/gi, "").slice(0, 20);
  return `${AUTH_EMAIL_LOCAL_PREFIX}+${safeTag}.${safeRun}.${local.slice(0, 12)}@${domain}`;
}

export function assertAuthTestProject(config) {
  if (PRODUCTION_PROJECT_REFS.includes(config.projectRef)) {
    throw new HarnessSetupError(
      `Refusing production project ref "${config.projectRef}".`,
      "Use hospitality-flow-security-test only."
    );
  }
  if (config.projectRef !== EXPECTED_TEST_PROJECT_REF) {
    throw new HarnessSetupError(
      `Auth lifecycle suite expects project ref ${EXPECTED_TEST_PROJECT_REF} (got ${config.projectRef || "unknown"}).`,
      "Point HF_RLS_TEST_SUPABASE_URL at hospitality-flow-security-test."
    );
  }
}

export function createCategorizedReporter() {
  const base = createReporter();
  const manual = [];

  function categorize(category, scenario, expected, actual, passed, detail) {
    return base.record(
      `[${category}] ${scenario}`,
      expected,
      actual,
      passed,
      detail || ""
    );
  }

  function pass(category, scenario, expected, actual, detail) {
    return categorize(category, scenario, expected, actual, true, detail);
  }

  function fail(category, scenario, expected, actual, detail) {
    return categorize(category, scenario, expected, actual, false, detail);
  }

  function assert(category, scenario, expected, actual, condition, detail) {
    return condition
      ? pass(category, scenario, expected, actual, detail)
      : fail(category, scenario, expected, actual, detail);
  }

  function noteManual(category, scenario, reason) {
    const row = { category, scenario, reason, status: "MANUAL" };
    manual.push(row);
    console.log(`MANUAL [${category}] ${scenario} | ${reason}`);
    return row;
  }

  function summary() {
    const buckets = {
      authentication: { passed: 0, failed: 0 },
      session: { passed: 0, failed: 0 },
      password_reset: { passed: 0, failed: 0 },
      invitation: { passed: 0, failed: 0 },
      suspension_removal: { passed: 0, failed: 0 },
      demo_redirect: { passed: 0, failed: 0 },
      other: { passed: 0, failed: 0 }
    };

    for (const r of base.results) {
      const m = /^\[([^\]]+)\]\s/.exec(r.scenario);
      const key = m ? m[1] : "other";
      const bucket = buckets[key] || buckets.other;
      if (r.status === "PASS") bucket.passed += 1;
      else bucket.failed += 1;
    }

    const { passed, failed, total, results } = base.summary();
    return { buckets, manual, passed, failed, total, results };
  }

  return { pass, fail, assert, noteManual, summary, results: base.results, manual };
}

async function authFetch(config, pathname, { method = "POST", accessToken, body, apikey } = {}) {
  const key = apikey || config.anonKey;
  const token = accessToken || key;
  const response = await fetch(`${config.url.replace(/\/$/, "")}${pathname}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: body != null ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { message: text.slice(0, 300) };
    }
  }
  return {
    ok: response.ok || response.status === 204,
    status: response.status,
    body: parsed,
    summary: formatResultDiagnostic(
      { ok: response.ok, status: response.status, body: parsed },
      pathname
    )
  };
}

/**
 * Sign in — returns tokens in memory only (never log them).
 */
export async function createSession(config, email, password) {
  const result = await authFetch(config, "/auth/v1/token?grant_type=password", {
    body: { email, password },
    accessToken: config.anonKey
  });
  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      summary: result.summary,
      errorBody: result.body,
      session: null
    };
  }
  const accessToken = result.body && result.body.access_token;
  const refreshToken = result.body && result.body.refresh_token;
  const user = result.body && result.body.user;
  if (!accessToken || !refreshToken || !user || !user.id) {
    return {
      ok: false,
      status: result.status,
      summary: "sign-in missing access_token, refresh_token, or user.id",
      session: null
    };
  }
  return {
    ok: true,
    status: result.status,
    summary: "session issued",
    session: {
      accessToken,
      refreshToken,
      user,
      client: createRestClient({
        url: config.url,
        apikey: config.anonKey,
        accessToken
      })
    }
  };
}

export async function refreshSession(config, refreshToken) {
  const result = await authFetch(config, "/auth/v1/token?grant_type=refresh_token", {
    body: { refresh_token: refreshToken },
    accessToken: config.anonKey
  });
  if (!result.ok) {
    return { ok: false, status: result.status, summary: result.summary, session: null };
  }
  const accessToken = result.body && result.body.access_token;
  const nextRefresh = result.body && result.body.refresh_token;
  const user = result.body && result.body.user;
  if (!accessToken || !nextRefresh) {
    return { ok: false, status: result.status, summary: "refresh missing tokens", session: null };
  }
  return {
    ok: true,
    status: result.status,
    summary: "refresh issued new session",
    session: {
      accessToken,
      refreshToken: nextRefresh,
      user,
      client: createRestClient({
        url: config.url,
        apikey: config.anonKey,
        accessToken
      })
    }
  };
}

export async function userSignOut(config, accessToken) {
  return authFetch(config, "/auth/v1/logout", {
    method: "POST",
    accessToken,
    body: {}
  });
}

function extractGenerateLinkProps(body) {
  const nested = (body && body.properties) || {};
  const flat = body && typeof body === "object" ? body : {};
  const actionLink =
    nested.action_link || flat.action_link || nested.actionLink || flat.actionLink || null;
  let emailOtp = nested.email_otp || flat.email_otp || nested.emailOtp || flat.emailOtp || null;
  let hashedToken =
    nested.hashed_token || flat.hashed_token || nested.hashedToken || flat.hashedToken || null;
  const verificationType =
    nested.verification_type ||
    flat.verification_type ||
    nested.verificationType ||
    flat.verificationType ||
    null;

  // Some GoTrue builds only return action_link; pull token/token_hash from the URL.
  if (actionLink && (!emailOtp || !hashedToken)) {
    try {
      const u = new URL(actionLink);
      const token = u.searchParams.get("token") || u.searchParams.get("token_hash");
      const th = u.searchParams.get("token_hash");
      if (!hashedToken && th) hashedToken = th;
      if (!emailOtp && token && /^\d{6,10}$/.test(token)) emailOtp = token;
      if (!hashedToken && token && !/^\d{6,10}$/.test(token)) hashedToken = token;
    } catch {
      /* ignore malformed action_link */
    }
  }

  return {
    actionLink,
    emailOtp,
    hashedToken,
    verificationType,
    // Redacted shape keys only — never values.
    shapeKeys: Object.keys(flat)
      .concat(Object.keys(nested).map((k) => `properties.${k}`))
      .sort()
  };
}

export async function adminGenerateLink(config, { type, email, password, redirectTo }) {
  const body = {
    type,
    email: String(email).trim().toLowerCase()
  };
  if (password) body.password = password;
  if (redirectTo) {
    body.options = { redirect_to: redirectTo };
  }

  const result = await authFetch(config, "/auth/v1/admin/generate_link", {
    accessToken: config.serviceRoleKey,
    apikey: config.serviceRoleKey,
    body
  });
  if (!result.ok) {
    return {
      ok: false,
      summary: result.summary,
      actionLink: null,
      emailOtp: null,
      hashedToken: null,
      shapeKeys: []
    };
  }
  const props = extractGenerateLinkProps(result.body);
  return {
    ok: true,
    summary: `generate_link type=${type} keys=${props.shapeKeys.join(",") || "none"}`,
    // Callers must not print these; used only for verify/update steps.
    actionLink: props.actionLink,
    emailOtp: props.emailOtp,
    hashedToken: props.hashedToken,
    verificationType: props.verificationType || type
  };
}

export async function verifyOtp(config, { email, token, tokenHash, type }) {
  const body = { type };
  if (tokenHash) {
    body.token_hash = tokenHash;
  } else {
    body.email = String(email).trim().toLowerCase();
    body.token = token;
  }
  const result = await authFetch(config, "/auth/v1/verify", {
    accessToken: config.anonKey,
    body
  });
  if (!result.ok) {
    return { ok: false, status: result.status, summary: result.summary, session: null };
  }
  const accessToken = result.body && result.body.access_token;
  const refreshToken = result.body && result.body.refresh_token;
  const user = result.body && result.body.user;
  if (!accessToken) {
    return { ok: false, status: result.status, summary: "verify missing access_token", session: null };
  }
  return {
    ok: true,
    status: result.status,
    summary: "otp verified",
    session: {
      accessToken,
      refreshToken,
      user,
      client: createRestClient({
        url: config.url,
        apikey: config.anonKey,
        accessToken
      })
    }
  };
}

export async function updateUserPassword(config, accessToken, newPassword) {
  return authFetch(config, "/auth/v1/user", {
    method: "PUT",
    accessToken,
    body: { password: newPassword }
  });
}

export async function adminLogoutUser(config, userId) {
  const result = await authFetch(config, `/auth/v1/admin/users/${userId}/logout`, {
    accessToken: config.serviceRoleKey,
    apikey: config.serviceRoleKey,
    body: {}
  });
  return {
    ok: result.ok,
    status: result.status,
    supported: result.status !== 404,
    summary: result.summary
  };
}

export async function adminBanUser(config, userId, banDuration = "87600h") {
  return authFetch(config, `/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    accessToken: config.serviceRoleKey,
    apikey: config.serviceRoleKey,
    body: { ban_duration: banDuration }
  });
}

export async function adminUnbanUser(config, userId) {
  return authFetch(config, `/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    accessToken: config.serviceRoleKey,
    apikey: config.serviceRoleKey,
    body: { ban_duration: "none" }
  });
}

export async function adminDeleteUser(config, userId) {
  return authFetch(config, `/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    accessToken: config.serviceRoleKey,
    apikey: config.serviceRoleKey
  });
}

export async function invokeEdgeFunction(config, name, { accessToken, body, headers } = {}) {
  const response = await fetch(
    `${config.url.replace(/\/$/, "")}/functions/v1/${name}`,
    {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken || config.anonKey}`,
        "Content-Type": "application/json",
        ...(headers || {})
      },
      body: JSON.stringify(body || {})
    }
  );
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { message: text.slice(0, 200) };
  }
  return {
    ok: response.ok,
    status: response.status,
    body: payload,
    summary: formatResultDiagnostic(
      { ok: response.ok, status: response.status, body: payload },
      `fn.${name}`
    )
  };
}

/**
 * Evaluate redirect targets using the shared allowlist authority.
 */
export function evaluateRedirectTarget(redirectParam, fallback = DEFAULT_POST_AUTH_ROUTE) {
  const actual = resolveInternalRedirect(redirectParam, {
    fallback,
    isOperator: false
  });
  const secure = resolveInternalRedirect(redirectParam, {
    fallback,
    isOperator: false
  });
  return { actual, secure, matchesSecurePolicy: actual === secure };
}

export function assertDemoModeIsolation() {
  const demoSrc = fs.readFileSync(path.join(REPO_ROOT, "js", "demo-mode.js"), "utf8");
  const findings = [];
  if (!/resolveGuestSession/.test(demoSrc) || !/demoGuest:\s*true/.test(demoSrc)) {
    findings.push("resolveGuestSession / demoGuest contract missing");
  }
  if (!/assertNoPersistenceApi/.test(demoSrc)) {
    findings.push("assertNoPersistenceApi missing");
  }
  if (/service_role|SERVICE_ROLE/.test(demoSrc)) {
    findings.push("demo-mode.js must not reference service_role");
  }
  return { ok: findings.length === 0, findings };
}

export function readSource(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

export function randomPassword(prefix = "HfAuth") {
  return `${prefix}!${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}Aa1`;
}

export { createReporter };
void __dirname;
