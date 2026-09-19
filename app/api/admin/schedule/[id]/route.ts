import { requireAdmin } from "@/lib/server/auth";
import { deleteScheduleDay, getScheduleDay, saveScheduleDay } from "@/lib/firestore/content";
import { scheduleDaySchema } from "@/lib/validation/schemas";
import { apiError, handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Update a schedule day — admin+. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAdmin();
    const existing = await getScheduleDay(params.id);
    if (!existing) return apiError("Schedule day not found", 404, "not_found");
    const body = await parseBody(req, scheduleDaySchema);
    const day = await saveScheduleDay(params.id, {
      day: body.day,
      label: body.label || undefined,
      dateISO: body.dateISO || null,
      note: body.note || null,
      status: body.status,
      sessions: body.sessions.map((s, i) => ({ ...s, id: s.id || `s-${body.day}-${i + 1}` })),
    });
    await auditLog({ actor, action: "content.schedule.update", resource: day.id, metadata: { day: day.day } });
    return ok(day);
  } catch (err) {
    return handleApiError(err);
  }
}

/** Delete a schedule day — admin+. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAdmin();
    const existing = await getScheduleDay(params.id);
    if (!existing) return apiError("Schedule day not found", 404, "not_found");
    await deleteScheduleDay(params.id);
    await auditLog({ actor, action: "content.schedule.delete", resource: params.id, metadata: { day: existing.day } });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
