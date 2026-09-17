import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getPasscodeState } from "@/lib/server/passcode";

/**
 * =====================================================================
 * Hackeradmin session — issued ONLY after the rotating passcode is
 * verified server-side. Independent from user sessions:
 *   • separate cookie (__ha_session)
 *   • HMAC-signed with a key derived from SESSION_SECRET
 *   • bounded lifetime (2h) with sliding re-issue on activity
 *   • revoked wholesale whenever the passcode rotates (epoch check)
 * The passcode itself is never stored in the cookie.
 */

export const HA_COOKIE = "__ha_session";
const HA_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours max per session

interface HaPayload {
  v: 1;
  iat: number; // issued at (ms)
  exp: number; // expires at (ms)
  epoch: number; // passcode epoch at grant time
}

function secret(): string {
  // Derive a purpose-specific key from the session secret so this cookie
  // can never be confused with (or forged from) a user session token.
  const base = process.env.SESSION_SECRET ?? "";
  return crypto
    .createHash("sha256")
    .update(`hackeradmin-session-key:${base}`)
    .digest("hex");
}

function b64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

export function signHaSession(payload: HaPayload): string {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `ha1.${body}.${sig}`;
}

export function verifyHaToken(token: string): HaPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "ha1") return null;
  const [, body, sig] = parts;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as HaPayload;
    if (payload.v !== 1 || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Create a fresh session token bound to the current passcode epoch. */
export function issueHaSession(epoch: number): { token: string; maxAgeSeconds: number } {
  const now = Date.now();
  const payload: HaPayload = { v: 1, iat: now, exp: now + HA_TTL_MS, epoch };
  return { token: signHaSession(payload), maxAgeSeconds: Math.floor(HA_TTL_MS / 1000) };
}

/**
 * Validate the current request's hackeradmin cookie. Returns the payload
 * when valid AND the passcode epoch hasn't been bumped since grant.
 */
export async function getHaSession(): Promise<HaPayload | null> {
  const cookieStore = cookies();
  const raw = cookieStore.get(HA_COOKIE)?.value;
  if (!raw) return null;
  const payload = verifyHaToken(raw);
  if (!payload) return null;
  try {
    const state = await getPasscodeState();
    if (payload.epoch !== state.sessionEpoch) return null; // rotation revoked it
  } catch {
    return null;
  }
  return payload;
}

/** True when the current request holds a valid hackeradmin session. */
export async function hasHaSession(): Promise<boolean> {
  return (await getHaSession()) !== null;
}

/** Cookie attributes for issuing the session (used by the verify route). */
export function haCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Sliding re-issue: fresh expiry on each authenticated owner request. */
export function refreshHaCookie(payload: HaPayload): { token: string; maxAgeSeconds: number } | null {
  const remaining = payload.exp - Date.now();
  if (remaining < HA_TTL_MS / 2) return null; // still fresh enough
  return issueHaSession(payload.epoch);
}
