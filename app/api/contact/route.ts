import { getAdminDb } from "@/lib/firebase/admin";
import { contactSchema } from "@/lib/validation/schemas";
import { createMessage } from "@/lib/firestore/engagement";
import { getPublicSettings } from "@/lib/firestore/settings";
import {
  apiError, created, handleApiError, parseBody, rateLimitKey,
} from "@/lib/server/api-helpers";
import { rateLimit, rateLimitHeaders, RATE_PRESETS } from "@/lib/server/rate-limit";
import { baseEmailTemplate, isSmtpConfigured, sendMail } from "@/lib/email/mailer";
import { stripHtml } from "@/lib/security/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rl = await rateLimit(rateLimitKey("contact", req), RATE_PRESETS.contact.limit, RATE_PRESETS.contact.windowMs);
    if (!rl.allowed) {
      return apiError("Too many messages. Please try again later.", 429, "rate_limited");
    }
    const body = await parseBody(req, contactSchema);
    // Honeypot: silently accept spam so bots can't probe.
    if (body.website) return created({ ok: true });

    const db = getAdminDb();
    if (!db) return apiError("Contact service is not configured", 503, "not_configured");

    const id = await createMessage({
      name: stripHtml(body.name),
      email: body.email.trim().toLowerCase(),
      phone: body.phone ? stripHtml(body.phone) : undefined,
      subject: stripHtml(body.subject),
      message: stripHtml(body.message),
    });

    // Notify site owner (best-effort; never fail the request on email errors)
    try {
      if (isSmtpConfigured()) {
        const settings = await getPublicSettings();
        const to = settings.contactEmail;
        if (to) {
          await sendMail({
            to,
            subject: `[${settings.siteName}] New contact message: ${stripHtml(body.subject)}`,
            html: baseEmailTemplate({
              title: "New contact message",
              bodyHtml: `<p><strong>From:</strong> ${stripHtml(body.name)} &lt;${body.email}&gt;</p>
                ${body.phone ? `<p><strong>Phone:</strong> ${stripHtml(body.phone)}</p>` : ""}
                <p><strong>Subject:</strong> ${stripHtml(body.subject)}</p>
                <p style="white-space:pre-wrap;">${stripHtml(body.message).replace(/\n/g, "<br/>")}</p>`,
            }),
            text: `From: ${body.name} <${body.email}>\nSubject: ${body.subject}\n\n${body.message}`,
            replyTo: body.email,
          });
        }
      }
    } catch (err) {
      console.error("[contact] notification email failed:", err);
    }

    const res = created({ ok: true, id });
    for (const [k, v] of Object.entries(rateLimitHeaders(rl, RATE_PRESETS.contact.limit))) {
      res.headers.set(k, v);
    }
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
