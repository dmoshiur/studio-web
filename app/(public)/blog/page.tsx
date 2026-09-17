import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { listCategories, listPublishedPosts } from "@/lib/firestore/content";
import { PostCard } from "@/components/public/cards";
import { Reveal } from "@/components/public/reveal";
import { EmptyState } from "@/components/ui/feedback";
import { PageHero, Section, SectionHeading } from "@/components/public/ui-kit";
import { cn } from "@/lib/utils";
import { BlogClient } from "./blog-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Journal",
  description: "Essays, interviews and behind-the-scenes notes from the ManUp stage.",
};

export default async function BlogPage({ searchParams }: { searchParams: { category?: string } }) {
  const category = searchParams.category;
  const [data, categories] = await Promise.all([
    listPublishedPosts({ limit: 9, categorySlug: category }).catch(() => ({ items: [], nextCursor: null })),
    listCategories().catch(() => []),
  ]);

  const [lead, ...rest] = data.items;

  return (
    <>
      <PageHero
        script="The Journal"
        eyebrow="Writing"
        title="Notes from the desk"
        description="Essays from our speakers and team on building, pricing, keeping taste and the unglamorous middle years."
        image="/images/gallery-panel.jpg"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Journal" }]}
      />

      <Section className="bg-white">
        {categories.length > 0 && (
          <div className="mb-14 flex flex-wrap items-center gap-3">
            <CategoryPill label="Everything" href="/blog" active={!category} />
            {categories.map((c) => (
              <CategoryPill
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
            tone="light"
            icon={<Newspaper className="h-7 w-7" />}
            title="No stories in this section yet"
            message="New writing is published every few weeks. Subscribe below and you will never miss one."
          />
        ) : (
          <>
            {/* Lead story */}
            {lead && (
              <Reveal className="mb-16">
                <Link
                  href={`/blog/${lead.slug}`}
                  className="group grid gap-10 border border-line bg-white p-7 shadow-card transition-all duration-500 hover:-translate-y-0.5 hover:border-gold-600/40 hover:shadow-lift lg:grid-cols-[1.15fr_1fr] lg:p-9"
                >
                  <div className="relative overflow-hidden">
                    {lead.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={lead.coverImage}
                        alt={lead.title}
                        className="aspect-[16/11] w-full object-cover transition-transform duration-1000 group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="flex aspect-[16/11] w-full items-center justify-center bg-paper-200">
                        <span className="font-serif text-[5rem] text-gold-500/50">{lead.title.charAt(0)}</span>
                      </div>
                    )}
                    <span aria-hidden className="absolute inset-3 border border-white/40" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="eyebrow">Latest essay</p>
                    <h2 className="display-md mt-5 text-ink-900">{lead.title}</h2>
                    <p className="lead mt-5 line-clamp-4">{lead.excerpt}</p>
                    <span className="mt-8 inline-flex items-center gap-3 font-sans text-[10.5px] font-semibold uppercase tracking-[0.22em] text-gold-700">
                      {lead.authorName}
                      <span className="h-px w-8 bg-gold-500/60" />
                      {lead.readingMinutes} min read
                    </span>
                  </div>
                </Link>
              </Reveal>
            )}

            <SectionHeading
              align="left"
              script="More reading"
              eyebrow="The archive"
              title="Recent essays"
            />

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((p, i) => (
                <Reveal key={p.id} delay={(i % 3) * 80}>
                  <PostCard post={p} />
                </Reveal>
              ))}
            </div>

            <BlogClient initialCursor={data.nextCursor} category={category} />
          </>
        )}
      </Section>
    </>
  );
}

function CategoryPill({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "border px-5 py-2.5 font-sans text-[10.5px] font-semibold uppercase tracking-[0.22em] transition-colors",
        active
          ? "border-gold-600/50 bg-gold-500/[0.08] text-gold-700"
          : "border-line bg-white text-ink-500 hover:border-gold-600/40 hover:text-gold-700"
      )}
    >
      {label}
    </Link>
  );
}
