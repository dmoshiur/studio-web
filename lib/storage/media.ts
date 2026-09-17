import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { getAdminBucketName, getAdminStorage, getDataBackend } from "@/lib/firebase/admin";
import { getDataDir } from "@/lib/db/local-store";
import {
  cloudinaryDeliveryUrl,
  cloudinaryDestroy,
  cloudinaryFetchAsset,
  cloudinaryTransformedUrl,
  cloudinaryUpload,
  getCloudinaryConfig,
  isCloudinaryConfigured,
  parseCloudinaryUrl,
  type CloudinaryResourceType,
} from "@/lib/storage/cloudinary";

/**
 * Storage facade — one API for every backend.
 *
 *   cloudinary → Cloudinary (images, video, audio, documents + CDN)
 *   firebase   → Firebase Storage (Admin SDK)
 *   local      → embedded uploads directory served by /api/media/[...path]
 *
 * `STORAGE_BACKEND` forces a backend; otherwise Cloudinary wins whenever
 * credentials exist, then Firebase, then the embedded store.
 */

export type StorageProvider = "cloudinary" | "firebase" | "local";
export type MediaKind = "image" | "video" | "audio" | "document";

export interface StoredObject {
  storagePath: string;
  downloadUrl: string;
  visibility: "public" | "private";
  provider: StorageProvider;
  /** Cloudinary public id (absent for the other backends). */
  publicId?: string;
  resourceType?: CloudinaryResourceType;
  /** Small square preview (Cloudinary only) for library grids & pickers. */
  thumbnailUrl?: string;
  /** Poster frame for videos (Cloudinary only). */
  posterUrl?: string;
  format?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  bytes?: number;
}

/* ------------------------------------------------------------------ */
/* Provider resolution                                                 */
/* ------------------------------------------------------------------ */

export function getStorageProvider(): StorageProvider {
  const forced = (process.env.STORAGE_BACKEND ?? "").trim().toLowerCase();
  if (forced === "cloudinary") return "cloudinary";
  if (forced === "firebase" || forced === "firebase-storage") return "firebase";
  if (forced === "local" || forced === "filesystem") return "local";
  if (isCloudinaryConfigured()) return "cloudinary";
  return getDataBackend() === "firebase" ? "firebase" : "local";
}

export function isCloudinaryStorage(): boolean {
  return getStorageProvider() === "cloudinary";
}

export function isLocalStorage(): boolean {
  return getStorageProvider() === "local";
}

/** Human-readable status for the owner console. */
export function describeStorage(): { provider: StorageProvider; cloudName?: string; rootFolder?: string } {
  const cfg = getCloudinaryConfig();
  const provider = getStorageProvider();
  return {
    provider,
    ...(provider === "cloudinary" && cfg ? { cloudName: cfg.cloudName, rootFolder: cfg.rootFolder } : {}),
  };
}

export function uploadsRoot(): string {
  return path.join(getDataDir(), "uploads");
}

export function localMediaUrl(storagePath: string): string {
  return `/api/media/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
}

/* ------------------------------------------------------------------ */
/* Kind / limits                                                       */
/* ------------------------------------------------------------------ */

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);
const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/ogg", "video/x-matroska", "video/x-msvideo"]);
const AUDIO_MIMES = new Set(["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "audio/ogg", "audio/aac", "audio/flac"]);
const DOC_MIMES = new Set(["application/pdf", "text/plain", "text/csv"]);

export const IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp", "avif", "gif", "svg"];
export const VIDEO_FORMATS = ["mp4", "webm", "mov", "ogv", "mkv", "avi"];
export const AUDIO_FORMATS = ["mp3", "m4a", "wav", "ogg", "aac", "flac"];
export const DOC_FORMATS = ["pdf", "txt", "csv"];

const MB = 1024 * 1024;

/** Media kind for a mime type, or null when the type is not accepted. */
export function mediaKindForMime(mime: string): MediaKind | null {
  if (IMAGE_MIMES.has(mime)) return "image";
  if (VIDEO_MIMES.has(mime)) return "video";
  if (AUDIO_MIMES.has(mime)) return "audio";
  if (DOC_MIMES.has(mime)) return "document";
  return null;
}

export function resourceTypeForKind(kind: MediaKind): CloudinaryResourceType {
  if (kind === "image") return "image";
  if (kind === "video" || kind === "audio") return "video";
  return "raw";
}

export function allowedFormatsForKind(kind: MediaKind): string[] {
  if (kind === "image") return IMAGE_FORMATS;
  if (kind === "video") return VIDEO_FORMATS;
  if (kind === "audio") return AUDIO_FORMATS;
  return DOC_FORMATS;
}

/**
 * Size ceilings per kind. Cloudinary's default plan caps single video
 * uploads at 100 MB — override with MAX_VIDEO_MB when your plan allows more.
 */
export function maxBytesForKind(kind: MediaKind): number {
  const envVideoMb = Number(process.env.MAX_VIDEO_MB ?? "");
  if (kind === "image") return Number(process.env.MAX_IMAGE_MB ?? "") > 0 ? Number(process.env.MAX_IMAGE_MB) * MB : 10 * MB;
  if (kind === "video" || kind === "audio") {
    if (envVideoMb > 0) return envVideoMb * MB;
    return isCloudinaryStorage() ? 100 * MB : 250 * MB;
  }
  return 25 * MB;
}

export function maxMbLabel(kind: MediaKind): string {
  return `${Math.round(maxBytesForKind(kind) / MB)} MB`;
}

/* ------------------------------------------------------------------ */
/* Upload                                                              */
/* ------------------------------------------------------------------ */

function kindForContentType(contentType: string, storagePath: string): MediaKind {
  const byMime = mediaKindForMime(contentType);
  if (byMime) return byMime;
  const ext = path.extname(storagePath).toLowerCase();
  if ([".mp4", ".webm", ".mov", ".mkv", ".ogv", ".avi"].includes(ext)) return "video";
  if ([".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac"].includes(ext)) return "audio";
  if ([".pdf", ".txt", ".csv"].includes(ext)) return "document";
  return "image";
}

/** `cloudinary:video:folder/name` — self-describing path used by deleteObject. */
export function cloudinaryStoragePath(publicId: string, resourceType: CloudinaryResourceType): string {
  return `cloudinary:${resourceType}:${publicId}`;
}

export function parseStoragePath(storagePath: string): {
  provider: StorageProvider;
  publicId?: string;
  resourceType?: CloudinaryResourceType;
} {
  if (storagePath.startsWith("cloudinary:")) {
    const [, resourceType, ...rest] = storagePath.split(":");
    return {
      provider: "cloudinary",
      resourceType: (resourceType as CloudinaryResourceType) || "image",
      publicId: rest.join(":"),
    };
  }
  return { provider: getStorageProvider() };
}

function thumbnailFor(publicId: string, resourceType: CloudinaryResourceType): string | undefined {
  if (resourceType === "raw") return undefined;
  return cloudinaryTransformedUrl(publicId, resourceType, "c_fill,w_480,h_480,q_auto,f_auto");
}

function posterFor(publicId: string): string | undefined {
  return cloudinaryTransformedUrl(publicId, "video", "so_0,c_fill,w_720,q_auto", "jpg");
}

export async function putObject(params: {
  storagePath: string;
  buffer: Buffer;
  contentType: string;
  visibility: "public" | "private";
  uploadedBy: string;
  originalName: string;
}): Promise<StoredObject> {
  const { storagePath, buffer, contentType, visibility } = params;
  const provider = getStorageProvider();

  if (provider === "cloudinary") {
    const kind = kindForContentType(contentType, storagePath);
    const resourceType = resourceTypeForKind(kind);
    const ext = path.extname(storagePath);
    const dir = path.dirname(storagePath);
    const base = path.basename(storagePath, ext).slice(0, 90);
    const asset = await cloudinaryUpload({
      buffer,
      fileName: `${base}${ext}`,
      contentType,
      resourceType,
      folder: dir === "." ? "" : dir,
      publicId: base,
    });
    return {
      storagePath: cloudinaryStoragePath(asset.publicId, asset.resourceType),
      downloadUrl: asset.secureUrl || cloudinaryDeliveryUrl(asset.publicId, asset.resourceType),
      visibility,
      provider: "cloudinary",
      publicId: asset.publicId,
      resourceType: asset.resourceType,
      thumbnailUrl: thumbnailFor(asset.publicId, asset.resourceType),
      posterUrl: asset.resourceType === "video" ? posterFor(asset.publicId) : undefined,
      format: asset.format,
      width: asset.width,
      height: asset.height,
      durationSeconds: asset.durationSeconds,
      bytes: asset.bytes || buffer.byteLength,
    };
  }

  if (provider === "local") {
    const target = path.join(uploadsRoot(), storagePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer);
    return { storagePath, downloadUrl: localMediaUrl(storagePath), visibility, provider: "local", bytes: buffer.byteLength };
  }

  const storage = getAdminStorage();
  const bucketName = getAdminBucketName();
  if (!storage || !bucketName) throw new Error("Storage is not configured");
  const gfile = storage.bucket(bucketName).file(storagePath);
  await gfile.save(buffer, {
    contentType,
    metadata: { metadata: { uploadedBy: params.uploadedBy, originalName: params.originalName } },
  });
  if (visibility === "public") {
    await gfile.makePublic().catch(() => undefined);
  }
  const downloadUrl =
    visibility === "public"
      ? `https://storage.googleapis.com/${bucketName}/${encodeURI(storagePath)}`
      : "";
  return { storagePath, downloadUrl, visibility, provider: "firebase", bytes: buffer.byteLength };
}

export async function deleteObject(storagePath: string): Promise<void> {
  const parsed = parseStoragePath(storagePath);
  if (parsed.provider === "cloudinary") {
    if (!parsed.publicId) return;
    await cloudinaryDestroy(parsed.publicId, parsed.resourceType ?? "image");
    return;
  }

  if (isLocalStorage()) {
    try {
      await fs.unlink(path.join(uploadsRoot(), storagePath));
    } catch {
      /* already gone */
    }
    return;
  }
  const storage = getAdminStorage();
  const bucketName = getAdminBucketName();
  if (!storage || !bucketName) return;
  try {
    await storage.bucket(bucketName).file(storagePath).delete({ ignoreNotFound: true });
  } catch (err) {
    console.error("[storage] delete failed:", err);
  }
}

/**
 * Delete whatever an asset URL points at — embedded `/api/media/...`
 * paths, Cloudinary delivery URLs or bare Firebase Storage paths.
 */
export async function deleteObjectByUrl(url: string | null | undefined): Promise<void> {
  if (!url) return;
  if (url.startsWith("/api/media/")) {
    const storagePath = decodeURIComponent(url.slice("/api/media/".length));
    if (storagePath.startsWith("avatars/") || storagePath.startsWith("media/")) {
      await deleteObject(storagePath).catch(() => undefined);
    }
    return;
  }
  const cloudinary = parseCloudinaryUrl(url);
  if (cloudinary) {
    await deleteObject(cloudinaryStoragePath(cloudinary.publicId, cloudinary.resourceType)).catch(() => undefined);
    return;
  }
  const bucketMatch = /^https:\/\/storage\.googleapis\.com\/[^/]+\/(.+)$/.exec(url);
  if (bucketMatch) await deleteObject(decodeURIComponent(bucketMatch[1])).catch(() => undefined);
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

/** Resolve a stored object for serving (local backend only). */
export async function readLocalObject(
  storagePath: string
): Promise<{ buffer: Buffer; contentType: string; mtime: Date } | null> {
  const root = uploadsRoot();
  const target = path.join(root, storagePath);
  // Path traversal guard: the resolved path must stay inside the uploads root.
  if (!path.resolve(target).startsWith(path.resolve(root))) return null;
  try {
    const stat = await fs.stat(target);
    if (!stat.isFile()) return null;
    const buffer = await fs.readFile(target);
    return { buffer, contentType: contentTypeFor(storagePath), mtime: stat.mtime };
  } catch {
    return null;
  }
}

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
};

export function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

/** Verify (and describe) a browser-direct Cloudinary upload. */
export async function inspectCloudinaryUpload(publicId: string, resourceType: CloudinaryResourceType) {
  return cloudinaryFetchAsset(publicId, resourceType);
}
