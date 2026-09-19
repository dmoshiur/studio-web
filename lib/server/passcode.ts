import "server-only";
import crypto from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendMail, baseEmailTemplate, isSmtpConfigured } from "@/lib/email/mailer";
import { getPublicSettings } from "@/lib/firestore/settings";
import { bumpCounter, opsError, opsInfo, opsWarn } from "@/lib/server/ops-log";

/**
 * =====================================================================
 * Rotating access passcode for the /hackeradmin operations panel
 * =====================================================================
 * Guarantees:
 *  • A cryptographically random passcode is valid for exactly 1 hour.
 *  • Only the scrypt hash + salt are stored (never plaintext), persisted
 *    in the shared database so restarts and multiple instances agree.
 *  • On every rotation the new passcode is emailed — and ONLY emailed —
 *    to the security recipient below. The passcode never appears in logs,
 *    API responses, or any other delivery channel.
 *  • If email delivery fails (after retries) the rotation is NOT
 *    committed: the previous passcode remains valid until its expiry,
 *    and the failure is recorded for the operations panel.
 *  • Brute-force protection: global attempt lockout stored in the DB
 *    plus per-IP rate limiting at the API layer.
 */

/** Single, hard-coded security recipient — by design not configurable from the UI. */
export const PASSCODE_RECIPIENT = "mdmoshiurrahmanmohi1@gmail.com";

const DOC = "hackeradminPasscode";
const COLLECTION = "siteSettings";
const VALIDITY_MS = 60 * 60 * 1000; // 1 hour
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const KEY_LEN = 64;

export type PasscodeMode = "auto" | "manual";

export interface PasscodeState {
  exists: boolean;
  mode: PasscodeMode;
  custom: boolean;
  valid: boolean; // a passcode is currently within its validity window
  expiresAt: string | null;
  issuedAt: string | null;
  lastRotatedAt: string | null;
  lastRotationResult: "emailed" | "email_failed" | "email_unconfigured" | "manual_set" | null;
  lastEmailSentAt: string | null;
  emailRecipient: string;
  smtpConfigured: boolean;
  lockedUntil: string | null;
  sessionEpoch: number;
}

interface PasscodeDoc {
  passcodeHash?: string;
  salt?: string;
  issuedAt?: number; // epoch ms
  expiresAt?: number; // epoch ms
  mode?: PasscodeMode;
  custom?: boolean;
  lastRotatedAt?: number;
  lastRotationResult?: PasscodeState["lastRotationResult"];
  lastEmailSentAt?: number;
  failCount?: number;
  lockedUntil?: number;
  sessionEpoch?: number;
  updatedAt?: unknown;
}

function hashPasscode(passcode: string, salt: string): string {
  return crypto.scryptSync(passcode.normalize("NFKC"), salt, KEY_LEN).toString("hex");
}

/** Unambiguous alphabet (no 0/O, 1/I/L) for passcodes humans may type. */
const PASSCODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generatePasscode(length = 12): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) out += PASSCODE_ALPHABET[bytes[i] % PASSCODE_ALPHABET.length];
  return out;
}

async function readDoc(): Promise<{ id: string; data: PasscodeDoc } | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection(COLLECTION).doc(DOC).get();
  if (!snap.exists) return null;
  return { id: snap.id, data: snap.data() as PasscodeDoc };
}

async function writeDoc(patch: PasscodeDoc): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Database is not configured");
  await db.collection(COLLECTION).doc(DOC).set({ ...patch, updatedAt: new Date() }, { merge: true });
}

export async function getPasscodeState(): Promise<PasscodeState> {
  const doc = await readDoc();
  const now = Date.now();
  const d = doc?.data;
  const lockedUntil = d?.lockedUntil && d.lockedUntil > now ? new Date(d.lockedUntil).toISOString() : null;
  return {
    exists: Boolean(d?.passcodeHash && d?.expiresAt),
    mode: d?.mode === "manual" ? "manual" : "auto",
    custom: d?.custom === true,
    valid: Boolean(d?.passcodeHash && d.expiresAt && d.expiresAt > now),
    expiresAt: d?.expiresAt ? new Date(d.expiresAt).toISOString() : null,
    issuedAt: d?.issuedAt ? new Date(d.issuedAt).toISOString() : null,
    lastRotatedAt: d?.lastRotatedAt ? new Date(d.lastRotatedAt).toISOString() : null,
    lastRotationResult: d?.lastRotationResult ?? null,
    lastEmailSentAt: d?.lastEmailSentAt ? new Date(d.lastEmailSentAt).toISOString() : null,
    emailRecipient: PASSCODE_RECIPIENT,
    smtpConfigured: isSmtpConfigured(),
    lockedUntil,
    sessionEpoch: d?.sessionEpoch ?? 0,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Deliver the passcode email with retries. Returns true only on real delivery. */
async function deliverPasscodeEmail(passcode: string, expiresAt: Date, siteName: string): Promise<boolean> {
  const issuedAt = new Date();
  const html = baseEmailTemplate({
    title: `${siteName} — Operations Passcode`,
    bodyHtml: `
      <p><strong>New operations passcode issued.</strong></p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;">
        <tr><td style="padding:6px 0;color:#6a6b7c;font-size:13px;">Website</td><td style="padding:6px 0;font-weight:bold;">${siteName}</td></tr>
        <tr><td style="padding:6px 0;color:#6a6b7c;font-size:13px;">Issued at (UTC)</td><td style="padding:6px 0;">${issuedAt.toUTCString()}</td></tr>
        <tr><td style="padding:6px 0;color:#6a6b7c;font-size:13px;">Passcode</td><td style="padding:6px 0;font-family:monospace;font-size:20px;letter-spacing:3px;font-weight:bold;">${passcode}</td></tr>
        <tr><td style="padding:6px 0;color:#6a6b7c;font-size:13px;">Valid until (UTC)</td><td style="padding:6px 0;">${expiresAt.toUTCString()}</td></tr>
      </table>
      <p style="background:#f6f1e3;border-left:3px solid #b99352;padding:12px 14px;font-size:13px;color:#4a4433;">
        <strong>Security notice:</strong> this passcode grants access to the protected operations
        panel of ${siteName}. It expires in one hour and is replaced automatically. It was sent only
        to this address. If you did not expect this email, treat it as an attempted intrusion and
        rotate the passcode immediately from the panel.
      </p>`,
    footer: `${siteName} — automated security notification. This passcode is never shown anywhere else.`,
  });

  const attempts = [0, 1500, 4000];
  for (let i = 0; i < attempts.length; i += 1) {
    if (attempts[i]) await sleep(attempts[i]);
    try {
      await sendMail({
        to: PASSCODE_RECIPIENT,
        subject: `[${siteName}] New operations passcode (valid 1 hour)`,
        html,
        text: `${siteName} operations passcode issued ${issuedAt.toUTCString()}. Passcode: ${passcode}. Valid until ${expiresAt.toUTCString()}. If you did not expect this, your operations panel may be under attack.`,
      });
      bumpCounter("emailsSent");
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      opsWarn("passcode", `Passcode email delivery attempt ${i + 1}/${attempts.length} failed: ${msg}`);
    }
  }
  bumpCounter("emailsFailed");
  return false;
}

export interface RotationResult {
  rotated: boolean;
  reason?: "email_failed" | "email_unconfigured" | "no_database" | "already_fresh";
}

/**
 * Rotate to a fresh passcode and email it to the security recipient.
 * The new hash is committed ONLY after the email is delivered, so an
 * undelivered passcode never becomes the active one.
 *
 * `invalidateSessions` bumps the session epoch, ending any open panel
 * sessions. Scheduled auto-rotations keep sessions alive (they are bounded
 * anyway); manual/security actions invalidate them.
 */
export async function rotatePasscode(opts?: { force?: boolean; invalidateSessions?: boolean }): Promise<RotationResult> {
  const db = getAdminDb();
  if (!db) {
    opsError("passcode", "Rotation skipped: database unavailable");
    return { rotated: false, reason: "no_database" };
  }

  // Multi-instance safety: re-read inside the decision; skip when another
  // instance already rotated within the current validity window.
  const existing = await readDoc();
  const now = Date.now();
  if (!opts?.force && existing?.data.expiresAt && existing.data.expiresAt - now > VALIDITY_MS / 2) {
    return { rotated: false, reason: "already_fresh" };
  }

  if (!isSmtpConfigured()) {
    await writeDoc({ lastRotatedAt: now, lastRotationResult: "email_unconfigured" });
    opsError("passcode", "Rotation blocked: SMTP is not configured — passcode email cannot be delivered");
    return { rotated: false, reason: "email_unconfigured" };
  }

  const passcode = generatePasscode();
  const expiresAt = new Date(now + VALIDITY_MS);
  const settings = await getPublicSettings().catch(() => null);
  const siteName = settings?.siteName ?? "Photography";

  const delivered = await deliverPasscodeEmail(passcode, expiresAt, siteName);
  if (!delivered) {
    await writeDoc({ lastRotatedAt: now, lastRotationResult: "email_failed" });
    opsError("passcode", `Rotation blocked: email delivery to security recipient failed after retries`);
    return { rotated: false, reason: "email_failed" };
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const currentEpoch = existing?.data.sessionEpoch ?? 0;
  await writeDoc({
    passcodeHash: hashPasscode(passcode, salt),
    salt,
    issuedAt: now,
    expiresAt: now + VALIDITY_MS,
    custom: false,
    failCount: 0,
    lockedUntil: 0,
    lastRotatedAt: now,
    lastRotationResult: "emailed",
    lastEmailSentAt: now,
    ...(opts?.invalidateSessions ? { sessionEpoch: currentEpoch + 1 } : {}),
  });
  opsInfo(
    "passcode",
    `Passcode rotated${opts?.invalidateSessions ? " (panel sessions revoked)" : ""}; new passcode emailed to security recipient (expires ${expiresAt.toISOString()})`
  );
  return { rotated: true };
}

/**
 * Ensure a valid passcode exists on boot / first use. Safe to call often:
 *  - fresh doc → rotate immediately (emails the first passcode)
 *  - expired in auto mode → rotate
 *  - manual mode or still valid → no-op
 */
export async function ensurePasscodeProvisioned(): Promise<void> {
  try {
    const state = await getPasscodeState();
    if (state.mode === "manual" && state.valid) return;
    if (state.valid && state.mode === "auto") {
      // Proactively rotate when more than the validity window has elapsed.
      return;
    }
    await rotatePasscode({ force: !state.exists });
  } catch (err) {
    opsError("passcode", `Passcode provisioning error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Lazy auto-rotation check — called on gate renders and status reads. */
export async function maybeAutoRotate(): Promise<void> {
  try {
    const doc = await readDoc();
    if (!doc) {
      await ensurePasscodeProvisioned();
      return;
    }
    const d = doc.data;
    if (d.mode === "manual") return; // controlled mode — never auto-rotate
    const now = Date.now();
    if (!d.expiresAt || d.expiresAt <= now) {
      await rotatePasscode({ force: true });
    }
  } catch (err) {
    opsError("passcode", `Auto-rotation check failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export interface VerifyResult {
  ok: boolean;
  reason?: "invalid" | "locked" | "expired" | "no_passcode";
  lockedUntil?: string | null;
  sessionEpoch?: number;
}

/** Constant-time passcode verification with global lockout bookkeeping. */
export async function verifyPasscode(candidate: string): Promise<VerifyResult> {
  bumpCounter("passcodeAttempts");
  const doc = await readDoc();
  const now = Date.now();
  const d = doc?.data;

  if (!d?.passcodeHash || !d.salt) return { ok: false, reason: "no_passcode" };
  if (d.lockedUntil && d.lockedUntil > now) {
    return { ok: false, reason: "locked", lockedUntil: new Date(d.lockedUntil).toISOString() };
  }
  if (!d.expiresAt || d.expiresAt <= now) {
    // Expired — trigger a background rotation attempt so a fresh code is emailed.
    void maybeAutoRotate();
    return { ok: false, reason: "expired" };
  }

  const provided = Buffer.from(hashPasscode(candidate, d.salt), "hex");
  const expected = Buffer.from(d.passcodeHash, "hex");
  const match = provided.length === expected.length && crypto.timingSafeEqual(provided, expected);

  if (!match) {
    bumpCounter("passcodeFailures");
    const fails = (d.failCount ?? 0) + 1;
    const lock = fails >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0;
    await writeDoc({ failCount: lock ? 0 : fails, lockedUntil: lock });
    if (lock) {
      opsWarn("passcode", `Passcode entry locked for ${LOCKOUT_MS / 60000} minutes after ${fails} failed attempts`);
      return { ok: false, reason: "locked", lockedUntil: new Date(lock).toISOString() };
    }
    opsWarn("passcode", `Invalid passcode attempt ${fails}/${MAX_ATTEMPTS}`);
    return { ok: false, reason: "invalid" };
  }

  if (d.failCount) await writeDoc({ failCount: 0 });
  opsInfo("passcode", "Operations passcode verified successfully");
  return { ok: true, sessionEpoch: d.sessionEpoch ?? 0 };
}

/**
 * Set a custom passphrase (controlled/manual mode). Requires confirmed
 * delivery of a notification email so the operator always has a record;
 * like rotation, it invalidates existing panel sessions.
 */
export async function setCustomPassphrase(passphrase: string): Promise<{ ok: boolean; reason?: string }> {
  if (!isSmtpConfigured()) {
    return { ok: false, reason: "SMTP is not configured — confirmation email cannot be sent" };
  }
  const settings = await getPublicSettings().catch(() => null);
  const siteName = settings?.siteName ?? "Photography";
  const delivered = await sendMail({
    to: PASSCODE_RECIPIENT,
    subject: `[${siteName}] Operations passphrase changed (manual mode)`,
    html: baseEmailTemplate({
      title: `${siteName} — Passphrase Changed`,
      bodyHtml: `<p>The operations panel passphrase was changed to a <strong>custom value</strong> and automatic hourly rotation was paused (manual mode).</p>
        <p style="background:#f6f1e3;border-left:3px solid #b99352;padding:12px 14px;font-size:13px;color:#4a4433;">For security, the custom passphrase itself is not included in this email. If you did not make this change, regain access by switching back to automatic rotation.</p>`,
    }),
  })
    .then(() => true)
    .catch((err) => {
      opsError("passcode", `Custom passphrase confirmation email failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    });
  if (!delivered) return { ok: false, reason: "Confirmation email could not be delivered" };

  const existing = await readDoc();
  const salt = crypto.randomBytes(16).toString("hex");
  const now = Date.now();
  await writeDoc({
    passcodeHash: hashPasscode(passphrase, salt),
    salt,
    issuedAt: now,
    expiresAt: now + VALIDITY_MS,
    mode: "manual",
    custom: true,
    failCount: 0,
    lockedUntil: 0,
    lastRotatedAt: now,
    lastRotationResult: "manual_set",
    lastEmailSentAt: now,
    sessionEpoch: (existing?.data.sessionEpoch ?? 0) + 1,
  });
  opsInfo("passcode", "Custom passphrase set; mode=manual (auto rotation paused)");
  return { ok: true };
}

/** Switch back to automatic hourly rotation (fresh passcode emailed immediately). */
export async function resumeAutoRotation(): Promise<RotationResult> {
  await writeDoc({ mode: "auto", custom: false, expiresAt: 0 });
  opsInfo("passcode", "Automatic hourly rotation resumed; immediate rotation requested");
  return rotatePasscode({ force: true, invalidateSessions: true });
}
