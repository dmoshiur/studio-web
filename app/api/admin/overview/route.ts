import { requireAdmin } from "@/lib/server/auth";
import { getDashboardCounts } from "@/lib/firestore/content";
import { listMessages } from "@/lib/firestore/engagement";
import { countReservations } from "@/lib/firestore/reservations";
import { handleApiError, ok } from "@/lib/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const [counts, recent, reservations] = await Promise.all([
      getDashboardCounts(),
      listMessages({ limit: 5 }),
      countReservations().catch(() => ({ total: 0, requested: 0 })),
    ]);
    return ok({
      counts: { ...counts, reservations: reservations.total, pendingReservations: reservations.requested },
      recentMessages: recent.items,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
