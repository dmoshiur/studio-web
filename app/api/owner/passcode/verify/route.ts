import { NextResponse } from "next/server";
import { z } from "zod";
import { HA_COOKIE, haCookieOptions, issueHaSession } from "@/lib/server/ha-session";
import { maybeAutoRotate, verifyPasscode } from "@/lib/server/passcode";
import { handleApiError, rateLimitKey, requestIp } from "@/lib/server/api-helpers";
import { rateLimit, rateLimitHeaders, RATE_PRESETS } from "@/lib/server/rate-limit";
import { auditLog } from "@/lib/server/audit";
import { bumpCounter } from "@/lib/server/ops-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  passcode: z.string().min(4).max(128),
});

/**
 * Verify the rotating operations passcode. This is the ONLY way into the
 * /hackeradmin panel. Server-side checks: per-IP rate limit, global
 * lockout, expiry and constant-time hash comparison. On success a signed
 * httpOnly session cookie is issued; on failure only generic reasons are
 * returned (the passcode itself is never echoed anywhere).
 */
export async function POST(req: Request) {
  try {
    const ip = requestIp(req);

    // Expired passcodes rotate lazily — give a fresh code a chance to exist.
    await maybeAutoRotate();

    const rl = await rateLimit(rateLimitKey("ha:verify", req), 5, 15 * 60_000);
    if (!rl.allowed) {
      bumpCounter("rateLimited");
      return NextResponse.json(
        { error: "Too many attempts. Please wait and try again.", code: "rate_limited" },
        { status: 429, headers: rateLimitHeaders(rl, 5) }
      );
    }

    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!raw) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    const { passcode } = schema.parse(raw);

    const result = await verifyPasscode(passcode);

    if (!result.ok) {
      await auditLog({
        actorId: "hackeradmin-gate",
        action: "hackeradmin.passcode.verify",
        result: "failure",
        metadata: { reason: result.reason },
        ip,
      });
      if (result.reason === "locked") {
        return NextResponse.json(
          {
            error: "Too many invalid attempts. Entry is temporarily locked.",
            code: "locked",
            lockedUntil: result.lockedUntil,
          },
          { status: 423 }
        );
      }
      if (result.reason === "expired" || result.reason === "no_passcode") {
        return NextResponse.json(
          {
            error: "No valid passcode is currently active. A new one is issued automatically when email delivery is available.",
            code: result.reason,
          },
          { status: 410 }
        );
      }
      return NextResponse.json({ error: "Invalid passcode", code: "invalid" }, { status: 401 });
    }

    const { token, maxAgeSeconds } = issueHaSession(result.sessionEpoch ?? 0);
    await auditLog({
      actorId: "hackeradmin-gate",
      action: "hackeradmin.passcode.verify",
      result: "success",
      ip,
    });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(HA_COOKIE, token, haCookieOptions(maxAgeSeconds));
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
