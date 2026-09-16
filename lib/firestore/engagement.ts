import "server-only";
import { FieldValue, type Query } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { toISODate } from "@/lib/utils";
import type {
  AuditLog, ContactMessage, MediaItem, NavigationDoc, NavLink, SocialLink, Subscriber,
} from "@/types";

function requireDb() {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore is not configured");
  return db;
}

// ------------------------------ MESSAGES -----------------------------
function mapMessage(id: string, d: Record<string, unknown>): ContactMessage {
  return {
    id,
    name: String(d.name ?? ""),
    email: String(d.email ?? ""),
    phone: (d.phone as string) || undefined,
    subject: String(d.subject ?? ""),
    message: String(d.message ?? ""),
    read: d.read === true,
    createdAt: toISODate(d.createdAt) ?? new Date().toISOString(),
  };
}

export async function createMessage(input: {
  name: string; email: string; phone?: string; subject: string; message: string;
}): Promise<string> {
  const db = requireDb();
  const ref = await db.collection("messages").add({
    ...input,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function listMessages(opts: { limit?: number; cursor?: string; unreadOnly?: boolean; q?: string } = {}) {
  const db = requireDb();
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  let query: Query = db.collection("messages").orderBy("createdAt", "desc");
  if (opts.unreadOnly) query = db.collection("messages").where("read", "==", false).orderBy("createdAt", "desc");
  query = query.limit(limit + 1);
  if (opts.cursor) {
    const cur = await db.collection("messages").doc(opts.cursor).get();
    if (cur.exists) query = query.startAfter(cur);
  }
  const snap = await query.get();
  let docs = snap.docs.slice(0, limit);
  if (opts.q) {
    const needle = opts.q.toLowerCase();
    docs = docs.filter((d) => {
      const m = d.data();
      return [m.name, m.email, m.subject].some((v) => String(v ?? "").toLowerCase().includes(needle));
    });
  }
  return {
    items: docs.map((d) => mapMessage(d.id, d.data())),
    nextCursor: snap.docs.length > limit ? docs[docs.length - 1]?.id ?? null : null,
  };
}

export async function markMessage(id: string, read: boolean) {
  await requireDb().collection("messages").doc(id).set({ read }, { merge: true });
}

export async function deleteMessage(id: string) {
  await requireDb().collection("messages").doc(id).delete();
}

// ---------------------------- SUBSCRIBERS ----------------------------
function mapSubscriber(id: string, d: Record<string, unknown>): Subscriber {
  return {
    id,
    email: String(d.email ?? ""),
    status: d.status === "unsubscribed" ? "unsubscribed" : "active",
    source: (d.source as string) || undefined,
    unsubscribeToken: String(d.unsubscribeToken ?? ""),
    createdAt: toISODate(d.createdAt) ?? new Date().toISOString(),
  };
}

export async function subscribe(email: string, source?: string): Promise<{ id: string; duplicate: boolean }> {
  const db = requireDb();
  const normalized = email.trim().toLowerCase();
  const existing = await db.collection("newsletterSubscribers").where("email", "==", normalized).limit(1).get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    if (doc.data().status !== "unsubscribed") return { id: doc.id, duplicate: true };
    await doc.ref.set({ status: "active" }, { merge: true });
    return { id: doc.id, duplicate: false };
  }
  const { randomBytes } = await import("crypto");
  const ref = await db.collection("newsletterSubscribers").add({
    email: normalized,
    status: "active",
    source: source ?? "website",
    unsubscribeToken: randomBytes(24).toString("hex"),
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id, duplicate: false };
}

/** Email-initiated unsubscribe (idempotent, never reveals whether the address exists). */
export async function unsubscribeByEmail(email: string): Promise<boolean> {
  const db = requireDb();
  const normalized = email.trim().toLowerCase();
  const snap = await db.collection("newsletterSubscribers").where("email", "==", normalized).limit(1).get();
  if (snap.empty) return false;
  await snap.docs[0].ref.set({ status: "unsubscribed", unsubscribedAt: FieldValue.serverTimestamp() }, { merge: true });
  return true;
}

export async function unsubscribeByToken(token: string): Promise<boolean> {
  const db = requireDb();
  const snap = await db.collection("newsletterSubscribers").where("unsubscribeToken", "==", token).limit(1).get();
  if (snap.empty) return false;
  await snap.docs[0].ref.set({ status: "unsubscribed", unsubscribedAt: FieldValue.serverTimestamp() }, { merge: true });
  return true;
}

export async function listSubscribers(opts: { limit?: number; cursor?: string } = {}) {
  const db = requireDb();
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  let query: Query = db.collection("newsletterSubscribers").orderBy("createdAt", "desc").limit(limit + 1);
  if (opts.cursor) {
    const cur = await db.collection("newsletterSubscribers").doc(opts.cursor).get();
    if (cur.exists) query = query.startAfter(cur);
  }
  const snap = await query.get();
  const docs = snap.docs.slice(0, limit);
  return {
    items: docs.map((d) => mapSubscriber(d.id, d.data())),
    nextCursor: snap.docs.length > limit ? docs[docs.length - 1].id : null,
  };
}

export async function deleteSubscriber(id: string) {
  await requireDb().collection("newsletterSubscribers").doc(id).delete();
}

// ------------------------------- MEDIA -------------------------------
function mapMedia(id: string, d: Record<string, unknown>): MediaItem {
  return {
    id,
    fileName: String(d.fileName ?? ""),
    originalName: String(d.originalName ?? ""),
    storagePath: String(d.storagePath ?? ""),
    downloadUrl: String(d.downloadUrl ?? ""),
    mimeType: String(d.mimeType ?? ""),
    sizeBytes: Number(d.sizeBytes ?? 0),
    width: d.width != null ? Number(d.width) : undefined,
    height: d.height != null ? Number(d.height) : undefined,
    folder: String(d.folder ?? "media/images"),
    visibility: d.visibility === "private" ? "private" : "public",
    alt: (d.alt as string) || undefined,
    uploadedBy: String(d.uploadedBy ?? ""),
    createdAt: toISODate(d.createdAt) ?? new Date().toISOString(),
  };
}

export async function listMedia(opts: { limit?: number; cursor?: string; folder?: string; q?: string } = {}) {
  const db = requireDb();
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 100);
  let query: Query = opts.folder
    ? db.collection("media").where("folder", "==", opts.folder).orderBy("createdAt", "desc")
    : db.collection("media").orderBy("createdAt", "desc");
  query = query.limit(limit + 1);
  if (opts.cursor) {
    const cur = await db.collection("media").doc(opts.cursor).get();
    if (cur.exists) query = query.startAfter(cur);
  }
  const snap = await query.get();
  let docs = snap.docs.slice(0, limit);
  if (opts.q) {
    const needle = opts.q.toLowerCase();
    docs = docs.filter((d) => {
      const m = d.data();
      return [m.fileName, m.originalName, m.alt].some((v) => String(v ?? "").toLowerCase().includes(needle));
    });
  }
  return {
    items: docs.map((d) => mapMedia(d.id, d.data())),
    nextCursor: snap.docs.length > limit ? docs[docs.length - 1]?.id ?? null : null,
  };
}

export async function getMediaById(id: string): Promise<MediaItem | null> {
  const db = requireDb();
  const snap = await db.collection("media").doc(id).get();
  if (!snap.exists) return null;
  return mapMedia(snap.id, snap.data() as Record<string, unknown>);
}

export async function createMediaRecord(data: Omit<MediaItem, "id" | "createdAt">): Promise<string> {
  const db = requireDb();
  const ref = await db.collection("media").add({ ...data, createdAt: FieldValue.serverTimestamp() });
  return ref.id;
}

export async function updateMediaRecord(id: string, patch: Partial<MediaItem>) {
  await requireDb().collection("media").doc(id).set(patch, { merge: true });
}

export async function deleteMediaRecord(id: string) {
  await requireDb().collection("media").doc(id).delete();
}

// ---------------------------- NAVIGATION -----------------------------
export async function getNavigation(id: "header" | "footer"): Promise<NavigationDoc> {
  const db = getAdminDb();
  const fallback: NavigationDoc =
    id === "header"
      ? {
          id,
          links: [
            { label: "Home", href: "/" },
            { label: "About", href: "/about" },
            { label: "Speakers", href: "/speakers" },
            { label: "Events", href: "/events" },
            { label: "Blog", href: "/blog" },
            { label: "Contact", href: "/contact" },
          ],
          updatedAt: new Date(0).toISOString(),
        }
      : {
          id,
          links: [
            { label: "About", href: "/about" },
            { label: "Blog", href: "/blog" },
            { label: "Contact", href: "/contact" },
            { label: "Privacy", href: "/privacy" },
          ],
          updatedAt: new Date(0).toISOString(),
        };
  if (!db) return fallback;
  try {
    const snap = await db.collection("navigation").doc(id).get();
    if (!snap.exists) return fallback;
    const d = snap.data() as { links?: NavLink[]; updatedAt?: unknown };
    return {
      id,
      links: Array.isArray(d.links) ? d.links : fallback.links,
      updatedAt: toISODate(d.updatedAt) ?? new Date(0).toISOString(),
    };
  } catch {
    return fallback;
  }
}

export async function saveNavigation(id: "header" | "footer", links: NavLink[]): Promise<NavigationDoc> {
  const db = requireDb();
  await db.collection("navigation").doc(id).set(
    { links, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  return getNavigation(id);
}

export async function listSocialLinks(): Promise<SocialLink[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db.collection("socialLinks").orderBy("label", "asc").limit(20).get();
    return snap.docs.map((d) => {
      const m = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        label: String(m.label ?? ""),
        href: String(m.href ?? ""),
        icon: String(m.icon ?? "globe"),
        updatedAt: toISODate(m.updatedAt) ?? new Date().toISOString(),
      };
    });
  } catch {
    return [];
  }
}

export async function saveSocialLink(input: { id?: string; label: string; href: string; icon: string }) {
  const db = requireDb();
  const payload = { label: input.label, href: input.href, icon: input.icon, updatedAt: FieldValue.serverTimestamp() };
  if (input.id) {
    await db.collection("socialLinks").doc(input.id).set(payload, { merge: true });
    return { id: input.id, ...payload };
  }
  const ref = await db.collection("socialLinks").add(payload);
  return { id: ref.id, ...payload };
}

export async function deleteSocialLink(id: string) {
  await requireDb().collection("socialLinks").doc(id).delete();
}

// ----------------------------- AUDIT LOGS ----------------------------
export async function listAuditLogs(opts: { limit?: number; cursor?: string; action?: string } = {}) {
  const db = requireDb();
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);
  let query: Query = opts.action
    ? db.collection("auditLogs").where("action", "==", opts.action).orderBy("createdAt", "desc")
    : db.collection("auditLogs").orderBy("createdAt", "desc");
  query = query.limit(limit + 1);
  if (opts.cursor) {
    const cur = await db.collection("auditLogs").doc(opts.cursor).get();
    if (cur.exists) query = query.startAfter(cur);
  }
  const snap = await query.get();
  const docs = snap.docs.slice(0, limit);
  const items: AuditLog[] = docs.map((d) => {
    const m = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      actorId: String(m.actorId ?? ""),
      actorEmail: (m.actorEmail as string) ?? undefined,
      actorRole: (m.actorRole as AuditLog["actorRole"]) ?? undefined,
      action: String(m.action ?? ""),
      resource: (m.resource as string) ?? undefined,
      result: (m.result as AuditLog["result"]) ?? "success",
      metadata: (m.metadata as Record<string, unknown>) ?? undefined,
      ip: (m.ip as string) ?? undefined,
      createdAt: toISODate(m.createdAt) ?? new Date().toISOString(),
    };
  });
  return { items, nextCursor: snap.docs.length > limit ? docs[docs.length - 1].id : null };
}
