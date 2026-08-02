/**
 * Hospitality Flow — shared authentication redirect allowlist (Edge).
 * Keep behaviour aligned with scripts/lib/safe-redirect.mjs and js/safe-redirect.js.
 */

export const DEFAULT_POST_AUTH_ROUTE = "account.html";
export const OPERATOR_ROUTE = "operator.html";
export const RESET_PASSWORD_ROUTE = "reset-password.html";
export const INVITE_LANDING_ROUTE = "account.html";
export const PRODUCTION_SITE_ORIGIN = "https://hospitalityflow.co.uk";

export const ALLOWED_POST_AUTH_ROUTES = [
  "account.html",
  "handover.html",
  "hotel-profile.html",
  "operator.html",
] as const;

export const ALLOWED_AUTH_CALLBACK_ROUTES = [
  "reset-password.html",
  "account.html",
] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function containsHostileEncoding(value: string): boolean {
  if (/%0a|%0d|%00/i.test(value)) return true;
  if (/%2f%2f/i.test(value) || /%5c/i.test(value)) return true;
  if (value.includes("\\")) return true;
  return false;
}

export function looksUnsafeRedirectCandidate(raw: unknown): boolean {
  if (!isNonEmptyString(raw)) return true;
  const s = raw.trim();
  const lower = s.toLowerCase();

  if (/^https?:/i.test(s)) return true;
  if (/^\/\//.test(s)) return true;
  if (/^(javascript|data|vbscript|file|blob):/i.test(lower)) return true;
  if (s.includes("\\")) return true;
  if (/^\/\\/.test(s) || /^\\/.test(s)) return true;
  if (/^[a-z][a-z0-9+.-]*:\/\/[^/]*@/i.test(s)) return true;
  if (/^[^/?#]*@[^/?#]*\./.test(s)) return true;
  if (/%0a|%0d|%00/i.test(s)) return true;
  if (/%2f%2f/i.test(s) || /%5c/i.test(s)) return true;
  if (/%68%74%74%70/i.test(s)) return true;
  return false;
}

function fullyDecode(
  raw: string,
  options: { allowAbsolute?: boolean; maxRounds?: number } = {},
): { ok: boolean; value: string } {
  const allowAbsolute = options.allowAbsolute === true;
  const maxRounds = options.maxRounds ?? 3;
  let current = raw.trim();

  for (let i = 0; i < maxRounds; i += 1) {
    if (containsHostileEncoding(current)) {
      return { ok: false, value: current };
    }
    if (!allowAbsolute && looksUnsafeRedirectCandidate(current)) {
      return { ok: false, value: current };
    }
    if (allowAbsolute && /^(javascript|data|vbscript|file|blob):/i.test(current)) {
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

export function resolveInternalRedirect(
  raw: unknown,
  options: { fallback?: string; isOperator?: boolean } = {},
): string {
  const fallback =
    options.fallback &&
      (ALLOWED_POST_AUTH_ROUTES as readonly string[]).includes(
        String(options.fallback).toLowerCase(),
      )
      ? String(options.fallback).toLowerCase()
      : DEFAULT_POST_AUTH_ROUTE;
  const isOperator = options.isOperator === true;

  if (!isNonEmptyString(raw)) {
    return fallback;
  }

  const decoded = fullyDecode(raw, { allowAbsolute: false });
  if (!decoded.ok) {
    return fallback;
  }

  let candidate = decoded.value.trim();
  if (looksUnsafeRedirectCandidate(candidate)) {
    return fallback;
  }

  candidate = candidate.replace(/^(?:\.\/|\/)+/, "");

  if (
    !candidate ||
    candidate.includes("\\") ||
    candidate.includes("/") ||
    candidate.includes("..")
  ) {
    return fallback;
  }

  if (/[?#]/.test(candidate)) {
    return fallback;
  }

  const pathOnly = candidate.split(/[?#]/)[0];
  if (!/^[a-z0-9][a-z0-9._-]*\.html$/i.test(pathOnly)) {
    return fallback;
  }

  const normalized = pathOnly.toLowerCase();
  if (!(ALLOWED_POST_AUTH_ROUTES as readonly string[]).includes(normalized)) {
    return fallback;
  }

  if (normalized === OPERATOR_ROUTE && !isOperator) {
    return fallback;
  }

  return normalized;
}

export function normalizeOrigin(siteUrl: unknown): string {
  if (!isNonEmptyString(siteUrl)) return "";
  try {
    const cleaned = siteUrl.trim().replace(/\/+$/, "");
    const u = new URL(cleaned.includes("://") ? cleaned : `https://${cleaned}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    if (u.username || u.password) return "";
    return u.origin;
  } catch {
    return "";
  }
}

export function parseAllowedOrigins(value: unknown): string[] {
  if (!isNonEmptyString(value)) return [];
  return value
    .split(",")
    .map((part) => normalizeOrigin(part))
    .filter(Boolean);
}

export function resolveTrustedAbsoluteUrl(
  requested: unknown,
  options: {
    siteUrl?: string;
    allowedOriginsExtra?: string[] | string;
    allowedPath: string;
    fallbackOrigin?: string;
  },
): string {
  let allowedPath = String(options.allowedPath || "").toLowerCase();
  if (!(ALLOWED_AUTH_CALLBACK_ROUTES as readonly string[]).includes(allowedPath)) {
    allowedPath = RESET_PASSWORD_ROUTE;
  }

  const fallbackOrigin =
    normalizeOrigin(options.fallbackOrigin || PRODUCTION_SITE_ORIGIN) ||
    PRODUCTION_SITE_ORIGIN;
  const configuredOrigin = normalizeOrigin(options.siteUrl || "") || fallbackOrigin;

  const extra = Array.isArray(options.allowedOriginsExtra)
    ? options.allowedOriginsExtra
    : parseAllowedOrigins(options.allowedOriginsExtra || "");

  const allowedOrigins = new Set(
    [configuredOrigin, fallbackOrigin, ...extra.map(normalizeOrigin)].filter(Boolean),
  );

  const safeDefault = `${configuredOrigin}/${allowedPath}`;

  if (!isNonEmptyString(requested)) {
    return safeDefault;
  }

  const raw = requested.trim();
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
    if (u.pathname !== `/${allowedPath}`) {
      return safeDefault;
    }
    return `${u.origin}/${allowedPath}`;
  } catch {
    return safeDefault;
  }
}

/** Edge helper: password-reset Auth redirectTo from env + optional client hint. */
export function resolvePasswordResetRedirectTo(requested: unknown): string {
  return resolveTrustedAbsoluteUrl(requested, {
    siteUrl: Deno.env.get("SITE_URL") || "",
    allowedOriginsExtra: Deno.env.get("HF_ALLOWED_REDIRECT_ORIGINS") || "",
    allowedPath: RESET_PASSWORD_ROUTE,
    fallbackOrigin: PRODUCTION_SITE_ORIGIN,
  });
}

/** Edge helper: invite Auth redirectTo from env (ignores unsafe PILOT_INVITE_REDIRECT_TO). */
export function resolveInviteRedirectTo(): string {
  const configured = (Deno.env.get("PILOT_INVITE_REDIRECT_TO") || "").trim();
  return resolveTrustedAbsoluteUrl(configured || null, {
    siteUrl: Deno.env.get("SITE_URL") || "",
    allowedOriginsExtra: Deno.env.get("HF_ALLOWED_REDIRECT_ORIGINS") || "",
    allowedPath: INVITE_LANDING_ROUTE,
    fallbackOrigin: PRODUCTION_SITE_ORIGIN,
  });
}
