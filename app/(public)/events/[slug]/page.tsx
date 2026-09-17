import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CalendarDays, MapPin, Clock, Users } from "lucide-react";
import { getEventBySlug, getSpeakersByIds, listPublishedEvents } from "@/lib/firestore/content";
import { getPublicSettings } from "@/lib/firestore/settings";
import { formatDate } from "@/lib/utils";
import { Countdown } from "@/components/public/countdown";
import { Badge, Diamond } from "@/components/ui/badge";
import { Backdrop, GoldRule, Script } from "@/components/public/ui-kit";
import { ReserveForm } from "@/components/public/reserve-form";

export const dynamic = "force-dynamic";

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

  const details: { label: string; value: string }[] = [
    { label: "Date", value: formatDate(event.startAt, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) },
    {
      label: "Time",
      value: `${new Date(event.startAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}${
        event.endAt ? ` – ${new Date(event.endAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : ""
      }`,
    },
    ...(event.venue ? [{ label: "Venue", value: event.venue }] : []),
    ...(event.address ? [{ label: "Address", value: event.address }] : []),
    ...(event.timezone ? [{ label: "Time zone", value: event.timezone }] : []),
    ...(event.price ? [{ label: "Passes from", value: event.price }] : []),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden pb-20 pt-40 sm:pb-24 sm:pt-48">
        <Backdrop src={event.coverImage ?? "/images/hero-stage.jpg"} overlay="obsidian" priority alt={event.title} />
        <div className="container relative">
          <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-ivory-500">
            <Link href="/" className="transition-colors hover:text-gold-300">
              Home
            </Link>
            <Diamond className="opacity-50" />
            <Link href="/events" className="transition-colors hover:text-gold-300">
              Events
            </Link>
            <Diamond className="opacity-50" />
            <span className="text-gold-300">{event.title}</span>
          </nav>

          <div className="grid gap-12 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              {event.featured && (
                <span className="mb-6 inline-block">
                  <Badge variant="solidGold">Flagship event</Badge>
                </span>
              )}
              <h1 className="display-xl max-w-3xl text-ivory-50 text-shadow-luxe">{event.title}</h1>
              <GoldRule className="mt-9 !mx-0 !max-w-[170px]" />
              <p className="lead mt-7 max-w-2xl">{event.description}</p>

              <div className="mt-9 flex flex-wrap gap-x-9 gap-y-3 text-[12.5px] text-ivory-300/80">
                <span className="flex items-center gap-2.5">
                  <CalendarDays className="h-4 w-4 text-gold-500" />
                  {formatDate(event.startAt, { weekday: "long", month: "long", day: "numeric" })}
                </span>
                <span className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-gold-500" />
                  {new Date(event.startAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </span>
                {event.venue && (
                  <span className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 text-gold-500" />
                    {event.venue}
                  </span>
                )}
              </div>
            </div>

            {new Date(event.startAt).getTime() > Date.now() && (
              <div className="border border-gold-500/20 bg-white/[0.03] p-7 backdrop-blur-sm">
                <p className="eyebrow mb-5">Doors open in</p>
                <Countdown targetISO={event.startAt} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Body + booking rail */}
      <section className="relative bg-obsidian-950 py-20 sm:py-24">
        <div className="container grid gap-14 lg:grid-cols-[1fr_380px] lg:gap-16">
          <article>
            {event.coverImage && (
              <div className="relative overflow-hidden rounded-sm border border-white/[0.08]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={event.coverImage} alt={event.title} className="aspect-[16/9] w-full object-cover" />
                <span aria-hidden className="absolute inset-4 border border-white/20" />
              </div>
            )}

            <div className="mt-10">
              <p className="font-serif text-[1.35rem] italic leading-relaxed text-ivory-200">{event.description}</p>
            </div>

            {event.contentHtml && (
              <div className="prose-manup mt-10" dangerouslySetInnerHTML={{ __html: event.contentHtml }} />
            )}

            {speakers.length > 0 && (
              <div className="mt-16">
                <div className="flex items-center gap-5">
                  <h2 className="font-serif text-[1.6rem] text-ivory-50">On this stage</h2>
                  <span className="h-px flex-1 bg-gradient-to-r from-gold-500/40 to-transparent" />
                </div>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {speakers.map((s) => (
                    <Link
                      key={s.id}
                      href={`/speakers/${s.slug}`}
                      className="group flex items-center gap-5 border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-gold-500/40"
                    >
                      {s.photoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.photoURL}
                          alt={s.name}
                          loading="lazy"
                          className="h-16 w-16 shrink-0 object-cover grayscale-[30%] transition-all group-hover:grayscale-0"
                        />
                      ) : (
                        <span className="flex h-16 w-16 shrink-0 items-center justify-center border border-gold-500/30 font-serif text-[1.4rem] text-gold-300">
                          {s.name.charAt(0)}
                        </span>
                      )}
                      <div>
                        <p className="font-serif text-[1.2rem] text-ivory-50">{s.name}</p>
                        {(s.title || s.company) && (
                          <p className="mt-1 font-sans text-[10.5px] uppercase tracking-[0.18em] text-gold-400">
                            {[s.title, s.company].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Booking rail */}
          <aside>
            <div className="border border-gold-500/20 bg-white/[0.03] p-8 lg:sticky lg:top-28">
              <Script className="text-[2rem] leading-none">reserve</Script>
              <h2 className="mt-3 font-serif text-[1.5rem] text-ivory-50">Passes for this date</h2>

              <dl className="mt-7 divide-y divide-white/[0.08]">
                {details.map((d) => (
                  <div key={d.label} className="flex items-start justify-between gap-6 py-3.5">
                    <dt className="font-sans text-[10.5px] uppercase tracking-[0.2em] text-ivory-500">{d.label}</dt>
                    <dd className="max-w-[62%] text-right text-[13.5px] leading-relaxed text-ivory-200">{d.value}</dd>
                  </div>
                ))}
                {speakers.length > 0 && (
                  <div className="flex items-center justify-between gap-6 py-3.5">
                    <dt className="font-sans text-[10.5px] uppercase tracking-[0.2em] text-ivory-500">Speakers</dt>
                    <dd className="inline-flex items-center gap-2 text-[13.5px] text-ivory-200">
                      <Users className="h-3.5 w-3.5 text-gold-500" />
                      {speakers.length}
                    </dd>
                  </div>
                )}
              </dl>

              {event.registrationUrl ? (
                <a
                  href={event.registrationUrl}
                  {...(event.registrationUrl.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group mt-8 inline-flex h-[52px] w-full items-center justify-center gap-3 bg-gold-gradient px-6 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-obsidian-950 transition-all hover:brightness-[1.06]"
                >
                  Reserve now
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              ) : (
                <Link
                  href="/contact"
                  className="mt-8 inline-flex h-[52px] w-full items-center justify-center gap-3 border border-gold-500/40 px-6 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-gold-200 transition-colors hover:bg-gold-500/10"
                >
                  Enquire about this date
                </Link>
              )}

              <p className="mt-5 text-[12px] leading-relaxed text-ivory-500">
                Transfers are free up to 72 hours before doors. Every pass includes the session recordings.
              </p>
            </div>

            {new Date(event.startAt).getTime() > Date.now() && (
              <div className="mt-6">
                <ReserveForm eventSlug={event.slug} eventTitle={event.title} />
              </div>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
