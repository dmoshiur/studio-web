import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { toISODate } from "@/lib/utils";
import type { Paginated, Reservation, ReservationStatus } from "@/types";

function requireDb() {
  const db = getAdminDb();
  if (!db) throw new Error("Database is not configured");
  return db;
}

function mapReservation(id: string, d: Record<string, unknown>): Reservation {
  return {
    id,
    eventId: String(d.eventId ?? ""),
    eventSlug: String(d.eventSlug ?? ""),
    eventTitle: String(d.eventTitle ?? ""),
    eventStartAt: toISODate(d.eventStartAt) ?? "",
    userId: String(d.userId ?? ""),
    name: String(d.name ?? ""),
    email: String(d.email ?? ""),
    seats: Number(d.seats ?? 1),
    note: (d.note as string) || undefined,
    status: (d.status as ReservationStatus) ?? "requested",
    createdAt: toISODate(d.createdAt) ?? "",
    updatedAt: toISODate(d.updatedAt) ?? "",
  };
}

export async function createReservation(input: {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventStartAt: string;
  userId: string;
  name: string;
  email: string;
  seats: number;
  note?: string;
}): Promise<Reservation> {
  const db = requireDb();
  const now = FieldValue.serverTimestamp();
  const ref = await db.collection("reservations").add({
    ...input,
    status: "requested",
    createdAt: now,
    updatedAt: now,
  });
  return {
    id: ref.id,
    ...input,
    note: input.note || undefined,
    status: "requested",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** One active (non-cancelled) reservation per user per event. */
export async function findActiveReservation(userId: string, eventId: string): Promise<Reservation | null> {
  const db = requireDb();
  const snap = await db
    .collection("reservations")
    .where("userId", "==", userId)
    .where("eventId", "==", eventId)
    .limit(5)
    .get();
  for (const doc of snap.docs) {
    const r = mapReservation(doc.id, doc.data() as Record<string, unknown>);
    if (r.status !== "cancelled") return r;
  }
  return null;
}

interface ChainableQuery {
  where: (f: string, op: "==", v: unknown) => ChainableQuery;
  orderBy: (f: string, d: "asc" | "desc") => ChainableQuery;
  limit: (n: number) => ChainableQuery;
  startAfter: (c: unknown) => ChainableQuery;
  get: () => Promise<{ docs: { id: string; data: () => Record<string, unknown> }[]; size: number }>;
}

export async function listReservations(opts: {
  limit?: number;
  cursor?: string;
  status?: ReservationStatus;
  userId?: string;
} = {}): Promise<Paginated<Reservation>> {
  const db = requireDb();
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  let query = db.collection("reservations") as unknown as ChainableQuery;
  if (opts.status) query = query.where("status", "==", opts.status);
  if (opts.userId) query = query.where("userId", "==", opts.userId);
  query = query.orderBy("createdAt", "desc").limit(limit + 1);
  if (opts.cursor) {
    const cursorDoc = await db.collection("reservations").doc(opts.cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }
  const snap = await query.get();
  const all = snap.docs.map((d) => mapReservation(d.id, d.data()));
  const items = all.slice(0, limit);
  const nextCursor = all.length > limit ? items[items.length - 1]?.id ?? null : null;
  return { items, nextCursor };
}

export async function setReservationStatus(id: string, status: ReservationStatus): Promise<Reservation | null> {
  const db = requireDb();
  const ref = db.collection("reservations").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.set({ status, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  const fresh = await ref.get();
  return mapReservation(fresh.id, fresh.data() as Record<string, unknown>);
}

export async function deleteReservation(id: string): Promise<boolean> {
  const db = requireDb();
  const ref = db.collection("reservations").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

export async function countReservations(): Promise<{ total: number; requested: number }> {
  const db = requireDb();
  const all = await db.collection("reservations").count().get();
  const requested = await db
    .collection("reservations")
    .where("status", "==", "requested")
    .count()
    .get();
  return { total: all.data().count, requested: requested.data().count };
}
