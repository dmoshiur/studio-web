import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireOwner } from "@/lib/server/auth";
import { getSmtpStatus } from "@/lib/email/mailer";
import { smtpSchema } from "@/lib/validation/schemas";
import { handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SMTP management.
 * - GET returns MASKED status only (never the password).
 * - PUT stores non-secret display metadata (from name/email/reply-to).
 *   Actual credentials live in server env vars (Vercel) — the UI explains this.
 *   The password field is accepted but NEVER persisted or echoed.
 */
export async function GET() {
  try {
    await requireOwner();
    return ok(await getSmtpStatus());
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireOwner();
    const body = await parseBody(req, smtpSchema);
    const db = getAdminDb();
    if (!db) return ok({ ok: false, message: "Firestore not configured" });
    // Persist ONLY non-secret display fields. Password is intentionally dropped.
    await db.collection("siteSettings").doc("smtpMeta").set(
      {
        fromName: body.fromName,
        fromEmail: body.fromEmail,
        replyTo: body.replyTo || null,
        hostHint: body.host,
        portHint: body.port,
        userHint: body.user,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: user.uid,
      },
      { merge: true }
    );
    await auditLog({
      actor: user,
      action: "settings.smtp.update",
      result: "success",
      metadata: { host: body.host, port: body.port, user: body.user, passwordProvided: body.password.length > 0 },
    });
    return ok({
      ok: true,
      message:
        "Display settings saved. SMTP credentials are managed via server environment variables — update them in Vercel and redeploy.",
      ...(await getSmtpStatus()),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
