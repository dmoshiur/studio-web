import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { listCategories, listPublishedPosts } from "@/lib/firestore/content";
import { PageHero, PostCard } from "@/components/public/cards";
import { Reveal } from "@/components/public/reveal";
import { BlogClient } from "./blog-client";
import { EmptyState } from "@/components/ui/feedback";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Blog",
  description: "Recaps, speaker interviews and behind-the-scenes stories from the ManUp stage.",
};

export default async function BlogPage({ searchParams }: { searchParams: { category?: string } }) {
  const category = searchParams.category;
  const [data, categories] = await Promise.all([
    listPublishedPosts({ limit: 9, categorySlug: category }).catch(() => ({ items: [], nextCursor: null })),
    listCategories().catch(() => []),
  ]);

  return (
    <>
      <PageHero
        eyebrow="Stories"
        title="Blog"
        description="Recaps, interviews and notes from the community."
      />
      <section className="bg-white py-14 md:py-20">
        <div className="container">
          {categories.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              <BlogCategoryLink label="All" href="/blog" active={!category} />
              {categories.map((c) => (
                <BlogCategoryLink
                  key={c.id}
                  label={c.name}
                  href={`/blog?category=${c.slug}`}
                  active={category === c.slug}
                />
              ))}
            </div>
          )}
          {data.items.length === 0 ? (
            <EmptyState
              icon={<Newspaper className="h-7 w-7" />}
              title="No stories yet"
              message="We're writing the first chapters. Check back soon."
            />
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {data.items.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 3) * 70}>
                    <PostCard post={p} />
                  </Reveal>
                ))}
              </div>
              <BlogClient initialCursor={data.nextCursor} category={category} />
            </>
          )}
        </div>
      </section>
    </>
  );
}

function BlogCategoryLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <a
      href={href}
      aria-current={active ? "true" : undefined}
      className={
        active
          ? "rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-white"
          : "rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-600"
      }
    >
      {label}
    </a>
  );
}
