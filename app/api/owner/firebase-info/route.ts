import { getAdminAuth, getAdminDb, getAdminStorage, getDataBackend } from "@/lib/firebase/admin";
import { describeStorage } from "@/lib/storage/media";
import { listIdentityUsers } from "@/lib/server/identity";
import { requireHackerAdmin } from "@/lib/server/auth";
import { maskSecret } from "@/lib/utils";
import { handleApiError, ok } from "@/lib/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Owner-only Firebase connection info. Secrets are masked server-side. */
export async function GET() {
  try {
    await requireHackerAdmin();

    const dbOk = await getAdminDb()?.collection("siteSettings").doc("public").get().then(() => "operational").catch(() => "error") ?? "error";
    const authOk = await listIdentityUsers(1).then(() => "operational").catch(() => "error");
    const storageOk =
      getDataBackend() === "local"
        ? "operational (embedded)"
        : getAdminStorage() && process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
          ? "operational"
          : "error";

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL ?? null;

    return ok({
      backend: getDataBackend(),
      configured: Boolean(process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
      projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? null,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? null,
      appIdMasked: maskSecret(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, 8),
      apiKeyMasked: maskSecret(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, 6),
      admin: {
        clientEmailMasked: clientEmail ? maskSecret(clientEmail, 12) : null,
        keyConfigured: Boolean(process.env.FIREBASE_PRIVATE_KEY ?? process.env.FIREBASE_SERVICE_ACCOUNT_BASE64),
      },
      checks: { firestore: dbOk, auth: authOk, storage: storageOk },
      // Where uploaded media actually lives (Cloudinary / Firebase / embedded).
      media: describeStorage(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
