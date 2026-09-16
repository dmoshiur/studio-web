import { requireAdmin } from "@/lib/server/auth";
import { listPagesAdmin, upsertPage } from "@/lib/firestore/content";
import { pageSchema } from "@/lib/validation/schemas";
import { handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return ok({ items: await listPagesAdmin() });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await parseBody(req, pageSchema);
    const page = await upsertPage({ ...body });
    await auditLog({ actor: user, action: "content.page.upsert", resource: page.id });
    return ok(page);
  } catch (err) {
    return handleApiError(err);
  }
}
