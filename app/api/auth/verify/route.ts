import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, handleApiError, ok, parseBody, requestIp } from "@/lib/server/api-helpers";
import { rateLimit, RATE_PRESETS } from "@/lib/server/rate-limit";
import { auditLog } from "@/lib/server/audit";
import { requireSession } from "@/lib/server/auth";
import { sendEmailVerificationEmail } from "@/lib/server/auth-emails";
import { completeEmailVerification, IdentityError } from "@/lib/server/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const completeSchema = z.object({
  token: z.string().min(10).max(512),
});

/** Resend the verification email for the signed-in account (via SMTP). */
export async function POST(req: Request) {
  try {
    const rl = await rateLimit(`auth:verify:${requestIp(req)}`, RATE_PRESETS.auth.limit, RATE_PRESETS.auth.windowMs);
    if (!rl.allowed) return apiError("Too many attempts. Please try again later.", 429, "rate_limited");

    const user = await requireSession();
    if (!user.email) return apiError("This account has no email address", 400, "no_email");
    if (user.emailVerified) return ok({ ok: true, alreadyVerified: true });

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
    const sent = await sendEmailVerificationEmail(
      { uid: user.uid, email: user.email },
      origin
    ).catch((err) => {
      console.error("[verify] verification email failed:", err);
      return false;
    });

    await auditLog({ actor: user, action: "auth.verify.request", result: "success" });
    return ok({ ok: true, sent });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Complete email verification with a token (local backend). */
export async function PUT(req: Request) {
  try {
    const rl = await rateLimit(`auth:verify-confirm:${requestIp(req)}`, RATE_PRESETS.auth.limit, RATE_PRESETS.auth.windowMs);
    if (!rl.allowed) return apiError("Too many attempts. Please try again later.", 429, "rate_limited");

    const { token } = await parseBody(req, completeSchema);
    await completeEmailVerification(token);
    await auditLog({ action: "auth.verify.complete", result: "success" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof IdentityError) return apiError(err.message, err.status, err.code);
    return handleApiError(err);
  }
}
