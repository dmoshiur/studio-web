import type { MetadataRoute } from "next";
import { listPublishedEvents, listPublishedPosts, listPublishedSpeakers } from "@/lib/firestore/content";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/events`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/schedule`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/speakers`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/blog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const [events, posts, speakers] = await Promise.all([
      listPublishedEvents({ limit: 50 }),
      listPublishedPosts({ limit: 50 }),
      listPublishedSpeakers({ limit: 50 }),
    ]);
    return [
      ...staticPages,
      ...events.items.map((e) => ({
        url: `${base}/events/${e.slug}`,
        lastModified: new Date(e.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...posts.items.map((p) => ({
        url: `${base}/blog/${p.slug}`,
        lastModified: new Date(p.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...speakers.map((s) => ({
        url: `${base}/speakers/${s.slug}`,
        lastModified: new Date(s.updatedAt),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticPages;
  }
}
