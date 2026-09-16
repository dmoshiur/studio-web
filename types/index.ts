// =====================================================================
// ManUp Platform — Shared TypeScript types
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

/** Where a signed-in user should land by default. */
export function studioHrefFor(role: Role): string {
  if (role === "superadmin") return "/hackeradmin";
  if (role === "owner") return "/hackeradmin";
  if (role === "admin") return "/admin";
  return "/";
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
  bio: string;
  photoURL?: string;
  socials?: { label: string; url: string }[];
  featured: boolean;
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
