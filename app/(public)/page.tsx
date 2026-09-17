import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  GraduationCap,
  Mail,
  MapPin,
  Mic,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { getPublicSettings } from "@/lib/firestore/settings";
import { listPublishedEvents, listPublishedPosts, listPublishedSpeakers } from "@/lib/firestore/content";
import { Reveal } from "@/components/public/reveal";
import { Countdown } from "@/components/public/countdown";
import { EventCard, PostCard, SpeakerCard } from "@/components/public/cards";
import { NewsletterForm } from "@/components/public/newsletter-form";
import { OwnerSpotlight } from "@/components/public/owner-spotlight";
import {
  Accordion,
  Backdrop,
  Eyebrow,
  Gallery,
  Marquee,
  QuoteBlock,
  Script,
  Section,
  SectionHeading,
  StatStrip,
  TextLink,
} from "@/components/public/ui-kit";
import { Badge, Diamond } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

const EXPERIENCE_ACCENTS = [
  {
    bar: "from-brand-700 via-brand-500 to-brand-300",
    chip: "border-brand-600/20 bg-brand-50 text-brand-700",
    numeral: "text-brand-600",
    icon: Mic,
  },
  {
    bar: "from-royal-700 via-royal-500 to-royal-300",
    chip: "border-royal-600/20 bg-royal-50 text-royal-700",
    numeral: "text-royal-600",
    icon: GraduationCap,
  },
  {
    bar: "from-ember-600 via-ember-500 to-gold-400",
    chip: "border-ember-500/25 bg-ember-50 text-ember-700",
    numeral: "text-ember-600",
    icon: Users,
  },
];

const GALLERY_FALLBACKS: { image: string; caption: string }[] = [
  { image: "/images/gallery-panel.jpg", caption: "Panels that stay on topic" },
  { image: "/images/gallery-networking.jpg", caption: "Dinners that turn into deals" },
  { image: "/images/audience.jpg", caption: "A room that shows up early" },
  { image: "/images/hero-stage.jpg", caption: "The main stage, minutes before doors" },
  { image: "/images/hero-portrait.jpg", caption: "Keynotes with nowhere to hide" },
];

export default async function HomePage() {
  const settings = await getPublicSettings();
  const h = settings.homepage;
  const [events, speakers, posts] = await Promise.all([
    safe(() => listPublishedEvents({ limit: 3, upcomingOnly: true }), { items: [], nextCursor: null }),
    safe(
      () =>
        listPublishedSpeakers({ limit: 4, featuredOnly: true }).then(async (s) =>
          s.length ? s : listPublishedSpeakers({ limit: 4 })
        ),
      []
    ),
    safe(() => listPublishedPosts({ limit: 3 }), { items: [], nextCursor: null }),
  ]);

  const stats = h.stats ?? h.aboutStats ?? [];
  const experience = h.experience;
  const featuredEvent = events.items[0];
  const tickets = h.tickets ?? [];
  const testimonials = h.testimonials ?? [];
  const faqs = h.faqs ?? [];
  const gallery = h.gallery ?? GALLERY_FALLBACKS.slice(0, 3);

  /* Fill the editorial gallery with real house photography so the asymmetric
     layout (1 large + up to 4 small) always has strong imagery. */
  const seen = new Set(gallery.map((g) => g.image));
  const galleryItems = [...gallery];
  for (const extra of GALLERY_FALLBACKS) {
    if (galleryItems.length >= 5) break;
    if (!seen.has(extra.image)) {
      galleryItems.push(extra);
      seen.add(extra.image);
    }
  }

  const heroImage = h.heroImage ?? "/images/hero-stage.jpg";

  return (
    <>
      {/* ================= HERO — asymmetric editorial composition ================= */}
      <section className="relative isolate overflow-hidden bg-white pb-20 pt-36 sm:pt-44 lg:pb-24">
        {/* Soft decorative wash */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-[-8%] h-[420px] w-[420px] rounded-full bg-brand-500/[0.08] blur-3xl" />
          <div className="absolute bottom-[-20%] left-[-6%] h-[380px] w-[380px] rounded-full bg-ember-400/[0.08] blur-3xl" />
          <div className="absolute left-[6%] top-32 hidden h-28 w-28 dot-grid opacity-60 lg:block" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-paper-100 to-transparent" />
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 inset-y-6 hidden border border-ink-900/[0.05] lg:block"
        />

        <div className="container relative">
          <div className="grid items-center gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
            {/* Copy */}
            <div className="max-w-2xl">
              <Reveal className="animate-fade-up">
                {h.heroBadge && (
                  <div className="flex flex-wrap items-center gap-4">
                    <Eyebrow align="left">{h.heroBadge}</Eyebrow>
                    {h.eventVenue && (
                      <span className="hidden items-center gap-2 rounded-full border border-ember-500/25 bg-ember-50 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ember-700 sm:flex">
                        <MapPin className="h-3.5 w-3.5" />
                        {h.eventVenue}
                      </span>
                    )}
                  </div>
                )}

                <h1 className="display-xl mt-8 font-semibold text-ink-900">{h.heroTitle}</h1>

                <span
                  aria-hidden
                  className="mt-8 block h-[3px] w-44 rounded-full bg-gradient-to-r from-brand-700 via-gold-500 to-ember-500"
                />

                <p className="lead mt-7 max-w-xl">{h.heroSubtitle}</p>

                {/* Trust row — driven by real summit stats */}
                {stats.length > 0 && (
                  <dl className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3">
                    {stats.slice(0, 3).map((s) => (
                      <div key={s.label} className="flex items-baseline gap-2">
                        <dt className="sr-only">{s.label}</dt>
                        <dd className="font-serif text-[1.5rem] font-semibold text-brand-800">{s.value}</dd>
                        <dd className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-400">
                          {s.label}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <Link href={h.heroCtaPrimary.href} className="btn-editorial group rounded-full shadow-brand-sm">
                    {h.heroCtaPrimary.label}
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                  {h.heroCtaSecondary && (
                    <Link href={h.heroCtaSecondary.href} className="btn-quiet rounded-full">
                      {h.heroCtaSecondary.label}
                    </Link>
                  )}
                </div>
              </Reveal>

              {h.showCountdown && h.eventDateISO && (
                <Reveal
                  className="mt-10 max-w-xl rounded-2xl border border-brand-600/10 bg-white/80 p-6 shadow-card backdrop-blur"
                  delay={160}
                >
                  <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
                    <div>
                      <p className="eyebrow mb-4">Doors open in</p>
                      <Countdown targetISO={h.eventDateISO} />
                    </div>
                    <div className="pb-1">
                      <p className="font-sans text-[10.5px] uppercase tracking-[0.24em] text-ink-400">
                        {formatDate(h.eventDateISO, { weekday: "long", month: "long", day: "numeric" })}
                      </p>
                      {h.eventVenue && (
                        <p className="mt-2 font-serif text-[1.2rem] text-ink-700">{h.eventVenue}</p>
                      )}
                    </div>
                  </div>
                </Reveal>
              )}
            </div>

            {/* Visual */}
            <Reveal delay={180} className="relative mx-auto w-full max-w-[520px] lg:mx-0 lg:max-w-none">
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
                <div className="absolute -bottom-14 -left-8 h-56 w-56 rounded-full bg-ember-400/25 blur-3xl" />
                <div className="absolute -left-8 -top-8 hidden h-24 w-24 dot-grid sm:block" />
                <div className="absolute -bottom-8 -right-6 hidden h-32 w-32 rounded-full border border-gold-500/40 sm:block" />
                <div className="absolute -right-4 top-1/3 hidden h-16 w-16 rounded-full border border-brand-600/20 lg:block" />
              </div>

              {/* Offset gradient frame */}
              <div
                aria-hidden
                className="absolute inset-0 rotate-2 rounded-[2.2rem] bg-gradient-to-br from-brand-600/15 via-gold-500/10 to-ember-500/15"
              />

              <figure className="relative overflow-hidden rounded-[1.75rem] border border-white bg-white shadow-luxe">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImage}
                  alt="Speaker on the ManUp main stage"
                  loading="eager"
                  fetchPriority="high"
                  className="aspect-[4/5] w-full object-cover sm:aspect-[5/5]"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-brand-950/60 via-transparent to-transparent" />
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-600 via-gold-500 to-ember-500"
                />
                <figcaption className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-4 p-6">
                  <div>
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.26em] text-gold-200">
                      Main stage
                    </p>
                    <p className="mt-1.5 font-serif text-[1.35rem] leading-tight text-white">
                      Two days, one unforgettable room
                    </p>
                  </div>
                  <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm sm:flex">
                    <Ticket className="h-5 w-5 text-white" />
                  </span>
                </figcaption>
              </figure>

              {/* Floating date card */}
              {h.eventDateISO && (
                <div className="absolute -right-2 top-6 flex items-center gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-lift backdrop-blur sm:-right-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-white shadow-brand-sm">
                    <CalendarDays className="h-[18px] w-[18px]" />
                  </span>
                  <span>
                    <span className="block font-sans text-[9.5px] font-semibold uppercase tracking-[0.22em] text-ember-600">
                      Save the date
                    </span>
                    <span className="block font-serif text-[1.05rem] leading-tight text-ink-900">
                      {formatDate(h.eventDateISO, { month: "short", day: "numeric" })}
                    </span>
                  </span>
                </div>
              )}

              {/* Floating live badge */}
              <div className="absolute -left-2 bottom-10 flex items-center gap-2.5 rounded-full border border-line bg-white/95 py-2 pl-3 pr-4 shadow-lift backdrop-blur sm:-left-5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-500 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ember-500" />
                </span>
                <span className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.2em] text-ink-700">
                  {stats[0] ? `${stats[0].value} ${stats[0].label.toLowerCase()}` : "Seats filling fast"}
                </span>
              </div>
            </Reveal>
          </div>
        </div>

        <div aria-hidden className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 lg:flex">
          <span className="font-sans text-[9.5px] uppercase tracking-luxe text-ink-400">Scroll</span>
          <span className="h-12 w-px bg-gradient-to-b from-brand-600/70 via-gold-500/60 to-transparent" />
        </div>
      </section>

      {/* ================= PARTNER MARQUEE ================= */}
      <Marquee
        items={[
          "Northwind Group",
          "Threadline",
          "Atelier Mono",
          "Halcyon Ventures",
          "Quill & Field",
          "Vantage Labs",
        ]}
      />

      {/* ================= ABOUT — light lavender tint ================= */}
      <Section tone="lavender">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-brand-400/10 blur-3xl" />
          <div className="absolute -right-20 bottom-10 h-64 w-64 rounded-full bg-ember-400/10 blur-3xl" />
          <div className="absolute right-[8%] top-14 hidden h-24 w-24 dot-grid opacity-50 lg:block" />
        </div>
        <div className="relative grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          <Reveal className="relative">
            <div aria-hidden className="absolute -inset-3 -rotate-2 rounded-[1.8rem] bg-gradient-to-br from-brand-600/10 via-transparent to-ember-500/10" />
            <div aria-hidden className="absolute -left-6 -top-6 h-20 w-20 rounded-full border border-gold-500/40" />
            <div className="relative overflow-hidden rounded-2xl border border-white bg-white shadow-luxe">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={h.aboutImage ?? "/images/audience.jpg"}
                alt={h.aboutTitle}
                loading="lazy"
                className="aspect-[4/5] w-full object-cover"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-brand-950/40 via-transparent to-transparent" />
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-600 via-gold-500 to-ember-500"
              />
              <span aria-hidden className="absolute inset-4 rounded-xl border border-white/40" />
            </div>
            <div className="absolute -bottom-10 -right-4 hidden w-[58%] overflow-hidden rounded-2xl border border-line bg-white p-7 shadow-luxe sm:block lg:-right-10">
              <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ember-500 via-gold-500 to-brand-600" />
              <Script className="text-[2.4rem] leading-none">est. 2019</Script>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
                Seven editions, one standard: no filler on stage, no strangers in the room.
              </p>
            </div>
          </Reveal>

          <div>
            <SectionHeading
              align="left"
              script="The Invitation"
              eyebrow="About the summit"
              title={h.aboutTitle}
              tone="light"
            />
            <Reveal className="mt-8 space-y-5">
              {(h.aboutBody ?? "").split("\n\n").map((para, i) => (
                <p key={i} className="lead-dark">
                  {para}
                </p>
              ))}
            </Reveal>
            <Reveal className="mt-9 flex flex-wrap items-center gap-8">
              <Link href="/about" className="btn-editorial group rounded-full shadow-brand-sm">
                Our story
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/speakers"
                className="link-underline font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-brand-700"
              >
                Meet the speakers
              </Link>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* ================= STATS — dark brand contrast band ================= */}
      {stats.length > 0 && (
        <section className="relative isolate overflow-hidden bg-brand-deep">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-brand-400/25 blur-3xl" />
            <div className="absolute -bottom-28 right-1/5 h-72 w-72 rounded-full bg-ember-500/20 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(255,255,255,0.08),transparent)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" />
          </div>
          <div className="container relative py-16 sm:py-20">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-luxe text-gold-300">
                <span aria-hidden className="h-px w-8 bg-gradient-to-r from-transparent to-gold-400/70" />
                The summit in numbers
                <span aria-hidden className="h-px w-8 bg-gradient-to-l from-transparent to-gold-400/70" />
              </p>
            </Reveal>
            <div className="mt-6">
              <StatStrip stats={stats} tone="brand" />
            </div>
          </div>
        </section>
      )}

      {/* ================= OWNER SPOTLIGHT ================= */}
      <OwnerSpotlight owner={h.owner} placement="home" />

      {/* ================= EXPERIENCE — white cards, accent tops ================= */}
      {experience?.items?.length ? (
        <Section tone="white" className="texture-grain">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-28 top-20 h-80 w-80 rounded-full bg-brand-500/[0.06] blur-3xl" />
            <div className="absolute -left-24 bottom-16 h-72 w-72 rounded-full bg-ember-400/[0.07] blur-3xl" />
          </div>
          <SectionHeading
            script={experience.eyebrow ?? "The Experience"}
            eyebrow={experience.title ?? "What you'll find"}
            title={experience.title ?? "Designed down to the last detail"}
            description={experience.body}
          />
          <div className="relative mt-16 grid gap-6 lg:grid-cols-3">
            {experience.items.map((item, i) => {
              const accent = EXPERIENCE_ACCENTS[i % EXPERIENCE_ACCENTS.length];
              const Icon = accent.icon;
              return (
                <Reveal key={item.title} delay={i * 110}>
                  <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lift">
                    <span aria-hidden className={`absolute inset-x-0 top-0 z-10 h-1.5 bg-gradient-to-r ${accent.bar}`} />
                    <div className="relative overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image ?? "/images/gallery-panel.jpg"}
                        alt={item.title}
                        loading="lazy"
                        className="h-60 w-full object-cover transition-transform duration-1000 group-hover:scale-[1.07]"
                      />
                      <span className="absolute inset-0 bg-gradient-to-t from-obsidian-950/45 via-transparent to-transparent" />
                    </div>
                    <div className="flex flex-1 flex-col p-8">
                      <div className="flex items-center justify-between">
                        <span
                          className={`flex h-11 w-11 items-center justify-center rounded-xl border ${accent.chip}`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className={`font-serif text-[1.1rem] ${accent.numeral}`}>0{i + 1}</span>
                      </div>
                      <h3 className="mt-5 font-serif text-[1.6rem] leading-tight text-ink-900">{item.title}</h3>
                      <p className="mt-3 flex-1 text-[13.5px] leading-[1.85] text-ink-500">{item.description}</p>
                      <span aria-hidden className="mt-6 h-px w-full bg-gradient-to-r from-line via-line to-transparent" />
                      <span className={`mt-5 inline-flex items-center gap-2 font-sans text-[10.5px] font-semibold uppercase tracking-[0.22em] ${accent.numeral}`}>
                        Part of your pass
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </Section>
      ) : null}

      {/* ================= FEATURED EVENT — warm peach tint ================= */}
      {featuredEvent && (
        <Section tone="peach">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-gold-400/15 blur-3xl" />
            <div className="absolute -right-16 bottom-8 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
          </div>
          <Reveal className="relative overflow-hidden rounded-2xl border border-gold-600/25 bg-white shadow-luxe">
            <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-1.5 bg-gradient-to-r from-brand-700 via-gold-500 to-ember-500" />
            <Backdrop
              src={featuredEvent.coverImage ?? "/images/hero-stage.jpg"}
              overlay="none"
              className="opacity-[0.08]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/70" />
            <div className="relative grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.3fr_0.9fr] lg:p-16">
              <div>
                <span className="pill-brand">
                  <Sparkles className="h-3.5 w-3.5" />
                  The flagship gathering
                </span>
                <h2 className="display-md mt-6 text-ink-900">{featuredEvent.title}</h2>
                <p className="lead mt-5 max-w-xl">{featuredEvent.description}</p>

                <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 text-[13px] text-ink-500">
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-600/20 bg-brand-50">
                      <CalendarDays className="h-4 w-4 text-brand-700" />
                    </span>
                    {formatDate(featuredEvent.startAt, { weekday: "long", month: "long", day: "numeric" })}
                  </span>
                  {featuredEvent.venue && (
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ember-500/25 bg-ember-50">
                        <MapPin className="h-4 w-4 text-ember-600" />
                      </span>
                      {featuredEvent.venue}
                    </span>
                  )}
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-5">
                  <Link href={`/events/${featuredEvent.slug}`} className="btn-editorial rounded-full shadow-brand-sm">
                    Reserve your seat
                  </Link>
                  {featuredEvent.price && <Badge variant="goldSoft">{featuredEvent.price}</Badge>}
                </div>
              </div>

              <div className="flex flex-col justify-center rounded-2xl border border-brand-600/10 bg-tint-lavender p-8 lg:p-10">
                <p className="eyebrow mb-5">Begins in</p>
                <Countdown targetISO={featuredEvent.startAt} />
                <p className="mt-7 text-[12.5px] leading-relaxed text-ink-500">
                  Held under the chandeliers of Grand Meridian Hall — with a private lounge for pass holders.
                </p>
              </div>
            </div>
          </Reveal>
        </Section>
      )}

      {/* ================= SCHEDULE / UPCOMING EVENTS — cool sky tint ================= */}
      {events.items.length > 0 && (
        <Section tone="sky">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <SectionHeading
              align="left"
              script="The Calendar"
              eyebrow="Upcoming"
              title="Dates worth clearing"
              description="Keynotes, workshops and evening salons — each capped so the room stays worth your time."
            />
            <TextLink href="/events" tone="brand" className="group pb-2">
              All events
            </TextLink>
          </div>

          {/* Timeline connector */}
          <div aria-hidden className="relative mt-14 hidden lg:block">
            <div className="h-px bg-gradient-to-r from-brand-600/40 via-ember-500/40 to-gold-500/40" />
            <span className="absolute left-[16.66%] top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-brand-600 shadow-brand-sm" />
            <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-ember-500" />
            <span className="absolute left-[83.33%] top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gold-500" />
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.items.map((e, i) => (
              <Reveal key={e.id} delay={i * 90}>
                <EventCard event={e} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* ================= SPEAKERS — white ================= */}
      {speakers.length > 0 && (
        <Section tone="white" className="relative isolate overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-64 w-[720px] -translate-x-1/2 rounded-full bg-brand-500/[0.05] blur-3xl" />
          </div>
          <div className="relative">
            <SectionHeading
              script="On Stage"
              eyebrow="The Voices"
              title="Speakers who have earned the room"
              description="Founders, operators and scientists — each asked for one idea they have never presented publicly."
            />
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {speakers.map((s, i) => (
                <Reveal key={s.id} delay={i * 90}>
                  <SpeakerCard speaker={s} />
                </Reveal>
              ))}
            </div>
            <Reveal className="mt-14 text-center">
              <Link
                href="/speakers"
                className="inline-flex h-[52px] items-center gap-3 rounded-full border border-brand-600/30 bg-white px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-brand-700 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-600 hover:shadow-brand-sm"
              >
                The full roster
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </Section>
      )}

      {/* ================= GALLERY / MOMENTS — white, editorial ================= */}
      <Section tone="white" className="border-t border-line/70">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 top-24 h-72 w-72 rounded-full bg-gold-400/10 blur-3xl" />
          <div className="absolute left-[4%] top-16 hidden h-24 w-24 dot-grid opacity-50 lg:block" />
        </div>
        <div className="relative">
          <SectionHeading
            script="Moments"
            eyebrow="The room"
            title="Inside the last edition"
            description="Unretouched, unposed — this is what the two days actually feel like."
          />
          <div className="mt-14">
            <Gallery items={galleryItems} variant="editorial" />
          </div>
        </div>
      </Section>

      {/* ================= TICKETS / PRICING — white ================= */}
      {tickets.length > 0 && (
        <Section tone="white" id="tickets" className="border-t border-line/70">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-10 h-56 w-[640px] -translate-x-1/2 rounded-full bg-brand-500/[0.05] blur-3xl" />
          </div>
          <div className="relative">
            <SectionHeading
              tone="light"
              script="Reserve"
              eyebrow="Tickets & Passes"
              title="Choose how you'd like to attend"
              description="Every pass includes both days, the recordings and the hospitality. Seats are capped each edition."
            />
            <div className="mt-16 grid gap-6 lg:grid-cols-3">
              {tickets.map((tier, i) => (
                <Reveal key={tier.name} delay={i * 100}>
                  <article
                    className={
                      tier.featured
                        ? "relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-brand-600/60 bg-gradient-to-b from-brand-50/90 via-white to-white p-9 text-ink-900 shadow-brand"
                        : "relative flex h-full flex-col rounded-2xl border border-line bg-white p-9 shadow-card transition-all duration-500 hover:-translate-y-1 hover:shadow-lift"
                    }
                  >
                    {tier.featured && (
                      <>
                        <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-700 via-gold-500 to-ember-500" />
                        <span className="absolute right-6 top-6 hidden h-16 w-16 rounded-full border border-brand-600/15 lg:block" />
                      </>
                    )}
                    {tier.featured && (
                      <span className="absolute -top-0 left-9 -translate-y-1/2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-4 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-brand-sm">
                          <Sparkles className="h-3 w-3" /> Most chosen
                        </span>
                      </span>
                    )}
                    <p
                      className={
                        tier.featured
                          ? "font-sans text-[10.5px] uppercase tracking-[0.26em] text-brand-700"
                          : "font-sans text-[10.5px] uppercase tracking-[0.26em] text-ink-400"
                      }
                    >
                      {tier.note ?? "Pass"}
                    </p>
                    <h3 className="mt-4 font-serif text-[1.75rem] text-ink-900">{tier.name}</h3>
                    <p className={`mt-5 font-serif text-[2.6rem] leading-none ${tier.featured ? "text-brand-800" : "text-ink-900"}`}>
                      {tier.price}
                    </p>
                    <span className={`mt-7 h-px w-full ${tier.featured ? "bg-gradient-to-r from-brand-600/40 via-gold-500/40 to-transparent" : "bg-line"}`} />
                    <ul className="mt-7 flex-1 space-y-3.5">
                      {tier.perks.map((perk) => (
                        <li key={perk} className="flex gap-3">
                          <Diamond
                            className={
                              tier.featured
                                ? "mt-2 h-1 w-1 shrink-0 !bg-brand-600"
                                : "mt-2 h-1 w-1 shrink-0 bg-gold-600/70"
                            }
                          />
                          <span className="text-[13.5px] leading-relaxed text-ink-500">
                            {perk}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/contact"
                      className={
                        tier.featured
                          ? "btn-editorial mt-9 w-full rounded-full shadow-brand-sm"
                          : "btn-quiet mt-9 w-full rounded-full"
                      }
                    >
                      Request this pass
                    </Link>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* ================= TESTIMONIALS ================= */}
      {testimonials.length > 0 && (
        <Section className="bg-paper-200">
          <div className="grid gap-8 lg:grid-cols-2">
            {testimonials.slice(0, 2).map((t, i) => (
              <QuoteBlock
                key={t.name + i}
                quote={t.quote}
                name={t.name}
                role={t.role}
                accent={i % 2 ? "ember" : "brand"}
              />
            ))}
          </div>
        </Section>
      )}

      {/* ================= JOURNAL ================= */}
      {posts.items.length > 0 && (
        <Section tone="white">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <SectionHeading
              align="left"
              script="The Journal"
              eyebrow="Writing"
              title="Letters from the desk"
              description="Essays from the team and our speakers on building, pricing and keeping taste."
            />
            <TextLink href="/blog" tone="brand" className="group pb-2">
              All writing
            </TextLink>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.items.map((p, i) => (
              <Reveal key={p.id} delay={i * 90}>
                <PostCard post={p} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* ================= FAQ — soft peach tint ================= */}
      {faqs.length > 0 && (
        <Section tone="peach">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-20 bottom-10 h-64 w-64 rounded-full bg-ember-400/10 blur-3xl" />
            <div className="absolute -right-16 top-12 h-60 w-60 rounded-full bg-brand-500/[0.07] blur-3xl" />
          </div>
          <div className="relative grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div>
              <SectionHeading
                align="left"
                tone="light"
                script="Good to know"
                eyebrow="Questions"
                title="Everything you might ask"
                description="Still unsure? Write to us — a human replies within two business days."
              />
              <Reveal delay={120} className="mt-10 rounded-2xl border border-line bg-white p-6 shadow-card">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-600/20 bg-brand-50">
                    <Mail className="h-5 w-5 text-brand-700" />
                  </span>
                  <div>
                    <p className="font-serif text-[1.2rem] text-ink-900">Prefer email?</p>
                    <a
                      href={`mailto:${settings.contactEmail}`}
                      className="mt-1 block text-[13.5px] font-medium text-brand-700 underline-offset-4 hover:underline"
                    >
                      {settings.contactEmail}
                    </a>
                    {settings.phone && (
                      <p className="mt-1 text-[13px] text-ink-500">{settings.phone}</p>
                    )}
                  </div>
                </div>
              </Reveal>
            </div>
            <div className="lg:pt-4">
              <Accordion items={faqs} tone="light" />
            </div>
          </div>
        </Section>
      )}

      {/* ================= CTA — dark brand conversion band ================= */}
      <section className="relative isolate overflow-hidden bg-brand-deep">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-[12%] h-96 w-96 rounded-full bg-brand-400/25 blur-3xl" />
          <div className="absolute -bottom-36 right-[8%] h-96 w-96 rounded-full bg-ember-500/25 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.07]" />
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" />
          <div className="absolute bottom-10 left-[8%] hidden h-20 w-20 dot-grid-gold opacity-40 lg:block" />
        </div>
        <div className="container relative py-20 text-center sm:py-24">
          <Reveal className="mx-auto max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 font-sans text-[10.5px] font-semibold uppercase tracking-[0.2em] text-gold-200 backdrop-blur-sm">
              <Ticket className="h-3.5 w-3.5" />
              {h.heroBadge ?? "Limited seats"}
            </span>
            <h2 className="display-lg mt-7 text-white">Ready to Experience the Future?</h2>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-[1.85] text-white/70">
              Join {stats[0]?.value ?? "2,400+"} founders, operators and creatives for two days that
              change the shape of your year. Seats are capped each edition.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/events"
                className="group inline-flex h-[54px] items-center gap-3 rounded-full bg-white px-9 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-brand-800 shadow-luxe transition-all duration-300 hover:-translate-y-0.5 hover:shadow-brand"
              >
                Get Your Ticket
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-[54px] items-center gap-3 rounded-full border border-white/30 px-9 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-white transition-all duration-300 hover:border-gold-300/70 hover:text-gold-200"
              >
                Talk to us
              </Link>
            </div>
            {stats.length > 0 && (
              <p className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">
                {stats.slice(0, 4).map((s, i) => (
                  <span key={s.label} className="flex items-center gap-6">
                    {i > 0 && <Diamond className="h-1 w-1 !bg-gold-400/70" />}
                    <span>
                      {s.value} {s.label}
                    </span>
                  </span>
                ))}
              </p>
            )}
          </Reveal>
        </div>
      </section>

      {/* ================= NEWSLETTER ================= */}
      <section className="relative isolate overflow-hidden border-t border-line bg-white">
        <Backdrop src="/images/cta-silk.jpg" overlay="none" className="opacity-[0.07]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/40 to-white/80" />
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-brand-500/[0.07] blur-3xl" />
          <div className="absolute -right-16 bottom-8 h-56 w-56 rounded-full bg-ember-400/[0.08] blur-3xl" />
        </div>
        <span aria-hidden className="pointer-events-none absolute inset-x-6 inset-y-6 hidden border border-ink-900/[0.07] lg:block" />
        <div className="container relative py-24 text-center sm:py-28">
          <Reveal className="mx-auto max-w-2xl">
            <Script className="text-[2.6rem] leading-none sm:text-[3.2rem]">Join the inner circle</Script>
            <h2 className="display-lg mt-6 text-ink-900">Never miss an announcement</h2>
            <p className="lead mt-5">
              Speaker drops, early-bird tickets and the occasional letter from the founders. One email a month, no noise.
            </p>
            <div className="mx-auto mt-10 max-w-lg">
              <NewsletterForm variant="light" source="homepage" />
            </div>
            <p className="mt-5 flex items-center justify-center gap-3 text-[11.5px] uppercase tracking-[0.2em] text-ink-400">
              <Diamond className="h-1 w-1" />
              Unsubscribe in one click
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
