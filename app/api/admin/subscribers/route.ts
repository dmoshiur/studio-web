import { requireAdmin } from "@/lib/server/auth";
import { listSubscribers } from "@/lib/firestore/engagement";
import { handleApiError, ok } from "@/lib/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const data = await listSubscribers({
      limit: Number(url.searchParams.get("limit") ?? 20),
      cursor: url.searchParams.get("cursor") ?? undefined,
    });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
