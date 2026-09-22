import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { MaintenanceState, OwnerProfile, PublicSiteSettings } from "@/types";
import { DEFAULT_OWNER_PROFILE } from "@/lib/owner-defaults";
import { toISODate } from "@/lib/utils";
import { normalizeBrandDeep, normalizeSiteName } from "@/lib/brand";

export { DEFAULT_OWNER_PROFILE };

export const DEFAULT_PUBLIC_SETTINGS: PublicSiteSettings = {
  siteName: "Photography",
  tagline: "Event Management Studio — Photo & Videography Events",
  contactEmail: "hello@example.com",
  phone: "",
  address: "",
  timezone: "UTC",
  seo: {
    metaTitle: "Photography — Event Management Studio",
    metaDescription:
      "Photography is a modern event management studio — photo and video productions, schedules, speakers, tickets and stories.",
    keywords: "photography, event management studio, photo events, videography, speakers, schedule, tickets",
    twitterCard: "summary_large_image",
  },
  social: {},
  appearance: {
    primaryColor: "#b99352",
    secondaryColor: "#ddc99e",
    theme: "light",
  },
  homepage: {
    heroBadge: "Photo & Video Production Event",
    heroTitle: "Where Every Frame Tells The Story",
    heroSubtitle:
      "Join leading photographers, filmmakers and creators for days of shoots, workshops, lighting labs and portfolio reviews.",
    heroCtaPrimary: { label: "Get Tickets", href: "/events" },
    heroCtaSecondary: { label: "Meet Speakers", href: "/speakers" },
    eventVenue: "Grand Meridian Hall, New York",
    showCountdown: true,
    aboutTitle: "About The Studio",
    aboutBody:
      "Photography brings together the brightest image-makers in photo and video. Across multiple tracks you'll find keynotes, live shoots, hands-on workshops and unforgettable networking.",
    aboutStats: [
      { value: "2K+", label: "Attendees" },
      { value: "40+", label: "Speakers" },
      { value: "25+", label: "Sessions" },
      { value: "3", label: "Days" },
    ],
    owner: DEFAULT_OWNER_PROFILE,
  },
  updatedAt: new Date(0).toISOString(),
};

export const DEFAULT_MAINTENANCE: MaintenanceState = {
  enabled: false,
  emergencyLock: false,
  title: "We'll be back soon",
  message: "Our website is temporarily under maintenance. Thanks for your patience.",
  expectedReturn: "",
  updatedAt: new Date(0).toISOString(),
};

function mergeDefaults<T extends Record<string, unknown>>(defaults: T, data: Record<string, unknown> | undefined): T {
  if (!data) return defaults;
  const out = { ...defaults } as Record<string, unknown>;
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

/**
 * Firestore rejects `undefined` values (arrays included), and optional
 * fields routinely arrive blank from the forms — strip them recursively.
 */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => stripUndefined(item)) as unknown as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

/* ------------------------------------------------------------------ */
/* In-memory cache (per-process) — avoids redundant DB reads           */
/* ------------------------------------------------------------------ */
const SETTINGS_CACHE_TTL_MS = 30_000; // 30 seconds — good balance of freshness vs speed
const MAINTENANCE_CACHE_TTL_MS = 10_000; // 10 seconds — maintenance state needs to be responsive

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const settingsCache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = settingsCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    settingsCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCache<T>(key: string, value: T, ttlMs: number): void {
  settingsCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Invalidate settings cache (called after saves). */
export function invalidateSettingsCache(): void {
  settingsCache.delete("publicSettings");
  settingsCache.delete("maintenance");
}

/** Public settings — safe for browser. Falls back to defaults when unconfigured. Cached for 30s. */
export async function getPublicSettings(): Promise<PublicSiteSettings> {
  const cached = getCached<PublicSiteSettings>("publicSettings");
  if (cached) return cached;

  try {
    const db = getAdminDb();
    if (!db) return DEFAULT_PUBLIC_SETTINGS;
    const snap = await db.collection("siteSettings").doc("public").get();
    if (!snap.exists) return DEFAULT_PUBLIC_SETTINGS;
    const data = snap.data() as Record<string, unknown>;
    const merged = mergeDefaults(
      DEFAULT_PUBLIC_SETTINGS as unknown as Record<string, unknown>,
      data
    ) as unknown as PublicSiteSettings;
    const homepage = (data.homepage as Record<string, unknown> | undefined) ?? {};
    // Stored values may still carry a legacy brand identity (e.g. an old
    // siteName seeded from a stale env var) — normalize before display so
    // the current brand is consistent on every surface, immediately.
    const result: PublicSiteSettings = normalizeBrandDeep({
      ...merged,
      siteName: normalizeSiteName(merged.siteName),
      seo: { ...DEFAULT_PUBLIC_SETTINGS.seo, ...(data.seo as object | undefined) },
      social: (data.social as Record<string, string>) ?? {},
      appearance: { ...DEFAULT_PUBLIC_SETTINGS.appearance, ...(data.appearance as object | undefined) },
      homepage: {
        ...DEFAULT_PUBLIC_SETTINGS.homepage,
        ...homepage,
        // The owner spotlight is merged field-by-field so a partial or older
        // document never blanks the section out.
        owner: {
          ...DEFAULT_OWNER_PROFILE,
          ...((homepage.owner as Partial<OwnerProfile> | undefined) ?? {}),
        },
      },
      updatedAt: toISODate(data.updatedAt) ?? new Date(0).toISOString(),
    });
    setCache("publicSettings", result, SETTINGS_CACHE_TTL_MS);
    return result;
  } catch (err) {
    console.error("[settings] getPublicSettings failed:", err);
    return DEFAULT_PUBLIC_SETTINGS;
  }
}

/**
 * Save just the owner spotlight (read-modify-write) — used by the studio,
 * so an admin editing the owner section can never clobber the rest of the
 * site settings.
 */
export async function saveOwnerProfile(owner: OwnerProfile, updatedBy: string): Promise<PublicSiteSettings> {
  const db = getAdminDb();
  if (!db) throw new Error("The data store is not configured");
  const current = await getPublicSettings();
  const payload: Omit<PublicSiteSettings, "updatedAt"> = {
    siteName: current.siteName,
    tagline: current.tagline,
    logoUrl: current.logoUrl,
    faviconUrl: current.faviconUrl,
    contactEmail: current.contactEmail,
    phone: current.phone,
    address: current.address,
    timezone: current.timezone,
    seo: current.seo,
    social: current.social,
    appearance: current.appearance,
    homepage: { ...current.homepage, owner },
  };
  await db
    .collection("siteSettings")
    .doc("public")
    .set(stripUndefined({ ...payload, updatedAt: FieldValue.serverTimestamp(), updatedBy }), { merge: true });
  invalidateSettingsCache();
  return getPublicSettings();
}

export async function savePublicSettings(
  data: Omit<PublicSiteSettings, "updatedAt">,
  updatedBy: string
): Promise<PublicSiteSettings> {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore is not configured");
  // A client that does not manage the owner spotlight (older form, script)
  // must never wipe it: keep the stored profile when it is not submitted.
  const previous = await getPublicSettings();
  const payload = stripUndefined({
    ...data,
    homepage: { ...data.homepage, owner: data.homepage.owner ?? previous.homepage.owner },
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy,
  });
  await db.collection("siteSettings").doc("public").set(payload, { merge: true });
  invalidateSettingsCache();
  return getPublicSettings();
}

/** Maintenance state — cached for 10s; changes propagate in seconds. */
export async function getMaintenanceState(): Promise<MaintenanceState> {
  // Hard override (useful if Firestore is unreachable)
  if ((process.env.MAINTENANCE_MODE ?? "").toLowerCase() === "true") {
    return { ...DEFAULT_MAINTENANCE, enabled: true, message: "Scheduled maintenance is in progress." };
  }

  const cached = getCached<MaintenanceState>("maintenance");
  if (cached) return cached;

  try {
    const db = getAdminDb();
    if (!db) return DEFAULT_MAINTENANCE;
    const snap = await db.collection("siteSettings").doc("maintenance").get();
    if (!snap.exists) return DEFAULT_MAINTENANCE;
    const d = snap.data() as Record<string, unknown>;
    const result: MaintenanceState = {
      enabled: d.enabled === true,
      emergencyLock: d.emergencyLock === true,
      title: typeof d.title === "string" ? d.title : DEFAULT_MAINTENANCE.title,
      message: typeof d.message === "string" ? d.message : DEFAULT_MAINTENANCE.message,
      expectedReturn: typeof d.expectedReturn === "string" ? d.expectedReturn : "",
      imageUrl: typeof d.imageUrl === "string" ? d.imageUrl : undefined,
      updatedAt: toISODate(d.updatedAt) ?? new Date(0).toISOString(),
      updatedBy: typeof d.updatedBy === "string" ? d.updatedBy : undefined,
    };
    setCache("maintenance", result, MAINTENANCE_CACHE_TTL_MS);
    return result;
  } catch (err) {
    console.error("[settings] getMaintenanceState failed:", err);
    return DEFAULT_MAINTENANCE;
  }
}

export async function saveMaintenanceState(
  data: Omit<MaintenanceState, "updatedAt" | "updatedBy">,
  updatedBy: string
): Promise<MaintenanceState> {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore is not configured");
  await db
    .collection("siteSettings")
    .doc("maintenance")
    .set({ ...data, updatedAt: FieldValue.serverTimestamp(), updatedBy }, { merge: true });
  invalidateSettingsCache();
  return getMaintenanceState();
}

export function isSiteOffline(m: MaintenanceState): boolean {
  return m.enabled || m.emergencyLock;
}
