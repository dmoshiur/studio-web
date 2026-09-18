import { z } from "zod";
import { requireAdmin } from "@/lib/server/auth";
import {
  createIdentityUser,
  getIdentityUser,
  IdentityError,
  listIdentityUsers,
  setIdentityRole,
} from "@/lib/server/identity";
import { apiError, handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";
import type { Role } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createUserSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
  displayName: z.string().min(2).max(80).optional(),
  role: z.enum(["user", "admin"]).default("user"),
});

const setRoleSchema = z.object({
  uid: z.string().min(4).max(128),
  role: z.enum(["user", "admin"]),
});

/** List accounts (studio user management). */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);
    const data = await listIdentityUsers(limit, url.searchParams.get("pageToken") ?? undefined);
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * Create an account from the studio. Privilege rules (server-enforced):
 *  - Site Admins may create regular users and other Site Admins
 *    (sub-admins) — the multi-admin workflow.
 *  - owner/superadmin accounts can NEVER be created from this endpoint
 *    (that stays exclusive to the protected operations console)
 */
export async function POST(req: Request) {
  try {
    const actor = await requireAdmin();
    const body = await parseBody(req, createUserSchema);

    const user = await createIdentityUser({
      email: body.email,
      password: body.password,
      displayName: body.displayName ?? null,
      role: body.role as Role,
    });
    await auditLog({ actor, action: "users.create", resource: user.uid, result: "success", metadata: { role: body.role, by: actor.role } });
    return ok({ user });
  } catch (err) {
    if (err instanceof IdentityError) {
      return apiError(err.message, err.status, err.code);
    }
    return handleApiError(err);
  }
}

/**
 * Change a role from the studio. Site Admins may promote/demote between
 * `user` and `admin` (sub-admin workflow) but can never touch owner,
 * superadmin or their own account — HackerAdmin/owner management stays in
 * the protected operations console.
 */
export async function PATCH(req: Request) {
  try {
    const actor = await requireAdmin();
    const { uid, role } = await parseBody(req, setRoleSchema);

    if (uid === actor.uid) {
      return apiError("You cannot change your own role here", 409, "self_role");
    }
    const target = await getIdentityUser(uid);
    if (!target) return apiError("User not found", 404, "not_found");
    if ((target.role === "owner" || target.role === "superadmin") && actor.role === "admin") {
      return apiError("Only the operations console can manage elevated roles", 403, "forbidden_role");
    }

    await setIdentityRole(uid, role);
    await auditLog({
      actor,
      action: "users.role.change",
      resource: uid,
      result: "success",
      metadata: { role, email: target.email, via: "studio" },
    });
    return ok({ ok: true });
  } catch (err) {
    if (err instanceof IdentityError) return apiError(err.message, err.status, err.code);
    return handleApiError(err);
  }
}

