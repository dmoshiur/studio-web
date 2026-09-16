import { z } from "zod";
import { getAdminDb, isAdminConfigured } from "@/lib/firebase/admin";
import {
  getAdminDisplayName,
  getAdminEmails,
  getAdminPassword,
  getOwnerEmails,
  verifyAdminPassword,
  verifyIdToken,
} from "@/lib/server/auth";
import { apiError, handleApiError, ok, rateLimitKey } from "@/lib/server/api-helpers";
import { rateLimit, RATE_PRESETS } from "@/lib/server/rate-limit";
import { auditLog } from "@/lib/server/audit";
import { getDataBackend } from "@/lib/firebase/admin";
import { createIdentityUser, identityBackend, setIdentityRole } from "@/lib/server/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.union([
  z.object({ idToken: z.string().min(10).max(10000), setupToken: z.string().min(8).max(256) }),
  z.object({
    email: z.string().email().max(254),
    password: z.string().min(8).max(200),
    setupToken: z.string().min(8).max(256),
    displayName: z.string().min(2).max(80).optional(),
  }),
]);

/**
 * One-time owner bootstrap. Requires ALL of:
 *  1. A valid identity — Firebase ID token, or email + password matching
 *     the environment master administrator / allowlisted owner address.
 *  2. The correct SETUP_TOKEN (server env, never shipped to the client).
 *  3. No existing owner in the system. The endpoint refuses claims afterwards.
 */
export async function POST(req: Request) {
  try {
    const rl = await rateLimit(rateLimitKey("setup", req), RATE_PRESETS.setup.limit, RATE_PRESETS.setup.windowMs);
    if (!rl.allowed) return apiError("Too many attempts. Try again later.", 429, "rate_limited");
    if (!isAdminConfigured()) return apiError("Backend not configured", 503, "not_configured");

    const body = bodySchema.parse(await req.json());
    const expected = process.env.SETUP_TOKEN;
    if (!expected || body.setupToken !== expected) {
      await auditLog({ action: "setup.claim_owner", result: "denied", metadata: { reason: "bad_token" } });
      return apiError("Invalid setup token", 403, "forbidden");
    }

    const db = getAdminDb();
    if (!db) return apiError("Backend not configured", 503, "not_configured");

    const existing = await db.collection("admins").where("role", "==", "owner").limit(1).get();
    if (!existing.empty) return apiError("Owner already provisioned", 409, "already_exists");

    /* ---------------- Firebase ID token path ---------------- */
    if ("idToken" in body) {
      const user = await verifyIdToken(body.idToken);
      if (!user || !user.email) return apiError("Invalid credentials", 401, "unauthenticated");
      if (!getOwnerEmails().includes(user.email.toLowerCase())) {
        await auditLog({
          actorId: user.uid, actorEmail: user.email, action: "setup.claim_owner",
          result: "denied", metadata: { reason: "email_not_allowlisted" },
        });
        return apiError("This account is not authorized for setup", 403, "forbidden");
      }
      await setIdentityRole(user.uid, "owner");
      await auditLog({
        actorId: user.uid, actorEmail: user.email, actorRole: "owner",
        action: "setup.claim_owner", result: "success",
      });
      return ok({ ok: true, email: user.email });
    }

    /* ---------------- Email + password path (embedded backend) ---------------- */
    const email = body.email.trim().toLowerCase();
    const allowed = Array.from(new Set([...getOwnerEmails(), ...getAdminEmails()]));
    if (!allowed.includes(email)) {
      await auditLog({ actorEmail: email, action: "setup.claim_owner", result: "denied", metadata: { reason: "email_not_allowlisted" } });
      return apiError("This account is not authorized for setup", 403, "forbidden");
    }

    // The environment master password authorises the very first owner.
    const masterPassword = getAdminPassword();
    if (masterPassword && !getAdminEmails().includes(email)) {
      return apiError("This account is not authorized for setup", 403, "forbidden");
    }
    if (masterPassword && !verifyAdminPassword(body.password)) {
      await auditLog({ actorEmail: email, action: "setup.claim_owner", result: "denied", metadata: { reason: "bad_password" } });
      return apiError("Invalid credentials", 401, "unauthenticated");
    }

    let uid: string | null = null;
    if (identityBackend() === "local") {
      try {
        const created = await createIdentityUser({
          email,
          password: body.password,
          displayName: body.displayName ?? getAdminDisplayName(),
          role: "owner",
        });
        uid = created.uid;
      } catch (err) {
        // Account already exists — promote it instead.
        const code = (err as { code?: string }).code;
        if (code === "email_exists") {
          const creds = await db.collection("users").where("email", "==", email).limit(1).get();
          uid = creds.empty ? null : creds.docs[0].id;
          if (uid) await setIdentityRole(uid, "owner");
        } else {
          throw err;
        }
      }
    } else {
      const { getAdminAuth } = await import("@/lib/firebase/admin");
      const auth = getAdminAuth();
      if (!auth) return apiError("Backend not configured", 503, "not_configured");
      const firebaseUser = await auth.getUserByEmail(email).catch(() => null);
      if (!firebaseUser) {
        return apiError(
          "No Firebase account exists for this address — create it in Firebase Auth first.",
          404,
          "no_account"
        );
      }
      uid = firebaseUser.uid;
      await auth.setCustomUserClaims(uid, { role: "owner" });
    }

    if (!uid) return apiError("Could not provision the owner account", 500, "provision_failed");

    await db.collection("users").doc(uid).set(
      { uid, email, role: "owner", updatedAt: new Date() },
      { merge: true }
    );
    await db.collection("admins").doc(uid).set(
      { uid, email, role: "owner", createdAt: new Date() },
      { merge: true }
    );

    await auditLog({ actorId: uid, actorEmail: email, actorRole: "owner", action: "setup.claim_owner", result: "success" });
    return ok({ ok: true, email, backend: getDataBackend() });
  } catch (err) {
    return handleApiError(err);
  }
}
