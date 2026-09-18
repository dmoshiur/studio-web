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

/**
 * Request a password reset link.
 *
 * The reset link is ALWAYS delivered through the studio's custom SMTP
 * transport (Nodemailer — see lib/server/auth-emails.ts). Firebase's
 * default password-reset emails are never triggered: on the Firebase
 * backend we mint our own token and set the new password via the Admin SDK
 * when the link is used. Never reveals whether the email exists.
 */
export async function POST(req: Request) {
  try {
    const rl = await rateLimit(`auth:reset:${requestIp(req)}`, RATE_PRESETS.auth.limit, RATE_PRESETS.auth.windowMs);
    if (!rl.allowed) return apiError("Too many attempts. Please try again later.", 429, "rate_limited");

    const { email } = await parseBody(req, passwordResetRequestSchema);
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

    // Mint the token once; the same token is emailed (and, in local dev
    // without SMTP, optionally surfaced to the requester).
    const { token } = await beginPasswordReset(email, origin);

    let delivered = false;
    if (token && isSmtpConfigured()) {
      try {
        const settings = await getPublicSettings();
        const link = `${origin}/forgot-password?token=${token}`;
        await sendMail({
          to: email,
          subject: `Reset your ${settings.siteName} password`,
          html: baseEmailTemplate({
            title: "Reset your password",
            bodyHtml: `<p>We received a request to reset the password for your ${settings.siteName} account.</p>
              <p style="margin:28px 0;text-align:center">
                <a href="${link}" style="display:inline-block;padding:13px 26px;border-radius:10px;background:#b99352;color:#0b0b0d;font-weight:600;text-decoration:none">Choose a new password</a>
              </p>
              <p style="color:#8b8b93;font-size:12px">The link expires in 30 minutes. If you didn't request this, you can safely ignore this email — your password stays unchanged.</p>`,
          }),
          text: `Reset your password: ${link} (expires in 30 minutes)`,
        });
        delivered = true;
      } catch (err) {
        // Transport failure must look identical to the client — log server-side only.
        console.error("[password-reset] SMTP delivery failed:", err);
      }
    }

    await auditLog({ actorEmail: email, action: "auth.password_reset.request", result: "success" });
    return ok({
      ok: true,
      delivered,
      // Local development convenience ONLY: surface the link when no mailer
      // is set up and we are not in production. Never returned in prod.
      ...(token && !delivered && identityBackend() === "local" && process.env.NODE_ENV !== "production"
        ? { resetToken: token }
        : {}),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Complete a password reset with a valid token. */
export async function PUT(req: Request) {
  try {
    const rl = await rateLimit(`auth:reset-confirm:${requestIp(req)}`, RATE_PRESETS.auth.limit, RATE_PRESETS.auth.windowMs);
    if (!rl.allowed) return apiError("Too many attempts. Please try again later.", 429, "rate_limited");

    const body = await parseBody(req, confirmSchema);
    await completePasswordReset(body.token, body.password);
    await auditLog({ action: "auth.password_reset.complete", result: "success" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof IdentityError) return apiError(err.message, err.status, err.code);
    return handleApiError(err);
  }
}
