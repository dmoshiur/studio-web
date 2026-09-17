import { requireAdmin } from "@/lib/server/auth";
import { getPublicSettings, saveOwnerProfile } from "@/lib/firestore/settings";
import { ownerProfileBodySchema } from "@/lib/validation/schemas";
import { handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Owner spotlight settings — readable and writable by any studio admin
 * (admin / owner / superadmin). Only the owner block is touched, so this
 * route can never overwrite the rest of the site settings.
 */
export async function GET() {
  try {
    await requireAdmin();
    const settings = await getPublicSettings();
    return ok({ owner: settings.homepage.owner });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await parseBody(req, ownerProfileBodySchema);
    const settings = await saveOwnerProfile(body.owner, user.uid);
    await auditLog({
      actor: user,
      action: "settings.owner.update",
      resource: "homepage.owner",
      metadata: { enabled: body.owner.enabled, showOnHome: body.owner.showOnHome, showOnAbout: body.owner.showOnAbout },
    });
    return ok({ owner: settings.homepage.owner });
  } catch (err) {
    return handleApiError(err);
  }
}
