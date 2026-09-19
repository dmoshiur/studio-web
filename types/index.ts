// =====================================================================
// Photography Platform — Shared TypeScript types
// =====================================================================

export type Role = "user" | "admin" | "owner" | "superadmin";

/** Roles that may enter the admin studio. */
export function isAdminRole(role: Role): boolean {
  return role === "admin" || role === "owner" || role === "superadmin";
}

/** Roles that may enter the owner console (/hackeradmin). */
export function isOwnerRole(role: Role): boolean {
  return role === "owner" || role === "superadmin";
}

export type PublishStatus = "draft" | "published" | "archived";

export interface SessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  role: Role;
}

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: Role;
  disabled?: boolean;
  createdAt: string; // ISO
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string; // sanitized HTML
  coverImage?: string;
  categoryId?: string;
  categorySlug?: string;
  tags: string[];
  authorName: string;
  authorId?: string;
  status: PublishStatus;
  featured: boolean;
  readingMinutes: number;
  seo?: SeoMeta;
  publishedAt: string | null;
  scheduledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  contentHtml?: string;
  startAt: string; // ISO
  endAt?: string;
  timezone?: string;
  venue?: string;
  address?: string;
  coverImage?: string;
  speakerIds: string[];
  registrationUrl?: string;
  price?: string;
  status: PublishStatus;
  featured: boolean;
  seo?: SeoMeta;
  createdAt: string;
  updatedAt: string;
}

export interface Speaker {
  id: string;
  name: string;
  slug: string;
  title?: string; // job title
  company?: string;
  /** The talk / topic the speaker presents (shown on cards & the schedule). */
  topic?: string;
  bio: string;
  photoURL?: string;
  socials?: { label: string; url: string }[];
  featured: boolean;
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
}

/** A single session inside a schedule day. */
export interface ScheduleSession {
  id: string;
  title: string;
  description?: string;
  /** 24h "HH:MM" local-time strings. */
  startTime: string;
  endTime?: string;
  venue?: string;
  /** Free-form track label: Keynote, Workshop, Panel, Reviews, Evening… */
  track?: string;
  speakerIds: string[];
}

/** A day tab in the schedule (Day 1, Day 2, …). */
export interface ScheduleDay {
  id: string;
  day: number;
  label: string;
  dateISO?: string;
  note?: string;
  sessions: ScheduleSession[];
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PageDoc {
  id: string;
  slug: string;
  title: string;
  contentHtml: string;
  status: PublishStatus;
  seo?: SeoMeta;
  updatedAt: string;
}

export interface SeoMeta {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
}

export type StorageProvider = "cloudinary" | "firebase" | "local";

export interface MediaItem {
  id: string;
  fileName: string;
  originalName: string;
  storagePath: string;
  downloadUrl: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  folder: string;
  visibility: "public" | "private";
  alt?: string;
  uploadedBy: string;
  createdAt: string;
  /** Which backend holds the bytes. */
  provider?: StorageProvider;
  /** Cloudinary public id (needed for transforms / deletes). */
  publicId?: string;
  resourceType?: "image" | "video" | "raw";
  /** Small square preview for grids and pickers. */
  thumbnailUrl?: string;
  /** Poster frame for videos. */
  posterUrl?: string;
  format?: string;
  durationSeconds?: number;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export type ReservationStatus = "requested" | "confirmed" | "cancelled";

export interface Reservation {
  id: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventStartAt: string;
  userId: string;
  name: string;
  email: string;
  seats: number;
  note?: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Subscriber {
  id: string;
  email: string;
  status: "active" | "unsubscribed";
  source?: string;
  unsubscribeToken: string;
  createdAt: string;
}

export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface NavigationDoc {
  id: string; // "header" | "footer"
  links: NavLink[];
  updatedAt: string;
}

export interface SocialLink {
  id: string;
  label: string;
  href: string;
  icon: string; // lucide icon key
  updatedAt: string;
}

/**
 * The owner spotlight — a portrait, a name and a personal message.
 * Fully editable from the studio (`/admin/owner`) and the owner console.
 */
export interface OwnerProfile {
  /** Master switch for the whole section. */
  enabled: boolean;
  showOnHome: boolean;
  showOnAbout: boolean;
  /** Calligraphic accent + eyebrow, e.g. "A word from" / "From The Owner". */
  script?: string;
  eyebrow?: string;
  /** Section heading. */
  title: string;
  name: string;
  role?: string;
  photoUrl?: string;
  photoAlt?: string;
  /** Multi-paragraph bio (blank line between paragraphs). */
  bio: string;
  quote?: string;
  /** Handwritten signature image. */
  signatureUrl?: string;
  /** Optional video message (Cloudinary video upload). */
  videoUrl?: string;
  email?: string;
  phone?: string;
  ctaLabel?: string;
  ctaHref?: string;
  socials?: { label: string; url: string }[];
}

export interface PublicSiteSettings {
  siteName: string;
  tagline: string;
  logoUrl?: string;
  faviconUrl?: string;
  contactEmail: string;
  phone?: string;
  address?: string;
  timezone: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string;
    ogImage?: string;
    twitterCard: "summary" | "summary_large_image";
  };
  social: Record<string, string>; // network -> url
  appearance: {
    primaryColor: string;
    secondaryColor: string;
    theme: "light" | "dark" | "system";
  };
  homepage: {
    heroBadge?: string;
    heroTitle: string;
    heroSubtitle: string;
    heroCtaPrimary: { label: string; href: string };
    heroCtaSecondary?: { label: string; href: string };
    heroImage?: string;
    eventDateISO?: string;
    eventVenue?: string;
    showCountdown: boolean;
    aboutTitle: string;
    aboutBody: string;
    aboutImage?: string;
    aboutStats: { value: string; label: string }[];
    /** Owner spotlight — portrait, name and personal message. */
    owner?: OwnerProfile;
    /** Optional editorial blocks rendered on the home page. */
    stats?: { value: string; label: string }[];
    experience?: {
      eyebrow?: string;
      title?: string;
      body?: string;
      items?: { title: string; description: string; image?: string }[];
    };
    venue?: { title?: string; address?: string; note?: string; image?: string };
    faqs?: { q: string; a: string }[];
    gallery?: { image: string; caption?: string }[];
    tickets?: { name: string; price: string; note?: string; perks: string[]; featured?: boolean }[];
    testimonials?: { quote: string; name: string; role?: string }[];
    announcement?: string;
  };
  updatedAt: string;
  updatedBy?: string;
}

export interface MaintenanceState {
  enabled: boolean;
  emergencyLock: boolean;
  title: string;
  message: string;
  expectedReturn?: string;
  imageUrl?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail?: string;
  actorRole?: Role;
  action: string;
  resource?: string;
  result: "success" | "failure" | "denied";
  metadata?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export interface HealthStatus {
  status: "operational" | "degraded" | "down";
  checks: Record<
    string,
    { status: "operational" | "configured" | "unavailable" | "error"; latencyMs?: number; message?: string }
  >;
  version: string;
  environment: string;
  commit?: string;
  /** Persistence driver in use: firebase | local (embedded SQLite). */
  backend?: "firebase" | "local";
  masterAdminConfigured?: boolean;
  checkedAt: string;
}
