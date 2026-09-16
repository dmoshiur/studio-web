import { getAdminAuth, getAdminDb, getAdminStorage } from "@/lib/firebase/admin";
import { requireOwner } from "@/lib/server/auth";
import { maskSecret } from "@/lib/utils";
import { handleApiError, ok } from "@/lib/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Owner-only Firebase connection info. Secrets are masked server-side. */
export async function GET() {
  try {
    await requireOwner();

    const dbOk = await getAdminDb()?.collection("siteSettings").doc("public").get().then(() => "operational").catch(() => "error") ?? "error";
    const authOk = await getAdminAuth()?.listUsers(1).then(() => "operational").catch(() => "error") ?? "error";
    const storageOk = getAdminStorage() && process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? "operational" : "error";

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL ?? null;

    return ok({
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
    });
  } catch (err) {
    return handleApiError(err);
  }
}
