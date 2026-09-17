import { randomUUID } from "crypto";
import { getDataBackend } from "@/lib/firebase/admin";
import {
  allowedFormatsForKind,
  getStorageProvider,
  isLocalStorage,
  maxBytesForKind,
  mediaKindForMime,
  putObject,
  type MediaKind,
} from "@/lib/storage/media";
import { ALLOWED_MEDIA_FOLDERS } from "@/lib/media-folders";
import { requireAdmin } from "@/lib/server/auth";
import { createMediaRecord } from "@/lib/firestore/engagement";
import { apiError, created, handleApiError, rateLimitKey } from "@/lib/server/api-helpers";
import { rateLimit, RATE_PRESETS } from "@/lib/server/rate-limit";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/ogg": "ogv",
  "video/x-matroska": "mkv",
  "video/x-msvideo": "avi",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/aac": "aac",
  "audio/flac": "flac",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
};

function mb(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

/**
 * Admin-only multipart upload, streamed through the server.
 *
 * Images, video, audio and documents are accepted; the storage backend
 * (Cloudinary / Firebase Storage / embedded disk) is chosen centrally.
 * Browsers normally use the faster signed direct-to-Cloudinary route
 * (/api/admin/media/sign + /record) — this handler is the fallback and the
 * only path for the embedded backend.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const rl = await rateLimit(
      rateLimitKey("upload", req, user.uid),
      RATE_PRESETS.upload.limit,
      RATE_PRESETS.upload.windowMs
    );
    if (!rl.allowed) return apiError("Upload rate limit exceeded", 429, "rate_limited");

    if (!isLocalStorage() && getDataBackend() === "firebase" && !process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
      return apiError("Storage is not configured", 503, "not_configured");
    }

    const form = await req.formData();
    const file = form.get("file");
    const folderRaw = String(form.get("folder") ?? "media/images");
    const alt = String(form.get("alt") ?? "").slice(0, 200);
    const folder = ALLOWED_MEDIA_FOLDERS.has(folderRaw) ? folderRaw : "media/images";

    if (!(file instanceof File)) return apiError("No file provided", 400, "no_file");

    const kind = mediaKindForMime(file.type);
    if (!kind) {
      return apiError(`File type ${file.type || "unknown"} is not allowed`, 415, "unsupported_media_type");
    }

    const maxBytes = maxBytesForKind(kind);
    if (file.size > maxBytes || file.size === 0) {
      return apiError(
        `File must be between 1 byte and ${mb(maxBytes)} (allowed: ${allowedFormatsForKind(kind).join(", ")})`,
        413,
        "file_too_large"
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload";
    const ext = EXT_BY_MIME[file.type] ?? safeName.split(".").pop()?.toLowerCase() ?? "bin";
    const base = safeName.replace(/\.[^.]+$/, "").slice(0, 80) || "upload";
    const storagePath = `${folder}/${Date.now()}-${randomUUID().slice(0, 8)}-${base}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Documents stay private (resolved on demand); everything else is public.
    const visibility: "public" | "private" = kind === "document" ? "private" : "public";
    const stored = await putObject({
      storagePath,
      buffer,
      contentType: file.type,
      visibility,
      uploadedBy: user.uid,
      originalName: file.name.slice(0, 200),
    });

    const id = await createMediaRecord({
      fileName: `${base}.${ext}`,
      originalName: file.name.slice(0, 200),
      storagePath: stored.storagePath,
      downloadUrl: stored.downloadUrl,
      mimeType: file.type,
      sizeBytes: file.size,
      width: stored.width,
      height: stored.height,
      folder,
      visibility,
      alt: alt || undefined,
      uploadedBy: user.uid,
      provider: stored.provider,
      publicId: stored.publicId,
      resourceType: stored.resourceType,
      thumbnailUrl: stored.thumbnailUrl,
      posterUrl: stored.posterUrl,
      format: stored.format ?? ext,
      durationSeconds: stored.durationSeconds,
    });

    await auditLog({
      actor: user,
      action: "media.upload",
      resource: id,
      metadata: { folder, sizeBytes: file.size, kind: kind as MediaKind, provider: getStorageProvider() },
    });
    return created({ id, storagePath: stored.storagePath, downloadUrl: stored.downloadUrl, visibility });
  } catch (err) {
    return handleApiError(err);
  }
}
