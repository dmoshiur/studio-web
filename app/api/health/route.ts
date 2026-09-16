import { getAdminAuth, getAdminDb, getAdminStorage, isAdminConfigured } from "@/lib/firebase/admin";
import { getMaintenanceState } from "@/lib/firestore/settings";
import { isSmtpConfigured } from "@/lib/email/mailer";
import { ok } from "@/lib/server/api-helpers";
import type { HealthStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function check(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    return { status: "operational" as const, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: (name === "smtp" ? "unavailable" : "error") as "unavailable" | "error",
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : "check failed",
    };
  }
}

/** Public liveness + safe subsystem status. Exposes NO secrets. */
export async function GET() {
  const checks: HealthStatus["checks"] = {};

  checks.app = { status: "operational" };

  checks.firestore = await check("firestore", async () => {
    const db = getAdminDb();
    if (!db) throw new Error("not configured");
    await db.collection("siteSettings").doc("public").get();
  });

  checks.auth = await check("auth", async () => {
    const auth = getAdminAuth();
    if (!auth) throw new Error("not configured");
    await auth.listUsers(1);
  });

  checks.storage = await check("storage", async () => {
    const storage = getAdminStorage();
    if (!storage || !isAdminConfigured()) throw new Error("not configured");
    // Lightweight: just verify bucket handle resolves
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) throw new Error("bucket not configured");
  });

  checks.email = isSmtpConfigured()
    ? { status: "configured" }
    : { status: "unavailable", message: "SMTP not configured" };

  try {
    const m = await getMaintenanceState();
    checks.maintenance = {
      status: m.enabled || m.emergencyLock ? "unavailable" : "operational",
      message: m.enabled || m.emergencyLock ? "Site is in maintenance mode" : "Site online",
    };
  } catch {
    checks.maintenance = { status: "error", message: "Unable to read maintenance state" };
  }

  const anyError = Object.values(checks).some((c) => c.status === "error");
  const status: HealthStatus["status"] = anyError ? "degraded" : "operational";

  return ok<HealthStatus>({
    status,
    checks,
    version: "2.0.0",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
    checkedAt: new Date().toISOString(),
  });
}
