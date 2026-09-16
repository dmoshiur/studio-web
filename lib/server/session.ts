import "server-only";
import crypto from "node:crypto";
import { metaGet, metaSet } from "@/lib/db/local-store";
import type { Role } from "@/types";

/**
 * Stateless, signed session tokens for the embedded backend.
 * Format: v1.<base64url payload>.<hmac signature>
 * The secret comes from SESSION_SECRET when provided; otherwise a random
 * secret is generated once and persisted in the database.
 */

let cachedSecret: string | null = null;

function getSecret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 16) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }
  try {
    const stored = metaGet("session_secret");
    if (stored) {
      cachedSecret = stored;
      return cachedSecret;
    }
    const generated = crypto.randomBytes(48).toString("hex");
    metaSet("session_secret", generated);
    cachedSecret = generated;
    return cachedSecret;
  } catch {
    cachedSecret = crypto.randomBytes(48).toString("hex");
    return cachedSecret;
  }
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

export function signSession(payload: LocalSessionPayload): string {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `v1.${body}.${sig}`;
}

export function verifySessionToken(token: string): LocalSessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const [, body, sig] = parts;
  const expected = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
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
