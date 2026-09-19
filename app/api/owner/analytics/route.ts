import { requireHackerAdmin } from "@/lib/server/auth";
import { getAnalyticsSummary } from "@/lib/firestore/analytics";
import { handleApiError, ok } from "@/lib/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Visitor metrics for the operations dashboard — passcode-protected. */
export async function GET() {
  try {
    await requireHackerAdmin();
    const summary = await getAnalyticsSummary();
    return ok(summary);
  } catch (err) {
    return handleApiError(err);
  }
}
