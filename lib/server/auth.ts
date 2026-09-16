import "server-only";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import type { Role, SessionUser } from "@/types";

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "__session";

export interface AuthResult {
  user: SessionUser | null;
  error?: string;
}

/**
 * Verify the session cookie server-side and return the user + role.
 * Role comes from Firebase Auth custom claims (set server-side only).
 */
export async function getSessionUser(): Promise<AuthResult> {
  const cookieStore = cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) return { user: null };

  const auth = getAdminAuth();
  if (!auth) return { user: null, error: "auth-unconfigured" };

  try {
    const decoded = await auth.verifySessionCookie(session, true);
    const role = (decoded.role as Role | undefined) ?? "user";
    const safeRole: Role = role === "owner" || role === "admin" ? role : "user";
    return {
      user: {
        uid: decoded.uid,
        email: decoded.email ?? null,
        displayName: decoded.name ?? null,
        photoURL: decoded.picture ?? null,
        emailVerified: Boolean(decoded.email_verified),
        role: safeRole,
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
    const safeRole: Role = role === "owner" || role === "admin" ? role : "user";
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      displayName: decoded.name ?? null,
      photoURL: decoded.picture ?? null,
      emailVerified: Boolean(decoded.email_verified),
      role: safeRole,
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
  if (user.role !== "admin" && user.role !== "owner") {
    throw new AuthError("Admin access required", 403, "forbidden");
  }
  return user;
}

export async function requireOwner(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== "owner") {
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

export function getOwnerEmails(): string[] {
  return (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
