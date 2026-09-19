import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validation/schemas";
import { apiError, handleApiError, parseBody, requestIp } from "@/lib/server/api-helpers";
import { rateLimit, RATE_PRESETS } from "@/lib/server/rate-limit";
import { auditLog } from "@/lib/server/audit";
import { createIdentityUser, createIdentitySession, IdentityError } from "@/lib/server/identity";
import { sendEmailVerificationEmail } from "@/lib/server/auth-emails";
import { SESSION_COOKIE } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Self-service registration for the public site (role: user).
 *  Returns a session cookie so the user is signed in immediately. */
export async function POST(req: Request) {
  try {
    if ((process.env.ALLOW_REGISTRATION ?? "true").toLowerCase() === "false") {
      return apiError("Registration is currently closed", 403, "registration_closed");
    }
    const rl = await rateLimit(`auth:register:${requestIp(req)}`, RATE_PRESETS.auth.limit, RATE_PRESETS.auth.windowMs);
    if (!rl.allowed) return apiError("Too many attempts. Please try again later.", 429, "rate_limited");

    const body = await parseBody(req, registerSchema);
    const user = await createIdentityUser({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
      role: "user",
    });

    // Create session token immediately — no second round-trip needed
    const { token, maxAgeSeconds } = await createIdentitySession(user);

    await auditLog({
      actorId: user.uid,
      actorEmail: user.email ?? undefined,
      action: "auth.register",
      result: "success",
      ip: requestIp(req),
    });

    // Email verification — delivered through the studio's custom SMTP
    // transport (never Firebase's default flow). Fire-and-forget: a mail
    // outage must never block a registration.
    if (user.email) {
      void sendEmailVerificationEmail(
        { uid: user.uid, email: user.email },
        process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
      ).catch((err) => console.error("[register] verification email failed:", err));
    }

    const res = NextResponse.json(
      { ok: true, user: { uid: user.uid, email: user.email, role: user.role }, redirect: "/" },
      { status: 201 }
    );
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(maxAgeSeconds));
    return res;
  } catch (err) {
    if (err instanceof IdentityError) return apiError(err.message, err.status, err.code);
    return handleApiError(err);
  }
}
