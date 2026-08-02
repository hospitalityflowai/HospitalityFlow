/**
 * Canonical Hospitality Flow authentication redirect allowlist.
 * Browser (js/safe-redirect.js) and Edge (_shared/safe-redirect.ts) must mirror this logic.
 */

export const DEFAULT_POST_AUTH_ROUTE = "account.html";
export const OPERATOR_ROUTE = "operator.html";
export const RESET_PASSWORD_ROUTE = "reset-password.html";
export const INVITE_LANDING_ROUTE = "account.html";
export const PRODUCTION_SITE_ORIGIN = "https://hospitalityflow.co.uk";

/** Post-login / post-auth internal navigation only (bare HTML filenames). */
export const ALLOWED_POST_AUTH_ROUTES = Object.freeze([
  "account.html",
  "handover.html",
  "hotel-profile.html",
  "operator.html"
]);

/** Paths permitted as Supabase Auth email redirect destinations. */
export const ALLOWED_AUTH_CALLBACK_ROUTES = Object.freeze([
  "reset-password.html",
  "account.html"
]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/**
 * True when the raw candidate is unsafe before/after normalization.
 */
export function looksUnsafeRedirectCandidate(raw) {
  if (!isNonEmptyString(raw)) return true;
  const s = String(raw).trim();
  const lower = s.toLowerCase();

  if (/^https?:/i.test(s)) return true;
  if (/^\/\//.test(s)) return true;
  if (/^(javascript|data|vbscript|file|blob):/i.test(lower)) return true;
  if (s.includes("\\")) return true;
  if (/^\/\\/.test(s) || /^\\/.test(s)) return true;
  // user:pass@host or embedded credentials
  if (/^[a-z][a-z0-9+.-]*:\/\/[^/]*@/i.test(s) || /\\@/.test(s)) return true;
  if (/^[^/?#]*@[^/?#]*\./.test(s)) return true;
  // Encoded protocol / slashes / backslashes commonly used in open-redirect bypasses
  if (/%0a|%0d|%00/i.test(s)) return true;
  if (/%2f%2f/i.test(s) || /%5c/i.test(s)) return true;
  if (/%68%74%74%70/i.test(s)) return true; // "http" encoded

  return false;
}

function containsHostileEncoding(value) {
  const s = String(value);
  if (/%0a|%0d|%00/i.test(s)) return true;
  if (/%2f%2f/i.test(s) || /%5c/i.test(s)) return true;
  if (s.includes("\\")) return true;
  return false;
}

/**
 * Decode nested URI encoding. When allowAbsolute is false, http(s) results are rejected.
 */
function fullyDecode(raw, { allowAbsolute = false, maxRounds = 3 } = {}) {
  let current = String(raw).trim();
  for (let i = 0; i < maxRounds; i += 1) {
    if (containsHostileEncoding(current)) {
      return { ok: false, value: current };
    }
    if (!allowAbsolute && looksUnsafeRedirectCandidate(current)) {
      return { ok: false, value: current };
    }
    if (
      allowAbsolute &&
      /^(javascript|data|vbscript|file|blob):/i.test(current)
    ) {
      return { ok: false, value: current };
    }
    const next = safeDecodeURIComponent(current);
    if (next == null) {
      return { ok: false, value: current };
    }
    if (next === current) {
      if (!allowAbsolute && looksUnsafeRedirectCandidate(current)) {
        return { ok: false, value: current };
      }
      return { ok: true, value: current };
    }
    current = next;
  }
  return { ok: false, value: current };
}

/**
 * Resolve a post-authentication internal redirect target.
 * Returns a bare allowlisted filename (never an external URL).
 *
 * @param {unknown} raw
 * @param {{ fallback?: string, isOperator?: boolean }} [options]
 */
export function resolveInternalRedirect(raw, options = {}) {
  const fallback =
    options.fallback && ALLOWED_POST_AUTH_ROUTES.includes(String(options.fallback).toLowerCase())
      ? String(options.fallback).toLowerCase()
      : DEFAULT_POST_AUTH_ROUTE;
  const isOperator = options.isOperator === true;

  if (!isNonEmptyString(raw)) {
    return fallback;
  }

  const decoded = fullyDecode(raw);
  if (!decoded.ok) {
    return fallback;
  }

  let candidate = decoded.value.trim();
  if (looksUnsafeRedirectCandidate(candidate)) {
    return fallback;
  }

  // Drop origin if a same-site absolute slipped through decode without scheme tricks
  try {
    if (/^https?:\/\//i.test(candidate)) {
      return fallback;
    }
  } catch {
    return fallback;
  }

  // Strip leading ./ or /
  candidate = candidate.replace(/^(?:\.\/|\/)+/, "");

  // No path segments, backslashes, or traversal
  if (!candidate || candidate.includes("\\") || candidate.includes("/") || candidate.includes("..")) {
    return fallback;
  }

  const pathOnly = candidate.split(/[?#]/)[0];
  if (!pathOnly || pathOnly !== candidate.split(/[?#]/)[0]) {
    return fallback;
  }
  // Disallow query/hash on login redirect targets (requireAuth already sends bare filenames)
  if (/[?#]/.test(candidate)) {
    return fallback;
  }

  if (!/^[a-z0-9][a-z0-9._-]*\.html$/i.test(pathOnly)) {
    return fallback;
  }

  const normalized = pathOnly.toLowerCase();
  if (!ALLOWED_POST_AUTH_ROUTES.includes(normalized)) {
    return fallback;
  }

  if (normalized === OPERATOR_ROUTE && !isOperator) {
    return fallback;
  }

  return normalized;
}

export function normalizeOrigin(siteUrl) {
  if (!isNonEmptyString(siteUrl)) return "";
  try {
    const cleaned = String(siteUrl).trim().replace(/\/+$/, "");
    const u = new URL(cleaned.includes("://") ? cleaned : `https://${cleaned}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    if (u.username || u.password) return "";
    if (u.hostname.includes("\\") || u.hostname.includes(" ")) return "";
    return u.origin;
  } catch {
    return "";
  }
}

export function parseAllowedOrigins(value) {
  if (!isNonEmptyString(value)) return [];
  return String(value)
    .split(",")
    .map((part) => normalizeOrigin(part))
    .filter(Boolean);
}

/**
 * Build a trusted absolute Auth redirect URL (reset / invite).
 * User-controlled full URLs cannot override to an unlisted origin or path.
 *
 * @param {unknown} requested
 * @param {{
 *   siteUrl?: string,
 *   allowedOriginsExtra?: string[] | string,
 *   allowedPath: string,
 *   fallbackOrigin?: string
 * }} options
 */
export function resolveTrustedAbsoluteUrl(requested, options) {
  const allowedPath = String(options.allowedPath || "").toLowerCase();
  if (!ALLOWED_AUTH_CALLBACK_ROUTES.includes(allowedPath)) {
    throw new Error(`safe-redirect: allowedPath "${allowedPath}" is not an Auth callback route`);
  }

  const fallbackOrigin =
    normalizeOrigin(options.fallbackOrigin || PRODUCTION_SITE_ORIGIN) || PRODUCTION_SITE_ORIGIN;
  const configuredOrigin = normalizeOrigin(options.siteUrl || "") || fallbackOrigin;

  const extra = Array.isArray(options.allowedOriginsExtra)
    ? options.allowedOriginsExtra
    : parseAllowedOrigins(options.allowedOriginsExtra || "");

  const allowedOrigins = new Set(
    [configuredOrigin, fallbackOrigin, ...extra.map(normalizeOrigin)].filter(Boolean)
  );

  const safeDefault = `${configuredOrigin}/${allowedPath}`;

  if (!isNonEmptyString(requested)) {
    return safeDefault;
  }

  const raw = String(requested).trim();
  if (raw.includes("\\") || /^(javascript|data|vbscript|file|blob):/i.test(raw)) {
    return safeDefault;
  }
  if (/^\/\//.test(raw)) {
    return safeDefault;
  }

  const decoded = fullyDecode(raw, { allowAbsolute: true });
  if (!decoded.ok) {
    return safeDefault;
  }

  try {
    const u = new URL(decoded.value);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return safeDefault;
    }
    if (u.username || u.password) {
      return safeDefault;
    }
    if (!allowedOrigins.has(u.origin)) {
      return safeDefault;
    }
    // Exact path only — no nested segments, query, or hash kept.
    if (u.pathname !== `/${allowedPath}`) {
      return safeDefault;
    }
    return `${u.origin}/${allowedPath}`;
  } catch {
    return safeDefault;
  }
}

/**
 * Browser helper: build absolute URL for an Auth callback path using the current page origin.
 * Still validates path against ALLOWED_AUTH_CALLBACK_ROUTES.
 */
export function buildAbsoluteAuthCallbackUrl(origin, path, basePath = "/") {
  const allowedPath = String(path || "").toLowerCase();
  if (!ALLOWED_AUTH_CALLBACK_ROUTES.includes(allowedPath)) {
    return resolveTrustedAbsoluteUrl(null, {
      siteUrl: origin,
      allowedPath: RESET_PASSWORD_ROUTE
    });
  }
  const originNorm = normalizeOrigin(origin);
  if (!originNorm) {
    return `${PRODUCTION_SITE_ORIGIN}/${allowedPath}`;
  }
  const prefix = String(basePath || "/").replace(/[^/]+$/, "");
  const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
  // Product pages live at site root or a directory prefix; Auth callback must remain a single segment.
  void normalizedPrefix;
  return `${originNorm}/${allowedPath}`;
}
