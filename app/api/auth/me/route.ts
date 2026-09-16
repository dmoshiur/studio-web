import { NextResponse } from "next/server";
import { getSessionUser, isEnvAdmin, isEnvAdminConfigured } from "@/lib/server/auth";
import { getDataBackend, isAdminConfigured } from "@/lib/firebase/admin";
import { identityBackend } from "@/lib/server/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user } = await getSessionUser();
  const meta = {
    backend: getDataBackend(),
    storage: getDataBackend() === "firebase" ? "firebase" : "sqlite",
    submitter: isAdminConfigured(),
    auth: identityBackend(),
    masterAdminConfigured: isEnvAdminConfigured(),
    envAdmin: isEnvAdmin(user?.email),
  };
  if (!user) return NextResponse.json({ user: null, ...meta }, { status: 401 });
  return NextResponse.json({ user, ...meta });
}
