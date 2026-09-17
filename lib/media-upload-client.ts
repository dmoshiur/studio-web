/**
 * Browser-side media upload helper (no server-only imports).
 *
 * Preferred path — Cloudinary direct upload:
 *   1. POST /api/admin/media/sign   → one-file signature (folder + limits signed in)
 *   2. POST <cloudinary upload url> → the file itself, straight from the browser
 *   3. POST /api/admin/media/record → the asset is verified and filed in the library
 * This bypasses serverless request-body limits, which is what makes large
 * video uploads (100 MB+) work.
 *
 * Fallback path — POST /api/admin/media/upload (embedded disk / Firebase
 * Storage, or when Cloudinary is not configured).
 */

export interface UploadResult {
  id?: string;
  downloadUrl: string;
  storagePath?: string;
  provider?: "cloudinary" | "firebase" | "local";
  resourceType?: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  bytes?: number;
  durationSeconds?: number;
}

export interface UploadOptions {
  folder: string;
  alt?: string;
  onProgress?: (percent: number) => void;
}

interface SignResponse {
  provider: string;
  resourceType: string;
  uploadUrl: string;
  publicId: string;
  params: Record<string, string>;
  maxBytes: number;
}

interface XhrResult {
  status: number;
  ok: boolean;
  json: Record<string, unknown>;
  text: string;
}

function xhrSend(
  url: string,
  body: FormData,
  onProgress?: (percent: number) => void,
  method = "POST"
): Promise<XhrResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      };
    }
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.onload = () => {
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(xhr.responseText) as Record<string, unknown>;
      } catch {
        /* non-JSON response */
      }
      resolve({ status: xhr.status, ok: xhr.status >= 200 && xhr.status < 300, json, text: xhr.responseText });
    };
    xhr.send(body);
  });
}

let directUploadAvailable: boolean | null = null;

async function requestSignature(file: File, folder: string): Promise<SignResponse | null> {
  if (directUploadAvailable === false) return null;
  let res: Response;
  try {
    res = await fetch("/api/admin/media/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder, fileName: file.name || "upload", mimeType: file.type }),
    });
  } catch {
    // Endpoint unreachable → use the server-side upload route instead.
    directUploadAvailable = false;
    return null;
  }
  if (res.status === 501 || res.status === 503) {
    // Cloudinary is not the active storage backend.
    directUploadAvailable = false;
    return null;
  }
  const data = (await res.json().catch(() => ({}))) as SignResponse & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Could not start the upload (HTTP ${res.status})`);
  directUploadAvailable = true;
  return data;
}

async function uploadViaCloudinary(file: File, folder: string, opts: UploadOptions): Promise<UploadResult | null> {
  const signed = await requestSignature(file, folder);
  if (!signed) return null;
  if (file.size > signed.maxBytes) {
    throw new Error(`File is too large — the limit is ${Math.round(signed.maxBytes / 1024 / 1024)} MB`);
  }

  const form = new FormData();
  for (const [key, value] of Object.entries(signed.params)) form.append(key, value);
  form.append("file", file);

  const uploaded = await xhrSend(signed.uploadUrl, form, opts.onProgress);
  if (!uploaded.ok) {
    const message =
      (uploaded.json as { error?: { message?: string } }).error?.message ??
      `Cloudinary rejected the upload (HTTP ${uploaded.status})`;
    throw new Error(message);
  }
  const info = uploaded.json as { public_id?: string; resource_type?: string; bytes?: number };
  const publicId = info.public_id ?? signed.publicId;

  // File the asset in the media library (server re-verifies it with Cloudinary).
  const res = await fetch("/api/admin/media/record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicId,
      resourceType: info.resource_type ?? signed.resourceType,
      folder,
      originalName: file.name || "upload",
      mimeType: file.type,
      alt: opts.alt ?? "",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; downloadUrl?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "The uploaded file could not be saved");
  return { id: data.id, downloadUrl: data.downloadUrl ?? "", provider: "cloudinary" };
}

async function uploadViaServer(file: File, folder: string, opts: UploadOptions): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  if (opts.alt) form.append("alt", opts.alt);

  const res = await xhrSend("/api/admin/media/upload", form, opts.onProgress);
  if (!res.ok) {
    throw new Error((res.json as { error?: string }).error ?? `Upload failed (HTTP ${res.status})`);
  }
  const data = res.json as { id?: string; downloadUrl?: string; storagePath?: string };
  return { id: data.id, downloadUrl: data.downloadUrl ?? "", storagePath: data.storagePath, provider: "local" };
}

/** Upload one file to the configured storage backend. */
export async function uploadMediaFile(file: File, opts: UploadOptions): Promise<UploadResult> {
  const direct = await uploadViaCloudinary(file, opts.folder, opts);
  if (direct) return direct;
  return uploadViaServer(file, opts.folder, opts);
}
