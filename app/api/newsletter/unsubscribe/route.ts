import { z } from "zod";
import { unsubscribeByEmail, unsubscribeByToken } from "@/lib/firestore/engagement";
import { apiError, handleApiError, ok, rateLimitKey } from "@/lib/server/api-helpers";
import { rateLimit, RATE_PRESETS } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.union([
  z.object({ token: z.string().min(8).max(128) }),
  z.object({ email: z.string().email().max(254) }),
]);

/**
 * Unsubscribe from the newsletter.
 * - Email links carry a per-subscriber `token`.
 * - The public form posts an `email`. The response is always `{ ok: true }`
 *   so the endpoint can never be used to discover who is subscribed.
 */
export async function POST(req: Request) {
  try {
    const rl = await rateLimit(rateLimitKey("unsubscribe", req), RATE_PRESETS.newsletter.limit, RATE_PRESETS.newsletter.windowMs);
    if (!rl.allowed) return apiError("Too many requests. Please try again later.", 429, "rate_limited");

    const body = bodySchema.parse(await req.json());

    if ("token" in body) {
      const done = await unsubscribeByToken(body.token);
      if (!done) return apiError("Invalid or expired unsubscribe link", 404, "not_found");
      return ok({ ok: true });
    }

    const done = await unsubscribeByEmail(body.email);
    return ok({ ok: true, removed: done });
  } catch (err) {
    return handleApiError(err);
  }
}
