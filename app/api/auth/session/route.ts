import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuth, getDataBackend, isAdminConfigured } from "@/lib/firebase/admin";
import { SESSION_COOKIE, adminSessionUser, isEnvAdmin, isEnvAdminConfigured, verifyAdminPassword } from "@/lib/server/auth";
import {
  authenticateWithPassword,
  createIdentitySession,
  getIdentityUser,
  identityBackend,
  IdentityError,
} from "@/lib/server/identity";
import { getCredentialByEmail } from "@/lib/server/local-credentials";
import { handleApiError, requestIp } from "@/lib/server/api-helpers";
import { rateLimit, rateLimitHeaders, RATE_PRESETS } from "@/lib/server/rate-limit";
import { auditLog } from "@/lib/server/audit";
import { bumpCounter, opsInfo, opsWarn } from "@/lib/server/ops-log";
import type { Role } from "@/types";
import { isAdminRole, isOwnerRole } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const firebaseSchema = z.object({ idToken: z.string().min(10).max(10000) });
const passwordSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
});

function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

function redirectForRole(role: Role): string {
  if (role === "admin" || role === "owner" || role === "superadmin") return "/admin";
  return "/";
}

/**
 * Create a session. Two accepted credential shapes:
 *  1. { email, password }  → the ACTIVE IDENTITY STORE (the exact same
 *     state the password-reset flow writes). On the embedded backend that
 *     is the scrypt-hashed credential table; on Firebase deployments the
 *     password is verified client-side and exchanged as an ID token, so
 *     this shape only serves the store + the env break-glass below.
 *  2. { idToken }          → Firebase Authentication (client SDK sign-in)
 *
 * The environment master admin (ADMIN_EMAIL/ADMIN_PASSWORD) is used ONLY
 * to bootstrap / as break-glass while the account does not yet exist in
 * the identity store. Once the account exists (it is seeded on boot), the
 * store is the single source of truth — a password changed or reset
 * through the account flows is effective immediately and the original env
 * value no longer grants access.
 */
export async function POST(req: Request) {
  try {
    const ip = requestIp(req);
    const rlResult = await rateLimit(`auth:session:${ip}`, RATE_PRESETS.auth.limit, RATE_PRESETS.auth.windowMs);
    if (!rlResult.allowed) {
      const res = NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rlResult, RATE_PRESETS.auth.limit) }
      );
      return res;
    }

    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!raw) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

    /* ---------------- Email + password ---------------- */
    if (typeof raw.email === "string") {
      const { email, password } = passwordSchema.parse(raw);
      const normalized = email.trim().toLowerCase();

      // 1) Embedded backend — verify against the credential store (the same
      //    record the forgot-password flow updates). Same algorithm and
      //    comparison used when the password was created or reset (scrypt).
      if (identityBackend() === "local") {
        const cred = getCredentialByEmail(normalized);
        if (cred) {
          try {
            const user = await authenticateWithPassword(normalized, password);
            const { token, maxAgeSeconds } = await createIdentitySession(user);
            await auditLog({ actorId: user.uid, actorEmail: normalized, actorRole: user.role, action: "auth.login", result: "success", metadata: { mode: "password" }, ip });
            bumpCounter("authSuccess");
            const res = NextResponse.json({
              ok: true,
              role: user.role,
              redirect: redirectForRole(user.role),
              user,
            });
            res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(maxAgeSeconds));
            return res;
          } catch (err) {
            if (err instanceof IdentityError) {
              await auditLog({ actorEmail: normalized, action: "auth.login", result: "failure", metadata: { mode: "password", code: err.code }, ip });
              bumpCounter("authFailures");
              opsWarn("auth", `Failed sign-in attempt for ${normalized}`);
              // Generic message — never reveal which half was wrong.
              return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
            }
            throw err;
          }
        }
      }

      // 2) Environment master administrator — break-glass ONLY while the
      //    account does not exist in the identity store (bootstrap gap).
      //    Once it exists, the store decides — so a reset password works
      //    immediately and a stale env value cannot override it.
      let storeHasAccount = identityBackend() === "local" ? getCredentialByEmail(normalized) !== null : false;
      if (!storeHasAccount && isEnvAdmin(normalized) && isEnvAdminConfigured() && verifyAdminPassword(password)) {
        if (identityBackend() === "firebase") {
          const auth = getAdminAuth();
          storeHasAccount = auth
            ? await auth.getUserByEmail(normalized).then(() => true).catch(() => false)
            : true;
        }
        if (!storeHasAccount) {
          const user = adminSessionUser(normalized);
          const { token, maxAgeSeconds } = await createIdentitySession(user);
          await auditLog({ actorId: user.uid, actorEmail: normalized, actorRole: user.role, action: "auth.login", result: "success", metadata: { mode: "env-admin" }, ip });
          bumpCounter("authSuccess");
          opsInfo("auth", `Master administrator signed in via env break-glass (${normalized})`);
          const res = NextResponse.json({ ok: true, role: user.role, redirect: redirectForRole(user.role), user });
          res.cookies.set(SESSION_COOKIE, `env-admin:${token}`, sessionCookieOptions(maxAgeSeconds));
          return res;
        }
      }

      if (identityBackend() === "local") {
        await auditLog({ actorEmail: normalized, action: "auth.login", result: "failure", metadata: { mode: "password", code: "invalid_credentials" }, ip });
        bumpCounter("authFailures");
        opsWarn("auth", `Failed sign-in attempt for ${normalized}`);
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }

      // 3) Firebase deployments verify passwords through the client SDK
      //    (Firebase Auth is the credential store the reset flow writes).
      //    The login page exchanges the resulting ID token below.
      return NextResponse.json(
        { error: "Password verification runs through the authentication provider.", code: "use_firebase_client" },
        { status: 400 }
      );
    }

    /* ---------------- Firebase ID token ---------------- */
    const { idToken } = firebaseSchema.parse(raw);
    if (!isAdminConfigured() || getDataBackend() === "local") {
      return NextResponse.json({ error: "Authentication service is not configured" }, { status: 503 });
    }
    const auth = getAdminAuth();
    if (!auth) return NextResponse.json({ error: "Authentication service is not configured" }, { status: 503 });

    const days = Math.min(Math.max(Number(process.env.SESSION_MAX_AGE_DAYS ?? 7), 1), 14);
    const expiresIn = days * 24 * 60 * 60 * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    const decoded = await auth.verifySessionCookie(sessionCookie, true);

    const profile = await getIdentityUser(decoded.uid);
    const claimRole = String((decoded as { role?: unknown }).role ?? "user") as Role;
    const role: Role = isEnvAdmin(decoded.email ?? null)
      ? "superadmin"
      : isAdminRole(claimRole) || isOwnerRole(claimRole)
        ? claimRole
        : "user";
    const user = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      displayName: decoded.name ?? profile?.displayName ?? null,
      photoURL: decoded.picture ?? profile?.photoURL ?? null,
      emailVerified: Boolean(decoded.email_verified) || profile?.emailVerified === true,
      role,
    };

    await auditLog({
      actorId: decoded.uid,
      actorEmail: decoded.email ?? undefined,
      actorRole: role,
      action: "auth.login",
      result: "success",
      metadata: { mode: "firebase" },
      ip,
    });
    bumpCounter("authSuccess");

    const res = NextResponse.json({ ok: true, role, redirect: redirectForRole(role), user });
    res.cookies.set(SESSION_COOKIE, sessionCookie, sessionCookieOptions(Math.floor(expiresIn / 1000)));
    return res;
  } catch (err) {
    if (err instanceof IdentityError) {
      await auditLog({ action: "auth.login", result: "failure", ip: requestIp(req), metadata: { code: err.code } });
      bumpCounter("authFailures");
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    await auditLog({ action: "auth.login", result: "failure", ip: requestIp(req) });
    return handleApiError(err);
  }
}

/**
 * Log out. This is a real server-side invalidation, not just a cookie
 * deletion: for database-backed accounts the session epoch is bumped so
 * every token issued before this moment stops verifying. The cookie is
 * then cleared on the client.
 */
export async function DELETE() {
  try {
    const { getSessionUser } = await import("@/lib/server/auth");
    const { user } = await getSessionUser();
    if (user && identityBackend() === "local" && !user.uid.startsWith("env-admin:")) {
      const { bumpSessionEpoch } = await import("@/lib/server/local-credentials");
      bumpSessionEpoch(user.uid);
    }
    if (user) {
      await auditLog({ actor: user, action: "auth.logout", result: "success" });
    }
  } catch {
    /* logout must always succeed — the cookie gets cleared regardless */
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
