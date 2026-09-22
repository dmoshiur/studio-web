import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { BRAND_NAME, normalizeBrandDeep, normalizeSiteName } from "@/lib/brand";
import { invalidateSettingsCache } from "@/lib/firestore/settings";

/**
 * =====================================================================
 * Rebrand migration — legacy identities ("ManUp", "AM IT Solution(s)
 * Limited", …) → "Photography"
 * =====================================================================
 * Content seeds run only on an empty database. Deployments seeded under a
 * legacy brand keep their stored documents, so this migration rewrites the
 * stored strings in place. It is:
 *   • idempotent  — plain string normalization, safe to run repeatedly;
 *   • versioned   — a marker document records the last applied version, so
 *                   improved sweeps re-run on databases migrated by an
 *                   earlier version (v1 only recognised "ManUp" and then
 *                   permanently marked the database done — leaving later
 *                   legacy identities like "AM IT Solutions Limited"
 *                   untouched);
 *   • deep        — every string in every document of every collection is
 *                   normalized, so no field (titles, copy, SEO, mail
 *                   sender, page content, event/post bodies) is missed.
 * Custom (non-legacy) admin wording is never touched.
 */

const MIGRATION_VERSION = 2;

const LEGACY_DEFAULTS: Record<string, string> = {
  heroTitle: "Where Ambition Meets The Stage",
  heroBadge: "The 2026 Annual Summit",
  aboutTitle: "An Invitation To Rise",
};

const REWRITE_TICKET_NAME = /Salon/gi;

function needsRewrite(key: string, value: unknown): boolean {
  const legacyDefault = LEGACY_DEFAULTS[key];
  return Boolean(legacyDefault) && value === legacyDefault;
}

interface Marker {
  version?: number;
  doneAt?: unknown;
  brand?: unknown;
}

export async function runRebrandMigration(): Promise<"applied" | "skipped" | "already-done"> {
  const db = getAdminDb();
  if (!db) return "skipped";

  const markerRef = db.collection("siteSettings").doc("rebrandState");
  const markerSnap = await markerRef.get();
  const marker = (markerSnap.exists ? (markerSnap.data() as Marker) : null) ?? null;
  if (marker && Number(marker.version ?? 1) >= MIGRATION_VERSION) return "already-done";

  const now = new Date();

  /* ---------------- Sweep every document in every known collection ---------------- */
  // collections that hold user-visible copy (extend as new collections appear)
  const COLLECTIONS = [
    "siteSettings",
    "navigation",
    "socialLinks",
    "pages",
    "posts",
    "events",
    "speakers",
    "categories",
    "scheduleDays",
    "messages",
    "newsletterSubscribers",
    "reservations",
    "users",
    "admins",
  ];

  let patched = 0;
  for (const name of COLLECTIONS) {
    let snap;
    try {
      snap = await db.collection(name).get();
    } catch {
      continue; // collection may not exist yet on older deployments
    }
    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      let next: Record<string, unknown> = normalizeBrandDeep(data);

      // Homepage ticket names historically used the "Salon Pass" wording.
      const homepage = next.homepage as Record<string, unknown> | undefined;
      if (homepage && Array.isArray(homepage.tickets)) {
        next = {
          ...next,
          homepage: {
            ...homepage,
            tickets: (homepage.tickets as Record<string, unknown>[]).map((t) =>
              REWRITE_TICKET_NAME.test(String(t.name ?? "")) ? { ...t, name: String(t.name).replace(REWRITE_TICKET_NAME, "Studio") } : t
            ),
          },
        };
      }

      // Legacy seed defaults that carried no brand name but belong to the
      // previous identity's copy (hero/about headlines).
      for (const [key, legacyDefault] of Object.entries(LEGACY_DEFAULTS)) {
        if (needsRewrite(key, next[key])) {
          if (key === "heroTitle") next[key] = "Where Every Frame Tells The Story";
          if (key === "heroBadge") next[key] = "The 2026 Annual Photo & Video Summit";
          if (key === "aboutTitle") next[key] = "An Invitation To Create";
        }
        const hp = next.homepage as Record<string, unknown> | undefined;
        if (hp && needsRewrite(key, hp[key])) {
          if (key === "heroTitle") hp[key] = "Where Every Frame Tells The Story";
          if (key === "heroBadge") hp[key] = "The 2026 Annual Photo & Video Summit";
          if (key === "aboutTitle") hp[key] = "An Invitation To Create";
        }
      }

      // The public settings document is the identity source of truth.
      if (name === "siteSettings" && doc.id === "public") {
        next = {
          ...next,
          siteName: normalizeSiteName(next.siteName),
          updatedAt: now,
        };
      }

      const changed = JSON.stringify(next) !== JSON.stringify(data);
      if (changed) {
        await doc.ref.set(next, { merge: true });
        patched += 1;
      }
    }
  }

  /* ---------------- Navigation: ensure the Schedule link exists ---------------- */
  const headerNav = await db.collection("navigation").doc("header").get();
  if (headerNav.exists) {
    const nav = headerNav.data() as { links?: { label: string; href: string; external?: boolean }[] };
    const links = nav.links ?? [];
    const hasSchedule = links.some((l) => l.href === "/schedule");
    if (!hasSchedule) {
      const eventsIdx = links.findIndex((l) => l.href === "/events");
      const next = [...links];
      next.splice(eventsIdx === -1 ? links.length : eventsIdx, 0, {
        label: "Schedule",
        href: "/schedule",
      });
      await db.collection("navigation").doc("header").set({ links: next, updatedAt: now }, { merge: true });
      patched += 1;
    }
  }

  await markerRef.set(
    { doneAt: now, brand: BRAND_NAME, version: MIGRATION_VERSION, patchedDocs: patched },
    { merge: true }
  );

  // Drop every display cache so the next request serves the migrated
  // values immediately (no stale legacy branding flash).
  try {
    invalidateSettingsCache();
    const { invalidateAllNavCaches } = await import("@/lib/firestore/engagement");
    invalidateAllNavCaches();
  } catch {
    /* caches are best-effort */
  }
  return "applied";
}
