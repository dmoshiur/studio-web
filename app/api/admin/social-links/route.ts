import { requireAdmin } from "@/lib/server/auth";
import { listSocialLinks, saveSocialLink } from "@/lib/firestore/engagement";
import { socialLinkSchema } from "@/lib/validation/schemas";
import { handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return ok({ items: await listSocialLinks() });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await parseBody(req, socialLinkSchema.extend({ id: z.string().max(128).optional() }));
    const saved = await saveSocialLink(body);
    await auditLog({ actor: user, action: "social.save", resource: saved.id });
    return ok(saved);
  } catch (err) {
    return handleApiError(err);
  }
}
