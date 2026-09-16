import { listPublishedEvents } from "@/lib/firestore/content";
import { handleApiError, ok } from "@/lib/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public paginated events feed (published only, rate-friendly page sizes). */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const data = await listPublishedEvents({
      limit: Number(url.searchParams.get("limit") ?? 9),
      cursor: url.searchParams.get("cursor") ?? undefined,
    });
    const res = ok(data);
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
