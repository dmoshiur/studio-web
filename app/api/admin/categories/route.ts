import { requireAdmin } from "@/lib/server/auth";
import { createCategory, listCategories } from "@/lib/firestore/content";
import { categorySchema } from "@/lib/validation/schemas";
import { handleApiError, ok, created, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return ok({ items: await listCategories() });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await parseBody(req, categorySchema);
    const category = await createCategory(body);
    await auditLog({ actor: user, action: "content.category.create", resource: category.id });
    return created(category);
  } catch (err) {
    return handleApiError(err);
  }
}
