import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { requireOwner } from "@/lib/server/auth";
import { setRoleSchema } from "@/lib/validation/schemas";
import { apiError, handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List users (paginated via Auth listUsers). Owner only. */
export async function GET(req: Request) {
  try {
    await requireOwner();
    const auth = getAdminAuth();
    if (!auth) return apiError("Auth not configured", 503, "not_configured");
    const url = new URL(req.url);
    const pageToken = url.searchParams.get("pageToken") ?? undefined;
    const result = await auth.listUsers(50, pageToken);
    const users = result.users.map((u) => ({
      uid: u.uid,
      email: u.email ?? null,
      displayName: u.displayName ?? null,
      photoURL: u.photoURL ?? null,
      emailVerified: u.emailVerified,
      disabled: u.disabled,
      role: ((u.customClaims?.role as string) ?? "user") as string,
      createdAt: u.metadata.creationTime,
      lastSignInAt: u.metadata.lastSignInTime,
    }));
    return ok({ users, nextPageToken: result.pageToken ?? null });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Set a user's role (custom claim + mirrored docs). Owner only. */
export async function PATCH(req: Request) {
  try {
    const actor = await requireOwner();
    const { uid, role } = await parseBody(req, setRoleSchema);
    const auth = getAdminAuth();
    const db = getAdminDb();
    if (!auth || !db) return apiError("Backend not configured", 503, "not_configured");

    // Prevent the last owner from demoting themselves.
    if (uid === actor.uid && role !== "owner") {
      const owners = await db.collection("admins").where("role", "==", "owner").limit(2).get();
      if (owners.size <= 1) {
        return apiError("You are the last owner. Promote another owner first.", 409, "last_owner");
      }
    }

    await auth.setCustomUserClaims(uid, { role });
    const target = await auth.getUser(uid).catch(() => null);
    const now = FieldValue.serverTimestamp();
    await db.collection("users").doc(uid).set(
      {
        uid, email: target?.email ?? "", displayName: target?.displayName ?? null,
        photoURL: target?.photoURL ?? null, role, updatedAt: now,
      },
      { merge: true }
    );
    if (role === "admin" || role === "owner") {
      await db.collection("admins").doc(uid).set(
        { uid, email: target?.email ?? "", role, updatedAt: now }, { merge: true }
      );
    } else {
      await db.collection("admins").doc(uid).delete().catch(() => undefined);
    }
    // Revoke sessions so the new role takes effect immediately.
    await auth.revokeRefreshTokens(uid).catch(() => undefined);

    await auditLog({
      actor, action: "users.role.change", resource: uid,
      result: "success", metadata: { role },
    });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
