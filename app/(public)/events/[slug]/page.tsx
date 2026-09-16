import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Clock, ArrowLeft, Ticket, User } from "lucide-react";
import { getEventBySlug, getSpeakersByIds, listPublishedEvents } from "@/lib/firestore/content";
import { getPublicSettings } from "@/lib/firestore/settings";
import { formatDate } from "@/lib/utils";

export const revalidate = 120;

export async function generateStaticParams() {
  try {
    const data = await listPublishedEvents({ limit: 50 });
    return data.items.map((e) => ({ slug: e.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const event = await getEventBySlug(params.slug).catch(() => null);
  if (!event) return { title: "Event not found" };
  return {
    title: event.seo?.title || event.title,
    description: event.seo?.description || event.description.slice(0, 300),
    openGraph: {
      title: event.title,
      description: event.description.slice(0, 300),
      type: "article",
      images: event.coverImage || event.seo?.ogImage ? [event.coverImage || event.seo!.ogImage!] : [],
    },
  };
}

export default async function EventDetailPage({ params }: { params: { slug: string } }) {
  const [event, settings] = await Promise.all([
    getEventBySlug(params.slug).catch(() => null),
    getPublicSettings(),
  ]);
  if (!event || event.status !== "published") notFound();
  const speakers = await getSpeakersByIds(event.speakerIds).catch(() => []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.startAt,
    endDate: event.endAt,
    location: event.venue ? { "@type": "Place", name: event.venue, address: event.address } : undefined,
    image: event.coverImage,
    organizer: { "@type": "Organization", name: settings.siteName },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="relative overflow-hidden bg-ink-950 pb-14 pt-32 md:pb-16 md:pt-40">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-brand-600/25 blur-[120px]" />
          <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-ember-500/20 blur-[120px]" />
        </div>
        <div className="container relative">
          <Link href="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> All events
          </Link>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-extrabold text-white md:text-5xl">{event.title}</h1>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-brand-400" />
              {formatDate(event.startAt, { weekday: "long" })}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-400" />
              {new Date(event.startAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              {event.endAt && ` – ${new Date(event.endAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`}
            </span>
            {event.venue && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-400" />{event.venue}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 md:py-16">
        <div className="container grid gap-10 lg:grid-cols-[1fr_340px]">
          <article>
            {event.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.coverImage} alt={event.title} className="aspect-[16/9] w-full rounded-3xl object-cover shadow-card" />
            )}
            <p className="mt-6 whitespace-pre-line text-[16px] leading-relaxed text-ink-600">{event.description}</p>
            {event.contentHtml && (
              <div className="prose-manup mt-6" dangerouslySetInnerHTML={{ __html: event.contentHtml }} />
            )}
            {speakers.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-xl font-bold text-ink-900">Speakers</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {speakers.map((s) => (
                    <Link
                      key={s.id}
                      href={`/speakers/${s.slug}`}
                      className="flex items-center gap-4 rounded-2xl border border-ink-100 p-4 transition-all hover:border-brand-200 hover:shadow-card"
                    >
                      {s.photoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.photoURL} alt={s.name} className="h-14 w-14 rounded-full object-cover" loading="lazy" />
                      ) : (
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient-soft font-display text-xl font-extrabold text-brand-600">
                          {s.name.charAt(0)}
                        </span>
                      )}
                      <div>
                        <p className="font-semibold text-ink-900">{s.name}</p>
                        {(s.title || s.company) && (
                          <p className="text-sm text-ink-500">{[s.title, s.company].filter(Boolean).join(" · ")}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>

          <aside>
            <div className="rounded-3xl border border-ink-100 bg-ink-50/50 p-6 lg:sticky lg:top-24">
              <h2 className="font-display text-lg font-bold text-ink-900">Event details</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-400">Date</dt>
                  <dd className="text-right font-semibold text-ink-900">{formatDate(event.startAt)}</dd>
                </div>
                {event.venue && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-400">Venue</dt>
                    <dd className="text-right font-semibold text-ink-900">{event.venue}</dd>
                  </div>
                )}
                {event.address && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-400">Address</dt>
                    <dd className="text-right font-semibold text-ink-900">{event.address}</dd>
                  </div>
                )}
                {event.price && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-400">Price</dt>
                    <dd className="text-right font-semibold text-ink-900">{event.price}</dd>
                  </div>
                )}
                {speakers.length > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-400">Speakers</dt>
                    <dd className="inline-flex items-center gap-1 text-right font-semibold text-ink-900">
                      <User className="h-4 w-4" />{speakers.length}
                    </dd>
                  </div>
                )}
              </dl>
              {event.registrationUrl ? (
                <a
                  href={event.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient text-[15px] font-semibold text-white shadow-pop transition-all hover:brightness-105"
                >
                  <Ticket className="h-4 w-4" /> Register now
                </a>
              ) : (
                <Link
                  href="/contact"
                  className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink-900 text-[15px] font-semibold text-white transition-all hover:bg-ink-700"
                >
                  Ask about this event
                </Link>
              )}
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
