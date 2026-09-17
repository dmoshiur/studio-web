import os from "node:os";
import path from "node:path";
import { requireHackerAdmin } from "@/lib/server/auth";
import { getAdminDb, getDataBackend } from "@/lib/firebase/admin";
import { getSmtpStatus, getTransporter } from "@/lib/email/mailer";
import { invalidateSettingsCache } from "@/lib/firestore/settings";
import { getOpsCounters, opsInfo } from "@/lib/server/ops-log";
import { getPasscodeState } from "@/lib/server/passcode";
import { handleApiError, ok, parseBody, apiError } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bootTime = Date.now();

let lastCpu = process.cpuUsage();
let lastCpuAt = Date.now();

function cpuPercent(): number {
  const now = Date.now();
  const usage = process.cpuUsage(lastCpu);
  const elapsedMs = Math.max(now - lastCpuAt, 1);
  lastCpu = process.cpuUsage();
  lastCpuAt = now;
  // usage is cumulative µs across all cores
  return Math.min(100, Math.round(((usage.user + usage.system) / 1000 / elapsedMs) * 100));
}

/**
 * Runtime/operations snapshot — live process facts, never secrets.
 * Every sensitive configuration value is masked or omitted.
 */
export async function GET() {
  try {
    await requireHackerAdmin();

    const mem = process.memoryUsage();
    const dbStart = Date.now();
    let dbStatus: "operational" | "error" = "error";
    try {
      const db = getAdminDb();
      if (db) {
        await db.collection("siteSettings").doc("public").get();
        dbStatus = "operational";
      }
    } catch {
      dbStatus = "error";
    }
    const dbLatency = Date.now() - dbStart;

    const smtp = await getSmtpStatus();
    const passcode = await getPasscodeState().catch(() => null);

    return ok({
      serverTime: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - bootTime) / 1000),
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: `${process.platform}/${process.arch}`,
        memory: {
          rssBytes: mem.rss,
          heapUsedBytes: mem.heapUsed,
          heapTotalBytes: mem.heapTotal,
        },
        cpuPercent: cpuPercent(),
        loadAvg: os.loadavg(),
        cpus: os.cpus().length,
      },
      app: {
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
        backend: getDataBackend(),
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
        dataDir: process.env.DATA_DIR ?? path.join(process.cwd(), "data"),
        registrationOpen: (process.env.ALLOW_REGISTRATION ?? "true").toLowerCase() !== "false",
        sessionCookie: process.env.SESSION_COOKIE_NAME ?? "__session",
      },
      database: { status: dbStatus, latencyMs: dbLatency },
      email: {
        configured: smtp.configured,
        host: smtp.host,
        port: smtp.port,
        user: smtp.user,
        fromEmail: smtp.fromEmail,
        // password is never included
      },
      passcode: passcode
        ? {
            mode: passcode.mode,
            valid: passcode.valid,
            expiresAt: passcode.expiresAt,
            lastRotationResult: passcode.lastRotationResult,
            lockedUntil: passcode.lockedUntil,
          }
        : null,
      counters: getOpsCounters(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const actionSchema = z.object({
  action: z.enum(["test-db", "test-smtp", "flush-cache"]),
});

/**
 * Safe runtime controls. Each action genuinely performs its operation and
 * reports the real result — nothing here is simulated.
 */
export async function POST(req: Request) {
  try {
    const actor = await requireHackerAdmin();
    const { action } = await parseBody(req, actionSchema);

    if (action === "test-db") {
      const start = Date.now();
      try {
        const db = getAdminDb();
        if (!db) return apiError("No database backend is configured", 503, "no_backend");
        await db.collection("siteSettings").doc("public").get();
        const latency = Date.now() - start;
        await auditLog({ actor, action: "hackeradmin.runtime.test_db", result: "success", metadata: { latencyMs: latency } });
        return ok({ ok: true, message: `Database connection verified (${latency}ms)`, latencyMs: latency });
      } catch (err) {
        await auditLog({ actor, action: "hackeradmin.runtime.test_db", result: "failure" });
        return apiError(`Database test failed: ${err instanceof Error ? err.message : "unknown error"}`, 502, "db_test_failed");
      }
    }

    if (action === "test-smtp") {
      try {
        const tx = await getTransporter();
        if (!tx) return apiError("SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASSWORD / SMTP_FROM_EMAIL required)", 503, "smtp_unconfigured");
        await tx.verify();
        await auditLog({ actor, action: "hackeradmin.runtime.test_smtp", result: "success" });
        return ok({ ok: true, message: "SMTP server accepted the connection (transport verified)." });
      } catch (err) {
        await auditLog({ actor, action: "hackeradmin.runtime.test_smtp", result: "failure" });
        return apiError(`SMTP test failed: ${err instanceof Error ? err.message : "unknown error"}`, 502, "smtp_test_failed");
      }
    }

    // flush-cache: drop the in-process settings/maintenance caches so the
    // next request reads fresh values from the database.
    invalidateSettingsCache();
    opsInfo("runtime", "In-process settings cache flushed by operator");
    await auditLog({ actor, action: "hackeradmin.runtime.flush_cache", result: "success" });
    return ok({ ok: true, message: "Application caches flushed — the next request will read fresh data from the database." });
  } catch (err) {
    return handleApiError(err);
  }
}
