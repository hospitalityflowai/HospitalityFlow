/**
 * Node mirror of supabase/functions/_shared/early-access-submit.ts for unit tests.
 */

export const MAX_FIELD_LENGTH = 200;
export const MAX_EMAIL_LENGTH = 320;
export const MAX_ROOM_COUNT = 10000;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function trimField(value, maxLength = MAX_FIELD_LENGTH) {
  return String(value == null ? "" : value).trim().slice(0, maxLength);
}

export function normalizeEmail(value) {
  return trimField(value, MAX_EMAIL_LENGTH).toLowerCase();
}

export function parseRoomCount(value) {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_ROOM_COUNT) {
    return null;
  }
  if (!Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

export function validateSubmitBody(body) {
  const firstName = trimField(body.firstName);
  const email = normalizeEmail(body.email);
  const propertyName = trimField(body.propertyName);
  const propertyType = trimField(body.propertyType);
  const role = trimField(body.role);
  const source =
    trimField(body.source || "early-access-programme") || "early-access-programme";

  if (
    body.roomCount != null &&
    body.roomCount !== "" &&
    parseRoomCount(body.roomCount) === null
  ) {
    return { error: "Room count must be a whole number between 0 and 10000." };
  }

  const roomCount = parseRoomCount(body.roomCount);

  if (!firstName || !email || !propertyName || !propertyType || !role) {
    return { error: "Missing required application fields." };
  }

  if (!EMAIL_RE.test(email)) {
    return { error: "A valid email address is required." };
  }

  if (
    String(body.firstName ?? "").trim().length > MAX_FIELD_LENGTH ||
    String(body.propertyName ?? "").trim().length > MAX_FIELD_LENGTH ||
    String(body.propertyType ?? "").trim().length > MAX_FIELD_LENGTH ||
    String(body.role ?? "").trim().length > MAX_FIELD_LENGTH
  ) {
    return { error: "One or more fields exceed the maximum allowed length." };
  }

  return {
    value: {
      firstName,
      email,
      propertyName,
      propertyType,
      role,
      source,
      roomCount
    }
  };
}

const hitBuckets = new Map();

export function checkSubmitRateLimit(key, options = {}) {
  const windowMs = options.windowMs ?? 10 * 60 * 1000;
  const maxHits = options.maxHits ?? 8;
  const now = Date.now();
  const cutoff = now - windowMs;
  const prev = (hitBuckets.get(key) || []).filter((t) => t > cutoff);

  if (prev.length >= maxHits) {
    const retryAfterMs = Math.max(0, (prev[0] ?? now) + windowMs - now);
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000))
    };
  }

  prev.push(now);
  hitBuckets.set(key, prev);
  return { allowed: true };
}

/** Test helper — clear in-memory buckets between cases. */
export function resetSubmitRateLimitBuckets() {
  hitBuckets.clear();
}
