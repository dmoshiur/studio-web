import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Clock } from "lucide-react";
import { getPostBySlug, listPublishedPosts } from "@/lib/firestore/content";
import { getPublicSettings } from "@/lib/firestore/settings";
import { formatDate } from "@/lib/utils";
import { Badge, Diamond } from "@/components/ui/badge";
import { PostCard } from "@/components/public/cards";
import { Reveal } from "@/components/public/reveal";
import { Backdrop, Section, SectionHeading, TextLink } from "@/components/public/ui-kit";

export const dynamic = "force-dynamic";

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

  const more = (await listPublishedPosts({ limit: 4 }).catch(() => ({ items: [], nextCursor: null }))).items.filter(
    (p) => p.id !== post.id
  ).slice(0, 3);

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

      <article>
        {/* Editorial header */}
        <header className="relative isolate overflow-hidden pb-20 pt-40 sm:pt-48">
          <Backdrop src={post.coverImage ?? "/images/texture-marble.jpg"} overlay="obsidian" priority alt={post.title} />
          <div className="container relative">
            <nav aria-label="Breadcrumb" className="mb-9 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-ivory-500">
              <Link href="/" className="transition-colors hover:text-gold-300">
                Home
              </Link>
              <Diamond className="opacity-50" />
              <Link href="/blog" className="transition-colors hover:text-gold-300">
                Journal
              </Link>
              <Diamond className="opacity-50" />
              <span className="text-gold-300">{post.categorySlug ?? "Essay"}</span>
            </nav>

            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-4 text-[11px] uppercase tracking-[0.22em] text-ivory-400/80">
                <span className="text-gold-300">{post.authorName}</span>
                <Diamond className="h-1 w-1" />
                <span>{formatDate(post.publishedAt)}</span>
                <Diamond className="h-1 w-1" />
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  {post.readingMinutes} min read
                </span>
              </div>

              <h1 className="display-xl mt-7 text-ivory-50 text-shadow-luxe">{post.title}</h1>
              <p className="lead mt-7 max-w-2xl">{post.excerpt}</p>
            </div>
          </div>
        </header>

        {/* Body */}
        <Section className="bg-obsidian-950 !py-16">
          <div className="mx-auto max-w-3xl">
            {post.coverImage && (
              <div className="relative mb-12 overflow-hidden border border-white/[0.08]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.coverImage} alt={post.title} className="aspect-[16/9] w-full object-cover" />
              </div>
            )}

            {post.tags.length > 0 && (
              <div className="mb-10 flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <Badge key={t} variant="outline">
                    #{t}
                  </Badge>
                ))}
              </div>
            )}

            <div className="prose-manup" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

            <div className="mt-16 flex flex-wrap items-center justify-between gap-6 border-t border-white/[0.08] pt-8">
              <p className="font-serif text-[1.15rem] italic text-ivory-300">
                Written by <span className="text-gold-200">{post.authorName}</span>
              </p>
              <TextLink href="/blog" className="group">
                All writing
              </TextLink>
            </div>

            {/* Invitation */}
            <div className="mt-14 border border-gold-500/25 bg-white/[0.03] p-9 text-center">
              <p className="calligraphic gold-text text-[2rem] leading-none">the invitation list</p>
              <p className="mt-4 font-serif text-[1.35rem] text-ivory-50">Get the next essay in your inbox</p>
              <p className="mt-3 text-[13.5px] leading-relaxed text-ivory-400/80">
                One long-form letter each month, plus early access to summit passes.
              </p>
              <Link
                href="/contact"
                className="mt-7 inline-flex h-[50px] items-center gap-3 bg-gold-gradient px-7 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-obsidian-950 transition-all hover:brightness-[1.06]"
              >
                Join the list
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Section>
      </article>

      {more.length > 0 && (
        <Section className="bg-obsidian-soft">
          <SectionHeading script="Keep reading" eyebrow="Related" title="More from the journal" />
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {more.map((p, i) => (
              <Reveal key={p.id} delay={i * 80}>
                <PostCard post={p} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
