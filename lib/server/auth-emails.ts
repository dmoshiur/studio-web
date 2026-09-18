import "server-only";
import { baseEmailTemplate, isSmtpConfigured, sendMail } from "@/lib/email/mailer";
import { getPublicSettings } from "@/lib/firestore/settings";
import {
  beginEmailVerification,
  beginPasswordReset,
} from "@/lib/server/identity";

/**
 * Auth emails — every transactional authentication mail (password reset,
 * email verification, welcome) is delivered through the studio's custom
 * SMTP transport (Nodemailer). Firebase's default reset/verification email
 * flow is never used: we mint our own links and send them ourselves.
 */

function actionButton(href: string, label: string): string {
  return `<p style="margin:28px 0;text-align:center">
    <a href="${href}" style="display:inline-block;padding:13px 26px;border-radius:10px;background:#b99352;color:#0b0b0d;font-weight:600;text-decoration:none">${label}</a>
  </p>
  <p style="color:#8b8b93;font-size:12px;word-break:break-all">Or paste this link into your browser:<br />${href}</p>`;
}

/**
 * Send a password-reset link for `email`.
 * Returns whether a link existed AND the mail was handed to the transport.
 * Never reveals whether the account exists.
 */
export async function sendPasswordResetEmail(email: string, origin: string): Promise<boolean> {
  const { token } = await beginPasswordReset(email, origin);
  if (!token) return false;
  if (!isSmtpConfigured()) return false;

  const settings = await getPublicSettings();
  const link = `${origin}/forgot-password?token=${token}`;
  await sendMail({
    to: email,
    subject: `Reset your ${settings.siteName} password`,
    html: baseEmailTemplate({
      title: "Reset your password",
      bodyHtml: `<p>We received a request to reset the password for your ${settings.siteName} account.</p>
        ${actionButton(link, "Choose a new password")}
        <p style="color:#8b8b93;font-size:12px">The link expires in 30 minutes. If you didn't request this, you can safely ignore this email — your password stays unchanged.</p>`,
    }),
    text: `Reset your password: ${link} (expires in 30 minutes)`,
  });
  return true;
}

/**
 * Send an email-verification link for a freshly created account.
 * Fire-and-forget friendly: failures are swallowed by the caller.
 */
export async function sendEmailVerificationEmail(
  user: { uid: string; email: string },
  origin: string
): Promise<boolean> {
  const { link } = await beginEmailVerification(user, origin);
  if (!link) return false;
  if (!isSmtpConfigured()) return false;

  const settings = await getPublicSettings();
  await sendMail({
    to: user.email,
    subject: `Verify your email — ${settings.siteName}`,
    html: baseEmailTemplate({
      title: `Welcome to ${settings.siteName}`,
      bodyHtml: `<p>Your account is ready. Confirm your email address to activate every part of the studio.</p>
        ${actionButton(link, "Verify my email")}
        <p style="color:#8b8b93;font-size:12px">The link expires in 24 hours.</p>`,
    }),
    text: `Verify your email: ${link} (expires in 24 hours)`,
  });
  return true;
}

/** True when transactional mail can actually be delivered. */
export function mailDeliveryAvailable(): boolean {
  return isSmtpConfigured();
}
