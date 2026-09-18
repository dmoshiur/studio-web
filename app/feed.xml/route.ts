import { listPublishedPosts } from "@/lib/firestore/content";
import { getPublicSettings } from "@/lib/firestore/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RSS 2.0 feed for the journal — subscribers keep up without visiting the site. */
export async function GET() {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  let items: { title: string; link: string; description: string; date: string; author: string }[] = [];
  let siteName = "Photography";
  let description = "Essays, events and speakers.";

  try {
    const [settings, posts] = await Promise.all([
      getPublicSettings(),
      listPublishedPosts({ limit: 30 }),
    ]);
    siteName = settings.siteName;
    description = settings.tagline || settings.seo.metaDescription || description;

    items = posts.items.map((post) => ({
      title: post.title,
      link: `${base}/blog/${post.slug}`,
      description: post.excerpt,
      date: new Date(post.publishedAt ?? post.updatedAt).toUTCString(),
      author: post.authorName,
    }));
  } catch {
    /* keep the feed valid even if the store is unreachable */
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)} — Journal</title>
    <link>${base}/blog</link>
    <description>${escapeXml(description)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml" />
${items
  .map(
    (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${item.link}</link>
      <guid isPermaLink="true">${item.link}</guid>
      <pubDate>${item.date}</pubDate>
      <author>${escapeXml(item.author)}</author>
      <description>${escapeXml(item.description)}</description>
    </item>`
  )
  .join("\n")}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600",
    },
  });
}
