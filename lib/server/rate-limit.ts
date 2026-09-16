import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * Serverless-compatible rate limiter backed by Firestore.
 * Falls back to in-memory buckets when Firestore is unavailable
 * (best-effort; Vercel instances are ephemeral so memory is per-instance).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, Bucket>();

function memoryCheck(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = memoryBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const db = getAdminDb();

  if (!db) {
    const allowed = memoryCheck(key, limit, windowMs);
    const b = memoryBuckets.get(key)!;
    return { allowed, remaining: Math.max(0, limit - b.count), resetAt: b.resetAt };
  }

  const ref = db.collection("rateLimits").doc(encodeURIComponent(key));
  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() as { count?: number; resetAt?: number } | undefined;
      if (!snap.exists || !data?.resetAt || data.resetAt <= now) {
        const resetAt = now + windowMs;
        tx.set(ref, { count: 1, resetAt, updatedAt: FieldValue.serverTimestamp() });
        return { allowed: true, remaining: limit - 1, resetAt };
      }
      if ((data.count ?? 0) >= limit) {
        return { allowed: false, remaining: 0, resetAt: data.resetAt };
      }
      tx.update(ref, { count: FieldValue.increment(1) });
      return { allowed: true, remaining: limit - (data.count ?? 0) - 1, resetAt: data.resetAt };
    });
    return result;
  } catch {
    // Firestore hiccup — fail open with memory fallback (never hard-block legit traffic on infra errors)
    const allowed = memoryCheck(key, limit, windowMs);
    const b = memoryBuckets.get(key)!;
    return { allowed, remaining: Math.max(0, limit - b.count), resetAt: b.resetAt };
  }
}

export function rateLimitHeaders(result: RateLimitResult, limit: number) {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

// Presets (requests per window per key)
export const RATE_PRESETS = {
  auth: { limit: 8, windowMs: 10 * 60_000 }, // login attempts
  contact: { limit: 5, windowMs: 60 * 60_000 },
  newsletter: { limit: 5, windowMs: 60 * 60_000 },
  upload: { limit: 30, windowMs: 60 * 60_000 },
  smtpTest: { limit: 5, windowMs: 60 * 60_000 },
  ownerApi: { limit: 60, windowMs: 60_000 },
  adminApi: { limit: 120, windowMs: 60_000 },
  setup: { limit: 5, windowMs: 60 * 60_000 },
} as const;
