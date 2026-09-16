import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireOwner } from "@/lib/server/auth";
import { baseEmailTemplate, getEffectiveSmtpConfig, sendMail } from "@/lib/email/mailer";
import { smtpTestSchema } from "@/lib/validation/schemas";
import { apiError, handleApiError, ok, parseBody, rateLimitKey } from "@/lib/server/api-helpers";
import { rateLimit, RATE_PRESETS } from "@/lib/server/rate-limit";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireOwner();
    const rl = await rateLimit(rateLimitKey("smtp-test", req, user.uid), RATE_PRESETS.smtpTest.limit, RATE_PRESETS.smtpTest.windowMs);
    if (!rl.allowed) return apiError("Too many test emails. Try again later.", 429, "rate_limited");
    const { to } = await parseBody(req, smtpTestSchema);
    const cfg = await getEffectiveSmtpConfig();
    if (!cfg) return apiError("SMTP is not configured", 503, "not_configured");
    const { messageId } = await sendMail({
      to,
      subject: `[${cfg.fromName}] SMTP test email`,
      html: baseEmailTemplate({
        title: "SMTP test",
        bodyHtml: `<p>Your SMTP configuration is working. This test email was sent from the owner control panel.</p>
          <p style="color:#6a6b7c;font-size:13px;">Host: ${cfg.host} · Port: ${cfg.port} · User: ${cfg.user}</p>`,
      }),
      text: "Your SMTP configuration is working.",
    });
    try {
      const db = getAdminDb();
      await db?.collection("siteSettings").doc("smtpMeta").set(
        { lastTestAt: new Date().toISOString(), lastTestResult: `sent to ${to}`, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    } catch { /* non-fatal */ }
    await auditLog({ actor: user, action: "settings.smtp.test", result: "success", metadata: { to } });
    return ok({ ok: true, messageId });
  } catch (err) {
    return handleApiError(err);
  }
}
