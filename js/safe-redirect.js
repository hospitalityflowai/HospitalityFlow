/**
 * Hospitality Flow — shared authentication redirect allowlist (browser).
 * Keep behaviour aligned with scripts/lib/safe-redirect.mjs and
 * supabase/functions/_shared/safe-redirect.ts.
 */
(function (global) {
  "use strict";

  var DEFAULT_POST_AUTH_ROUTE = "account.html";
  var OPERATOR_ROUTE = "operator.html";
  var RESET_PASSWORD_ROUTE = "reset-password.html";
  var INVITE_LANDING_ROUTE = "account.html";
  var PRODUCTION_SITE_ORIGIN = "https://hospitalityflow.co.uk";

  var ALLOWED_POST_AUTH_ROUTES = [
    "account.html",
    "handover.html",
    "hotel-profile.html",
    "operator.html"
  ];

  var ALLOWED_AUTH_CALLBACK_ROUTES = [
    "reset-password.html",
    "account.html"
  ];

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim() !== "";
  }

  function safeDecodeURIComponent(value) {
    try {
      return decodeURIComponent(value);
    } catch (e) {
      return null;
    }
  }

  function containsHostileEncoding(value) {
    var s = String(value);
    if (/%0a|%0d|%00/i.test(s)) return true;
    if (/%2f%2f/i.test(s) || /%5c/i.test(s)) return true;
    if (s.indexOf("\\") !== -1) return true;
    return false;
  }

  function looksUnsafeRedirectCandidate(raw) {
    if (!isNonEmptyString(raw)) return true;
    var s = String(raw).trim();
    var lower = s.toLowerCase();

    if (/^https?:/i.test(s)) return true;
    if (/^\/\//.test(s)) return true;
    if (/^(javascript|data|vbscript|file|blob):/i.test(lower)) return true;
    if (s.indexOf("\\") !== -1) return true;
    if (/^\/\\/.test(s) || /^\\/.test(s)) return true;
    if (/^[a-z][a-z0-9+.-]*:\/\/[^/]*@/i.test(s)) return true;
    if (/^[^/?#]*@[^/?#]*\./.test(s)) return true;
    if (/%0a|%0d|%00/i.test(s)) return true;
    if (/%2f%2f/i.test(s) || /%5c/i.test(s)) return true;
    if (/%68%74%74%70/i.test(s)) return true;
    return false;
  }

  function fullyDecode(raw, options) {
    options = options || {};
    var allowAbsolute = options.allowAbsolute === true;
    var maxRounds = options.maxRounds || 3;
    var current = String(raw).trim();
    var i;
    var next;

    for (i = 0; i < maxRounds; i += 1) {
      if (containsHostileEncoding(current)) {
        return { ok: false, value: current };
      }
      if (!allowAbsolute && looksUnsafeRedirectCandidate(current)) {
        return { ok: false, value: current };
      }
      if (allowAbsolute && /^(javascript|data|vbscript|file|blob):/i.test(current)) {
        return { ok: false, value: current };
      }
      next = safeDecodeURIComponent(current);
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

  function resolveInternalRedirect(raw, options) {
    options = options || {};
    var fallback =
      options.fallback && ALLOWED_POST_AUTH_ROUTES.indexOf(String(options.fallback).toLowerCase()) !== -1
        ? String(options.fallback).toLowerCase()
        : DEFAULT_POST_AUTH_ROUTE;
    var isOperator = options.isOperator === true;
    var decoded;
    var candidate;
    var pathOnly;
    var normalized;

    if (!isNonEmptyString(raw)) {
      return fallback;
    }

    decoded = fullyDecode(raw, { allowAbsolute: false });
    if (!decoded.ok) {
      return fallback;
    }

    candidate = decoded.value.trim();
    if (looksUnsafeRedirectCandidate(candidate)) {
      return fallback;
    }

    candidate = candidate.replace(/^(?:\.\/|\/)+/, "");

    if (
      !candidate ||
      candidate.indexOf("\\") !== -1 ||
      candidate.indexOf("/") !== -1 ||
      candidate.indexOf("..") !== -1
    ) {
      return fallback;
    }

    if (/[?#]/.test(candidate)) {
      return fallback;
    }

    pathOnly = candidate.split(/[?#]/)[0];
    if (!/^[a-z0-9][a-z0-9._-]*\.html$/i.test(pathOnly)) {
      return fallback;
    }

    normalized = pathOnly.toLowerCase();
    if (ALLOWED_POST_AUTH_ROUTES.indexOf(normalized) === -1) {
      return fallback;
    }

    if (normalized === OPERATOR_ROUTE && !isOperator) {
      return fallback;
    }

    return normalized;
  }

  function normalizeOrigin(siteUrl) {
    if (!isNonEmptyString(siteUrl)) return "";
    try {
      var cleaned = String(siteUrl).trim().replace(/\/+$/, "");
      var u = new URL(cleaned.indexOf("://") !== -1 ? cleaned : "https://" + cleaned);
      if (u.protocol !== "http:" && u.protocol !== "https:") return "";
      if (u.username || u.password) return "";
      return u.origin;
    } catch (e) {
      return "";
    }
  }

  function parseAllowedOrigins(value) {
    if (!isNonEmptyString(value)) return [];
    return String(value)
      .split(",")
      .map(function (part) {
        return normalizeOrigin(part);
      })
      .filter(Boolean);
  }

  function resolveTrustedAbsoluteUrl(requested, options) {
    options = options || {};
    var allowedPath = String(options.allowedPath || "").toLowerCase();
    var fallbackOrigin;
    var configuredOrigin;
    var extra;
    var allowedOrigins;
    var safeDefault;
    var raw;
    var decoded;
    var u;

    if (ALLOWED_AUTH_CALLBACK_ROUTES.indexOf(allowedPath) === -1) {
      allowedPath = RESET_PASSWORD_ROUTE;
    }

    fallbackOrigin =
      normalizeOrigin(options.fallbackOrigin || PRODUCTION_SITE_ORIGIN) || PRODUCTION_SITE_ORIGIN;
    configuredOrigin = normalizeOrigin(options.siteUrl || "") || fallbackOrigin;
    extra = Array.isArray(options.allowedOriginsExtra)
      ? options.allowedOriginsExtra
      : parseAllowedOrigins(options.allowedOriginsExtra || "");

    allowedOrigins = {};
    allowedOrigins[configuredOrigin] = true;
    allowedOrigins[fallbackOrigin] = true;
    extra.forEach(function (origin) {
      var n = normalizeOrigin(origin);
      if (n) allowedOrigins[n] = true;
    });

    safeDefault = configuredOrigin + "/" + allowedPath;

    if (!isNonEmptyString(requested)) {
      return safeDefault;
    }

    raw = String(requested).trim();
    if (raw.indexOf("\\") !== -1 || /^(javascript|data|vbscript|file|blob):/i.test(raw)) {
      return safeDefault;
    }
    if (/^\/\//.test(raw)) {
      return safeDefault;
    }

    decoded = fullyDecode(raw, { allowAbsolute: true });
    if (!decoded.ok) {
      return safeDefault;
    }

    try {
      u = new URL(decoded.value);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return safeDefault;
      }
      if (u.username || u.password) {
        return safeDefault;
      }
      if (!allowedOrigins[u.origin]) {
        return safeDefault;
      }
      if (u.pathname !== "/" + allowedPath) {
        return safeDefault;
      }
      return u.origin + "/" + allowedPath;
    } catch (e) {
      return safeDefault;
    }
  }

  function buildAbsoluteAuthCallbackUrl(origin, path) {
    var allowedPath = String(path || "").toLowerCase();
    if (ALLOWED_AUTH_CALLBACK_ROUTES.indexOf(allowedPath) === -1) {
      allowedPath = RESET_PASSWORD_ROUTE;
    }
    return resolveTrustedAbsoluteUrl(null, {
      siteUrl: origin,
      allowedPath: allowedPath
    });
  }

  global.HFSafeRedirect = {
    DEFAULT_POST_AUTH_ROUTE: DEFAULT_POST_AUTH_ROUTE,
    OPERATOR_ROUTE: OPERATOR_ROUTE,
    RESET_PASSWORD_ROUTE: RESET_PASSWORD_ROUTE,
    INVITE_LANDING_ROUTE: INVITE_LANDING_ROUTE,
    PRODUCTION_SITE_ORIGIN: PRODUCTION_SITE_ORIGIN,
    ALLOWED_POST_AUTH_ROUTES: ALLOWED_POST_AUTH_ROUTES.slice(),
    ALLOWED_AUTH_CALLBACK_ROUTES: ALLOWED_AUTH_CALLBACK_ROUTES.slice(),
    looksUnsafeRedirectCandidate: looksUnsafeRedirectCandidate,
    resolveInternalRedirect: resolveInternalRedirect,
    normalizeOrigin: normalizeOrigin,
    parseAllowedOrigins: parseAllowedOrigins,
    resolveTrustedAbsoluteUrl: resolveTrustedAbsoluteUrl,
    buildAbsoluteAuthCallbackUrl: buildAbsoluteAuthCallbackUrl
  };
})(typeof window !== "undefined" ? window : globalThis);
