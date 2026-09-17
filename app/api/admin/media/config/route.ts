import { describeStorage, maxBytesForKind, type MediaKind } from "@/lib/storage/media";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError, ok } from "@/lib/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: MediaKind[] = ["image", "video", "audio", "document"];

/** Storage backend + upload limits, so the studio can explain the rules. */
export async function GET() {
  try {
    await requireAdmin();
    const storage = describeStorage();
    const limitsMb = Object.fromEntries(
      KINDS.map((kind) => [kind, Math.round(maxBytesForKind(kind) / 1024 / 1024)])
    ) as Record<MediaKind, number>;
    return ok({
      provider: storage.provider,
      cloudName: storage.cloudName ?? null,
      rootFolder: storage.rootFolder ?? null,
      directUpload: storage.provider === "cloudinary",
      limitsMb,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
