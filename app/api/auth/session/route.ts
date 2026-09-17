import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuth, getDataBackend, isAdminConfigured } from "@/lib/firebase/admin";
import { SESSION_COOKIE, adminSessionUser, isEnvAdmin, isEnvAdminConfigured, verifyAdminPassword } from "@/lib/server/auth";
import {
  authenticateWithPassword,
  createIdentitySession,
  identityBackend,
  IdentityError,
} from "@/lib/server/identity";
import { handleApiError, requestIp } from "@/lib/server/api-helpers";
import { rateLimit, rateLimitHeaders, RATE_PRESETS } from "@/lib/server/rate-limit";
import { auditLog } from "@/lib/server/audit";
import { bumpCounter, opsInfo, opsWarn } from "@/lib/server/ops-log";

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

/**
 * Create a session. Two accepted credential shapes:
 *  1. { email, password }  → environment master admin, then the active backend
 *  2. { idToken }          → Firebase Authentication (client SDK sign-in)
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

      // 1) Environment master administrator — full platform access.
      //    Only attempt if env admin is fully configured (email AND password set).
      if (isEnvAdmin(normalized) && isEnvAdminConfigured()) {
        if (verifyAdminPassword(password)) {
          // Env admin password matches → grant superadmin access
          const user = adminSessionUser(normalized);
          const { token, maxAgeSeconds } = await createIdentitySession(user);
          await auditLog({ actorId: user.uid, actorEmail: normalized, actorRole: user.role, action: "auth.login", result: "success", metadata: { mode: "env-admin" }, ip });
          bumpCounter("authSuccess");
          opsInfo("auth", `Master administrator signed in (${normalized})`);
          const res = NextResponse.json({ ok: true, role: user.role, redirect: "/hackeradmin", user });
          res.cookies.set(SESSION_COOKIE, `env-admin:${token}`, sessionCookieOptions(maxAgeSeconds));
          return res;
        }
        // Env admin password didn't match — fall through to check database
        // credentials. This allows a user who registered with the same email
        // through the form to still log in with their own password.
      }

      // 2) Embedded backend credentials.
      //    Covers: (a) normal user registrations, (b) env admin email with
      //    wrong env password but correct database password.
      if (identityBackend() === "local") {
        try {
          const user = await authenticateWithPassword(normalized, password);
          const { token, maxAgeSeconds } = await createIdentitySession(user);
          await auditLog({ actorId: user.uid, actorEmail: normalized, actorRole: user.role, action: "auth.login", result: "success", metadata: { mode: "password" }, ip });
          bumpCounter("authSuccess");
          const res = NextResponse.json({
            ok: true,
            role: user.role,
            redirect: user.role === "admin" || user.role === "owner" || user.role === "superadmin" ? (user.role === "admin" ? "/admin" : "/hackeradmin") : "/",
            user,
          });
          res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(maxAgeSeconds));
          return res;
        } catch (err) {
          if (err instanceof IdentityError) {
            await auditLog({ actorEmail: normalized, action: "auth.login", result: "failure", metadata: { mode: "password", code: err.code }, ip });
            bumpCounter("authFailures");
            opsWarn("auth", `Failed sign-in attempt for ${normalized}`);
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
          }
          throw err;
        }
      }

      // 3) Firebase deployments verify passwords through the client SDK.
      return NextResponse.json(
        { error: "This deployment authenticates with Firebase — please sign in with the Firebase client.", code: "use_firebase_client" },
        { status: 400 }
      );
    }

    /* ---------------- Firebase ID token ---------------- */
    const { idToken } = firebaseSchema.parse(raw);
    if (!isAdminConfigured() || getDataBackend() === "local") {
      return NextResponse.json({ error: "Firebase Authentication is not configured" }, { status: 503 });
    }
    const auth = getAdminAuth();
    if (!auth) return NextResponse.json({ error: "Firebase Authentication is not configured" }, { status: 503 });

    const days = Math.min(Math.max(Number(process.env.SESSION_MAX_AGE_DAYS ?? 7), 1), 14);
    const expiresIn = days * 24 * 60 * 60 * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    const decoded = await auth.verifySessionCookie(sessionCookie, true);

    await auditLog({
      actorId: decoded.uid,
      actorEmail: decoded.email ?? undefined,
      action: "auth.login",
      result: "success",
      metadata: { mode: "firebase" },
      ip,
    });

    const res = NextResponse.json({ ok: true, role: (decoded.role as string) ?? "user" });
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
