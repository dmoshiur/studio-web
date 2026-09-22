import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuth } from "@/lib/firebase/admin";
import { requireSession, SESSION_COOKIE } from "@/lib/server/auth";
import { createIdentitySession, identityBackend, updateIdentityProfile, IdentityError } from "@/lib/server/identity";
import { apiError, handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";
import { bumpSessionEpoch, getCredentialByUid, verifyPassword } from "@/lib/server/local-credentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "New password needs letters and numbers"),
  // Firebase deployments: the client re-authenticates with the CURRENT
  // password (Firebase Auth is the credential store) and sends a fresh ID
  // token as proof — the Admin SDK cannot verify passwords itself.
  proofIdToken: z.string().min(10).max(10000).optional(),
});

/**
 * Change own password. Requires the current password (verified against the
 * same credential store the login and forgot-password flows use), hashes /
 * stores the new one through the identity facade, then revokes all
 * pre-existing sessions for this account.
 */
export async function POST(req: Request) {
  try {
    const user = await requireSession();
    if (!user.email) return apiError("This account has no email address", 400, "no_email");
    const { currentPassword, newPassword, proofIdToken } = await parseBody(req, schema);

    if (identityBackend() === "local") {
      const cred = getCredentialByUid(user.uid);
      if (!cred || !verifyPassword(currentPassword, cred.salt, cred.password_hash)) {
        await auditLog({ actor: user, action: "account.password.change", result: "failure", metadata: { reason: "wrong_current" } });
        return apiError("Current password is incorrect", 401, "wrong_password");
      }
      await updateIdentityProfile(user.uid, { password: newPassword });
      bumpSessionEpoch(user.uid); // revoke every pre-existing session…
      const { token, maxAgeSeconds } = await createIdentitySession({
        uid: user.uid,
        email: user.email,
        role: user.role,
      });
      await auditLog({ actor: user, action: "account.password.change", result: "success" });
      // …then re-issue a fresh cookie so THIS browser stays signed in.
      const res = ok({ ok: true, message: "Password updated. Other active sessions were signed out." });
      res.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: maxAgeSeconds,
      });
      return res;
    }

    // Firebase backend: verify the CURRENT password via a freshly minted
    // Firebase ID token (the client signs in with it), then delegate the
    // change to the identity facade.
    const auth = getAdminAuth();
    if (!auth) return apiError("Authentication service is not configured", 503, "not_configured");
    if (!proofIdToken) {
      return apiError("Current password verification is required", 400, "reauth_required");
    }
    let decoded;
    try {
      decoded = await auth.verifyIdToken(proofIdToken, true);
    } catch {
      await auditLog({ actor: user, action: "account.password.change", result: "failure", metadata: { reason: "bad_proof" } });
      return apiError("Current password is incorrect", 401, "wrong_password");
    }
    if (decoded.uid !== user.uid) {
      return apiError("Current password is incorrect", 401, "wrong_password");
    }
    // The proof must be fresh: it was minted by re-entering the current
    // password moments ago (auth_time is set at actual sign-in).
    const authTime = Number(decoded.auth_time ?? 0) * 1000;
    if (!authTime || Date.now() - authTime > 10 * 60_000) {
      return apiError("Current password verification expired — please try again", 401, "stale_proof");
    }
    try {
      await updateIdentityProfile(user.uid, { password: newPassword });
    } catch (err) {
      if (err instanceof IdentityError) return apiError(err.message, err.status, err.code);
      throw err;
    }
    await auth.revokeRefreshTokens(user.uid).catch(() => undefined);
    await auditLog({ actor: user, action: "account.password.change", result: "success" });
    return ok({ ok: true, message: "Password updated. Other active sessions were signed out." });
  } catch (err) {
    return handleApiError(err);
  }
}
