import "server-only";
import crypto from "node:crypto";
import { Timestamp, getSqlite, LocalFieldValue } from "@/lib/db/local-store";

/**
 * Password credentials for the embedded backend.
 * Hashes use scrypt with a per-user random salt; stored in the credentials
 * table so they never travel through the document store or the audit log.
 */

const KEY_LEN = 64;

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt ?? crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password.normalize("NFKC"), useSalt, KEY_LEN).toString("hex");
  return { hash, salt: useSalt };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface CredentialRow {
  uid: string;
  email: string;
  password_hash: string;
  salt: string;
  session_epoch: number;
}

export function putCredential(uid: string, email: string, password: string): void {
  const { hash, salt } = hashPassword(password);
  getSqlite()
    .prepare(
      `INSERT INTO credentials (uid, email, password_hash, salt, session_epoch, updated_at)
       VALUES (?, ?, ?, ?, 0, ?)
       ON CONFLICT(uid) DO UPDATE SET email = excluded.email,
         password_hash = excluded.password_hash, salt = excluded.salt, updated_at = excluded.updated_at`
    )
    .run(uid, email.toLowerCase(), hash, salt, Date.now());
}

export function getCredentialByEmail(email: string): CredentialRow | null {
  const row = getSqlite()
    .prepare("SELECT uid, email, password_hash, salt, session_epoch FROM credentials WHERE email = ?")
    .get(email.toLowerCase()) as CredentialRow | undefined;
  return row ?? null;
}

export function getCredentialByUid(uid: string): CredentialRow | null {
  const row = getSqlite()
    .prepare("SELECT uid, email, password_hash, salt, session_epoch FROM credentials WHERE uid = ?")
    .get(uid) as CredentialRow | undefined;
  return row ?? null;
}

export function updatePassword(uid: string, password: string): void {
  const { hash, salt } = hashPassword(password);
  getSqlite()
    .prepare("UPDATE credentials SET password_hash = ?, salt = ?, updated_at = ? WHERE uid = ?")
    .run(hash, salt, Date.now(), uid);
}

export function deleteCredential(uid: string): boolean {
  const info = getSqlite().prepare("DELETE FROM credentials WHERE uid = ?").run(uid);
  return Number(info.changes ?? 0) > 0;
}

export function deleteCredentialByEmail(email: string): boolean {
  const info = getSqlite().prepare("DELETE FROM credentials WHERE email = ?").run(email.toLowerCase());
  return Number(info.changes ?? 0) > 0;
}

export function bumpSessionEpoch(uid: string): number {
  getSqlite()
    .prepare("UPDATE credentials SET session_epoch = session_epoch + 1, updated_at = ? WHERE uid = ?")
    .run(Date.now(), uid);
  return getCredentialByUid(uid)?.session_epoch ?? 0;
}

export function createResetToken(email: string, ttlMinutes = 30): string | null {
  const cred = getCredentialByEmail(email);
  if (!cred) return null;
  const token = crypto.randomBytes(24).toString("hex");
  getSqlite()
    .prepare("UPDATE credentials SET reset_token = ?, reset_expires = ? WHERE uid = ?")
    .run(token, Date.now() + ttlMinutes * 60_000, cred.uid);
  return token;
}

export function consumeResetToken(token: string, newPassword: string): string | null {
  const row = getSqlite()
    .prepare("SELECT uid, reset_expires FROM credentials WHERE reset_token = ?")
    .get(token) as { uid: string; reset_expires: number } | undefined;
  if (!row) return null;
  if (!row.reset_expires || row.reset_expires < Date.now()) return null;
  updatePassword(row.uid, newPassword);
  getSqlite()
    .prepare("UPDATE credentials SET reset_token = NULL, reset_expires = NULL WHERE uid = ?")
    .run(row.uid);
  return row.uid;
}

export { Timestamp, LocalFieldValue };
