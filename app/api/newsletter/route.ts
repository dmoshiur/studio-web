import { getAdminDb } from "@/lib/firebase/admin";
import { newsletterSchema } from "@/lib/validation/schemas";
import { subscribe } from "@/lib/firestore/engagement";
import {
  apiError, created, handleApiError, parseBody, rateLimitKey,
} from "@/lib/server/api-helpers";
import { rateLimit, RATE_PRESETS } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rl = await rateLimit(rateLimitKey("newsletter", req), RATE_PRESETS.newsletter.limit, RATE_PRESETS.newsletter.windowMs);
    if (!rl.allowed) return apiError("Too many requests. Please try again later.", 429, "rate_limited");
    const body = await parseBody(req, newsletterSchema);
    if (body.website) return created({ ok: true }); // honeypot
    if (!getAdminDb()) return apiError("Newsletter service is not configured", 503, "not_configured");
    const { duplicate } = await subscribe(body.email, body.source);
    return created({ ok: true, duplicate });
  } catch (err) {
    return handleApiError(err);
  }
}
