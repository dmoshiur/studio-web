import { getAdminDb } from "@/lib/firebase/admin";
import { requireHackerAdmin } from "@/lib/server/auth";
import { setRoleSchema } from "@/lib/validation/schemas";
import { apiError, handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";
import {
  IdentityError,
  createIdentityUser,
  getIdentityUser,
  listIdentityUsers,
  setIdentityRole,
} from "@/lib/server/identity";
import { z } from "zod";
import type { Role } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List accounts — owner only. */
export async function GET(req: Request) {
  try {
    await requireHackerAdmin();
    const url = new URL(req.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);
    const result = await listIdentityUsers(limit, url.searchParams.get("pageToken") ?? undefined);
    return ok({ users: result.users, nextPageToken: result.nextPageToken });
  } catch (err) {
    return handleApiError(err);
  }
}

const inviteSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
  displayName: z.string().min(2).max(80).optional(),
  role: z.enum(["user", "admin", "owner", "superadmin"]).default("admin"),
});

/**
 * Provision a new account from the operations console — HackerAdmin only.
 * Site Admins ("admin") and HackerAdmins ("owner") can be created here;
 * "superadmin" is reserved for actors that already hold it.
 */
export async function POST(req: Request) {
  try {
    const actor = await requireHackerAdmin();
    const body = await parseBody(req, inviteSchema);
    if (body.role === "superadmin" && actor.role !== "superadmin") {
      return apiError("Only a superadmin can create another superadmin", 403, "forbidden_role");
    }
    const user = await createIdentityUser({
      email: body.email,
      password: body.password,
      displayName: body.displayName ?? null,
      role: body.role as Role,
    });
    await auditLog({ actor, action: "users.create", resource: user.uid, result: "success", metadata: { role: body.role } });
    return ok({ user });
  } catch (err) {
    if (err instanceof IdentityError) return apiError(err.message, err.status, err.code);
    return handleApiError(err);
  }
}

/** Set a user's role (owner only). Works on both backends. */
export async function PATCH(req: Request) {
  try {
    const actor = await requireHackerAdmin();
    const { uid, role } = await parseBody(req, setRoleSchema);
    const db = getAdminDb();
    if (!db) return apiError("Backend not configured", 503, "not_configured");

    // Prevent the last owner from demoting themselves.
    if (uid === actor.uid && role !== "owner" && role !== "superadmin") {
      const owners = await db.collection("admins").where("role", "==", "owner").limit(2).get();
      if (owners.size <= 1 && actor.role === "owner") {
        return apiError("You are the last owner. Promote another owner first.", 409, "last_owner");
      }
    }

    const target = await getIdentityUser(uid);
    if (!target) return apiError("User not found", 404, "not_found");

    await setIdentityRole(uid, role);
    await auditLog({
      actor,
      action: "users.role.change",
      resource: uid,
      result: "success",
      metadata: { role, email: target.email },
    });
    return ok({ ok: true });
  } catch (err) {
    if (err instanceof IdentityError) return apiError(err.message, err.status, err.code);
    return handleApiError(err);
  }
}
