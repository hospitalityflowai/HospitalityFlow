/**
 * Shared validation for early-access application submissions.
 * Must stay aligned with public.submit_early_access_application SQL checks.
 */

export const MAX_FIELD_LENGTH = 200;
export const MAX_EMAIL_LENGTH = 320;
export const MAX_ROOM_COUNT = 10000;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EarlyAccessSubmitInput = {
  firstName: string;
  email: string;
  propertyName: string;
  propertyType: string;
  role: string;
  source: string;
  roomCount: number | null;
};

export type EarlyAccessSubmitBody = {
  firstName?: string;
  email?: string;
  propertyName?: string;
  propertyType?: string;
  roomCount?: number | string | null;
  role?: string;
  source?: string;
};

export function trimField(value: unknown, maxLength = MAX_FIELD_LENGTH): string {
  return String(value == null ? "" : value).trim().slice(0, maxLength);
}

export function normalizeEmail(value: unknown): string {
  return trimField(value, MAX_EMAIL_LENGTH).toLowerCase();
}

export function parseRoomCount(value: unknown): number | null {
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

export function validateSubmitBody(
  body: EarlyAccessSubmitBody,
): { error: string } | { value: EarlyAccessSubmitInput } {
  const firstName = trimField(body.firstName);
  const email = normalizeEmail(body.email);
  const propertyName = trimField(body.propertyName);
  const propertyType = trimField(body.propertyType);
  const role = trimField(body.role);
  const source = trimField(body.source || "early-access-programme") ||
    "early-access-programme";

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

  // Reject oversized raw payloads that relied only on silent truncation previously
  // for critical identity fields after trim (email already sliced).
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
      roomCount,
    },
  };
}

/** Simple in-memory sliding window for Edge abuse protection (per isolate). */
const hitBuckets = new Map<string, number[]>();

export function checkSubmitRateLimit(
  key: string,
  options: { windowMs?: number; maxHits?: number } = {},
): { allowed: boolean; retryAfterSec?: number } {
  const windowMs = options.windowMs ?? 10 * 60 * 1000;
  const maxHits = options.maxHits ?? 8;
  const now = Date.now();
  const cutoff = now - windowMs;
  const prev = (hitBuckets.get(key) || []).filter((t) => t > cutoff);

  if (prev.length >= maxHits) {
    const retryAfterMs = Math.max(0, (prev[0] ?? now) + windowMs - now);
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  prev.push(now);
  hitBuckets.set(key, prev);
  return { allowed: true };
}

export function clientRateLimitKey(req: Request, email: string): string {
  const forwarded = req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for") ||
    "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  return `${ip}|${email}`;
}
