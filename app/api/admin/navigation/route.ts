import { z } from "zod";
import { requireAdmin } from "@/lib/server/auth";
import { getNavigation, saveNavigation } from "@/lib/firestore/engagement";
import { navigationSchema } from "@/lib/validation/schemas";
import { apiError, handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (id !== "header" && id !== "footer") return apiError("id must be header|footer", 400);
    return ok(await getNavigation(id));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await parseBody(req, navigationSchema.extend({}).and(z.object({})));
    const saved = await saveNavigation(body.id, body.links);
    await auditLog({ actor: user, action: "navigation.update", resource: body.id });
    return ok(saved);
  } catch (err) {
    return handleApiError(err);
  }
}
