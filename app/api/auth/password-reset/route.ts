import { NextResponse } from "next/server";
import { z } from "zod";
import { passwordResetRequestSchema } from "@/lib/validation/schemas";
import { apiError, handleApiError, ok, parseBody, requestIp } from "@/lib/server/api-helpers";
import { rateLimit, RATE_PRESETS } from "@/lib/server/rate-limit";
import { auditLog } from "@/lib/server/audit";
import { baseEmailTemplate, isSmtpConfigured, sendMail } from "@/lib/email/mailer";
import { getPublicSettings } from "@/lib/firestore/settings";
import {
  beginPasswordReset,
  completePasswordReset,
  identityBackend,
  IdentityError,
} from "@/lib/server/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const confirmSchema = z.object({
  token: z.string().min(10).max(512),
  password: z.string().min(8).max(200),
});

/** Request a password reset link. Never reveals whether the email exists. */
export async function POST(req: Request) {
  try {
    const rl = await rateLimit(`auth:reset:${requestIp(req)}`, RATE_PRESETS.auth.limit, RATE_PRESETS.auth.windowMs);
    if (!rl.allowed) return apiError("Too many attempts. Please try again later.", 429, "rate_limited");

    const { email } = await parseBody(req, passwordResetRequestSchema);
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
    const { token } = await beginPasswordReset(email, origin);

    let delivered = false;
    if (token && identityBackend() === "local" && isSmtpConfigured()) {
      try {
        const settings = await getPublicSettings();
        const link = `${origin}/forgot-password?token=${token}`;
        await sendMail({
          to: email,
          subject: `Reset your ${settings.siteName} password`,
          html: baseEmailTemplate({
            title: "Reset your password",
            bodyHtml: `<p>Use the button below to choose a new password. The link expires in 30 minutes.</p>
              <p><a href="${link}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#c9a227;color:#0b0b0d;font-weight:600;text-decoration:none">Choose a new password</a></p>
              <p style="color:#8b8b93;font-size:12px">If you didn't request this, you can safely ignore this email.</p>`,
          }),
          text: `Reset your password: ${link}`,
        });
        delivered = true;
      } catch (err) {
        console.error("[password-reset] email failed:", err);
      }
    }

    await auditLog({ actorEmail: email, action: "auth.password_reset.request", result: "success" });
    return ok({
      ok: true,
      delivered,
      // Local development convenience: surface the link when no mailer is set up.
      ...(token && !delivered && identityBackend() === "local" ? { resetToken: token } : {}),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Complete a password reset with a valid token. */
export async function PUT(req: Request) {
  try {
    const body = await parseBody(req, confirmSchema);
    await completePasswordReset(body.token, body.password);
    await auditLog({ action: "auth.password_reset.complete", result: "success" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof IdentityError) return apiError(err.message, err.status, err.code);
    return handleApiError(err);
  }
}
