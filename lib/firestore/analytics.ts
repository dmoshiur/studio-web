import "server-only";
import crypto from "node:crypto";
import { FieldValue, type Query } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { toISODate } from "@/lib/utils";

/**
 * =====================================================================
 * Visitor analytics
 * =====================================================================
 * Privacy-first, first-party pageview tracking (no external services).
 *
 * Collections:
 *   analyticsVisitors  one doc per anonymous visitor id — first/last seen
 *   analyticsViews     one doc per page view (visitor, path, referrer, time)
 *   analyticsDaily     one doc per (day, visitor) — powers unique counts
 *
 * Each doc stores only an opaque id, the path, an optional referrer host
 * and timestamps. No IPs, no fingerprints, no cross-site tracking.
 */

function requireDb() {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore is not configured");
  return db;
}

/** Simple UA sniffing — bots and crawlers are not counted. */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return /bot|crawl|spider|slurp|pingdom|headless|lighthouse|vercel|monitor|preview|curl|wget|facebookexternalhit|prerender/i.test(
    userAgent
  );
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export interface VisitInput {
  visitorId: string;
  path: string;
  referrer?: string;
}

/** Record one page view. Cheap, idempotent-per-view writes. */
export async function recordVisit(input: VisitInput): Promise<void> {
  const db = requireDb();
  const now = new Date();

  // The per-view record.
  await db.collection("analyticsViews").add({
    v: input.visitorId,
    p: input.path.slice(0, 300),
    r: (input.referrer ?? "").slice(0, 200),
    at: now,
  });

  // Visitor rollup (first seen is preserved by merge semantics).
  await db
    .collection("analyticsVisitors")
    .doc(input.visitorId)
    .set({ lastAt: now, views: FieldValue.increment(1) }, { merge: true });

  const snap = await db.collection("analyticsVisitors").doc(input.visitorId).get();
  if (!snap.exists || !(snap.data() as Record<string, unknown>).firstAt) {
    await db.collection("analyticsVisitors").doc(input.visitorId).set({ firstAt: now }, { merge: true });
  }

  // Daily unique marker: one doc per (day, visitor).
  await db
    .collection("analyticsDaily")
    .doc(`${dayKey(now)}_${input.visitorId}`)
    .set({ day: dayKey(now), v: input.visitorId, at: now }, { merge: true });
}

export interface AnalyticsSummary {
  /** All-time totals. */
  totalViews: number;
  totalVisitors: number;
  /** Rolling windows. */
  todayViews: number;
  todayVisitors: number;
  last7dViews: number;
  /** Visitors with a page view in the last 5 minutes. */
  activeNow: number;
  /** Page views over the last 14 days (oldest first). */
  series: { day: string; views: number }[];
  /** Most viewed paths (last 30 days). */
  topPages: { path: string; views: number }[];
  /** Top referrer hosts (last 30 days, external only). */
  topReferrers: { host: string; views: number }[];
}

const FIVE_MIN_MS = 5 * 60 * 1000;

/** Aggregated metrics for the operations dashboard. */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const db = requireDb();
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
  const seriesStart = new Date(todayStart.getTime() - 13 * 24 * 60 * 60 * 1000);
  const activeSince = new Date(now.getTime() - FIVE_MIN_MS);

  const [
    totalViews,
    totalVisitors,
    todayViews,
    todayVisitors,
    last7dViews,
    activeViewsSnap,
    seriesSnap,
  ] = await Promise.all([
    db.collection("analyticsViews").count().get(),
    db.collection("analyticsVisitors").count().get(),
    db.collection("analyticsViews").where("at", ">=", todayStart).count().get(),
    db.collection("analyticsDaily").where("day", "==", dayKey(now)).count().get(),
    db.collection("analyticsViews").where("at", ">=", weekStart).count().get(),
    db.collection("analyticsViews").where("at", ">=", activeSince).limit(2000).get(),
    db.collection("analyticsViews").where("at", ">=", seriesStart).limit(20000).get(),
  ]);

  // Real-time: unique visitor ids seen in the last five minutes.
  const activeIds = new Set<string>();
  activeViewsSnap.docs.forEach((d) => {
    const v = (d.data() as Record<string, unknown>).v;
    if (typeof v === "string") activeIds.add(v);
  });

  // Daily series + top pages + referrers from the recent window.
  const byDay = new Map<string, number>();
  const byPath = new Map<string, number>();
  const byReferrer = new Map<string, number>();
  seriesSnap.docs.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    const at = toISODate(data.at);
    const key = at ? at.slice(0, 10) : "unknown";
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
    const p = typeof data.p === "string" ? data.p : "/";
    byPath.set(p, (byPath.get(p) ?? 0) + 1);
    if (typeof data.r === "string" && data.r) {
      try {
        const host = new URL(data.r).hostname.replace(/^www\./, "");
        if (host && !host.includes(process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname : "localhost")) {
          byReferrer.set(host, (byReferrer.get(host) ?? 0) + 1);
        }
      } catch {
        /* not a URL — ignore */
      }
    }
  });
  const series: { day: string; views: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(seriesStart.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    series.push({ day: key, views: byDay.get(key) ?? 0 });
  }

  const topPages = [...byPath.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([path, views]) => ({ path, views }));

  const topReferrers = [...byReferrer.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([host, views]) => ({ host, views }));

  return {
    totalViews: totalViews.data().count,
    totalVisitors: totalVisitors.data().count,
    todayViews: todayViews.data().count,
    todayVisitors: todayVisitors.data().count,
    last7dViews: last7dViews.data().count,
    activeNow: activeIds.size,
    series,
    topPages,
    topReferrers,
  };
}

/** Mint a new opaque visitor id. */
export function newVisitorId(): string {
  return crypto.randomBytes(16).toString("hex");
}
