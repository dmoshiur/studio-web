import { z } from "zod";
import { requireSession } from "@/lib/server/auth";
import { getIdentityUser, updateIdentityProfile } from "@/lib/server/identity";
import { apiError, handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Own account profile. The identity always comes from the verified session
 * cookie — never from a uid supplied in the request body.
 */
export async function GET() {
  try {
    const user = await requireSession();
    const full = await getIdentityUser(user.uid);
    return ok({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName ?? full?.displayName ?? null,
      photoURL: user.photoURL ?? full?.photoURL ?? null,
      emailVerified: user.emailVerified,
      role: user.role,
      createdAt: full?.createdAt ?? null,
      lastSignInAt: full?.lastSignInAt ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const patchSchema = z.object({
  displayName: z.string().min(2).max(80),
});

/** Update the editable parts of the profile (name). Password/hash never leave the server. */
export async function PATCH(req: Request) {
  try {
    const user = await requireSession();
    const { displayName } = await parseBody(req, patchSchema);
    await updateIdentityProfile(user.uid, { displayName });
    await auditLog({ actor: user, action: "account.profile.update", result: "success" });
    const full = await getIdentityUser(user.uid);
    return ok({
      uid: user.uid,
      email: user.email,
      displayName: full?.displayName ?? displayName,
      photoURL: full?.photoURL ?? user.photoURL,
      role: user.role,
      createdAt: full?.createdAt ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
