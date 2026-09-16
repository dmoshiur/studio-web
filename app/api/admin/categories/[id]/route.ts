import { requireAdmin } from "@/lib/server/auth";
import { deleteCategory } from "@/lib/firestore/content";
import { handleApiError, ok } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdmin();
    await deleteCategory(params.id);
    await auditLog({ actor: user, action: "content.category.delete", resource: params.id });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
