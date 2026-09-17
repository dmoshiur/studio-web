import { requireAdmin } from "@/lib/server/auth";
import { listReservations } from "@/lib/firestore/reservations";
import { handleApiError, ok } from "@/lib/server/api-helpers";
import type { ReservationStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** All seat reservations — admin studio. */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status");
    const status =
      statusParam === "requested" || statusParam === "confirmed" || statusParam === "cancelled"
        ? (statusParam as ReservationStatus)
        : undefined;
    const data = await listReservations({
      status,
      limit: Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20) || 20, 1), 100),
      cursor: url.searchParams.get("cursor") ?? undefined,
    });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
