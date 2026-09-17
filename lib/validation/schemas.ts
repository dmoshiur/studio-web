import { z } from "zod";

// =====================================================================
// Centralized Zod validation schemas — used on BOTH client and server.
// Never trust browser validation: every API route re-validates.
// =====================================================================

export const slugSchema = z
  .string()
  .min(2)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers and hyphens");

const httpUrl = z.string().url().max(2048).refine(
  (v) => v.startsWith("http://") || v.startsWith("https://"),
  "URL must be http(s)"
);

export const seoSchema = z.object({
  title: z.string().max(120).optional(),
  description: z.string().max(300).optional(),
  keywords: z.string().max(300).optional(),
  ogImage: z.string().max(2048).optional(),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
  cursor: z.string().max(256).optional(),
});

// ---------------- Auth ----------------
export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

export const registerSchema = z.object({
  displayName: z.string().min(2).max(80),
  email: z.string().email().max(254),
  password: z.string().min(8).max(128).regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Password needs letters and numbers"),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email().max(254),
});

// ---------------- Content ----------------
export const categorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: slugSchema.optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal("")),
});

export const postSchema = z.object({
  title: z.string().min(3).max(180),
  slug: slugSchema.optional(),
  excerpt: z.string().max(400).optional(),
  contentHtml: z.string().min(10).max(200_000),
  coverImage: z.string().max(2048).optional().or(z.literal("")),
  categoryId: z.string().max(128).optional().or(z.literal("")),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
  authorName: z.string().min(2).max(100),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  featured: z.boolean().default(false),
  scheduledAt: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  seo: seoSchema.optional(),
});

export const eventSchema = z.object({
  title: z.string().min(3).max(180),
  slug: slugSchema.optional(),
  description: z.string().min(10).max(2000),
  contentHtml: z.string().max(200_000).optional().or(z.literal("")),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  timezone: z.string().max(64).optional().or(z.literal("")),
  venue: z.string().max(200).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  coverImage: z.string().max(2048).optional().or(z.literal("")),
  speakerIds: z.array(z.string().max(128)).max(50).default([]),
  registrationUrl: z.string().max(2048).optional().or(z.literal("")),
  price: z.string().max(60).optional().or(z.literal("")),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  featured: z.boolean().default(false),
  seo: seoSchema.optional(),
});

export const speakerSchema = z.object({
  name: z.string().min(2).max(120),
  slug: slugSchema.optional(),
  title: z.string().max(120).optional().or(z.literal("")),
  company: z.string().max(120).optional().or(z.literal("")),
  bio: z.string().min(10).max(5000),
  photoURL: z.string().max(2048).optional().or(z.literal("")),
  socials: z
    .array(z.object({ label: z.string().min(1).max(40), url: httpUrl }))
    .max(10)
    .default([]),
  featured: z.boolean().default(false),
  status: z.enum(["draft", "published", "archived"]).default("published"),
});

export const pageSchema = z.object({
  slug: slugSchema,
  title: z.string().min(2).max(180),
  contentHtml: z.string().min(2).max(200_000),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  seo: seoSchema.optional(),
});

// ---------------- Forms ----------------
export const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(254),
  phone: z.string().max(30).optional().or(z.literal("")),
  subject: z.string().min(3).max(180),
  message: z.string().min(10).max(5000),
  website: z.string().max(0).optional(), // honeypot — must stay empty
});

export const newsletterSchema = z.object({
  email: z.string().email().max(254),
  source: z.string().max(60).optional(),
  website: z.string().max(0).optional(), // honeypot
});

// ---------------- Navigation / social ----------------
export const navigationSchema = z.object({
  id: z.enum(["header", "footer"]),
  links: z
    .array(
      z.object({
        label: z.string().min(1).max(60),
        href: z.string().min(1).max(2048),
        external: z.boolean().optional(),
      })
    )
    .max(20),
});

export const socialLinkSchema = z.object({
  label: z.string().min(1).max(40),
  href: httpUrl,
  icon: z.string().min(1).max(40),
});

// ---------------- Settings (owner) ----------------
/**
 * Owner spotlight (portrait + name + texts) — editable from the studio and
 * the owner console, rendered on the homepage and the about page.
 */
export const ownerProfileSchema = z.object({
  enabled: z.boolean().default(true),
  showOnHome: z.boolean().default(true),
  showOnAbout: z.boolean().default(true),
  script: z.string().max(120).optional().or(z.literal("")),
  eyebrow: z.string().max(120).optional().or(z.literal("")),
  title: z.string().min(2, "Add a section heading").max(200).default("The person behind the stage"),
  name: z.string().min(1, "Add the owner's name").max(120),
  role: z.string().max(160).optional().or(z.literal("")),
  photoUrl: z.string().max(2048).optional().or(z.literal("")),
  photoAlt: z.string().max(200).optional().or(z.literal("")),
  bio: z.string().max(6000).default(""),
  quote: z.string().max(600).optional().or(z.literal("")),
  signatureUrl: z.string().max(2048).optional().or(z.literal("")),
  videoUrl: z.string().max(2048).optional().or(z.literal("")),
  email: z.string().max(254).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  ctaLabel: z.string().max(40).optional().or(z.literal("")),
  ctaHref: z.string().max(2048).optional().or(z.literal("")),
  socials: z
    .array(z.object({ label: z.string().min(1).max(40), url: z.string().min(1).max(2048) }))
    .max(6)
    .default([]),
});

export const ownerProfileBodySchema = z.object({ owner: ownerProfileSchema });

/** Direct-to-Cloudinary upload: request a signature for one file. */
export const mediaSignSchema = z.object({
  folder: z.string().min(1).max(120),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(3).max(120),
});

/** Record a browser-direct Cloudinary upload in the media library. */
export const mediaRecordSchema = z.object({
  publicId: z.string().min(3).max(512),
  resourceType: z.enum(["image", "video", "raw"]),
  folder: z.string().min(1).max(120),
  originalName: z.string().max(200).default("upload"),
  mimeType: z.string().max(120).optional().or(z.literal("")),
  alt: z.string().max(200).optional().or(z.literal("")),
});

export const publicSettingsSchema = z.object({
  siteName: z.string().min(2).max(80),
  tagline: z.string().max(160),
  logoUrl: z.string().max(2048).optional().or(z.literal("")),
  faviconUrl: z.string().max(2048).optional().or(z.literal("")),
  contactEmail: z.string().email().max(254),
  phone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  timezone: z.string().max(64).default("UTC"),
  seo: z.object({
    metaTitle: z.string().max(120),
    metaDescription: z.string().max(300),
    keywords: z.string().max(300).optional().or(z.literal("")),
    ogImage: z.string().max(2048).optional().or(z.literal("")),
    twitterCard: z.enum(["summary", "summary_large_image"]).default("summary_large_image"),
  }),
  social: z.record(z.string().max(2048)).default({}),
  appearance: z.object({
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#b99352"),
    secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ddc99e"),
    theme: z.enum(["light", "dark", "system"]).default("light"),
  }),
  homepage: z.object({
    heroBadge: z.string().max(160).optional().or(z.literal("")),
    heroTitle: z.string().min(2).max(160),
    heroSubtitle: z.string().max(400),
    heroCtaPrimary: z.object({ label: z.string().max(40), href: z.string().max(2048) }),
    heroCtaSecondary: z.object({ label: z.string().max(40), href: z.string().max(2048) }).optional(),
    heroImage: z.string().max(2048).optional().or(z.literal("")),
    eventDateISO: z.string().max(64).optional().or(z.literal("")),
    eventVenue: z.string().max(200).optional().or(z.literal("")),
    showCountdown: z.boolean().default(true),
    aboutTitle: z.string().max(160),
    aboutBody: z.string().max(5000),
    aboutImage: z.string().max(2048).optional().or(z.literal("")),
    aboutStats: z.array(z.object({ value: z.string().max(20), label: z.string().max(60) })).max(6).default([]),
    owner: ownerProfileSchema.optional(),
  }),
});

export const maintenanceSchema = z.object({
  enabled: z.boolean(),
  emergencyLock: z.boolean().optional(),
  title: z.string().min(2).max(120),
  message: z.string().min(2).max(1000),
  expectedReturn: z.string().max(200).optional().or(z.literal("")),
  imageUrl: z.string().max(2048).optional().or(z.literal("")),
});

export const smtpSchema = z.object({
  host: z.string().min(2).max(255),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean().default(false),
  user: z.string().min(1).max(255),
  // Password is write-only: accepted on save, NEVER returned to the client.
  password: z.string().min(1).max(500),
  fromEmail: z.string().email().max(254),
  fromName: z.string().max(120),
  replyTo: z.string().email().max(254).optional().or(z.literal("")),
});

export const smtpTestSchema = z.object({
  to: z.string().email().max(254),
});

export const ownerBootstrapSchema = z.object({
  token: z.string().min(8).max(256),
});

export const setRoleSchema = z.object({
  uid: z.string().min(4).max(128),
  role: z.enum(["user", "admin", "owner", "superadmin"]),
});

export const mediaUpdateSchema = z.object({
  alt: z.string().max(200).optional(),
  folder: z.string().max(80).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  fileName: z.string().min(1).max(160).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type PostInput = z.infer<typeof postSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type SpeakerInput = z.infer<typeof speakerSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
