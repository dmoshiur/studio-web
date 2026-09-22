import "server-only";
import crypto from "node:crypto";
import { getAdminDb, getDataBackend } from "@/lib/firebase/admin";
import {
  bumpSessionEpoch,
  consumeResetToken,
  createResetToken,
  getCredentialByEmail,
  getCredentialByUid,
  putCredential,
  updatePassword,
  verifyPassword,
} from "@/lib/server/local-credentials";
import { signSession, verifySessionToken, type LocalSessionPayload } from "@/lib/server/session";
import { deleteCredential } from "@/lib/server/local-credentials";
import type { Role } from "@/types";
import { isAdminRole, isOwnerRole } from "@/types";

/**
 * =====================================================================
 * Identity facade
 * =====================================================================
 * One API for both backends:
 *   • Firebase  → Firebase Authentication (Admin SDK)
 *   • Embedded  → credential table + signed session tokens
 * Every consumer (login, sessions, owner user management, profile)
 * talks to this module so the two backends stay interchangeable.
 */

export interface IdentityUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  disabled: boolean;
  role: Role;
  createdAt?: string | null;
  lastSignInAt?: string | null;
}

export class IdentityError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = "identity_error", status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function identityBackend(): "firebase" | "local" {
  return getDataBackend() === "firebase" ? "firebase" : "local";
}

function normalizeRole(value: unknown): Role {
  const role = String(value ?? "user") as Role;
  return role === "admin" || role === "owner" || role === "superadmin" ? role : "user";
}

async function getUserDoc(uid: string): Promise<Record<string, unknown> | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection("users").doc(uid).get();
  return snap.exists ? (snap.data() as Record<string, unknown>) : null;
}

export async function getIdentityUser(uid: string): Promise<IdentityUser | null> {
  if (identityBackend() === "firebase") {
    const { getAdminAuth } = await import("@/lib/firebase/admin");
    const auth = getAdminAuth();
    if (!auth) return null;
    try {
      const user = await auth.getUser(uid);
      return {
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
        emailVerified: user.emailVerified,
        disabled: user.disabled,
        role: normalizeRole(user.customClaims?.role),
        createdAt: user.metadata.creationTime,
        lastSignInAt: user.metadata.lastSignInTime,
      };
    } catch {
      return null;
    }
  }

  const doc = await getUserDoc(uid);
  if (!doc) return null;
  return {
    uid,
    email: (doc.email as string) ?? null,
    displayName: (doc.displayName as string) ?? null,
    photoURL: (doc.photoURL as string) ?? null,
    emailVerified: doc.emailVerified === true,
    disabled: doc.disabled === true,
    role: normalizeRole(doc.role),
    createdAt: (doc.createdAt as { toDate?: () => Date })?.toDate?.().toISOString() ?? null,
    lastSignInAt: (doc.lastSignInAt as { toDate?: () => Date })?.toDate?.().toISOString() ?? null,
  };
}

export async function listIdentityUsers(
  limit = 50,
  pageToken?: string
): Promise<{ users: IdentityUser[]; nextPageToken: string | null }> {
  if (identityBackend() === "firebase") {
    const { getAdminAuth } = await import("@/lib/firebase/admin");
    const auth = getAdminAuth();
    if (!auth) throw new IdentityError("Authentication backend not configured", "not_configured", 503);
    const result = await auth.listUsers(limit, pageToken);
    return {
      users: result.users.map((u) => ({
        uid: u.uid,
        email: u.email ?? null,
        displayName: u.displayName ?? null,
        photoURL: u.photoURL ?? null,
        emailVerified: u.emailVerified,
        disabled: u.disabled,
        role: normalizeRole(u.customClaims?.role),
        createdAt: u.metadata.creationTime,
        lastSignInAt: u.metadata.lastSignInTime,
      })),
      nextPageToken: result.pageToken ?? null,
    };
  }

  const db = getAdminDb();
  if (!db) throw new IdentityError("Authentication backend not configured", "not_configured", 503);
  const offset = Number(pageToken ?? 0) || 0;
  const snap = await db
    .collection("users")
    .orderBy("createdAt", "desc")
    .limit(limit + 1)
    .get();
  const all = snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      uid: d.id,
      email: (data.email as string) ?? null,
      displayName: (data.displayName as string) ?? null,
      photoURL: (data.photoURL as string) ?? null,
      emailVerified: data.emailVerified === true,
      disabled: data.disabled === true,
      role: normalizeRole(data.role),
      createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.().toISOString() ?? null,
      lastSignInAt: (data.lastSignInAt as { toDate?: () => Date })?.toDate?.().toISOString() ?? null,
    } satisfies IdentityUser;
  });
  const page = offset ? all.slice(offset) : all;
  const users = page.slice(0, limit);
  const nextPageToken = page.length > limit ? String(offset + limit) : null;
  return { users, nextPageToken };
}

export async function createIdentityUser(input: {
  email: string;
  password: string;
  displayName?: string | null;
  role?: Role;
}): Promise<IdentityUser> {
  const email = input.email.trim().toLowerCase();
  const role = input.role ?? "user";

  if (identityBackend() === "firebase") {
    const { getAdminAuth } = await import("@/lib/firebase/admin");
    const auth = getAdminAuth();
    if (!auth) throw new IdentityError("Authentication backend not configured", "not_configured", 503);
    try {
      const created = await auth.createUser({
        email,
        password: input.password,
        displayName: input.displayName ?? undefined,
        emailVerified: false,
      });
      if (role !== "user") await auth.setCustomUserClaims(created.uid, { role });
      await mirrorUserDoc(created.uid, { email, displayName: input.displayName ?? null, role, createdAt: new Date() });
      if (role !== "user") {
        const db = getAdminDb();
        if (db) {
          await db
            .collection("admins")
            .doc(created.uid)
            .set({ uid: created.uid, email, role, updatedAt: new Date() }, { merge: true });
        }
      }
      return {
        uid: created.uid,
        email,
        displayName: input.displayName ?? null,
        photoURL: null,
        emailVerified: false,
        disabled: false,
        role,
      };
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      if (code.includes("email-already-exists")) {
        throw new IdentityError("An account with this email already exists", "email_exists", 409);
      }
      throw new IdentityError(err instanceof Error ? err.message : "Could not create account", "create_failed", 400);
    }
  }

  if (getCredentialByEmail(email)) {
    throw new IdentityError("An account with this email already exists", "email_exists", 409);
  }
  const uid = crypto.randomUUID();
  putCredential(uid, email, input.password);
  await mirrorUserDoc(uid, {
    email,
    displayName: input.displayName ?? null,
    role,
    createdAt: new Date(),
    passwordLogin: true,
  });
  // Keep the admins collection in sync (powers last-owner protections).
  const db = getAdminDb();
  if (db && (role === "admin" || role === "owner" || role === "superadmin")) {
    await db
      .collection("admins")
      .doc(uid)
      .set({ uid, email, role, updatedAt: new Date() }, { merge: true });
  }
  return {
    uid,
    email,
    displayName: input.displayName ?? null,
    photoURL: null,
    emailVerified: false,
    disabled: false,
    role,
  };
}

/** Mirror the canonical user record into the users collection. */
export async function mirrorUserDoc(
  uid: string,
  patch: Record<string, unknown>
): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await db
    .collection("users")
    .doc(uid)
    .set({ uid, ...patch, updatedAt: new Date() }, { merge: true });
}

export async function authenticateWithPassword(
  email: string,
  password: string
): Promise<IdentityUser> {
  const normalized = email.trim().toLowerCase();

  if (identityBackend() === "firebase") {
    // Firebase password verification happens on the client SDK; the API
    // route exchanges the resulting ID token instead. This path exists so
    // the facade is complete for server-side tooling.
    throw new IdentityError(
      "Password sign-in for this deployment is performed with Firebase Authentication",
      "use_firebase_client",
      400
    );
  }

  const cred = getCredentialByEmail(normalized);
  if (!cred || !verifyPassword(password, cred.salt, cred.password_hash)) {
    throw new IdentityError("Invalid email or password", "invalid_credentials", 401);
  }
  const user = await getIdentityUser(cred.uid);
  if (!user) throw new IdentityError("Account not found", "not_found", 404);
  if (user.disabled) throw new IdentityError("This account has been disabled", "disabled", 403);
  await mirrorUserDoc(cred.uid, { lastLoginAt: new Date(), lastSignInAt: new Date() });
  return user;
}

/**
 * Permanently remove an account (credentials, profile docs and Firebase user).
 * Used by the owner console; the caller must guard against self-deletion and
 * against removing the last owner.
 */
export async function deleteIdentityUser(uid: string): Promise<void> {
  if (identityBackend() === "firebase") {
    const { getAdminAuth } = await import("@/lib/firebase/admin");
    const auth = getAdminAuth();
    if (auth) {
      await auth.deleteUser(uid).catch((err: { code?: string }) => {
        if (err?.code !== "auth/user-not-found") throw err;
      });
    }
  } else {
    deleteCredential(uid);
  }

  const db = getAdminDb();
  if (!db) return;
  await Promise.all([
    db.collection("users").doc(uid).delete().catch(() => undefined),
    db.collection("admins").doc(uid).delete().catch(() => undefined),
  ]);
}

export async function setIdentityRole(uid: string, role: Role): Promise<void> {
  if (identityBackend() === "firebase") {
    const { getAdminAuth } = await import("@/lib/firebase/admin");
    const auth = getAdminAuth();
    if (!auth) throw new IdentityError("Authentication backend not configured", "not_configured", 503);
    await auth.setCustomUserClaims(uid, { role });
    await auth.revokeRefreshTokens(uid).catch(() => undefined);
  } else {
    bumpSessionEpoch(uid);
  }
  const user = await getIdentityUser(uid);
  await mirrorUserDoc(uid, { role, email: user?.email ?? "", displayName: user?.displayName ?? null, photoURL: user?.photoURL ?? null });

  const db = getAdminDb();
  if (db) {
    if (role === "admin" || role === "owner" || role === "superadmin") {
      await db.collection("admins").doc(uid).set({ uid, email: user?.email ?? "", role, updatedAt: new Date() }, { merge: true });
    } else {
      await db.collection("admins").doc(uid).delete().catch(() => undefined);
    }
  }
}

export async function setIdentityDisabled(uid: string, disabled: boolean): Promise<void> {
  if (identityBackend() === "firebase") {
    const { getAdminAuth } = await import("@/lib/firebase/admin");
    const auth = getAdminAuth();
    if (!auth) throw new IdentityError("Authentication backend not configured", "not_configured", 503);
    await auth.updateUser(uid, { disabled });
    if (disabled) await auth.revokeRefreshTokens(uid).catch(() => undefined);
  } else {
    bumpSessionEpoch(uid);
  }
  await mirrorUserDoc(uid, { disabled });
}

export async function updateIdentityProfile(
  uid: string,
  patch: { displayName?: string | null; photoURL?: string | null; password?: string }
): Promise<void> {
  if (identityBackend() === "firebase") {
    const { getAdminAuth } = await import("@/lib/firebase/admin");
    const auth = getAdminAuth();
    if (!auth) throw new IdentityError("Authentication backend not configured", "not_configured", 503);
    await auth.updateUser(uid, {
      displayName: patch.displayName ?? undefined,
      photoURL: patch.photoURL ?? undefined,
      ...(patch.password ? { password: patch.password } : {}),
    });
  } else if (patch.password) {
    updatePassword(uid, patch.password);
  }
  await mirrorUserDoc(uid, {
    ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
    ...(patch.photoURL !== undefined ? { photoURL: patch.photoURL } : {}),
  });
}

/* -------------------------------------------------------------------- */
/* Password reset — custom token flow for BOTH backends.                */
/* Firebase's own reset emails are never used: we mint our own token,    */
/* store only its hash, and deliver the link via the studio's SMTP       */
/* mailer. Completion sets the new password through the identity facade. */
/* -------------------------------------------------------------------- */

const RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function beginPasswordReset(email: string, origin: string): Promise<{ token: string | null }> {
  const normalized = email.trim().toLowerCase();
  void origin; // link construction happens in the API route

  if (identityBackend() === "local") {
    const token = createResetToken(normalized);
    return { token };
  }

  // Firebase backend: mint our OWN token (never Firebase's OOB code) and
  // store its hash with the resolved uid.
  const { getAdminAuth } = await import("@/lib/firebase/admin");
  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) throw new IdentityError("Authentication backend not configured", "not_configured", 503);
  try {
    const user = await auth.getUserByEmail(normalized); // throws when absent
    const token = crypto.randomBytes(32).toString("hex");
    await db
      .collection("passwordResets")
      .doc(hashToken(token))
      .set({
        uid: user.uid,
        email: normalized,
        backend: "firebase",
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
        createdAt: new Date(),
      });
    return { token };
  } catch {
    // Unknown address (or transient failure) — respond exactly like success.
    return { token: null };
  }
}

export async function completePasswordReset(token: string, password: string): Promise<void> {
  if (identityBackend() === "local") {
    const uid = consumeResetToken(token, password);
    if (!uid) throw new IdentityError("This reset link is invalid or has expired", "invalid_token", 400);
    bumpSessionEpoch(uid);
    return;
  }

  const { getAdminAuth } = await import("@/lib/firebase/admin");
  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) throw new IdentityError("Authentication backend not configured", "not_configured", 503);

  const ref = db.collection("passwordResets").doc(hashToken(token));
  const snap = await ref.get();
  if (!snap.exists) throw new IdentityError("This reset link is invalid or has expired", "invalid_token", 400);
  const data = snap.data() as { uid?: string; expiresAt?: { toDate?: () => Date } };
  const expiresAt = data.expiresAt?.toDate?.().getTime() ?? 0;
  if (expiresAt < Date.now()) {
    await ref.delete().catch(() => undefined);
    throw new IdentityError("This reset link is invalid or has expired", "invalid_token", 400);
  }
  const uid = data.uid;
  if (!uid) throw new IdentityError("This reset link is invalid or has expired", "invalid_token", 400);

  await auth.updateUser(uid, { password });
  await auth.revokeRefreshTokens(uid).catch(() => undefined);
  await ref.delete().catch(() => undefined);
}

/* -------------------------------------------------------------------- */
/* Email verification                                                   */
/* -------------------------------------------------------------------- */

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Begin email verification. Returns a link that the caller delivers via
 * the studio's SMTP mailer — never Firebase's default templates.
 *  - local backend: own token, verified via PUT /api/auth/verify
 *  - firebase backend: Firebase action link (marks emailVerified after
 *    click), but still delivered through our SMTP transport
 */
export async function beginEmailVerification(user: {
  uid: string;
  email: string;
}, origin: string): Promise<{ link: string | null }> {
  if (identityBackend() === "local") {
    const db = getAdminDb();
    if (!db) return { link: null };
    const token = crypto.randomBytes(32).toString("hex");
    await db
      .collection("emailVerifications")
      .doc(hashToken(token))
      .set({
        uid: user.uid,
        email: user.email.trim().toLowerCase(),
        expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
        createdAt: new Date(),
      });
    return { link: `${origin}/verify-email?token=${token}` };
  }

  const { getAdminAuth } = await import("@/lib/firebase/admin");
  const auth = getAdminAuth();
  if (!auth) return { link: null };
  try {
    const link = await auth.generateEmailVerificationLink(user.email.trim().toLowerCase());
    return { link };
  } catch {
    return { link: null };
  }
}

/** Complete email verification with a token minted by beginEmailVerification (local backend). */
export async function completeEmailVerification(token: string): Promise<void> {
  if (identityBackend() !== "local") {
    throw new IdentityError(
      "Email verification for this deployment is completed through Firebase's action page",
      "use_firebase",
      400
    );
  }
  const db = getAdminDb();
  if (!db) throw new IdentityError("Authentication backend not configured", "not_configured", 503);

  const ref = db.collection("emailVerifications").doc(hashToken(token));
  const snap = await ref.get();
  if (!snap.exists) throw new IdentityError("This verification link is invalid or has expired", "invalid_token", 400);
  const data = snap.data() as { uid?: string; expiresAt?: { toDate?: () => Date } };
  const expiresAt = data.expiresAt?.toDate?.().getTime() ?? 0;
  if (expiresAt < Date.now()) {
    await ref.delete().catch(() => undefined);
    throw new IdentityError("This verification link is invalid or has expired", "invalid_token", 400);
  }
  const uid = data.uid;
  if (!uid) throw new IdentityError("This verification link is invalid or has expired", "invalid_token", 400);

  await mirrorUserDoc(uid, { emailVerified: true });
  await ref.delete().catch(() => undefined);
}

/* --------------------------- Session tokens --------------------------- */

export async function createIdentitySession(
  user: Pick<IdentityUser, "uid" | "email" | "role">
): Promise<{ token: string; maxAgeSeconds: number }> {
  const days = Math.min(Math.max(Number(process.env.SESSION_MAX_AGE_DAYS ?? 7), 1), 14);
  const maxAgeSeconds = days * 24 * 60 * 60;
  const epoch = identityBackend() === "local" ? getCredentialByUid(user.uid)?.session_epoch ?? 0 : 0;
  const payload: LocalSessionPayload = {
    uid: user.uid,
    role: user.role,
    epoch,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  return { token: await signSession(payload), maxAgeSeconds };
}

export interface ResolvedIdentity {
  uid: string;
  role: Role;
  email: string | null;
}

/** Resolve a session cookie issued by either backend. */
export async function resolveIdentitySession(cookieValue: string): Promise<ResolvedIdentity | null> {
  if (identityBackend() === "firebase") {
    const { getAdminAuth } = await import("@/lib/firebase/admin");
    const auth = getAdminAuth();
    if (!auth) return null;
    try {
      const decoded = await auth.verifySessionCookie(cookieValue, true);
      return { uid: decoded.uid, role: normalizeRole(decoded.role), email: decoded.email ?? null };
    } catch {
      return null;
    }
  }

  const payload = await verifySessionToken(cookieValue);
  if (!payload) return null;
  const cred = getCredentialByUid(payload.uid);
  if (cred && cred.session_epoch !== payload.epoch) return null; // session revoked
  const user = await getIdentityUser(payload.uid);
  if (!user || user.disabled) return null;
  return { uid: user.uid, role: user.role, email: user.email };
}

export { isAdminRole, isOwnerRole };
