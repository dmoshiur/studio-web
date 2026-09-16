import { requireAdmin } from "@/lib/server/auth";
import { getDashboardCounts } from "@/lib/firestore/content";
import { listMessages } from "@/lib/firestore/engagement";
import { handleApiError, ok } from "@/lib/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const [counts, recent] = await Promise.all([
      getDashboardCounts(),
      listMessages({ limit: 5 }),
    ]);
    return ok({ counts, recentMessages: recent.items });
  } catch (err) {
    return handleApiError(err);
  }
}
