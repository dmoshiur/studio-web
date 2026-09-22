import "server-only";
import crypto from "node:crypto";
import { metaGet, metaSet } from "@/lib/db/local-store";
import type { Role } from "@/types";

/**
 * Stateless, signed session tokens.
 * Format: v1.<base64url payload>.<hmac signature>
 *
 * The secret is resolved in priority order:
 *   1. SESSION_SECRET environment variable (recommended for production),
 *   2. a generated secret PERSISTED IN THE SHARED DATA STORE — a single
 *      document in Firestore (firebase backend) or the embedded database
 *      (local backend) — so every serverless instance signs and verifies
 *      with the SAME key. Storing it in per-instance storage is not
 *      sufficient: instances would invalidate each other's sessions.
 *   3. (last resort) an in-memory per-process secret.
 *
 * All sign/verify helpers await `ensureSessionSecret()` first, so the
 * shared secret is loaded once per process and kept in memory.
 */

let cachedSecret: string | null = null;
let initPromise: Promise<string> | null = null;

async function loadSecret(): Promise<string> {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.trim().length >= 16) {
    return fromEnv.trim();
  }

  // Shared data store — visible to every instance of the deployment.
  try {
    const { getAdminDb, getDataBackend } = await import("@/lib/firebase/admin");
    if (getDataBackend() === "firebase") {
      const db = getAdminDb();
      if (db) {
        const ref = db.collection("siteSettings").doc("secrets");
        const snap = await ref.get();
        const stored = snap.exists ? (snap.data() as { sessionSecret?: unknown }) : null;
        if (stored && typeof stored.sessionSecret === "string" && stored.sessionSecret.length >= 32) {
          return stored.sessionSecret;
        }
        const generated = crypto.randomBytes(48).toString("hex");
        await ref.set(
          { sessionSecret: generated, createdAt: new Date(), note: "Server-side session signing key. Never expose." },
          { merge: true }
        );
        return generated;
      }
    }
  } catch {
    /* fall through to the embedded store */
  }

  try {
    const stored = metaGet("session_secret");
    if (stored) return stored;
    const generated = crypto.randomBytes(48).toString("hex");
    metaSet("session_secret", generated);
    return generated;
  } catch {
    // Last resort (e.g. read-only filesystem): per-process secret. Sessions
    // will not survive a process recycle — logged loudly by the caller.
    console.warn(
      "[session] SESSION_SECRET is not set and no shared store is writable — sessions will NOT survive restarts or span instances. Set SESSION_SECRET in production."
    );
    return crypto.randomBytes(48).toString("hex");
  }
}

export async function ensureSessionSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;
  if (!initPromise) {
    initPromise = loadSecret().then((s) => {
      cachedSecret = s;
      return s;
    });
  }
  return initPromise;
}

export interface LocalSessionPayload {
  uid: string;
  role: Role;
  epoch: number;
  exp: number; // unix seconds
  email?: string | null;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export async function signSession(payload: LocalSessionPayload): Promise<string> {
  const secret = await ensureSessionSecret();
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `v1.${body}.${sig}`;
}

export async function verifySessionToken(token: string): Promise<LocalSessionPayload | null> {
  const secret = await ensureSessionSecret();
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const [, body, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as LocalSessionPayload;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
