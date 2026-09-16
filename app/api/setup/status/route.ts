import { getAdminAuth, getAdminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { getOwnerEmails } from "@/lib/server/auth";
import { ok } from "@/lib/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tells the setup UI whether bootstrap is available. No secrets exposed. */
export async function GET() {
  if (!isAdminConfigured()) {
    return ok({ available: false, reason: "Firebase Admin is not configured" });
  }
  const db = getAdminDb();
  const auth = getAdminAuth();
  if (!db || !auth) return ok({ available: false, reason: "Backend not configured" });

  // Bootstrap is disabled once an owner exists.
  try {
    const owners = await db.collection("admins").where("role", "==", "owner").limit(1).get();
    if (!owners.empty) return ok({ available: false, reason: "Owner already provisioned" });
  } catch {
    /* fall through — allow attempt; claim route re-checks */
  }

  const ownerEmails = getOwnerEmails();
  if (!ownerEmails.length) {
    return ok({ available: false, reason: "OWNER_EMAILS is not configured" });
  }
  return ok({ available: true });
}
