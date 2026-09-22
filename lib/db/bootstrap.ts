import "server-only";
import { seedIfEmpty } from "@/lib/db/seed";
import { runRebrandMigration } from "@/lib/db/rebrand";
import { opsInfo, opsWarn } from "@/lib/server/ops-log";

/**
 * One-time-per-process startup tasks, kicked from the root layout:
 *   1. Seed demo content into an empty embedded store.
 *   2. Migrate legacy-branded content to the current brand (idempotent).
 *   3. Seed the environment-configured admin account (hashed password,
 *      idempotent — never duplicates, never resets).
 *   4. Provision the rotating operations passcode (emails the first code
 *      to the security recipient when SMTP is configured).
 * Each task is idempotent and failure-isolated.
 */

let bootPromise: Promise<void> | null = null;

async function boot(): Promise<void> {
  try {
    const { getDataBackend } = await import("@/lib/firebase/admin");
    opsInfo("app", `Application boot — data backend: ${getDataBackend()}`);
    // Data-persistence diagnostics: the embedded store lives on the local
    // disk and will NOT survive across serverless instances/deploys. The
    // intended production database is Firestore — say so loudly.
    if (getDataBackend() !== "firebase") {
      if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        console.warn(
          "[bootstrap] ⚠ Running the embedded store on a serverless host — data, accounts and sessions are per-instance and will not persist. Configure the Firebase (Firestore) credentials so the deployment connects to the production database."
        );
        opsWarn("bootstrap", "Embedded store on serverless host — configure Firestore for production persistence");
      }
      if (!process.env.SESSION_SECRET) {
        console.warn(
          "[bootstrap] ⚠ SESSION_SECRET is not set — session cookies are signed with a generated key. Set SESSION_SECRET in production so sessions survive restarts and span instances."
        );
      }
    }
  } catch {
    /* informational only */
  }

  try {
    const result = await seedIfEmpty();
    if (result.seeded) opsInfo("bootstrap", `Content store seeded (${Object.entries(result.counts).map(([k, v]) => `${k}:${v}`).join(", ")})`);
  } catch (err) {
    console.error("[bootstrap] seeding failed:", err);
  }

  // Rebrand migration — patches stores seeded under the legacy brand name.
  try {
    const result = await runRebrandMigration();
    if (result === "applied") opsInfo("bootstrap", "Legacy content rebranded to Photography");
  } catch (err) {
    console.error("[bootstrap] rebrand migration failed:", err);
  }

  try {
    const { seedAdminFromEnv } = await import("@/lib/server/auth");
    const result = await seedAdminFromEnv();
    if (result === "created") opsInfo("bootstrap", "Admin account seeded from environment configuration");
  } catch (err) {
    console.error("[bootstrap] admin seeding failed:", err);
  }

  try {
    const { ensurePasscodeProvisioned } = await import("@/lib/server/passcode");
    await ensurePasscodeProvisioned();
  } catch (err) {
    console.error("[bootstrap] passcode provisioning failed:", err);
  }

  // Hourly passcode rotation watchdog (per-process; the rotation itself is
  // committed atomically against the shared database, so multiple
  // instances cannot produce conflicting passcodes).
  const g = globalThis as { __haRotationTimer?: ReturnType<typeof setInterval> };
  if (!g.__haRotationTimer) {
    g.__haRotationTimer = setInterval(() => {
      void import("@/lib/server/passcode").then(({ maybeAutoRotate }) => maybeAutoRotate());
    }, 5 * 60 * 1000);
    g.__haRotationTimer.unref?.();
  }
}

export function ensureSeededOnce(): Promise<void> {
  if (!bootPromise) {
    bootPromise = boot();
  }
  return bootPromise;
}
