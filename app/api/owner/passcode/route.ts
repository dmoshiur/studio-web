import { NextResponse } from "next/server";
import { z } from "zod";
import { HA_COOKIE } from "@/lib/server/ha-session";
import { requireHackerAdmin } from "@/lib/server/auth";
import {
  getPasscodeState,
  resumeAutoRotation,
  rotatePasscode,
  setCustomPassphrase,
  verifyPasscode,
} from "@/lib/server/passcode";
import { apiError, handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";
import { maybeAutoRotate } from "@/lib/server/passcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Passcode status — never includes the passcode itself. */
export async function GET() {
  try {
    await requireHackerAdmin();
    await maybeAutoRotate();
    return ok(await getPasscodeState());
  } catch (err) {
    return handleApiError(err);
  }
}

const actionSchema = z.object({
  action: z.enum(["rotate", "resume-auto"]),
  /**
   * Re-authentication: sensitive passcode operations require the operator
   * to prove they hold the CURRENT passcode again.
   */
  confirmPasscode: z.string().min(4).max(128),
});

/** Manual rotation / return to automatic mode. Requires re-authentication. */
export async function POST(req: Request) {
  try {
    const actor = await requireHackerAdmin();
    const { action, confirmPasscode } = await parseBody(req, actionSchema);

    const check = await verifyPasscode(confirmPasscode);
    if (!check.ok) {
      await auditLog({ actor, action: "hackeradmin.passcode.manage", result: "denied", metadata: { action, reason: "reauth_failed" } });
      return apiError("Re-authentication failed: the current passcode was not confirmed.", 403, "reauth_failed");
    }

    if (action === "rotate") {
      const result = await rotatePasscode({ force: true, invalidateSessions: true });
      await auditLog({ actor, action: "hackeradmin.passcode.rotate", result: result.rotated ? "success" : "failure", metadata: { reason: result.reason ?? null } });
      if (!result.rotated) {
        const msg =
          result.reason === "email_unconfigured"
            ? "Rotation blocked: SMTP is not configured, so the new passcode could not be delivered."
            : result.reason === "email_failed"
              ? "Rotation blocked: passcode email delivery failed. The previous passcode remains active."
              : "Rotation could not be completed.";
        return apiError(msg, 502, result.reason ?? "rotation_failed");
      }
      return ok({ ok: true, message: "New passcode generated and emailed to the security recipient. Open panel sessions were ended.", note: "This session has been revoked — sign in again with the new passcode." });
    }

    const result = await resumeAutoRotation();
    await auditLog({ actor, action: "hackeradmin.passcode.resume_auto", result: result.rotated ? "success" : "failure", metadata: { reason: result.reason ?? null } });
    if (!result.rotated) {
      return apiError("Could not resume automatic rotation: email delivery is unavailable.", 502, result.reason ?? "rotation_failed");
    }
    return ok({ ok: true, message: "Automatic hourly rotation resumed. A fresh passcode was emailed to the security recipient.", note: "This session has been revoked — sign in again with the new passcode." });
  } catch (err) {
    return handleApiError(err);
  }
}

const customSchema = z.object({
  passphrase: z
    .string()
    .min(10)
    .max(128)
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Passphrase needs letters and numbers"),
  confirmPasscode: z.string().min(4).max(128),
});

/**
 * Set a custom passphrase (controlled mode). Pauses automatic rotation
 * until "resume-auto" is invoked. Requires re-authentication with the
 * current passcode; a confirmation email is sent to the security
 * recipient (the passphrase itself is never emailed or logged).
 */
export async function PATCH(req: Request) {
  try {
    const actor = await requireHackerAdmin();
    const { passphrase, confirmPasscode } = await parseBody(req, customSchema);

    const check = await verifyPasscode(confirmPasscode);
    if (!check.ok) {
      await auditLog({ actor, action: "hackeradmin.passcode.custom", result: "denied", metadata: { reason: "reauth_failed" } });
      return apiError("Re-authentication failed: the current passcode was not confirmed.", 403, "reauth_failed");
    }

    const result = await setCustomPassphrase(passphrase);
    if (!result.ok) {
      await auditLog({ actor, action: "hackeradmin.passcode.custom", result: "failure", metadata: { reason: result.reason } });
      return apiError(result.reason ?? "Could not set the custom passphrase.", 502, "custom_failed");
    }
    await auditLog({ actor, action: "hackeradmin.passcode.custom", result: "success" });
    return ok({ ok: true, message: "Custom passphrase active. Automatic rotation is paused. Open panel sessions were ended.", note: "Sign in again with your new passphrase." });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Sign out of the operations panel (clears the session cookie). */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(HA_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
