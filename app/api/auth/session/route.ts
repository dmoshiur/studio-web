import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuth, isAdminConfigured } from "@/lib/firebase/admin";
import { SESSION_COOKIE } from "@/lib/server/auth";
import { handleApiError, requestIp } from "@/lib/server/api-helpers";
import { rateLimit, rateLimitHeaders, RATE_PRESETS, rateLimit as rl } from "@/lib/server/rate-limit";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ idToken: z.string().min(10).max(10000) });

/** Exchange a Firebase ID token for an httpOnly session cookie. */
export async function POST(req: Request) {
  try {
    if (!isAdminConfigured()) {
      return NextResponse.json({ error: "Authentication is not configured" }, { status: 503 });
    }
    const ip = requestIp(req);
    const rlResult = await rl(`auth:session:${ip}`, RATE_PRESETS.auth.limit, RATE_PRESETS.auth.windowMs);
    if (!rlResult.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rlResult, RATE_PRESETS.auth.limit) }
      );
    }
    const { idToken } = bodySchema.parse(await req.json());
    const auth = getAdminAuth();
    if (!auth) return NextResponse.json({ error: "Authentication is not configured" }, { status: 503 });

    const days = Math.min(Math.max(Number(process.env.SESSION_MAX_AGE_DAYS ?? 5), 1), 14);
    const expiresIn = days * 24 * 60 * 60 * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    const decoded = await auth.verifySessionCookie(sessionCookie, true);

    await auditLog({
      actorId: decoded.uid,
      actorEmail: decoded.email ?? undefined,
      action: "auth.login",
      result: "success",
      ip,
    });

    const res = NextResponse.json({ ok: true, role: (decoded.role as string) ?? "user" });
    res.cookies.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(expiresIn / 1000),
    });
    return res;
  } catch (err) {
    await auditLog({ action: "auth.login", result: "failure", ip: requestIp(req) });
    return handleApiError(err);
  }
}

/** Clear the session cookie. */
export async function DELETE() {
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
