import { getAdminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { getAdminEmails, getAdminPassword, getOwnerEmails } from "@/lib/server/auth";
import { ok } from "@/lib/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tells the setup UI whether bootstrap is available. No secrets exposed. */
export async function GET() {
  if (!isAdminConfigured()) {
    return ok({ available: false, reason: "Backend is not configured" });
  }
  const db = getAdminDb();
  if (!db) return ok({ available: false, reason: "Backend is not configured" });

  // Bootstrap is disabled once an owner exists.
  try {
    const owners = await db.collection("admins").where("role", "==", "owner").limit(1).get();
    if (!owners.empty) return ok({ available: false, reason: "Owner already provisioned" });
  } catch {
    /* fall through — allow attempt; claim route re-checks */
  }

  if (!process.env.SETUP_TOKEN) {
    return ok({ available: false, reason: "SETUP_TOKEN is not configured" });
  }
  if (!getOwnerEmails().length && !getAdminEmails().length) {
    return ok({ available: false, reason: "OWNER_EMAILS / ADMIN_EMAIL is not configured" });
  }
  return ok({ available: true, masterAdminConfigured: Boolean(getAdminPassword()) });
}
