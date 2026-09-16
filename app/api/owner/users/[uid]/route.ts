import { z } from "zod";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { requireOwner } from "@/lib/server/auth";
import { apiError, handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Disable/enable a user. Owner only. */
export async function PATCH(req: Request, { params }: { params: { uid: string } }) {
  try {
    const actor = await requireOwner();
    const { disabled } = await parseBody(req, z.object({ disabled: z.boolean() }));
    if (params.uid === actor.uid && disabled) {
      return apiError("You cannot disable your own account", 409, "self_disable");
    }
    const auth = getAdminAuth();
    const db = getAdminDb();
    if (!auth || !db) return apiError("Backend not configured", 503, "not_configured");
    await auth.updateUser(params.uid, { disabled });
    if (disabled) await auth.revokeRefreshTokens(params.uid).catch(() => undefined);
    await db.collection("users").doc(params.uid).set({ disabled }, { merge: true });
    await auditLog({ actor, action: disabled ? "users.disable" : "users.enable", resource: params.uid, result: "success" });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
