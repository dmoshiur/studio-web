import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { MaintenanceState, PublicSiteSettings } from "@/types";
import { toISODate } from "@/lib/utils";

export const DEFAULT_PUBLIC_SETTINGS: PublicSiteSettings = {
  siteName: "ManUp",
  tagline: "Change Your Mind To Become Success",
  contactEmail: "hello@example.com",
  phone: "",
  address: "",
  timezone: "UTC",
  seo: {
    metaTitle: "ManUp — Conference & Events",
    metaDescription:
      "ManUp is a modern conference and events platform — speakers, schedules, tickets and stories.",
    keywords: "conference, events, speakers, tickets, ManUp",
    twitterCard: "summary_large_image",
  },
  social: {},
  appearance: {
    primaryColor: "#f9488b",
    secondaryColor: "#ee8425",
    theme: "light",
  },
  homepage: {
    heroBadge: "Annual Tech Conference",
    heroTitle: "Change Your Mind To Become Success",
    heroSubtitle:
      "Join industry leaders, innovators and creators for two days of talks, workshops and networking.",
    heroCtaPrimary: { label: "Get Tickets", href: "/events" },
    heroCtaSecondary: { label: "Meet Speakers", href: "/speakers" },
    eventVenue: "Mardavall Hotel, New York",
    showCountdown: true,
    aboutTitle: "About the Conference",
    aboutBody:
      "ManUp brings together the brightest minds in technology and business. Across multiple tracks you'll find keynotes, panels, hands-on workshops and unforgettable networking.",
    aboutStats: [
      { value: "2K+", label: "Attendees" },
      { value: "40+", label: "Speakers" },
      { value: "25+", label: "Sessions" },
      { value: "2", label: "Days" },
    ],
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
    const result: PublicSiteSettings = {
      ...merged,
      seo: { ...DEFAULT_PUBLIC_SETTINGS.seo, ...(data.seo as object | undefined) },
      social: (data.social as Record<string, string>) ?? {},
      appearance: { ...DEFAULT_PUBLIC_SETTINGS.appearance, ...(data.appearance as object | undefined) },
      homepage: { ...DEFAULT_PUBLIC_SETTINGS.homepage, ...(data.homepage as object | undefined) },
      updatedAt: toISODate(data.updatedAt) ?? new Date(0).toISOString(),
    };
    setCache("publicSettings", result, SETTINGS_CACHE_TTL_MS);
    return result;
  } catch (err) {
    console.error("[settings] getPublicSettings failed:", err);
    return DEFAULT_PUBLIC_SETTINGS;
  }
}

export async function savePublicSettings(
  data: Omit<PublicSiteSettings, "updatedAt">,
  updatedBy: string
): Promise<PublicSiteSettings> {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore is not configured");
  const payload = {
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy,
  };
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
