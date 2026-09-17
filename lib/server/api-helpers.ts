import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { AuthError } from "@/lib/server/auth";
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
  // Log the real error server-side (for the ops terminal) but return a
  // generic message — stack traces never reach the browser.
  console.error("[api] Unhandled error:", err);
  bumpCounter("apiErrors");
  opsError("api", `Unhandled API error: ${err instanceof Error ? err.message : String(err)}`);
  return apiError("Internal server error", 500, "internal_error");
}

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new AuthError("Invalid JSON body", 400, "invalid_json");
  }
  return schema.parse(json);
}

export function requestIp(req: Request): string {
  return getClientIp(req.headers);
}

export function rateLimitKey(prefix: string, req: Request, suffix?: string): string {
  const ip = requestIp(req);
  return `${prefix}:${ip}${suffix ? `:${suffix}` : ""}`;
}
