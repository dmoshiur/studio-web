import { requireAdmin } from "@/lib/server/auth";
import { listMessages } from "@/lib/firestore/engagement";
import { handleApiError, ok } from "@/lib/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const data = await listMessages({
      limit: Number(url.searchParams.get("limit") ?? 20),
      cursor: url.searchParams.get("cursor") ?? undefined,
      unreadOnly: url.searchParams.get("unread") === "1",
      q: url.searchParams.get("q") ?? undefined,
    });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
