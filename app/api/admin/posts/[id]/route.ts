import { requireAdmin } from "@/lib/server/auth";
import { deletePost, getPostById, updatePost } from "@/lib/firestore/content";
import { postSchema } from "@/lib/validation/schemas";
import { excerptFromHtml, readingMinutesFromHtml } from "@/lib/utils";
import { apiError, handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const post = await getPostById(params.id);
    if (!post) return apiError("Post not found", 404, "not_found");
    return ok(post);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdmin();
    const body = await parseBody(req, postSchema.partial());
    const patch: Record<string, unknown> = { ...body };
    if (typeof body.contentHtml === "string") {
      patch.readingMinutes = readingMinutesFromHtml(body.contentHtml);
      if (!body.excerpt) patch.excerpt = excerptFromHtml(body.contentHtml);
    }
    const post = await updatePost(params.id, patch);
    await auditLog({ actor: user, action: "content.post.update", resource: params.id });
    return ok(post);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdmin();
    await deletePost(params.id);
    await auditLog({ actor: user, action: "content.post.delete", resource: params.id });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
