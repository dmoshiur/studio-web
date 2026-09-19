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
import { listPublishedEvents, listPublishedPosts, listPublishedScheduleDays, listPublishedSpeakers } from "@/lib/firestore/content";
import { Reveal } from "@/components/public/reveal";
import { Countdown } from "@/components/public/countdown";
import { EventCard, PostCard } from "@/components/public/cards";
import { ScheduleTabs } from "@/components/public/schedule";
import { SpeakerGrid } from "@/components/public/speaker-grid";
import { NewsletterForm } from "@/components/public/newsletter-form";
import { OwnerSpotlight } from "@/components/public/owner-spotlight";
import {
  Accordion,
  Backdrop,
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
    bar: "from-gold-700 via-gold-500 to-gold-300",
    chip: "border-gold-600/20 bg-gold-50 text-gold-700",
    numeral: "text-gold-700",
    icon: Mic,
  },
  {
    bar: "from-gold-700 via-gold-500 to-gold-300",
    chip: "border-gold-600/20 bg-gold-50 text-gold-700",
    numeral: "text-gold-700",
    icon: GraduationCap,
  },
  {
    bar: "from-gold-700 via-gold-500 to-gold-300",
    chip: "border-gold-600/20 bg-gold-50 text-gold-700",
    numeral: "text-gold-700",
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
  const [events, speakers, posts, scheduleDays] = await Promise.all([
    safe(() => listPublishedEvents({ limit: 3, upcomingOnly: true }), { items: [], nextCursor: null }),
    safe(
      () =>
        listPublishedSpeakers({ limit: 8, featuredOnly: true }).then(async (s) =>
          s.length ? s : listPublishedSpeakers({ limit: 8 })
        ),
      []
    ),
    safe(() => listPublishedPosts({ limit: 3 }), { items: [], nextCursor: null }),
    safe(() => listPublishedScheduleDays(), []),
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
      {/* ================= HERO — full-bleed cinematic stage photography ================= */}
      <section className="relative isolate overflow-hidden bg-obsidian-950">
        {/* Large background image — the stage fills the entire first viewport */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt=""
            role="presentation"
            loading="eager"
            fetchPriority="high"
            className="h-full w-full object-cover"
          />
          {/* A restrained charcoal scrim keeps the copy legible while the stage
              remains bright and visible across the right half of the frame. */}
          <div className="absolute inset-0 bg-gradient-to-r from-obsidian-950/92 via-obsidian-950/54 to-obsidian-950/12" />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian-950/76 via-transparent to-obsidian-950/20" />
        </div>

        {/* Decorative depth — one quiet editorial grid, no competing colour fields. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute right-[10%] top-[20%] hidden h-28 w-28 dot-grid-gold opacity-35 lg:block" />
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 inset-y-6 hidden border border-white/[0.14] lg:block"
        />

        {/* Floating date chip over the photography (desktop) */}
        {h.eventDateISO && (
          <Reveal
            delay={280}
            className="absolute top-32 z-10 hidden animate-floaty lg:block lg:right-10 xl:right-[max(2.5rem,calc((100vw_-_80rem)/2_+_2.5rem))]"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-lift backdrop-blur">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-700 text-white shadow-gold-sm">
                <CalendarDays className="h-[18px] w-[18px]" />
              </span>
              <span>
                <span className="block font-sans text-[9.5px] font-semibold uppercase tracking-[0.22em] text-gold-700">
                  Save the date
                </span>
                <span className="block font-serif text-[1.05rem] leading-tight text-ink-900">
                  {formatDate(h.eventDateISO, { month: "short", day: "numeric" })}
                </span>
              </span>
            </div>
          </Reveal>
        )}

        <div className="container relative flex min-h-[92svh] flex-col justify-center pb-24 pt-32 sm:pt-36">
          <div className="max-w-2xl">
            <Reveal className="animate-fade-up">
              {h.heroBadge && (
                <div className="flex flex-wrap items-center gap-4">
                  <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-luxe text-gold-300">
                    <span aria-hidden className="h-px w-8 bg-gradient-to-r from-transparent to-gold-400/80" />
                    {h.heroBadge}
                  </p>
                  {h.eventVenue && (
                    <span className="hidden items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold-100 backdrop-blur-sm sm:flex">
                      <MapPin className="h-3.5 w-3.5" />
                      {h.eventVenue}
                    </span>
                  )}
                </div>
              )}

              <h1 className="display-xl mt-8 font-semibold text-white [text-shadow:0_2px_32px_rgba(8,8,10,0.45)]">
                {h.heroTitle}
              </h1>

              <span
                aria-hidden
                className="mt-8 block h-[2px] w-44 bg-gold-500"
              />

              <p className="mt-7 max-w-xl text-[15px] leading-[1.85] text-white/80 sm:text-[16.5px]">
                {h.heroSubtitle}
              </p>

              {/* Trust row — driven by real summit stats */}
              {stats.length > 0 && (
                <dl className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3">
                  {stats.slice(0, 3).map((s) => (
                    <div key={s.label} className="flex items-baseline gap-2">
                      <dt className="sr-only">{s.label}</dt>
                      <dd className="font-serif text-[1.5rem] font-semibold text-gold-200">{s.value}</dd>
                      <dd className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                        {s.label}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link href={h.heroCtaPrimary.href} className="btn-editorial group rounded-full shadow-gold">
                  {h.heroCtaPrimary.label}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                {h.heroCtaSecondary && (
                  <Link
                    href={h.heroCtaSecondary.href}
                    className="btn-quiet !border-white/60 !bg-white/95 shadow-lift hover:!border-white hover:!bg-white rounded-full"
                  >
                    {h.heroCtaSecondary.label}
                  </Link>
                )}
              </div>

              {/* Compact badges — the save-the-date chip also appears as a floating card on lg+ */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {h.eventDateISO && (
                  <span className="inline-flex items-center gap-2.5 rounded-full border border-line bg-white/95 py-1.5 pl-2 pr-4 shadow-lift backdrop-blur lg:hidden">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-700 text-white shadow-gold-sm">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block font-sans text-[8.5px] font-semibold uppercase tracking-[0.22em] text-gold-700">
                        Save the date
                      </span>
                      <span className="block font-serif text-[0.95rem] leading-tight text-ink-900">
                        {formatDate(h.eventDateISO, { month: "short", day: "numeric" })}
                      </span>
                    </span>
                  </span>
                )}
                <span className="inline-flex items-center gap-2.5 rounded-full border border-line bg-white/95 py-2 pl-3 pr-4 shadow-lift backdrop-blur">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-600 opacity-45" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold-600" />
                  </span>
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-700">
                    {stats[0] ? `${stats[0].value} ${stats[0].label.toLowerCase()}` : "Seats filling fast"}
                  </span>
                </span>
              </div>
            </Reveal>

            {h.showCountdown && h.eventDateISO && (
              <Reveal
                className="mt-10 max-w-xl rounded-2xl border border-white/40 bg-white/95 p-6 shadow-luxe backdrop-blur"
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
        </div>

        {/* Floating stage badge — bottom right over the hall (xl only, where the
            copy column never reaches) */}
        <div className="absolute bottom-24 right-10 z-10 hidden xl:block xl:right-[max(2.5rem,calc((100vw_-_80rem)/2_+_2.5rem))]">
          <div className="flex items-center gap-3.5 rounded-2xl border border-white/20 bg-obsidian-950/60 px-5 py-4 shadow-luxe backdrop-blur-md">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
              <Ticket className="h-5 w-5 text-gold-200" />
            </span>
            <span>
              <span className="block font-sans text-[10px] font-semibold uppercase tracking-[0.26em] text-gold-200">
                Main stage
              </span>
              <span className="mt-1 block font-serif text-[1.15rem] leading-tight text-white">
                Two days, one unforgettable room
              </span>
            </span>
          </div>
        </div>

        <div aria-hidden className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 lg:flex">
          <span className="font-sans text-[9.5px] uppercase tracking-luxe text-white/60">Scroll</span>
          <span className="h-12 w-px bg-gradient-to-b from-gold-300/80 via-gold-300/40 to-transparent" />
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

      {/* ================= ABOUT — clean white, large supporting image ================= */}
      <Section tone="white">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute right-[8%] top-14 hidden h-24 w-24 dot-grid opacity-35 lg:block" />
        </div>
        <div className="relative grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          <Reveal className="relative">
            <div aria-hidden className="absolute -inset-3 -rotate-2 rounded-[1.8rem] bg-gradient-to-br from-gold-600/12 via-transparent to-ink-900/5" />
            <div aria-hidden className="absolute -left-6 -top-6 h-20 w-20 rounded-full border border-gold-500/40" />
            <div className="relative overflow-hidden rounded-2xl border border-white bg-white shadow-luxe">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={h.aboutImage ?? "/images/audience.jpg"}
                alt={h.aboutTitle}
                loading="lazy"
                className="aspect-[4/5] w-full object-cover"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-obsidian-950/40 via-transparent to-transparent" />
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-1.5 bg-gold-600"
              />
              <span aria-hidden className="absolute inset-4 rounded-xl border border-white/40" />
            </div>
            <div className="absolute -bottom-10 -right-4 hidden w-[58%] overflow-hidden rounded-2xl border border-line bg-white p-7 shadow-luxe sm:block lg:-right-10">
              <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gold-600" />
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
              <Link href="/about" className="btn-editorial group rounded-full shadow-gold-sm">
                Our story
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/speakers"
                className="link-underline font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-gold-700"
              >
                Meet the speakers
              </Link>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* ================= STATS — charcoal contrast band over the hall ================= */}
      {stats.length > 0 && (
        <section className="relative isolate overflow-hidden bg-obsidian-950">
          {/* Chandelier-lit ballroom ghosting through charcoal */}
          <Backdrop src="/images/page-header.jpg" overlay="none" className="opacity-[0.14] grayscale saturate-0" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-obsidian-950/78" />
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />
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

      {/* ================= EXPERIENCE — neutral paper tint, white cards ================= */}
      {experience?.items?.length ? (
        <Section tone="lavender" className="texture-grain">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute right-[8%] top-16 hidden h-20 w-20 border border-gold-600/15 lg:block" />
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

      {/* ================= FEATURED EVENT — warm paper surface ================= */}
      {featuredEvent && (
        <Section tone="peach">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute right-[8%] bottom-8 hidden h-24 w-24 border border-gold-600/15 lg:block" />
          </div>
          <Reveal className="relative overflow-hidden rounded-2xl border border-gold-600/25 bg-white shadow-luxe">
            <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-1.5 bg-gradient-to-r from-gold-700 via-gold-500 to-gold-300" />
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
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-600/20 bg-gold-50">
                      <CalendarDays className="h-4 w-4 text-gold-700" />
                    </span>
                    {formatDate(featuredEvent.startAt, { weekday: "long", month: "long", day: "numeric" })}
                  </span>
                  {featuredEvent.venue && (
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-500/25 bg-gold-50">
                        <MapPin className="h-4 w-4 text-gold-700" />
                      </span>
                      {featuredEvent.venue}
                    </span>
                  )}
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-5">
                  <Link href={`/events/${featuredEvent.slug}`} className="btn-editorial rounded-full shadow-gold-sm">
                    Reserve your seat
                  </Link>
                  {featuredEvent.price && <Badge variant="goldSoft">{featuredEvent.price}</Badge>}
                </div>
              </div>

              <div className="flex flex-col justify-center rounded-2xl border border-gold-600/10 bg-tint-lavender p-8 lg:p-10">
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

      {/* ================= SCHEDULE / UPCOMING EVENTS — very light neutral ================= */}
      {events.items.length > 0 && (
        <Section tone="sky">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <SectionHeading
              align="left"
              script="The Calendar"
              eyebrow="Upcoming"
              title="Dates worth clearing"
              description="Keynotes, live-shoot workshops and studio evenings — each capped so the room stays worth your time."
            />
            <TextLink href="/events" tone="brand" className="group pb-2">
              All events
            </TextLink>
          </div>

          {/* Timeline connector */}
          <div aria-hidden className="relative mt-14 hidden lg:block">
            <div className="h-px bg-gold-600/35" />
            <span className="absolute left-[16.66%] top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gold-600 shadow-gold-sm" />
            <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gold-600" />
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
            <div className="absolute left-1/2 top-0 h-px w-48 -translate-x-1/2 bg-gold-600/30" />
          </div>
          <div className="relative">
            <SectionHeading
              script="On Stage"
              eyebrow="The Voices"
              title="Speakers who have earned the room"
              description="Photographers, filmmakers and image scientists — each asked for one idea they have never presented publicly."
            />
            <div className="mt-16">
              <SpeakerGrid speakers={speakers.slice(0, 8)} />
            </div>
            <Reveal className="mt-14 text-center">
              <Link
                href="/speakers"
                className="inline-flex h-[52px] items-center gap-3 rounded-full border border-gold-600/30 bg-white px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-gold-700 shadow-card transition-all hover:-translate-y-0.5 hover:border-gold-600 hover:shadow-gold-sm"
              >
                The full roster
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </Section>
      )}

      {/* ================= SCHEDULE — day tabs ================= */}
      {scheduleDays.length > 0 && (
        <Section tone="light">
          <SectionHeading
            script="The Program"
            eyebrow="Schedule"
            title="Pick your day, build your route"
            description="Keynotes, lighting labs and portfolio reviews — tab between days without leaving this page."
          />
          <div className="mt-14">
            <ScheduleTabs days={scheduleDays} speakers={speakers} />
          </div>
          <Reveal className="mt-14 text-center">
            <Link
              href="/schedule"
              className="inline-flex h-[52px] items-center gap-3 rounded-full border border-gold-600/30 bg-white px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-gold-700 shadow-card transition-all hover:-translate-y-0.5 hover:border-gold-600 hover:shadow-gold-sm"
            >
              The full schedule
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </Section>
      )}

      {/* ================= GALLERY / MOMENTS — white, editorial ================= */}
      <Section tone="white" className="border-t border-line/70">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[4%] top-16 hidden h-24 w-24 dot-grid opacity-35 lg:block" />
        </div>
        <div className="relative">
          <SectionHeading
            script="Moments"
            eyebrow="The room"
            title="Inside the last edition"
            description="Unretouched, unposed — this is what the summit actually feels like."
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
            <div className="absolute left-1/2 top-10 h-px w-48 -translate-x-1/2 bg-gold-600/30" />
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
                        ? "relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-gold-600/60 bg-gradient-to-b from-gold-50/55 via-white to-white p-9 text-ink-900 shadow-gold"
                        : "relative flex h-full flex-col rounded-2xl border border-line bg-white p-9 shadow-card transition-all duration-500 hover:-translate-y-1 hover:shadow-lift"
                    }
                  >
                    {tier.featured && (
                      <>
                        <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-gold-700 via-gold-500 to-gold-300" />
                        <span className="absolute right-6 top-6 hidden h-16 w-16 rounded-full border border-gold-600/15 lg:block" />
                      </>
                    )}
                    {tier.featured && (
                      <span className="absolute -top-0 left-9 -translate-y-1/2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-700 px-4 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-gold-sm">
                          <Sparkles className="h-3 w-3" /> Most chosen
                        </span>
                      </span>
                    )}
                    <p
                      className={
                        tier.featured
                          ? "font-sans text-[10.5px] uppercase tracking-[0.26em] text-gold-700"
                          : "font-sans text-[10.5px] uppercase tracking-[0.26em] text-ink-400"
                      }
                    >
                      {tier.note ?? "Pass"}
                    </p>
                    <h3 className="mt-4 font-serif text-[1.75rem] text-ink-900">{tier.name}</h3>
                    <p className={`mt-5 font-serif text-[2.6rem] leading-none ${tier.featured ? "text-gold-800" : "text-ink-900"}`}>
                      {tier.price}
                    </p>
                    <span className={`mt-7 h-px w-full ${tier.featured ? "bg-gradient-to-r from-gold-600/45 via-gold-500/30 to-transparent" : "bg-line"}`} />
                    <ul className="mt-7 flex-1 space-y-3.5">
                      {tier.perks.map((perk) => (
                        <li key={perk} className="flex gap-3">
                          <Diamond
                            className={
                              tier.featured
                                ? "mt-2 h-1 w-1 shrink-0 !bg-gold-600"
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
                          ? "btn-editorial mt-9 w-full rounded-full shadow-gold-sm"
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

      {/* ================= FAQ — very light neutral ================= */}
      {faqs.length > 0 && (
        <Section tone="peach">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute right-[8%] top-12 hidden h-20 w-20 border border-gold-600/15 lg:block" />
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
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold-600/20 bg-gold-50">
                    <Mail className="h-5 w-5 text-gold-700" />
                  </span>
                  <div>
                    <p className="font-serif text-[1.2rem] text-ink-900">Prefer email?</p>
                    <a
                      href={`mailto:${settings.contactEmail}`}
                      className="mt-1 block text-[13.5px] font-medium text-gold-700 underline-offset-4 hover:underline"
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

      {/* ================= CTA — charcoal conversion band over silk ================= */}
      <section className="relative isolate overflow-hidden bg-obsidian-950">
        {/* Subtle silk texture settling beneath charcoal */}
        <Backdrop src="/images/cta-silk.jpg" overlay="none" className="opacity-[0.26]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-obsidian-950/78" />
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(255,255,255,0.05),transparent)]" />
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
              Join {stats[0]?.value ?? "2,400+"} photographers, filmmakers and creatives for days that
              change the shape of your portfolio. Seats are capped each edition.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/events"
                className="group inline-flex h-[54px] items-center gap-3 rounded-full bg-gold-700 px-9 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-white shadow-gold transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-600 hover:shadow-gold"
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
          <div className="absolute right-[8%] top-10 hidden h-20 w-20 border border-gold-600/15 lg:block" />
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
