import { requireAdmin } from "@/lib/server/auth";
import { deleteSpeaker, getSpeakerById, updateSpeaker } from "@/lib/firestore/content";
import { speakerSchema } from "@/lib/validation/schemas";
import { apiError, handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const speaker = await getSpeakerById(params.id);
    if (!speaker) return apiError("Speaker not found", 404, "not_found");
    return ok(speaker);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdmin();
    const body = await parseBody(req, speakerSchema.partial());
    const speaker = await updateSpeaker(params.id, { ...body });
    await auditLog({ actor: user, action: "content.speaker.update", resource: params.id });
    return ok(speaker);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdmin();
    await deleteSpeaker(params.id);
    await auditLog({ actor: user, action: "content.speaker.delete", resource: params.id });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
