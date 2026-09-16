import { deleteObject } from "@/lib/storage/media";
import { requireAdmin } from "@/lib/server/auth";
import { deleteMediaRecord, getMediaById, updateMediaRecord } from "@/lib/firestore/engagement";
import { mediaUpdateSchema } from "@/lib/validation/schemas";
import { apiError, handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdmin();
    const body = await parseBody(req, mediaUpdateSchema);
    await updateMediaRecord(params.id, body);
    await auditLog({ actor: user, action: "media.update", resource: params.id });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdmin();
    const media = await getMediaById(params.id);
    if (!media) return apiError("Media not found", 404, "not_found");
    if (media.storagePath) await deleteObject(media.storagePath);
    await deleteMediaRecord(params.id);
    await auditLog({ actor: user, action: "media.delete", resource: params.id, metadata: { path: media.storagePath } });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
