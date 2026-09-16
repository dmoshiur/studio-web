import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { getAdminBucketName, getAdminStorage, getDataBackend } from "@/lib/firebase/admin";
import { getDataDir } from "@/lib/db/local-store";

/**
 * Storage facade — media files land either in Firebase Storage (when
 * configured) or in the embedded uploads directory served by
 * /api/media/[...path]. Both paths return the same shape.
 */

export interface StoredObject {
  storagePath: string;
  downloadUrl: string;
  visibility: "public" | "private";
}

export function uploadsRoot(): string {
  return path.join(getDataDir(), "uploads");
}

export function localMediaUrl(storagePath: string): string {
  return `/api/media/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
}

export function isLocalStorage(): boolean {
  return getDataBackend() === "local";
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

  if (isLocalStorage()) {
    const target = path.join(uploadsRoot(), storagePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer);
    return { storagePath, downloadUrl: localMediaUrl(storagePath), visibility };
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
  return { storagePath, downloadUrl, visibility };
}

export async function deleteObject(storagePath: string): Promise<void> {
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
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
};

export function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}
