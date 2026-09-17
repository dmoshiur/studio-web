import { z } from "zod";
import { requireSession } from "@/lib/server/auth";
import { getEventBySlug } from "@/lib/firestore/content";
import { createReservation, findActiveReservation, listReservations } from "@/lib/firestore/reservations";
import { apiError, created, handleApiError, ok, parseBody, rateLimitKey } from "@/lib/server/api-helpers";
import { rateLimit } from "@/lib/server/rate-limit";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  eventSlug: z.string().min(2).max(140),
  seats: z.number().int().min(1).max(6).default(1),
  note: z.string().max(500).optional().or(z.literal("")),
});

/**
 * Reserve a seat at a published event. Requires a signed-in account so
 * reservations are durable and visible on the user's dashboard.
 */
export async function POST(req: Request) {
  try {
    const user = await requireSession();
    const rl = await rateLimit(rateLimitKey("reserve", req, user.uid), 10, 60 * 60_000);
    if (!rl.allowed) return apiError("Too many reservation attempts — please try again later.", 429, "rate_limited");

    const body = await parseBody(req, schema);
    const event = await getEventBySlug(body.eventSlug).catch(() => null);
    if (!event || event.status !== "published") {
      return apiError("This event is not open for reservations", 404, "event_not_found");
    }
    if (new Date(event.startAt).getTime() < Date.now()) {
      return apiError("This event has already taken place", 410, "event_past");
    }
    if (!user.email) return apiError("Your account has no email address — reservations need one", 400, "no_email");

    const existing = await findActiveReservation(user.uid, event.id);
    if (existing) {
      return apiError("You already have a reservation for this event", 409, "duplicate");
    }

    const reservation = await createReservation({
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      eventStartAt: event.startAt,
      userId: user.uid,
      name: user.displayName ?? user.email,
      email: user.email,
      seats: body.seats ?? 1,
      note: body.note || undefined,
    });
    await auditLog({ actor: user, action: "reservations.create", resource: reservation.id, metadata: { event: event.slug, seats: body.seats } });
    return created({ reservation });
  } catch (err) {
    return handleApiError(err);
  }
}

/** The caller's own reservations (for the profile dashboard). */
export async function GET(req: Request) {
  try {
    const user = await requireSession();
    const url = new URL(req.url);
    const data = await listReservations({
      userId: user.uid,
      limit: Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 100),
    });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
