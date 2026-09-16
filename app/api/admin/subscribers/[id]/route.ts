import { requireAdmin } from "@/lib/server/auth";
import { deleteSubscriber } from "@/lib/firestore/engagement";
import { handleApiError, ok } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdmin();
    await deleteSubscriber(params.id);
    await auditLog({ actor: user, action: "subscribers.delete", resource: params.id });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
