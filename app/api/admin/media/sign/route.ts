import {
  allowedFormatsForKind,
  getStorageProvider,
  maxBytesForKind,
  mediaKindForMime,
  resourceTypeForKind,
} from "@/lib/storage/media";
import { buildSignedUploadParams } from "@/lib/storage/cloudinary";
import { ALLOWED_MEDIA_FOLDERS } from "@/lib/media-folders";
import { requireAdmin } from "@/lib/server/auth";
import { mediaSignSchema } from "@/lib/validation/schemas";
import { apiError, handleApiError, ok, parseBody, rateLimitKey } from "@/lib/server/api-helpers";
import { rateLimit, RATE_PRESETS } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mint a one-file Cloudinary signature so the browser uploads directly to
 * Cloudinary — no request-body limits, which is what makes large video
 * uploads work on serverless hosting. Formats, size ceiling and the
 * destination folder are part of the signature and cannot be changed by
 * the client afterwards.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const rl = await rateLimit(
      rateLimitKey("media-sign", req, user.uid),
      RATE_PRESETS.upload.limit,
      RATE_PRESETS.upload.windowMs
    );
    if (!rl.allowed) return apiError("Upload rate limit exceeded", 429, "rate_limited");

    const body = await parseBody(req, mediaSignSchema);
    if (getStorageProvider() !== "cloudinary") {
      return apiError("Direct upload requires Cloudinary storage", 501, "not_configured");
    }
    if (!ALLOWED_MEDIA_FOLDERS.has(body.folder)) {
      return apiError(`Folder ${body.folder} is not allowed`, 400, "bad_folder");
    }
    const kind = mediaKindForMime(body.mimeType);
    if (!kind) {
      return apiError(`File type ${body.mimeType || "unknown"} is not allowed`, 415, "unsupported_media_type");
    }

    const signed = buildSignedUploadParams({
      folder: body.folder,
      fileName: body.fileName,
      resourceType: resourceTypeForKind(kind),
      allowedFormats: allowedFormatsForKind(kind),
      maxBytes: maxBytesForKind(kind),
    });
    if (!signed) return apiError("Cloudinary is not configured", 503, "not_configured");

    return ok({
      provider: "cloudinary" as const,
      kind,
      cloudName: signed.cloudName,
      resourceType: signed.resourceType,
      uploadUrl: signed.uploadUrl,
      publicId: signed.publicId,
      params: signed.params,
      maxBytes: signed.maxBytes,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
