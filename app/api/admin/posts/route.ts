import { requireAdmin } from "@/lib/server/auth";
import { createPost, listPostsAdmin } from "@/lib/firestore/content";
import { postSchema } from "@/lib/validation/schemas";
import { excerptFromHtml, readingMinutesFromHtml, slugify } from "@/lib/utils";
import { handleApiError, ok, created, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const data = await listPostsAdmin({
      limit: Number(url.searchParams.get("limit") ?? 20),
      cursor: url.searchParams.get("cursor") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await parseBody(req, postSchema);
    const slug = body.slug || slugify(body.title);
    const post = await createPost(
      {
        ...body,
        slug,
        excerpt: body.excerpt || excerptFromHtml(body.contentHtml),
        readingMinutes: readingMinutesFromHtml(body.contentHtml),
      },
      user.uid
    );
    await auditLog({ actor: user, action: "content.post.create", resource: post.id, metadata: { slug } });
    return created(post);
  } catch (err) {
    return handleApiError(err);
  }
}
