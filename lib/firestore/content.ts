import "server-only";
import { FieldValue, type Query } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { slugify, toISODate } from "@/lib/utils";
import { sanitizeRichText } from "@/lib/security/sanitize";
import { normalizeBrandDeep } from "@/lib/brand";
import type {
  Category, EventItem, Paginated, PageDoc, Post, PublishStatus, ScheduleDay, ScheduleSession, Speaker,
} from "@/types";

function requireDb() {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore is not configured");
  return db;
}

type QDoc = { id: string; data: () => Record<string, unknown> };

/** Numeric sort value for a stored date-ish field (Timestamp | Date | ISO). */
function timeVal(d: QDoc, field: string): number {
  const v = d.data()[field];
  if (!v) return 0;
  const isoStr = toISODate(v);
  return isoStr ? Date.parse(isoStr) : 0;
}

/**
 * Run a composed query; when Firestore rejects it because the required
 * composite index has not been deployed (FAILED_PRECONDITION), fall back to
 * an in-memory filter/sort of the collection so public pages and APIs keep
 * working. Deploy `firestore.indexes.json` to avoid the fallback
 * (`firebase deploy --only firestore:indexes`).
 */
async function queryDocs(q: Query, fallback: () => Promise<QDoc[]>): Promise<QDoc[]> {
  try {
    const snap = await q.get();
    return snap.docs as unknown as QDoc[];
  } catch (err) {
    const code = (err as { code?: number | string }).code;
    const msg = err instanceof Error ? err.message : String(err);
    if (code === 9 || /requires an index|FAILED_PRECONDITION/i.test(msg)) {
      console.error(
        "[content] Firestore composite index missing — using in-memory fallback. Deploy the indexes with `firebase deploy --only firestore:indexes`.",
        msg.split("\n")[0]
      );
      return fallback();
    }
    throw err;
  }
}

function iso(v: unknown, fallback?: string | null): string | null {
  return toISODate(v) ?? fallback ?? null;
}

// ------------------------------- POSTS -------------------------------
function mapPost(id: string, d: Record<string, unknown>): Post {
  return normalizeBrandDeep({
    id,
    title: String(d.title ?? ""),
    slug: String(d.slug ?? id),
    excerpt: String(d.excerpt ?? ""),
    contentHtml: String(d.contentHtml ?? ""),
    coverImage: (d.coverImage as string) || undefined,
    categoryId: (d.categoryId as string) || undefined,
    categorySlug: (d.categorySlug as string) || undefined,
    tags: Array.isArray(d.tags) ? (d.tags as string[]) : [],
    authorName: String(d.authorName ?? ""),
    authorId: (d.authorId as string) || undefined,
    status: (d.status as PublishStatus) ?? "draft",
    featured: d.featured === true,
    readingMinutes: Number(d.readingMinutes ?? 1),
    seo: (d.seo as Post["seo"]) ?? undefined,
    publishedAt: iso(d.publishedAt),
    scheduledAt: iso(d.scheduledAt),
    createdAt: toISODate(d.createdAt) ?? new Date().toISOString(),
    updatedAt: toISODate(d.updatedAt) ?? new Date().toISOString(),
  });
}

export async function listPublishedPosts(opts: {
  limit?: number; cursor?: string; categorySlug?: string; featuredOnly?: boolean;
} = {}): Promise<Paginated<Post>> {
  const db = requireDb();
  const limit = Math.min(Math.max(opts.limit ?? 12, 1), 50);
  let q: Query = db.collection("posts").where("status", "==", "published");
  if (opts.categorySlug) q = q.where("categorySlug", "==", opts.categorySlug);
  if (opts.featuredOnly) q = q.where("featured", "==", true);
  q = q.orderBy("publishedAt", "desc").limit(limit + 1);
  if (opts.cursor) {
    const cur = await db.collection("posts").doc(opts.cursor).get();
    if (cur.exists) q = q.startAfter(cur);
  }
  const docs = await queryDocs(q, async () => {
    const snap = await db.collection("posts").get();
    let all = (snap.docs as unknown as QDoc[]).filter((d) => {
      const data = d.data();
      if (data.status !== "published") return false;
      if (opts.categorySlug && data.categorySlug !== opts.categorySlug) return false;
      if (opts.featuredOnly && data.featured !== true) return false;
      return true;
    });
    all.sort((a, b) => timeVal(b, "publishedAt") - timeVal(a, "publishedAt"));
    if (opts.cursor) {
      const idx = all.findIndex((d) => d.id === opts.cursor);
      if (idx >= 0) all = all.slice(idx + 1);
    }
    return all.slice(0, limit + 1);
  });
  const page = docs.slice(0, limit);
  return {
    items: page.map((d) => mapPost(d.id, d.data())),
    nextCursor: docs.length > limit ? page[page.length - 1].id : null,
  };
}

export async function listPostsAdmin(opts: { limit?: number; cursor?: string; status?: string } = {}) {
  const db = requireDb();
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  let q: Query = db.collection("posts").orderBy("updatedAt", "desc");
  if (opts.status) q = db.collection("posts").where("status", "==", opts.status).orderBy("updatedAt", "desc");
  q = q.limit(limit + 1);
  if (opts.cursor) {
    const cur = await db.collection("posts").doc(opts.cursor).get();
    if (cur.exists) q = q.startAfter(cur);
  }
  const docs = await queryDocs(q, async () => {
    const snap = await db.collection("posts").get();
    let all = (snap.docs as unknown as QDoc[]).filter((d) =>
      opts.status ? d.data().status === opts.status : true
    );
    all.sort((a, b) => timeVal(b, "updatedAt") - timeVal(a, "updatedAt"));
    if (opts.cursor) {
      const idx = all.findIndex((d) => d.id === opts.cursor);
      if (idx >= 0) all = all.slice(idx + 1);
    }
    return all.slice(0, limit + 1);
  });
  const page = docs.slice(0, limit);
  return {
    items: page.map((d) => mapPost(d.id, d.data())),
    nextCursor: docs.length > limit ? page[page.length - 1].id : null,
  };
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const db = requireDb();
  const snap = await db.collection("posts").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return mapPost(d.id, d.data());
}

export async function getPostById(id: string): Promise<Post | null> {
  const db = requireDb();
  const snap = await db.collection("posts").doc(id).get();
  if (!snap.exists) return null;
  return mapPost(snap.id, snap.data() as Record<string, unknown>);
}

export async function createPost(input: Record<string, unknown>, authorId: string): Promise<Post> {
  const db = requireDb();
  const now = FieldValue.serverTimestamp();
  const slug = (input.slug as string) || slugify(String(input.title));
  const existing = await db.collection("posts").where("slug", "==", slug).limit(1).get();
  if (!existing.empty) throw new Error("A post with this slug already exists");
  const ref = db.collection("posts").doc();
  const status = input.status as PublishStatus;
  await ref.set({
    ...input,
    slug,
    contentHtml: sanitizeRichText(String(input.contentHtml ?? "")),
    authorId,
    publishedAt: status === "published" ? now : null,
    createdAt: now,
    updatedAt: now,
  });
  const created = await ref.get();
  return mapPost(ref.id, created.data() as Record<string, unknown>);
}

export async function updatePost(id: string, input: Record<string, unknown>): Promise<Post> {
  const db = requireDb();
  const ref = db.collection("posts").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Post not found");
  const prev = snap.data() as Record<string, unknown>;
  if (input.slug && input.slug !== prev.slug) {
    const clash = await db.collection("posts").where("slug", "==", input.slug).limit(1).get();
    if (!clash.empty && clash.docs[0].id !== id) throw new Error("A post with this slug already exists");
  }
  const patch: Record<string, unknown> = { ...input, updatedAt: FieldValue.serverTimestamp() };
  if (typeof input.contentHtml === "string") patch.contentHtml = sanitizeRichText(input.contentHtml);
  if (input.status === "published" && prev.status !== "published" && !prev.publishedAt) {
    patch.publishedAt = FieldValue.serverTimestamp();
  }
  await ref.set(patch, { merge: true });
  const updated = await ref.get();
  return mapPost(id, updated.data() as Record<string, unknown>);
}

export async function deletePost(id: string): Promise<void> {
  await requireDb().collection("posts").doc(id).delete();
}

// ------------------------------- EVENTS ------------------------------
function mapEvent(id: string, d: Record<string, unknown>): EventItem {
  return normalizeBrandDeep({
    id,
    title: String(d.title ?? ""),
    slug: String(d.slug ?? id),
    description: String(d.description ?? ""),
    contentHtml: (d.contentHtml as string) || undefined,
    startAt: toISODate(d.startAt) ?? new Date().toISOString(),
    endAt: iso(d.endAt) ?? undefined,
    timezone: (d.timezone as string) || undefined,
    venue: (d.venue as string) || undefined,
    address: (d.address as string) || undefined,
    coverImage: (d.coverImage as string) || undefined,
    speakerIds: Array.isArray(d.speakerIds) ? (d.speakerIds as string[]) : [],
    registrationUrl: (d.registrationUrl as string) || undefined,
    price: (d.price as string) || undefined,
    status: (d.status as PublishStatus) ?? "draft",
    featured: d.featured === true,
    seo: (d.seo as EventItem["seo"]) ?? undefined,
    createdAt: toISODate(d.createdAt) ?? new Date().toISOString(),
    updatedAt: toISODate(d.updatedAt) ?? new Date().toISOString(),
  });
}

export async function listPublishedEvents(opts: { limit?: number; cursor?: string; upcomingOnly?: boolean } = {}) {
  const db = requireDb();
  const limit = Math.min(Math.max(opts.limit ?? 12, 1), 50);
  let q: Query = db.collection("events").where("status", "==", "published");
  if (opts.upcomingOnly) q = q.where("startAt", ">=", new Date());
  q = q.orderBy("startAt", "asc").limit(limit + 1);
  if (opts.cursor) {
    const cur = await db.collection("events").doc(opts.cursor).get();
    if (cur.exists) q = q.startAfter(cur);
  }
  const docs = await queryDocs(q, async () => {
    const snap = await db.collection("events").get();
    let all = (snap.docs as unknown as QDoc[]).filter((d) => {
      const data = d.data();
      if (data.status !== "published") return false;
      if (opts.upcomingOnly && timeVal(d, "startAt") < Date.now()) return false;
      return true;
    });
    all.sort((a, b) => timeVal(a, "startAt") - timeVal(b, "startAt"));
    if (opts.cursor) {
      const idx = all.findIndex((d) => d.id === opts.cursor);
      if (idx >= 0) all = all.slice(idx + 1);
    }
    return all.slice(0, limit + 1);
  });
  const page = docs.slice(0, limit);
  return {
    items: page.map((d) => mapEvent(d.id, d.data())),
    nextCursor: docs.length > limit ? page[page.length - 1].id : null,
  };
}

export async function listEventsAdmin(opts: { limit?: number; cursor?: string } = {}) {
  const db = requireDb();
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  let q: Query = db.collection("events").orderBy("startAt", "desc").limit(limit + 1);
  if (opts.cursor) {
    const cur = await db.collection("events").doc(opts.cursor).get();
    if (cur.exists) q = q.startAfter(cur);
  }
  const snap = await q.get();
  const docs = snap.docs.slice(0, limit);
  return {
    items: docs.map((d) => mapEvent(d.id, d.data())),
    nextCursor: snap.docs.length > limit ? docs[docs.length - 1].id : null,
  };
}

export async function getEventBySlug(slug: string): Promise<EventItem | null> {
  const db = requireDb();
  const snap = await db.collection("events").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return mapEvent(d.id, d.data());
}

export async function getEventById(id: string) {
  const db = requireDb();
  const snap = await db.collection("events").doc(id).get();
  if (!snap.exists) return null;
  return mapEvent(snap.id, snap.data() as Record<string, unknown>);
}

export async function createEvent(input: Record<string, unknown>): Promise<EventItem> {
  const db = requireDb();
  const slug = (input.slug as string) || slugify(String(input.title));
  const clash = await db.collection("events").where("slug", "==", slug).limit(1).get();
  if (!clash.empty) throw new Error("An event with this slug already exists");
  const ref = db.collection("events").doc();
  const now = FieldValue.serverTimestamp();
  await ref.set({
    ...input,
    slug,
    startAt: new Date(String(input.startAt)),
    endAt: input.endAt ? new Date(String(input.endAt)) : null,
    contentHtml: input.contentHtml ? sanitizeRichText(String(input.contentHtml)) : "",
    createdAt: now,
    updatedAt: now,
  });
  const created = await ref.get();
  return mapEvent(ref.id, created.data() as Record<string, unknown>);
}

export async function updateEvent(id: string, input: Record<string, unknown>) {
  const db = requireDb();
  const ref = db.collection("events").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Event not found");
  const patch: Record<string, unknown> = { ...input, updatedAt: FieldValue.serverTimestamp() };
  if (typeof input.startAt === "string") patch.startAt = new Date(input.startAt);
  if (typeof input.endAt === "string") patch.endAt = input.endAt ? new Date(input.endAt) : null;
  if (typeof input.contentHtml === "string") patch.contentHtml = sanitizeRichText(input.contentHtml);
  await ref.set(patch, { merge: true });
  const updated = await ref.get();
  return mapEvent(id, updated.data() as Record<string, unknown>);
}

export async function deleteEvent(id: string) {
  await requireDb().collection("events").doc(id).delete();
}

// ------------------------------ SPEAKERS -----------------------------
function mapSpeaker(id: string, d: Record<string, unknown>): Speaker {
  return normalizeBrandDeep({
    id,
    name: String(d.name ?? ""),
    slug: String(d.slug ?? id),
    title: (d.title as string) || undefined,
    company: (d.company as string) || undefined,
    topic: (d.topic as string) || undefined,
    bio: String(d.bio ?? ""),
    photoURL: (d.photoURL as string) || undefined,
    socials: Array.isArray(d.socials) ? (d.socials as Speaker["socials"]) : [],
    featured: d.featured === true,
    status: (d.status as PublishStatus) ?? "published",
    createdAt: toISODate(d.createdAt) ?? new Date().toISOString(),
    updatedAt: toISODate(d.updatedAt) ?? new Date().toISOString(),
  });
}

export async function listPublishedSpeakers(opts: { limit?: number; featuredOnly?: boolean } = {}) {
  const db = requireDb();
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 100);
  let q: Query = db.collection("speakers").where("status", "==", "published");
  if (opts.featuredOnly) q = q.where("featured", "==", true);
  q = q.orderBy("name", "asc").limit(limit);
  const docs = await queryDocs(q, async () => {
    const snap = await db.collection("speakers").get();
    const all = (snap.docs as unknown as QDoc[]).filter((d) => {
      const data = d.data();
      if (data.status !== "published") return false;
      if (opts.featuredOnly && data.featured !== true) return false;
      return true;
    });
    all.sort((a, b) => String(a.data().name ?? "").localeCompare(String(b.data().name ?? "")));
    return all.slice(0, limit);
  });
  return docs.map((d) => mapSpeaker(d.id, d.data()));
}

export async function listSpeakersAdmin(opts: { limit?: number } = {}) {
  const db = requireDb();
  const snap = await db.collection("speakers").orderBy("name", "asc").limit(Math.min(opts.limit ?? 100, 200)).get();
  return snap.docs.map((d) => mapSpeaker(d.id, d.data()));
}

export async function getSpeakerBySlug(slug: string) {
  const db = requireDb();
  const snap = await db.collection("speakers").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return mapSpeaker(d.id, d.data());
}

export async function getSpeakerById(id: string) {
  const db = requireDb();
  const snap = await db.collection("speakers").doc(id).get();
  if (!snap.exists) return null;
  return mapSpeaker(snap.id, snap.data() as Record<string, unknown>);
}

export async function getSpeakersByIds(ids: string[]) {
  if (!ids.length) return [];
  const db = requireDb();
  const snaps = await Promise.all(ids.slice(0, 50).map((id) => db.collection("speakers").doc(id).get()));
  return snaps.filter((s) => s.exists).map((s) => mapSpeaker(s.id, s.data() as Record<string, unknown>));
}

export async function createSpeaker(input: Record<string, unknown>) {
  const db = requireDb();
  const slug = (input.slug as string) || slugify(String(input.name));
  const clash = await db.collection("speakers").where("slug", "==", slug).limit(1).get();
  if (!clash.empty) throw new Error("A speaker with this slug already exists");
  const ref = db.collection("speakers").doc();
  const now = FieldValue.serverTimestamp();
  await ref.set({ ...input, slug, createdAt: now, updatedAt: now });
  const created = await ref.get();
  return mapSpeaker(ref.id, created.data() as Record<string, unknown>);
}

export async function updateSpeaker(id: string, input: Record<string, unknown>) {
  const db = requireDb();
  const ref = db.collection("speakers").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Speaker not found");
  await ref.set({ ...input, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  const updated = await ref.get();
  return mapSpeaker(id, updated.data() as Record<string, unknown>);
}

export async function deleteSpeaker(id: string) {
  await requireDb().collection("speakers").doc(id).delete();
}

// ---------------------------- CATEGORIES -----------------------------
function mapCategory(id: string, d: Record<string, unknown>): Category {
  return {
    id,
    name: String(d.name ?? ""),
    slug: String(d.slug ?? id),
    description: (d.description as string) || undefined,
    color: (d.color as string) || undefined,
    createdAt: toISODate(d.createdAt) ?? new Date().toISOString(),
    updatedAt: toISODate(d.updatedAt) ?? new Date().toISOString(),
  };
}

export async function listCategories(): Promise<Category[]> {
  const db = requireDb();
  const snap = await db.collection("categories").orderBy("name", "asc").limit(100).get();
  return snap.docs.map((d) => mapCategory(d.id, d.data()));
}

export async function createCategory(input: { name: string; slug?: string; description?: string; color?: string }) {
  const db = requireDb();
  const slug = input.slug || slugify(input.name);
  const clash = await db.collection("categories").where("slug", "==", slug).limit(1).get();
  if (!clash.empty) throw new Error("A category with this slug already exists");
  const ref = db.collection("categories").doc();
  const now = FieldValue.serverTimestamp();
  await ref.set({ ...input, slug, createdAt: now, updatedAt: now });
  const created = await ref.get();
  return mapCategory(ref.id, created.data() as Record<string, unknown>);
}

export async function deleteCategory(id: string) {
  await requireDb().collection("categories").doc(id).delete();
}

// ------------------------------- PAGES -------------------------------
function mapPage(id: string, d: Record<string, unknown>): PageDoc {
  return normalizeBrandDeep({
    id,
    slug: String(d.slug ?? id),
    title: String(d.title ?? ""),
    contentHtml: String(d.contentHtml ?? ""),
    status: (d.status as PublishStatus) ?? "draft",
    seo: (d.seo as PageDoc["seo"]) ?? undefined,
    updatedAt: toISODate(d.updatedAt) ?? new Date().toISOString(),
  });
}

export async function getPageBySlug(slug: string): Promise<PageDoc | null> {
  const db = requireDb();
  const snap = await db.collection("pages").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return mapPage(d.id, d.data());
}

export async function listPagesAdmin(): Promise<PageDoc[]> {
  const db = requireDb();
  const snap = await db.collection("pages").orderBy("slug", "asc").limit(100).get();
  return snap.docs.map((d) => mapPage(d.id, d.data()));
}

export async function upsertPage(input: Record<string, unknown>) {
  const db = requireDb();
  const slug = String(input.slug);
  const snap = await db.collection("pages").where("slug", "==", slug).limit(1).get();
  const payload = {
    ...input,
    contentHtml: sanitizeRichText(String(input.contentHtml ?? "")),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (snap.empty) {
    const ref = db.collection("pages").doc();
    await ref.set({ ...payload, createdAt: FieldValue.serverTimestamp() });
    const created = await ref.get();
    return mapPage(ref.id, created.data() as Record<string, unknown>);
  }
  const doc = snap.docs[0];
  await doc.ref.set(payload, { merge: true });
  const updated = await doc.ref.get();
  return mapPage(doc.id, updated.data() as Record<string, unknown>);
}

export async function deletePage(id: string) {
  await requireDb().collection("pages").doc(id).delete();
}

// --------------------------- DASHBOARD COUNTS ------------------------
export async function getDashboardCounts() {
  const db = requireDb();
  const [posts, events, speakers, media, messages, subs, scheduleDays] = await Promise.all([
    db.collection("posts").count().get(),
    db.collection("events").count().get(),
    db.collection("speakers").count().get(),
    db.collection("media").count().get(),
    db.collection("messages").where("read", "==", false).count().get(),
    db.collection("newsletterSubscribers").where("status", "==", "active").count().get(),
    db.collection("scheduleDays").count().get(),
  ]);
  return {
    posts: posts.data().count,
    events: events.data().count,
    speakers: speakers.data().count,
    media: media.data().count,
    unreadMessages: messages.data().count,
    subscribers: subs.data().count,
    scheduleDays: scheduleDays.data().count,
  };
}

// ----------------------------- SCHEDULE ------------------------------
function mapSession(raw: unknown, fallbackIndex: number): ScheduleSession {
  const s = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(s.id ?? `session-${fallbackIndex}`),
    title: String(s.title ?? ""),
    description: (s.description as string) || undefined,
    startTime: String(s.startTime ?? ""),
    endTime: (s.endTime as string) || undefined,
    venue: (s.venue as string) || undefined,
    track: (s.track as string) || undefined,
    speakerIds: Array.isArray(s.speakerIds) ? (s.speakerIds as string[]) : [],
  };
}

function mapScheduleDay(id: string, d: Record<string, unknown>): ScheduleDay {
  return {
    id,
    day: Number(d.day ?? 1),
    label: String(d.label ?? `Day ${d.day ?? 1}`),
    dateISO: toISODate(d.dateISO) ?? undefined,
    note: (d.note as string) || undefined,
    sessions: Array.isArray(d.sessions) ? d.sessions.map(mapSession) : [],
    status: (d.status as PublishStatus) ?? "published",
    createdAt: toISODate(d.createdAt) ?? new Date().toISOString(),
    updatedAt: toISODate(d.updatedAt) ?? new Date().toISOString(),
  };
}

/** Public schedule days (published only), ordered Day 1 → N. */
export async function listPublishedScheduleDays(): Promise<ScheduleDay[]> {
  const db = requireDb();
  const snap = await db.collection("scheduleDays").orderBy("day", "asc").get();
  return snap.docs
    .map((d) => mapScheduleDay(d.id, d.data()))
    .filter((d) => d.status === "published" && d.sessions.length > 0);
}

/** All schedule days for the studio (drafts included). */
export async function listScheduleDaysAdmin(): Promise<ScheduleDay[]> {
  const db = requireDb();
  const snap = await db.collection("scheduleDays").orderBy("day", "asc").get();
  return snap.docs.map((d) => mapScheduleDay(d.id, d.data()));
}

export async function getScheduleDay(id: string): Promise<ScheduleDay | null> {
  const db = requireDb();
  const snap = await db.collection("scheduleDays").doc(id).get();
  if (!snap.exists) return null;
  return mapScheduleDay(snap.id, snap.data() as Record<string, unknown>);
}

export interface ScheduleDayInput {
  day: number;
  label?: string;
  dateISO?: string | null;
  note?: string | null;
  status?: PublishStatus;
  sessions: ScheduleSession[];
}

/** Create or replace a schedule day document. */
export async function saveScheduleDay(id: string | undefined, input: ScheduleDayInput): Promise<ScheduleDay> {
  const db = requireDb();
  const day = Math.min(Math.max(Number(input.day) || 1, 1), 31);
  const label = input.label?.trim() || `Day ${day}`;
  const sessions = (input.sessions ?? []).map((s, i) => ({
    id: s.id || `s-${day}-${i + 1}`,
    title: s.title,
    description: s.description ?? "",
    startTime: s.startTime,
    endTime: s.endTime ?? "",
    venue: s.venue ?? "",
    track: s.track ?? "",
    speakerIds: s.speakerIds ?? [],
  }));
  const payload = {
    day,
    label,
    dateISO: input.dateISO || null,
    note: input.note || null,
    status: input.status ?? "published",
    sessions,
    updatedAt: FieldValue.serverTimestamp(),
  };
  const ref = id ? db.collection("scheduleDays").doc(id) : db.collection("scheduleDays").doc();
  await ref.set(
    { ...payload, ...(id ? {} : { createdAt: FieldValue.serverTimestamp() }) },
    { merge: true }
  );
  const saved = await ref.get();
  return mapScheduleDay(ref.id, saved.data() as Record<string, unknown>);
}

export async function deleteScheduleDay(id: string): Promise<void> {
  await requireDb().collection("scheduleDays").doc(id).delete();
}
