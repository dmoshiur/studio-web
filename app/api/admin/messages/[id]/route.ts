import { z } from "zod";
import { requireAdmin } from "@/lib/server/auth";
import { deleteMessage, markMessage } from "@/lib/firestore/engagement";
import { handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdmin();
    const { read } = await parseBody(req, z.object({ read: z.boolean() }));
    await markMessage(params.id, read);
    await auditLog({ actor: user, action: "messages.mark", resource: params.id, metadata: { read } });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdmin();
    await deleteMessage(params.id);
    await auditLog({ actor: user, action: "messages.delete", resource: params.id });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
