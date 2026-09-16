import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/auth";
import { createIdentityUser, IdentityError, listIdentityUsers } from "@/lib/server/identity";
import { apiError, handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";
import type { Role } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createUserSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
  displayName: z.string().min(2).max(80).optional(),
  role: z.enum(["user", "admin", "owner"]).default("user"),
});

/** List accounts (owner console user management). */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);
    const data = await listIdentityUsers(limit, url.searchParams.get("pageToken") ?? undefined);
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

/** Create an account directly (useful when self-registration is disabled). */
export async function POST(req: Request) {
  try {
    const actor = await requireAdmin();
    const body = await parseBody(req, createUserSchema);
    const user = await createIdentityUser({
      email: body.email,
      password: body.password,
      displayName: body.displayName ?? null,
      role: body.role as Role,
    });
    await auditLog({ actor, action: "users.create", resource: user.uid, result: "success", metadata: { role: body.role } });
    return ok({ user });
  } catch (err) {
    if (err instanceof IdentityError) {
      return apiError(err.message, err.status, err.code);
    }
    return handleApiError(err);
  }
}

