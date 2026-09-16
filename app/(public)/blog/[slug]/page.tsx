import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, User } from "lucide-react";
import { getPostBySlug, listPublishedPosts } from "@/lib/firestore/content";
import { getPublicSettings } from "@/lib/firestore/settings";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const revalidate = 120;

export async function generateStaticParams() {
  try {
    const data = await listPublishedPosts({ limit: 50 });
    return data.items.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPostBySlug(params.slug).catch(() => null);
  if (!post) return { title: "Post not found" };
  return {
    title: post.seo?.title || post.title,
    description: post.seo?.description || post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      authors: [post.authorName],
      images: post.coverImage || post.seo?.ogImage ? [post.coverImage || post.seo!.ogImage!] : [],
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const [post, settings] = await Promise.all([
    getPostBySlug(params.slug).catch(() => null),
    getPublicSettings(),
  ]);
  if (!post || post.status !== "published") notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage,
    datePublished: post.publishedAt,
    author: { "@type": "Person", name: post.authorName },
    publisher: { "@type": "Organization", name: settings.siteName },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="bg-white pb-16 md:pb-24">
        <div className="bg-ink-950 pb-12 pt-32 md:pt-40">
          <div className="container max-w-3xl">
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> All stories
            </Link>
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-white md:text-[2.75rem]">
              {post.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/65">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-4 w-4" /> {post.authorName}
              </span>
              <span>{formatDate(post.publishedAt)}</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {post.readingMinutes} min read
              </span>
            </div>
          </div>
        </div>

        <div className="container max-w-3xl">
          {post.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.coverImage}
              alt={post.title}
              className="-mt-2 aspect-[16/9] w-full rounded-3xl object-cover shadow-card"
            />
          )}
          {post.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <Badge key={t} variant="default">#{t}</Badge>
              ))}
            </div>
          )}
          <div className="prose-manup mt-6 text-[16px]" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
          <div className="mt-10 rounded-3xl bg-brand-gradient-soft p-6 text-center">
            <p className="font-display text-lg font-bold text-ink-900">Enjoyed this story?</p>
            <p className="mt-1 text-sm text-ink-500">Get the next one in your inbox.</p>
            <Link
              href="/contact"
              className="mt-4 inline-flex h-11 items-center rounded-xl bg-ink-900 px-6 text-sm font-semibold text-white hover:bg-ink-700"
            >
              Get in touch
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
