import path from "node:path";
import {
  cloudinaryStoragePath,
  contentTypeFor,
  getStorageProvider,
  inspectCloudinaryUpload,
  maxBytesForKind,
  mediaKindForMime,
} from "@/lib/storage/media";
import { cloudinaryTransformedUrl, getCloudinaryConfig } from "@/lib/storage/cloudinary";
import { ALLOWED_MEDIA_FOLDERS } from "@/lib/media-folders";
import { requireAdmin } from "@/lib/server/auth";
import { createMediaRecord } from "@/lib/firestore/engagement";
import { mediaRecordSchema } from "@/lib/validation/schemas";
import { apiError, created, handleApiError, parseBody, rateLimitKey } from "@/lib/server/api-helpers";
import { rateLimit, RATE_PRESETS } from "@/lib/server/rate-limit";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MIME_BY_FORMAT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  ogv: "video/ogg",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  aac: "audio/aac",
  flac: "audio/flac",
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
};

/**
 * Record an asset that the browser uploaded straight to Cloudinary.
 * Nothing is trusted from the request: the asset is re-read from the
 * Cloudinary Admin API, its folder must sit inside our root folder, and
 * its size must respect the per-kind ceiling.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const rl = await rateLimit(
      rateLimitKey("media-record", req, user.uid),
      RATE_PRESETS.upload.limit,
      RATE_PRESETS.upload.windowMs
    );
    if (!rl.allowed) return apiError("Upload rate limit exceeded", 429, "rate_limited");

    if (getStorageProvider() !== "cloudinary") {
      return apiError("Cloudinary storage is not active", 501, "not_configured");
    }
    const cfg = getCloudinaryConfig();
    if (!cfg) return apiError("Cloudinary is not configured", 503, "not_configured");

    const body = await parseBody(req, mediaRecordSchema);
    if (!ALLOWED_MEDIA_FOLDERS.has(body.folder)) {
      return apiError(`Folder ${body.folder} is not allowed`, 400, "bad_folder");
    }

    const expectedPrefix = `${cfg.rootFolder}/${body.folder}/`;
    if (!body.publicId.startsWith(expectedPrefix)) {
      return apiError("Uploaded asset is outside the allowed folder", 403, "forbidden_folder");
    }

    const asset = await inspectCloudinaryUpload(body.publicId, body.resourceType);
    if (!asset) return apiError("The uploaded asset could not be found in Cloudinary", 404, "not_found");

    // Cloudinary's own format metadata is authoritative — the client's
    // declared mime type is only used as a fallback.
    const extension = (asset.format || path.extname(asset.publicId).replace(".", "") || "bin").toLowerCase();
    const mimeType = MIME_BY_FORMAT[extension] ?? contentTypeFor(asset.publicId);

    const kind = mediaKindForMime(mimeType) ?? (asset.resourceType === "raw" ? "document" : "image");
    const maxBytes = maxBytesForKind(kind);
    if (asset.bytes > maxBytes) {
      return apiError(
        `File is ${(asset.bytes / 1024 / 1024).toFixed(1)} MB — the limit is ${Math.round(maxBytes / 1024 / 1024)} MB`,
        413,
        "file_too_large"
      );
    }

    const fileName = path.basename(asset.publicId);
    const id = await createMediaRecord({
      fileName,
      originalName: (body.originalName || fileName).slice(0, 200),
      storagePath: cloudinaryStoragePath(asset.publicId, asset.resourceType),
      downloadUrl: asset.secureUrl,
      mimeType,
      sizeBytes: asset.bytes,
      width: asset.width,
      height: asset.height,
      folder: body.folder,
      visibility: body.folder === "media/documents" ? "private" : "public",
      alt: body.alt || undefined,
      uploadedBy: user.uid,
      provider: "cloudinary",
      publicId: asset.publicId,
      resourceType: asset.resourceType,
      thumbnailUrl:
        asset.resourceType === "raw"
          ? undefined
          : cloudinaryTransformedUrl(asset.publicId, asset.resourceType, "c_fill,w_480,h_480,q_auto,f_auto"),
      posterUrl:
        asset.resourceType === "video"
          ? cloudinaryTransformedUrl(asset.publicId, "video", "so_0,c_fill,w_720,q_auto", "jpg")
          : undefined,
      format: extension,
      durationSeconds: asset.durationSeconds,
    });

    await auditLog({
      actor: user,
      action: "media.upload",
      resource: id,
      metadata: { folder: body.folder, sizeBytes: asset.bytes, provider: "cloudinary", publicId: asset.publicId },
    });
    return created({
      id,
      storagePath: cloudinaryStoragePath(asset.publicId, asset.resourceType),
      downloadUrl: asset.secureUrl,
      visibility: body.folder === "media/documents" ? "private" : "public",
      provider: "cloudinary",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
