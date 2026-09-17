import "server-only";
import crypto from "node:crypto";

/**
 * =====================================================================
 * Cloudinary — server-only client (no SDK dependency)
 * =====================================================================
 * Signed uploads, deletions and asset lookups against the Cloudinary
 * REST API. Everything the platform stores (images, videos, audio and
 * documents) can live in Cloudinary; the API key/secret never reach the
 * browser. Browser uploads use short-lived signatures minted by
 * /api/admin/media/sign (see `buildSignedUploadParams`).
 *
 * Configuration (any of):
 *   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
 *   CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
 * Optional:
 *   CLOUDINARY_FOLDER="manup"            root folder inside the account
 *   CLOUDINARY_UPLOAD_PRESET="<preset>"  signed preset with extra rules
 */

export type CloudinaryResourceType = "image" | "video" | "raw";

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  /** Every asset is stored under this root folder. */
  rootFolder: string;
  uploadPreset?: string;
}

export interface CloudinaryAsset {
  publicId: string;
  resourceType: CloudinaryResourceType;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  secureUrl: string;
  createdAt?: string;
}

export class CloudinaryError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(redactSecret(message));
    this.name = "CloudinaryError";
    this.status = status;
  }
}

/** Never let a credential leak into an error message or a log line. */
function redactSecret(message: string): string {
  const cfg = getCloudinaryConfig();
  if (!cfg) return message;
  return message
    .split(cfg.apiSecret)
    .join("[redacted]")
    .split(cfg.apiKey)
    .join("[redacted]");
}

/** Parse the classic single-variable form: cloudinary://key:secret@cloud */
function fromCloudinaryUrl(raw: string | undefined): Partial<CloudinaryConfig> | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "cloudinary:") return null;
    const cloudName = url.hostname;
    const apiKey = decodeURIComponent(url.username);
    const apiSecret = decodeURIComponent(url.password);
    if (!cloudName || !apiKey || !apiSecret) return null;
    const folder = url.searchParams.get("folder") ?? undefined;
    return { cloudName, apiKey, apiSecret, ...(folder ? { rootFolder: folder } : {}) };
  } catch {
    console.error("[cloudinary] CLOUDINARY_URL is not a valid cloudinary:// URL");
    return null;
  }
}

export function getCloudinaryConfig(): CloudinaryConfig | null {
  const fromUrl = fromCloudinaryUrl(process.env.CLOUDINARY_URL);
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME?.trim() ||
    fromUrl?.cloudName ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ||
    "";
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() || fromUrl?.apiKey || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() || fromUrl?.apiSecret || "";
  if (!cloudName || !apiKey || !apiSecret) return null;
  const rootFolder = (process.env.CLOUDINARY_FOLDER ?? fromUrl?.rootFolder ?? "manup")
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9/_-]/g, "-");
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET?.trim() || undefined;
  return { cloudName, apiKey, apiSecret, rootFolder: rootFolder || "manup", uploadPreset };
}

export function isCloudinaryConfigured(): boolean {
  return getCloudinaryConfig() !== null;
}

export function cloudinaryCloudName(): string | null {
  return getCloudinaryConfig()?.cloudName ?? null;
}

/* ------------------------------------------------------------------ */
/* Signatures                                                          */
/* ------------------------------------------------------------------ */

/** SHA-1 signature over alphabetically sorted params + api_secret. */
export function signParams(params: Record<string, string | number>, secret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(toSign + secret).digest("hex");
}

export interface SignedUpload {
  cloudName: string;
  resourceType: CloudinaryResourceType;
  uploadUrl: string;
  /** Params to post verbatim (signature, api_key, timestamp, folder, limits…). */
  params: Record<string, string>;
  /** Full public id the asset will have when Cloudinary accepts it. */
  publicId: string;
  /** Destination folder inside the Cloudinary account. */
  folder: string;
  maxBytes: number;
}

/**
 * Mint a short-lived signature so the browser can upload straight to
 * Cloudinary (bypassing serverless request-body limits — essential for
 * video). Formats, size and destination folder are baked into the
 * signature, so the client cannot widen them.
 */
export function buildSignedUploadParams(opts: {
  folder: string;
  fileName: string;
  resourceType: CloudinaryResourceType;
  allowedFormats: string[];
  maxBytes: number;
  timestamp?: number;
}): SignedUpload | null {
  const cfg = getCloudinaryConfig();
  if (!cfg) return null;

  const stamp = Math.floor((opts.timestamp ?? Date.now()) / 1000);
  const unique = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const base =
    (opts.fileName || "upload")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .slice(0, 80)
      .replace(/^[-_.]+|[-_.]+$/g, "") || "upload";
  const name = `${unique}-${base}`;
  const folder = [cfg.rootFolder, opts.folder].filter(Boolean).join("/");

  const params: Record<string, string | number> = {
    api_key: cfg.apiKey,
    timestamp: stamp,
    folder,
    public_id: name,
    allowed_formats: opts.allowedFormats.join(","),
    max_file_size: opts.maxBytes,
    unique_filename: "false",
    overwrite: "false",
    ...(cfg.uploadPreset ? { upload_preset: cfg.uploadPreset } : {}),
  };
  const signature = signParams(params, cfg.apiSecret);
  const signed: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) signed[k] = String(v);
  signed.signature = signature;

  return {
    cloudName: cfg.cloudName,
    resourceType: opts.resourceType,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/${opts.resourceType}/upload`,
    params: signed,
    publicId: `${folder}/${name}`,
    folder,
    maxBytes: opts.maxBytes,
  };
}

/* ------------------------------------------------------------------ */
/* Upload / delete / inspect                                           */
/* ------------------------------------------------------------------ */

const REQUEST_TIMEOUT_MS = 120_000;

interface RawUploadResponse {
  public_id?: string;
  resource_type?: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
  secure_url?: string;
  created_at?: string;
  error?: { message?: string };
}

function normaliseAsset(raw: RawUploadResponse, fallbackType: CloudinaryResourceType): CloudinaryAsset {
  if (!raw.public_id || !raw.secure_url) {
    throw new CloudinaryError(raw.error?.message ?? "Cloudinary returned an unexpected response");
  }
  return {
    publicId: raw.public_id,
    resourceType: (raw.resource_type as CloudinaryResourceType) ?? fallbackType,
    format: raw.format ?? "",
    bytes: Number(raw.bytes ?? 0),
    width: raw.width != null ? Number(raw.width) : undefined,
    height: raw.height != null ? Number(raw.height) : undefined,
    durationSeconds: raw.duration != null ? Number(raw.duration) : undefined,
    secureUrl: raw.secure_url,
    createdAt: raw.created_at,
  };
}

/** Server-side upload (small files, avatars, seeds). */
export async function cloudinaryUpload(params: {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  resourceType?: CloudinaryResourceType;
  folder?: string;
  publicId?: string;
}): Promise<CloudinaryAsset> {
  const cfg = getCloudinaryConfig();
  if (!cfg) throw new CloudinaryError("Cloudinary is not configured", 503);

  const resourceType =
    params.resourceType ??
    (params.contentType.startsWith("video/") || params.contentType.startsWith("audio/")
      ? "video"
      : params.contentType.startsWith("image/")
        ? "image"
        : "raw");

  const form = new FormData();
  const bytes = new Uint8Array(params.buffer);
  form.append("file", new Blob([bytes], { type: params.contentType }), params.fileName);
  const stamp = Math.floor(Date.now() / 1000);
  const folder = [cfg.rootFolder, params.folder].filter(Boolean).join("/");
  const signed: Record<string, string | number> = {
    api_key: cfg.apiKey,
    timestamp: stamp,
    ...(folder ? { folder } : {}),
    ...(params.publicId ? { public_id: params.publicId } : {}),
    ...(cfg.uploadPreset ? { upload_preset: cfg.uploadPreset } : {}),
  };
  signed.signature = signParams(signed, cfg.apiSecret);
  for (const [k, v] of Object.entries(signed)) form.append(k, String(v));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/${resourceType}/upload`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch((err) => {
    throw new CloudinaryError(`Cloudinary upload failed: ${err instanceof Error ? err.message : "network error"}`);
  });

  const text = await res.text();
  let json: RawUploadResponse;
  try {
    json = JSON.parse(text) as RawUploadResponse;
  } catch {
    throw new CloudinaryError(`Cloudinary returned an unreadable response (HTTP ${res.status})`);
  }
  if (!res.ok) throw new CloudinaryError(json.error?.message ?? `Cloudinary upload failed (HTTP ${res.status})`, res.status);
  return normaliseAsset(json, resourceType);
}

/** Delete an asset. `invalidate` also purges the CDN copy. */
export async function cloudinaryDestroy(publicId: string, resourceType: CloudinaryResourceType): Promise<void> {
  const cfg = getCloudinaryConfig();
  if (!cfg) return;
  const stamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string | number> = {
    api_key: cfg.apiKey,
    public_id: publicId,
    timestamp: stamp,
    invalidate: "true",
  };
  params.signature = signParams(params, cfg.apiSecret);

  const form = new FormData();
  for (const [k, v] of Object.entries(params)) form.append(k, String(v));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/${resourceType}/destroy`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new CloudinaryError(`Cloudinary delete failed (HTTP ${res.status}) ${text.slice(0, 200)}`.trim(), res.status);
  }
}

/**
 * Authoritative asset metadata from the Cloudinary Admin API — used to
 * verify (and price) a browser-direct upload before it is recorded.
 */
export async function cloudinaryFetchAsset(
  publicId: string,
  resourceType: CloudinaryResourceType
): Promise<CloudinaryAsset | null> {
  const cfg = getCloudinaryConfig();
  if (!cfg) return null;
  const encoded = publicId.split("/").map(encodeURIComponent).join("/");
  const auth = Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString("base64");
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cfg.cloudName}/resources/${resourceType}/upload/${encoded}`,
    { headers: { Authorization: `Basic ${auth}` }, signal: AbortSignal.timeout(30_000), cache: "no-store" }
  ).catch(() => null);
  if (!res) return null;
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as RawUploadResponse | null;
  if (!json) return null;
  try {
    return normaliseAsset(json, resourceType);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Delivery URLs                                                       */
/* ------------------------------------------------------------------ */

function encodePublicId(publicId: string): string {
  return publicId
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/** Canonical delivery URL for an asset (no transformations). */
export function cloudinaryDeliveryUrl(publicId: string, resourceType: CloudinaryResourceType): string {
  const cfg = getCloudinaryConfig();
  if (!cfg) return "";
  return `https://res.cloudinary.com/${cfg.cloudName}/${resourceType}/upload/${encodePublicId(publicId)}`;
}

/** Delivery URL with a transformation applied (thumbnails, posters, …). */
export function cloudinaryTransformedUrl(
  publicId: string,
  resourceType: CloudinaryResourceType,
  transformation: string,
  extension?: string
): string {
  const cfg = getCloudinaryConfig();
  if (!cfg) return "";
  const ext = extension ? (extension.startsWith(".") ? extension : `.${extension}`) : "";
  return `https://res.cloudinary.com/${cfg.cloudName}/${resourceType}/upload/${transformation}/${encodePublicId(publicId)}${ext}`;
}

const EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "webp", "avif", "gif", "svg", "bmp", "tiff", "heic", "ico",
  "mp4", "webm", "mov", "m4v", "ogv", "avi", "mkv", "mp3", "m4a", "wav", "ogg", "aac", "flac",
  "pdf", "txt", "csv", "doc", "docx", "zip",
]);

/**
 * Reverse a delivery URL (as stored on a user profile / media record)
 * back to its Cloudinary coordinates so it can be deleted.
 */
export function parseCloudinaryUrl(url: string): { publicId: string; resourceType: CloudinaryResourceType } | null {
  const cfg = getCloudinaryConfig();
  if (!cfg || !url) return null;
  const marker = `res.cloudinary.com/${cfg.cloudName}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const rest = url.slice(idx + marker.length).split("?")[0].split("#")[0];
  const match = /^(image|video|raw)\/upload\/(.+)$/.exec(rest);
  if (!match) return null;
  const resourceType = match[1] as CloudinaryResourceType;
  let tail = match[2].replace(/^v\d+\//, "");
  if (resourceType !== "raw") {
    tail = tail.replace(/\.[a-zA-Z0-9]{1,5}$/, "");
  }
  if (!tail) return null;
  return { publicId: decodeURIComponent(tail), resourceType };
}
