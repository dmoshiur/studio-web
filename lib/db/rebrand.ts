import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * =====================================================================
 * One-time rebrand migration — "ManUp" → "Photography"
 * =====================================================================
 * The content seed only runs on an empty database. Deployments that were
 * already seeded under the legacy brand keep their stored settings, so
 * this migration patches the stored documents in place (idempotent,
 * guarded by a marker document). It rewrites the brand strings and legacy
 * "salon" wording to the Event Management Studio positioning without
 * touching anything an admin has already customised away from the legacy
 * defaults.
 */

const LEGACY_BRAND = "manup";
const NEW_SITE_NAME = "Photography";

/** Legacy seed values that must be rewritten even when they don't carry the brand name. */
const LEGACY_DEFAULTS: Record<string, string> = {
  heroTitle: "Where Ambition Meets The Stage",
  heroBadge: "The 2026 Annual Summit",
  aboutTitle: "An Invitation To Rise",
};

function isLegacy(value: unknown): boolean {
  return typeof value === "string" && value.toLowerCase().includes(LEGACY_BRAND);
}

function isLegacyOrSalon(value: unknown): boolean {
  return typeof value === "string" && (value.toLowerCase().includes(LEGACY_BRAND) || /salon/i.test(value));
}

function needsRewrite(key: string, value: unknown): boolean {
  if (isLegacyOrSalon(value)) return true;
  const legacyDefault = LEGACY_DEFAULTS[key];
  return Boolean(legacyDefault) && value === legacyDefault;
}

export async function runRebrandMigration(): Promise<"applied" | "skipped" | "already-done"> {
  const db = getAdminDb();
  if (!db) return "skipped";

  const marker = await db.collection("siteSettings").doc("rebrandState").get();
  if (marker.exists) return "already-done";

  const snap = await db.collection("siteSettings").doc("public").get();
  if (!snap.exists) {
    // Nothing seeded yet — the fresh seed already carries the new brand.
    await db.collection("siteSettings").doc("rebrandState").set({ doneAt: new Date(), brand: NEW_SITE_NAME }, { merge: true });
    return "already-done";
  }

  const data = snap.data() as Record<string, unknown>;
  const siteName = typeof data.siteName === "string" ? data.siteName : "";

  /* Only migrate deployments that still carry the legacy brand. If an
     admin renamed the site to something else entirely, respect that. */
  if (!isLegacy(siteName)) {
    await db.collection("siteSettings").doc("rebrandState").set({ doneAt: new Date(), brand: siteName || NEW_SITE_NAME }, { merge: true });
    return "already-done";
  }

  const now = new Date();

  /* ----------------------------- Settings ---------------------------- */
  const homepage = (data.homepage as Record<string, unknown>) ?? {};
  const seo = (data.seo as Record<string, unknown>) ?? {};
  const owner = (homepage.owner as Record<string, unknown>) ?? {};

  const patch: Record<string, unknown> = {
    siteName: NEW_SITE_NAME,
    tagline: "Event Management Studio — Photo & Videography Events",
    seo: {
      metaTitle: "Photography — Event Management Studio",
      metaDescription:
        "Photography is a modern event management studio — photo and video productions, schedules, speakers, tickets and stories.",
      keywords: "photography, event management studio, photo events, videography, speakers, schedule, tickets",
      ...(seo.ogImage ? { ogImage: seo.ogImage } : {}),
      twitterCard: seo.twitterCard ?? "summary_large_image",
    },
    homepage: {
      ...homepage,
      // Only swap copy that still references the legacy brand / salon era.
      ...(needsRewrite("heroTitle", homepage.heroTitle)
        ? { heroTitle: "Where Every Frame Tells The Story" }
        : {}),
      ...(needsRewrite("heroBadge", homepage.heroBadge)
        ? { heroBadge: "The 2026 Annual Photo & Video Summit" }
        : {}),
      ...(needsRewrite("aboutTitle", homepage.aboutTitle) ? { aboutTitle: "An Invitation To Create" } : {}),
      ...(isLegacy(homepage.aboutBody)
        ? {
            aboutBody:
              "Photography is a curated stage for people who refuse to settle for average images. Across three days and four tracks we pair world-class keynotes with intimate, hands-on workshops, so every technique you learn is one you can use on your next shoot.\n\nExpect candid conversations, real lighting diagrams and a room full of people who are already shooting the next chapter.",
          }
        : {}),
      ...(Array.isArray(homepage.tickets)
        ? {
            tickets: (homepage.tickets as Record<string, unknown>[]).map((t) =>
              isLegacyOrSalon(t.name) ? { ...t, name: String(t.name).replace(/Salon/gi, "Studio") } : t
            ),
          }
        : {}),
      owner: {
        ...owner,
        ...(isLegacy(owner.bio)
          ? {
              bio: "I started Photography because the rooms I remembered most were the small ones — the ones where you actually got to finish a frame with someone. That standard has not moved: every speaker earns the stage, and every guest leaves with something they can act on.\n\nIf you are new here, come say hello. The door is open.",
            }
          : {}),
        ...(isLegacy(owner.title) ? { title: "The person behind the lens" } : {}),
      },
    },
    updatedAt: now,
    rebrandedFrom: siteName,
  };

  await db.collection("siteSettings").doc("public").set(patch, { merge: true });

  /* ---------------------------- Navigation --------------------------- */
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
    }
  }

  /* ------------------------------ Events ----------------------------- */
  const eventsSnap = await db.collection("events").get();
  await Promise.all(
    eventsSnap.docs
      .filter((d) => isLegacy((d.data() as Record<string, unknown>).title))
      .map((d) =>
        d.ref.set(
          {
            title: String((d.data() as Record<string, unknown>).title).replace(/ManUp/gi, NEW_SITE_NAME),
            updatedAt: now,
          },
          { merge: true }
        )
      )
  );

  /* ------------------------------ Posts ------------------------------ */
  const postsSnap = await db.collection("posts").get();
  await Promise.all(
    postsSnap.docs
      .filter((d) => isLegacy((d.data() as Record<string, unknown>).authorName))
      .map((d) =>
        d.ref.set(
          {
            authorName: String((d.data() as Record<string, unknown>).authorName).replace(
              /ManUp/gi,
              NEW_SITE_NAME
            ),
            updatedAt: now,
          },
          { merge: true }
        )
      )
  );

  /* ------------------------------- Pages ----------------------------- */
  const aboutPage = await db.collection("pages").doc("about").get();
  if (aboutPage.exists && isLegacy((aboutPage.data() as Record<string, unknown>).title)) {
    await aboutPage.ref.set({ title: `About ${NEW_SITE_NAME}`, updatedAt: now }, { merge: true });
  }

  await db.collection("siteSettings").doc("rebrandState").set({ doneAt: now, brand: NEW_SITE_NAME }, { merge: true });
  return "applied";
}
