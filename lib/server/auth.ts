import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  identityBackend,
  resolveIdentitySession,
  getIdentityUser,
} from "@/lib/server/identity";
import type { Role, SessionUser } from "@/types";
import { isAdminRole, isOwnerRole } from "@/types";

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "__session";

export interface AuthResult {
  user: SessionUser | null;
  error?: string;
}

/**
 * =====================================================================
 * Environment-driven master administrator
 * =====================================================================
 * ADMIN_EMAIL / (ADMIN_EMAILS) + ADMIN_PASSWORD in the environment always
 * grant full platform access. The master admin is signed in through the
 * normal login form (`/login`) — no Firebase or database required — and can
 * then promote regular accounts to admin/owner from the owner console.
 *
 *   ADMIN_EMAIL=you@example.com
 *   ADMIN_PASSWORD=choose-a-strong-password
 *   ADMIN_NAME=Your Name            # optional display name
 *   ADMIN_EMAILS=a@x.com,b@y.com    # optional: additional full-access emails
 */
export function getAdminEmails(): string[] {
  return [process.env.ADMIN_EMAIL, process.env.ADMIN_EMAILS]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function getAdminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  return password && password.length > 0 ? password : null;
}

export function getAdminDisplayName(): string {
  return process.env.ADMIN_NAME ?? "Master Admin";
}

/** True when this email is the environment master administrator. */
export function isEnvAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}

export function isEnvAdminConfigured(): boolean {
  return getAdminEmails().length > 0 && Boolean(getAdminPassword());
}

/** Constant-time password check for the environment admin account. */
export function verifyAdminPassword(password: string): boolean {
  const expected = getAdminPassword();
  if (!expected) return false;
  const a = Buffer.from(crypto.createHash("sha256").update(password).digest("hex"));
  const b = Buffer.from(crypto.createHash("sha256").update(expected).digest("hex"));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function adminSessionUser(email: string): SessionUser {
  return {
    uid: `env-admin:${email}`,
    email,
    displayName: getAdminDisplayName(),
    photoURL: null,
    emailVerified: true,
    role: "superadmin",
  };
}

/** Owner allowlist (setup bootstrap) — includes the env admin address. */
export function getOwnerEmails(): string[] {
  const configured = (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...configured, ...getAdminEmails()]));
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getOwnerEmails().includes(email.trim().toLowerCase());
}

/* -------------------------------------------------------------------- */
/* Session resolution                                                    */
/* -------------------------------------------------------------------- */

async function resolveEnvAdminSession(value: string): Promise<SessionUser | null> {
  const prefix = "env-admin:";
  if (!value.startsWith(prefix)) return null;
  const [, token] = value.split(":");
  const { verifySessionToken } = await import("@/lib/server/session");
  const payload = verifySessionToken(token ?? "");
  if (!payload) return null;
  const email = payload.email ?? payload.uid?.replace(prefix, "");
  if (!email || !isEnvAdmin(email)) return null;
  return adminSessionUser(email);
}

/**
 * Verify the session cookie server-side and return the user + role.
 * Handles: environment master admin token → active identity backend.
 */
export async function getSessionUser(): Promise<AuthResult> {
  const cookieStore = cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) return { user: null };

  // 1) Environment master administrator (always wins — full access)
  if (session.startsWith("env-admin:")) {
    const envUser = await resolveEnvAdminSession(session);
    if (envUser) return { user: envUser };
    return { user: null, error: "invalid-session" };
  }

  // 2) Embedded backend: signed session token
  if (identityBackend() === "local") {
    const resolved = await resolveIdentitySession(session);
    if (!resolved) return { user: null, error: "invalid-session" };
    const profile = await getIdentityUser(resolved.uid);
    return {
      user: {
        uid: resolved.uid,
        email: resolved.email,
        displayName: profile?.displayName ?? null,
        photoURL: profile?.photoURL ?? null,
        emailVerified: profile?.emailVerified ?? false,
        role: resolved.role,
      },
    };
  }

  // 3) Firebase session cookie
  const auth = getAdminAuth();
  if (!auth) return { user: null, error: "auth-unconfigured" };

  try {
    const decoded = await auth.verifySessionCookie(session, true);
    const rawRole = decoded.role as Role | undefined;
    const role: Role = rawRole ?? "user";
    const email = decoded.email ?? null;
    const effectiveRole: Role = isEnvAdmin(email) ? "superadmin" : role;
    return {
      user: {
        uid: decoded.uid,
        email,
        displayName: decoded.name ?? (isEnvAdmin(email) ? getAdminDisplayName() : null),
        photoURL: decoded.picture ?? null,
        emailVerified: Boolean(decoded.email_verified),
        role: isAdminRole(effectiveRole) || isOwnerRole(effectiveRole) ? effectiveRole : "user",
      },
    };
  } catch {
    return { user: null, error: "invalid-session" };
  }
}

/** Verify a Bearer ID token (for API clients that send Authorization header). */
export async function verifyIdToken(idToken: string): Promise<SessionUser | null> {
  const auth = getAdminAuth();
  if (!auth) return null;
  try {
    const decoded = await auth.verifyIdToken(idToken, true);
    const role = (decoded.role as Role | undefined) ?? "user";
    const email = decoded.email ?? null;
    const effectiveRole: Role = isEnvAdmin(email) ? "superadmin" : role;
    return {
      uid: decoded.uid,
      email,
      displayName: decoded.name ?? null,
      photoURL: decoded.picture ?? null,
      emailVerified: Boolean(decoded.email_verified),
      role: isAdminRole(effectiveRole) || isOwnerRole(effectiveRole) ? effectiveRole : "user",
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const { user } = await getSessionUser();
  if (!user) throw new AuthError("Authentication required", 401, "unauthenticated");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (!isAdminRole(user.role)) {
    throw new AuthError("Admin access required", 403, "forbidden");
  }
  return user;
}

export async function requireOwner(): Promise<SessionUser> {
  const user = await requireSession();
  if (!isOwnerRole(user.role)) {
    throw new AuthError("Owner access required", 403, "forbidden");
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 401, code = "unauthenticated") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
