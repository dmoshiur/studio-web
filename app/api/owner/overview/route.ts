import { getAdminAuth, getAdminDb, getAdminStorage, isAdminConfigured } from "@/lib/firebase/admin";
import { requireOwner } from "@/lib/server/auth";
import { getDashboardCounts } from "@/lib/firestore/content";
import { getMaintenanceState, getPublicSettings } from "@/lib/firestore/settings";
import { isSmtpConfigured } from "@/lib/email/mailer";
import { handleApiError, ok } from "@/lib/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Owner overview: safe statuses only — never secrets. */
export async function GET() {
  try {
    await requireOwner();
    const [counts, maintenance, settings] = await Promise.all([
      getDashboardCounts().catch(() => null),
      getMaintenanceState(),
      getPublicSettings(),
    ]);

    const dbOk = await getAdminDb()?.collection("siteSettings").doc("public").get().then(() => true).catch(() => false) ?? false;
    const authOk = await getAdminAuth()?.listUsers(1).then(() => true).catch(() => false) ?? false;
    const storageOk = Boolean(getAdminStorage() && process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

    return ok({
      app: {
        status: "operational",
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
        url: process.env.NEXT_PUBLIC_APP_URL ?? null,
      },
      firebase: {
        configured: isAdminConfigured(),
        projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? null,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? null,
        firestore: dbOk ? "operational" : "error",
        auth: authOk ? "operational" : "error",
        storage: storageOk ? "operational" : "error",
      },
      email: { configured: isSmtpConfigured() },
      maintenance: {
        enabled: maintenance.enabled,
        emergencyLock: maintenance.emergencyLock,
        updatedAt: maintenance.updatedAt,
      },
      counts,
      site: { name: settings.siteName, contactEmail: settings.contactEmail },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
