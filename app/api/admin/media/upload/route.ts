import { randomUUID } from "crypto";
import { getDataBackend } from "@/lib/firebase/admin";
import { isLocalStorage, putObject } from "@/lib/storage/media";
import { requireAdmin } from "@/lib/server/auth";
import { createMediaRecord } from "@/lib/firestore/engagement";
import { apiError, created, handleApiError, rateLimitKey } from "@/lib/server/api-helpers";
import { rateLimit, RATE_PRESETS } from "@/lib/server/rate-limit";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_FOLDERS = new Set([
  "media/images",
  "media/documents",
  "media/public",
  "avatars",
  "events",
  "speakers",
  "posts",
]);

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "image/avif"]);
const DOC_MIMES = new Set(["application/pdf", "text/plain", "text/csv"]);

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_DOC_BYTES = 20 * 1024 * 1024;

/** Admin-only multipart upload. Validates MIME + size, stores via Admin SDK. */
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
    const folder = ALLOWED_FOLDERS.has(folderRaw) ? folderRaw : "media/images";

    if (!(file instanceof File)) return apiError("No file provided", 400, "no_file");

    const isDocFolder = folder === "media/documents";
    const allowed: Set<string> = isDocFolder ? DOC_MIMES : IMAGE_MIMES;
    if (!allowed.has(file.type)) {
      return apiError(`File type ${file.type || "unknown"} is not allowed in ${folder}`, 415, "unsupported_media_type");
    }
    const maxBytes = isDocFolder ? MAX_DOC_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes || file.size === 0) {
      return apiError(`File must be between 1 byte and ${Math.round(maxBytes / 1024 / 1024)} MB`, 413, "file_too_large");
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload";
    const storagePath = `${folder}/${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    // Public folders get public URLs; documents stay private (resolved on demand).
    const visibility: "public" | "private" = isDocFolder ? "private" : "public";
    const stored = await putObject({
      storagePath,
      buffer,
      contentType: file.type,
      visibility,
      uploadedBy: user.uid,
      originalName: file.name.slice(0, 200),
    });
    const downloadUrl = stored.downloadUrl;

    const id = await createMediaRecord({
      fileName: safeName,
      originalName: file.name.slice(0, 200),
      storagePath,
      downloadUrl,
      mimeType: file.type,
      sizeBytes: file.size,
      folder,
      visibility,
      alt: alt || undefined,
      uploadedBy: user.uid,
    });

    await auditLog({ actor: user, action: "media.upload", resource: id, metadata: { folder, sizeBytes: file.size } });
    return created({ id, storagePath, downloadUrl, visibility });
  } catch (err) {
    return handleApiError(err);
  }
}
