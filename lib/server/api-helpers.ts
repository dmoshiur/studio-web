import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type z, type ZodTypeAny } from "zod";
import { AuthError } from "@/lib/server/auth";
import { CloudinaryError } from "@/lib/storage/cloudinary";
import { bumpCounter, opsError } from "@/lib/server/ops-log";
import { getClientIp } from "@/lib/utils";

export function ok<T>(data: T, init?: ResponseInit & { headers?: Record<string, string> }) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function apiError(message: string, status = 400, code = "bad_request", details?: unknown) {
  return NextResponse.json({ error: message, code, details }, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof AuthError) {
    return apiError(err.message, err.status, err.code);
  }
  if (err instanceof ZodError) {
    return apiError("Validation failed", 422, "validation_error", err.flatten());
  }
  // Storage provider failures (Cloudinary/Cloudinary Admin API) — the message
  // is already redacted of credentials inside CloudinaryError.
  if (err instanceof CloudinaryError) {
    const status = err.status >= 400 && err.status < 600 ? err.status : 502;
    console.error("[api] Storage error:", err.message);
    return apiError(err.message, status === 401 || status === 403 ? 502 : status, "storage_error");
  }
  // Log the real error server-side (for the ops terminal) but return a
  // generic message — stack traces never reach the browser.
  console.error("[api] Unhandled error:", err);
  bumpCounter("apiErrors");
  opsError("api", `Unhandled API error: ${err instanceof Error ? err.message : String(err)}`);
  return apiError("Internal server error", 500, "internal_error");
}

/**
 * Validate a JSON request body. The schema's *output* type is returned, so
 * defaults declared in the schema (`.default(…)`) are always applied.
 */
export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.output<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new AuthError("Invalid JSON body", 400, "invalid_json");
  }
  return schema.parse(json) as z.output<S>;
}

export function requestIp(req: Request): string {
  return getClientIp(req.headers);
}

export function rateLimitKey(prefix: string, req: Request, suffix?: string): string {
  const ip = requestIp(req);
  return `${prefix}:${ip}${suffix ? `:${suffix}` : ""}`;
}
