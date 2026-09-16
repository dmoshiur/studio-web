import { requireAdmin } from "@/lib/server/auth";
import { createEvent, listEventsAdmin } from "@/lib/firestore/content";
import { eventSchema } from "@/lib/validation/schemas";
import { slugify } from "@/lib/utils";
import { handleApiError, ok, created, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const data = await listEventsAdmin({
      limit: Number(url.searchParams.get("limit") ?? 20),
      cursor: url.searchParams.get("cursor") ?? undefined,
    });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await parseBody(req, eventSchema);
    const event = await createEvent({ ...body, slug: body.slug || slugify(body.title) });
    await auditLog({ actor: user, action: "content.event.create", resource: event.id });
    return created(event);
  } catch (err) {
    return handleApiError(err);
  }
}
