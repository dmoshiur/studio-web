import { z } from "zod";
import { requireHackerAdmin } from "@/lib/server/auth";
import { apiError, handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";
import {
  IdentityError,
  deleteIdentityUser,
  getIdentityUser,
  listIdentityUsers,
  setIdentityDisabled,
  updateIdentityProfile,
} from "@/lib/server/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  disabled: z.boolean().optional(),
  displayName: z.string().min(2).max(80).optional(),
  password: z.string().min(8).max(200).optional(),
});

/** Disable / enable / edit a user — owner only. */
export async function PATCH(req: Request, { params }: { params: { uid: string } }) {
  try {
    const actor = await requireHackerAdmin();
    const body = await parseBody(req, patchSchema);

    const target = await getIdentityUser(params.uid);
    if (!target) return apiError("User not found", 404, "not_found");

    if (params.uid === actor.uid && body.disabled) {
      return apiError("You cannot disable your own account", 409, "self_disable");
    }

    if (body.disabled !== undefined) {
      await setIdentityDisabled(params.uid, body.disabled);
    }
    if (body.displayName !== undefined || body.password !== undefined) {
      await updateIdentityProfile(params.uid, {
        displayName: body.displayName ?? undefined,
        password: body.password,
      });
    }

    await auditLog({
      actor,
      action: body.disabled === undefined ? "users.update" : body.disabled ? "users.disable" : "users.enable",
      resource: params.uid,
      result: "success",
      metadata: { email: target.email },
    });
    return ok({ ok: true });
  } catch (err) {
    if (err instanceof IdentityError) return apiError(err.message, err.status, err.code);
    return handleApiError(err);
  }
}

/** Permanently delete an account — owner only, never yourself, never the last owner. */
export async function DELETE(_req: Request, { params }: { params: { uid: string } }) {
  try {
    const actor = await requireHackerAdmin();
    if (params.uid === actor.uid) {
      return apiError("You cannot delete your own account.", 409, "self_delete");
    }

    const target = await getIdentityUser(params.uid);
    if (!target) return apiError("User not found", 404, "not_found");

    const { users } = await listIdentityUsers(200);
    const owners = users.filter((u) => u.role === "owner" || u.role === "superadmin");
    if ((target.role === "owner" || target.role === "superadmin") && owners.length <= 1) {
      return apiError("This is the last owner account and cannot be deleted.", 409, "last_owner");
    }

    await deleteIdentityUser(params.uid);
    await auditLog({
      actor,
      action: "users.delete",
      resource: params.uid,
      result: "success",
      metadata: { email: target.email, role: target.role },
    });
    return ok({ ok: true });
  } catch (err) {
    if (err instanceof IdentityError) return apiError(err.message, err.status, err.code);
    return handleApiError(err);
  }
}
