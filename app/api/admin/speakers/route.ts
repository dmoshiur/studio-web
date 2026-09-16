import { requireAdmin } from "@/lib/server/auth";
import { createSpeaker, listSpeakersAdmin } from "@/lib/firestore/content";
import { speakerSchema } from "@/lib/validation/schemas";
import { slugify } from "@/lib/utils";
import { handleApiError, ok, created, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return ok({ items: await listSpeakersAdmin(), nextCursor: null });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await parseBody(req, speakerSchema);
    const speaker = await createSpeaker({ ...body, slug: body.slug || slugify(body.name) });
    await auditLog({ actor: user, action: "content.speaker.create", resource: speaker.id });
    return created(speaker);
  } catch (err) {
    return handleApiError(err);
  }
}
