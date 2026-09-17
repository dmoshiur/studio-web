import { randomUUID } from "node:crypto";
import { requireSession } from "@/lib/server/auth";
import { getIdentityUser, updateIdentityProfile } from "@/lib/server/identity";
import { putObject, deleteObject, isLocalStorage } from "@/lib/storage/media";
import { apiError, handleApiError, ok, rateLimitKey } from "@/lib/server/api-helpers";
import { rateLimit, RATE_PRESETS } from "@/lib/server/rate-limit";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

/** Real file-type detection from magic bytes — the declared MIME is not trusted. */
function detectImageType(buffer: Buffer): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return "image/gif";
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Upload / replace the profile picture. Validates size (≤2 MB) and the
 * actual file content (magic bytes), stores it through the configured
 * storage backend and points the user record at it.
 */
export async function POST(req: Request) {
  try {
    const user = await requireSession();
    const rl = await rateLimit(rateLimitKey("avatar", req, user.uid), RATE_PRESETS.upload.limit, RATE_PRESETS.upload.windowMs);
    if (!rl.allowed) return apiError("Upload rate limit exceeded", 429, "rate_limited");

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return apiError("No file provided", 400, "no_file");
    if (file.size === 0) return apiError("File is empty", 400, "empty_file");
    if (file.size > MAX_AVATAR_BYTES) return apiError("Avatar must be 2 MB or smaller", 413, "file_too_large");

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectImageType(buffer);
    if (!detected) {
      return apiError("Only JPEG, PNG, WebP or GIF images are allowed", 415, "unsupported_media_type");
    }

    const ext = EXT_BY_TYPE[detected];
    const storagePath = `avatars/${user.uid}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
    const stored = await putObject({
      storagePath,
      buffer,
      contentType: detected,
      visibility: "public",
      uploadedBy: user.uid,
      originalName: (file.name || "avatar").slice(0, 200),
    });

    // Best-effort cleanup of the previous avatar file.
    const previous = (await getIdentityUser(user.uid))?.photoURL ?? null;
    if (previous && previous.startsWith("/api/media/")) {
      const prevPath = decodeURIComponent(previous.slice("/api/media/".length));
      if (prevPath.startsWith("avatars/")) await deleteObject(prevPath).catch(() => undefined);
    }

    await updateIdentityProfile(user.uid, { photoURL: stored.downloadUrl });
    await auditLog({ actor: user, action: "account.avatar.upload", result: "success", metadata: { bytes: file.size, type: detected } });
    return ok({ photoURL: stored.downloadUrl });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Remove the profile picture (falls back to the initials avatar). */
export async function DELETE() {
  try {
    const user = await requireSession();
    const current = (await getIdentityUser(user.uid))?.photoURL ?? null;
    if (current && current.startsWith("/api/media/")) {
      const prevPath = decodeURIComponent(current.slice("/api/media/".length));
      if (prevPath.startsWith("avatars/")) await deleteObject(prevPath).catch(() => undefined);
    }
    await updateIdentityProfile(user.uid, { photoURL: "" });
    await auditLog({ actor: user, action: "account.avatar.remove", result: "success" });
    return ok({ photoURL: null });
  } catch (err) {
    return handleApiError(err);
  }
}
