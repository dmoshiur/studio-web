import { requireOwner } from "@/lib/server/auth";
import { listAuditLogs } from "@/lib/firestore/engagement";
import { handleApiError, ok } from "@/lib/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireOwner();
    const url = new URL(req.url);
    const data = await listAuditLogs({
      limit: Number(url.searchParams.get("limit") ?? 25),
      cursor: url.searchParams.get("cursor") ?? undefined,
      action: url.searchParams.get("action") ?? undefined,
    });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
