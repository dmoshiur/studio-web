import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, ArrowUpRight } from "lucide-react";
import { getSpeakerBySlug, listPublishedSpeakers } from "@/lib/firestore/content";
import { SpeakerCard } from "@/components/public/cards";
import { Reveal } from "@/components/public/reveal";
import { Diamond } from "@/components/ui/badge";
import { Backdrop, GoldRule, Script, Section, SectionHeading } from "@/components/public/ui-kit";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const speaker = await getSpeakerBySlug(params.slug).catch(() => null);
  if (!speaker) return { title: "Speaker not found" };
  return {
    title: speaker.name,
    description: speaker.bio.slice(0, 300),
    openGraph: {
      title: speaker.name,
      description: speaker.bio.slice(0, 300),
      images: speaker.photoURL ? [speaker.photoURL] : [],
    },
  };
}

export default async function SpeakerDetailPage({ params }: { params: { slug: string } }) {
  const speaker = await getSpeakerBySlug(params.slug).catch(() => null);
  if (!speaker || speaker.status !== "published") notFound();

  const others = (await listPublishedSpeakers({ limit: 5 }).catch(() => []))
    .filter((s) => s.id !== speaker.id)
    .slice(0, 4);

  return (
    <>
      {/* Portrait hero */}
      <section className="relative isolate overflow-hidden pb-20 pt-40 sm:pt-48">
        <Backdrop src="/images/texture-marble.jpg" overlay="paper" priority />
        <div className="container relative">
          <nav aria-label="Breadcrumb" className="mb-10 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-ink-400">
            <Link href="/" className="transition-colors hover:text-gold-700">
              Home
            </Link>
            <Diamond className="opacity-50" />
            <Link href="/speakers" className="transition-colors hover:text-gold-700">
              Speakers
            </Link>
            <Diamond className="opacity-50" />
            <span className="text-gold-700">{speaker.name}</span>
          </nav>

          <div className="grid items-end gap-12 lg:grid-cols-[380px_1fr] lg:gap-16">
            <div className="relative">
              <div className="relative overflow-hidden border border-line">
                {speaker.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={speaker.photoURL} alt={speaker.name} className="aspect-[3/4] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[3/4] w-full items-center justify-center bg-paper-200">
                    <span className="font-serif text-[6rem] text-gold-500/60">{speaker.name.charAt(0)}</span>
                  </div>
                )}
                <span aria-hidden className="absolute inset-4 border border-line-strong" />
              </div>
            </div>

            <div>
              <Script className="text-[2.2rem] leading-none">on stage</Script>
              <h1 className="display-xl mt-5 text-ink-900 text-shadow-luxe">{speaker.name}</h1>
              {(speaker.title || speaker.company) && (
                <p className="mt-5 font-sans text-[11.5px] uppercase tracking-[0.24em] text-gold-700">
                  {[speaker.title, speaker.company].filter(Boolean).join(" · ")}
                </p>
              )}
              <GoldRule className="mt-8 !mx-0 !max-w-[160px]" />
              <div className="mt-8 max-w-2xl space-y-5">
                {(speaker.bio ?? "").split("\n\n").map((para, i) => (
                  <p key={i} className="lead">
                    {para}
                  </p>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-5">
                <Link
                  href="/events"
                  className="btn-editorial group"
                >
                  See the schedule
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                {speaker.socials?.map((s) => (
                  <a
                    key={s.url + s.label}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-line-strong px-5 py-3 font-sans text-[10.5px] font-semibold uppercase tracking-[0.2em] text-ink-700 transition-colors hover:border-gold-600/50 hover:text-gold-700"
                  >
                    {s.label}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* More speakers */}
      {others.length > 0 && (
        <Section className="bg-white">
          <SectionHeading
            script="Also on stage"
            eyebrow="The roster"
            title="Others sharing the stage"
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((s, i) => (
              <Reveal key={s.id} delay={i * 80}>
                <SpeakerCard speaker={s} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
