import { z } from "zod";
import { requireAdmin } from "@/lib/server/auth";
import {
  deleteIdentityUser,
  getIdentityUser,
  IdentityError,
  listIdentityUsers,
  setIdentityDisabled,
  updateIdentityProfile,
} from "@/lib/server/identity";
import { apiError, handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  disabled: z.boolean().optional(),
  displayName: z.string().min(2).max(80).optional(),
  password: z.string().min(8).max(200).optional(),
});

function isElevated(role: string): boolean {
  return role === "owner" || role === "superadmin";
}

/**
 * Disable / enable / edit an account from the studio.
 * Site Admins may manage regular users and sub-admins; HackerAdmin
 * (owner) and superadmin accounts are protected — they are managed from
 * the operations console only.
 */
export async function PATCH(req: Request, { params }: { params: { uid: string } }) {
  try {
    const actor = await requireAdmin();
    const body = await parseBody(req, patchSchema);

    if (params.uid === actor.uid && body.disabled) {
      return apiError("You cannot disable your own account", 409, "self_disable");
    }

    const target = await getIdentityUser(params.uid);
    if (!target) return apiError("User not found", 404, "not_found");
    if (isElevated(target.role) && actor.role === "admin") {
      return apiError("Only the operations console can manage elevated accounts", 403, "forbidden_role");
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
      metadata: { email: target.email, via: "studio" },
    });
    return ok({ ok: true });
  } catch (err) {
    if (err instanceof IdentityError) return apiError(err.message, err.status, err.code);
    return handleApiError(err);
  }
}

/**
 * Permanently delete an account from the studio. Elevated accounts and the
 * last owner are protected; self-deletion is blocked.
 */
export async function DELETE(_req: Request, { params }: { params: { uid: string } }) {
  try {
    const actor = await requireAdmin();
    if (params.uid === actor.uid) {
      return apiError("You cannot delete your own account.", 409, "self_delete");
    }

    const target = await getIdentityUser(params.uid);
    if (!target) return apiError("User not found", 404, "not_found");
    if (isElevated(target.role) && actor.role === "admin") {
      return apiError("Only the operations console can delete elevated accounts", 403, "forbidden_role");
    }

    const { users } = await listIdentityUsers(200);
    const owners = users.filter((u) => isElevated(u.role));
    if (isElevated(target.role) && owners.length <= 1) {
      return apiError("This is the last owner account and cannot be deleted.", 409, "last_owner");
    }

    await deleteIdentityUser(params.uid);
    await auditLog({
      actor,
      action: "users.delete",
      resource: params.uid,
      result: "success",
      metadata: { email: target.email, role: target.role, via: "studio" },
    });
    return ok({ ok: true });
  } catch (err) {
    if (err instanceof IdentityError) return apiError(err.message, err.status, err.code);
    return handleApiError(err);
  }
}
