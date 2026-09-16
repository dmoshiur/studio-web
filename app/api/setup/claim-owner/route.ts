import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { getOwnerEmails, verifyIdToken } from "@/lib/server/auth";
import { apiError, handleApiError, ok, rateLimitKey } from "@/lib/server/api-helpers";
import { rateLimit, RATE_PRESETS } from "@/lib/server/rate-limit";
import { auditLog } from "@/lib/server/audit";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  idToken: z.string().min(10).max(10000),
  setupToken: z.string().min(8).max(256),
});

/**
 * One-time owner bootstrap. Requires ALL of:
 *  1. Valid Firebase ID token for an email listed in OWNER_EMAILS
 *  2. Correct SETUP_TOKEN (server env, never shipped to client)
 *  3. No existing owner in the system
 * After success this endpoint permanently refuses new claims.
 */
export async function POST(req: Request) {
  try {
    const rl = await rateLimit(rateLimitKey("setup", req), RATE_PRESETS.setup.limit, RATE_PRESETS.setup.windowMs);
    if (!rl.allowed) return apiError("Too many attempts. Try again later.", 429, "rate_limited");
    if (!isAdminConfigured()) return apiError("Backend not configured", 503, "not_configured");

    const { idToken, setupToken } = bodySchema.parse(await req.json());
    const expected = process.env.SETUP_TOKEN;
    if (!expected || setupToken !== expected) {
      await auditLog({ action: "setup.claim_owner", result: "denied", metadata: { reason: "bad_token" } });
      return apiError("Invalid setup token", 403, "forbidden");
    }

    const user = await verifyIdToken(idToken);
    if (!user || !user.email) return apiError("Invalid credentials", 401, "unauthenticated");

    const allowed = getOwnerEmails();
    if (!allowed.includes(user.email.toLowerCase())) {
      await auditLog({
        actorId: user.uid, actorEmail: user.email, action: "setup.claim_owner",
        result: "denied", metadata: { reason: "email_not_allowlisted" },
      });
      return apiError("This account is not authorized for setup", 403, "forbidden");
    }

    const db = getAdminDb();
    const auth = getAdminAuth();
    if (!db || !auth) return apiError("Backend not configured", 503, "not_configured");

    const existing = await db.collection("admins").where("role", "==", "owner").limit(1).get();
    if (!existing.empty) return apiError("Owner already provisioned", 409, "already_exists");

    await auth.setCustomUserClaims(user.uid, { role: "owner" });
    const now = FieldValue.serverTimestamp();
    await db.collection("users").doc(user.uid).set(
      {
        uid: user.uid, email: user.email, displayName: user.displayName,
        photoURL: user.photoURL, role: "owner", createdAt: now, updatedAt: now,
      },
      { merge: true }
    );
    await db.collection("admins").doc(user.uid).set(
      { uid: user.uid, email: user.email, role: "owner", createdAt: now },
      { merge: true }
    );

    await auditLog({
      actorId: user.uid, actorEmail: user.email, actorRole: "owner",
      action: "setup.claim_owner", result: "success",
    });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
