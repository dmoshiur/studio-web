import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { Role, SessionUser } from "@/types";

/** Append-only audit log. Never log secrets. Fire-and-forget safe. */
export async function auditLog(params: {
  actor?: SessionUser | null;
  actorId?: string;
  actorEmail?: string | null;
  actorRole?: Role;
  action: string;
  resource?: string;
  result?: "success" | "failure" | "denied";
  metadata?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  try {
    const db = getAdminDb();
    if (!db) return;
    const { actor, ...rest } = params;
    await db.collection("auditLogs").add({
      actorId: actor?.uid ?? rest.actorId ?? "anonymous",
      actorEmail: actor?.email ?? rest.actorEmail ?? null,
      actorRole: actor?.role ?? rest.actorRole ?? null,
      action: rest.action,
      resource: rest.resource ?? null,
      result: rest.result ?? "success",
      metadata: sanitizeMetadata(rest.metadata ?? {}),
      ip: rest.ip ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error("[audit] failed to write audit log:", err);
  }
}

// Strip anything that looks like a secret before persisting.
const SECRET_KEYS = ["password", "privatekey", "private_key", "secret", "token", "smtp_password", "apikey", "api_key"];

function sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    const lower = k.toLowerCase().replace(/[^a-z]/g, "");
    if (SECRET_KEYS.some((s) => lower.includes(s.replace(/_/g, "")))) {
      out[k] = "[redacted]";
    } else if (typeof v === "string" && v.length > 2000) {
      out[k] = v.slice(0, 2000) + "…[truncated]";
    } else {
      out[k] = v;
    }
  }
  return out;
}
