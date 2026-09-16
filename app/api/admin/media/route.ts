import { requireAdmin } from "@/lib/server/auth";
import { listMedia } from "@/lib/firestore/engagement";
import { handleApiError, ok } from "@/lib/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const data = await listMedia({
      limit: Number(url.searchParams.get("limit") ?? 24),
      cursor: url.searchParams.get("cursor") ?? undefined,
      folder: url.searchParams.get("folder") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
    });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
