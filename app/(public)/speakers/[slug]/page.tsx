import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getSpeakerBySlug, listPublishedSpeakers } from "@/lib/firestore/content";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const speakers = await listPublishedSpeakers({ limit: 60 });
    return speakers.map((s) => ({ slug: s.slug }));
  } catch {
    return [];
  }
}

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

  return (
    <>
      <section className="relative overflow-hidden bg-ink-950 pb-14 pt-32 md:pt-40">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute -right-32 top-0 h-80 w-80 rounded-full bg-brand-600/25 blur-[120px]" />
        </div>
        <div className="container relative">
          <Link href="/speakers" className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> All speakers
          </Link>
        </div>
      </section>
      <section className="bg-white pb-16 md:pb-24">
        <div className="container">
          <div className="-mt-2 grid gap-10 md:grid-cols-[300px_1fr]">
            <div>
              <div className="overflow-hidden rounded-3xl shadow-card">
                {speaker.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={speaker.photoURL} alt={speaker.name} className="aspect-[3/4] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[3/4] w-full items-center justify-center bg-brand-gradient-soft">
                    <span className="font-display text-8xl font-extrabold text-brand-200">
                      {speaker.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              {speaker.socials && speaker.socials.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {speaker.socials.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 px-3.5 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-600"
                    >
                      {s.label} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="pt-2">
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-brand-600">Speaker</p>
              <h1 className="mt-2 font-display text-4xl font-extrabold text-ink-900 md:text-5xl">{speaker.name}</h1>
              {(speaker.title || speaker.company) && (
                <p className="mt-3 text-lg text-ink-500">{[speaker.title, speaker.company].filter(Boolean).join(" · ")}</p>
              )}
              <p className="mt-6 whitespace-pre-line leading-relaxed text-ink-600">{speaker.bio}</p>
              <Link
                href="/events"
                className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-brand-gradient px-7 text-[15px] font-semibold text-white shadow-pop transition-all hover:brightness-105"
              >
                See the schedule
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
