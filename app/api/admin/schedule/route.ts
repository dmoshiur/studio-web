import { requireAdmin } from "@/lib/server/auth";
import { listScheduleDaysAdmin, saveScheduleDay } from "@/lib/firestore/content";
import { scheduleDaySchema } from "@/lib/validation/schemas";
import { created, handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List all schedule days (drafts included) — admin+. */
export async function GET() {
  try {
    await requireAdmin();
    return ok({ items: await listScheduleDaysAdmin() });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Create a schedule day — admin+. */
export async function POST(req: Request) {
  try {
    const actor = await requireAdmin();
    const body = await parseBody(req, scheduleDaySchema);
    const day = await saveScheduleDay(undefined, {
      day: body.day,
      label: body.label || undefined,
      dateISO: body.dateISO || null,
      note: body.note || null,
      status: body.status,
      sessions: body.sessions.map((s, i) => ({ ...s, id: s.id || `s-${body.day}-${i + 1}` })),
    });
    await auditLog({ actor, action: "content.schedule.create", resource: day.id, metadata: { day: day.day } });
    return created(day);
  } catch (err) {
    return handleApiError(err);
  }
}
