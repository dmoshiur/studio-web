import { requireAdmin } from "@/lib/server/auth";
import { deleteEvent, getEventById, updateEvent } from "@/lib/firestore/content";
import { eventSchema } from "@/lib/validation/schemas";
import { apiError, handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const event = await getEventById(params.id);
    if (!event) return apiError("Event not found", 404, "not_found");
    return ok(event);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdmin();
    const body = await parseBody(req, eventSchema.partial());
    const event = await updateEvent(params.id, { ...body });
    await auditLog({ actor: user, action: "content.event.update", resource: params.id });
    return ok(event);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdmin();
    await deleteEvent(params.id);
    await auditLog({ actor: user, action: "content.event.delete", resource: params.id });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
