import { z } from "zod";
import { unsubscribeByToken } from "@/lib/firestore/engagement";
import { apiError, handleApiError, ok } from "@/lib/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { token } = z.object({ token: z.string().min(8).max(128) }).parse(await req.json());
    const done = await unsubscribeByToken(token);
    if (!done) return apiError("Invalid or expired unsubscribe link", 404, "not_found");
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
