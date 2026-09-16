import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Sparkles } from "lucide-react";
import { getPublicSettings } from "@/lib/firestore/settings";
import { listPublishedEvents, listPublishedPosts, listPublishedSpeakers } from "@/lib/firestore/content";
import { Reveal } from "@/components/public/reveal";
import { Countdown } from "@/components/public/countdown";
import { EventCard, PostCard, SpeakerCard } from "@/components/public/cards";
import { NewsletterForm } from "@/components/public/newsletter-form";
import {
  Accordion,
  Backdrop,
  Eyebrow,
  Gallery,
  GoldRule,
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
  const gallery = h.gallery ?? [
    { image: "/images/gallery-panel.jpg", caption: "Panels that stay on topic" },
    { image: "/images/gallery-networking.jpg", caption: "Dinners that turn into deals" },
    { image: "/images/audience.jpg", caption: "A room that shows up early" },
  ];

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="relative isolate flex min-h-[92vh] items-center overflow-hidden pb-24 pt-40 sm:pt-48">
        <Backdrop src={h.heroImage ?? "/images/hero-stage.jpg"} overlay="obsidian" priority alt="Conference stage" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-obsidian-950 to-transparent" />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 inset-y-6 hidden border border-gold-500/20 lg:block"
        />

        <div className="container relative">
          <div className="max-w-4xl">
            <Reveal className="animate-fade-up">
              {h.heroBadge && (
                <div className="flex flex-wrap items-center gap-4">
                  <Eyebrow align="left">{h.heroBadge}</Eyebrow>
                  {h.eventVenue && (
                    <span className="hidden items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-ivory-400/70 sm:flex">
                      <MapPin className="h-3.5 w-3.5 text-gold-500" />
                      {h.eventVenue}
                    </span>
                  )}
                </div>
              )}

              <h1 className="display-xl mt-8 text-ivory-50 text-shadow-luxe">
                {h.heroTitle}
              </h1>

              <GoldRule className="mt-9 !max-w-[180px] !mx-0" />

              <p className="lead mt-8 max-w-2xl">{h.heroSubtitle}</p>

              <div className="mt-11 flex flex-wrap items-center gap-4">
                <Link
                  href={h.heroCtaPrimary.href}
                  className="group inline-flex h-[54px] items-center gap-3 bg-gold-gradient px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-obsidian-950 shadow-gold-sm transition-all duration-300 hover:shadow-gold hover:brightness-[1.06]"
                >
                  {h.heroCtaPrimary.label}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                {h.heroCtaSecondary && (
                  <Link
                    href={h.heroCtaSecondary.href}
                    className="inline-flex h-[54px] items-center gap-3 border border-white/25 px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-ivory-100 backdrop-blur-sm transition-all duration-300 hover:border-gold-400/70 hover:bg-white/[0.06]"
                  >
                    {h.heroCtaSecondary.label}
                  </Link>
                )}
              </div>
            </Reveal>

            {h.showCountdown && h.eventDateISO && (
              <Reveal className="mt-14 max-w-2xl" delay={160}>
                <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
                  <div>
                    <p className="eyebrow mb-4">Doors open in</p>
                    <Countdown targetISO={h.eventDateISO} />
                  </div>
                  <div className="pb-1">
                    <p className="font-sans text-[10.5px] uppercase tracking-[0.24em] text-ivory-500">
                      {formatDate(h.eventDateISO, { weekday: "long", month: "long", day: "numeric" })}
                    </p>
                    {h.eventVenue && (
                      <p className="mt-2 font-serif text-[1.2rem] text-ivory-200">{h.eventVenue}</p>
                    )}
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        </div>

        <div aria-hidden className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 lg:flex">
          <span className="font-sans text-[9.5px] uppercase tracking-luxe text-ivory-500">Scroll</span>
          <span className="h-14 w-px bg-gradient-to-b from-gold-500/70 to-transparent" />
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

      {/* ================= ABOUT ================= */}
      <Section tone="light">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          <Reveal className="relative">
            <div className="relative overflow-hidden rounded-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={h.aboutImage ?? "/images/audience.jpg"}
                alt={h.aboutTitle}
                loading="lazy"
                className="aspect-[4/5] w-full object-cover"
              />
              <span aria-hidden className="absolute inset-4 border border-white/25" />
            </div>
            <div className="absolute -bottom-10 -right-4 hidden w-[58%] border border-ink-900/10 bg-white p-7 shadow-luxe sm:block lg:-right-10">
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
              <Link
                href="/about"
                className="group inline-flex h-[52px] items-center gap-3 bg-obsidian-900 px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-ivory-100 transition-colors hover:bg-obsidian-800"
              >
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

        <div className="mt-24">
          <GoldRule className="mb-14 !max-w-none" />
          <StatStrip stats={stats} tone="light" />
        </div>
      </Section>

      {/* ================= EXPERIENCE ================= */}
      {experience?.items?.length ? (
        <Section className="bg-obsidian-950 bg-grain">
          <SectionHeading
            script={experience.eyebrow ?? "The Experience"}
            eyebrow={experience.title ?? "What you'll find"}
            title={experience.title ?? "Designed down to the last detail"}
            description={experience.body}
          />
          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {experience.items.map((item, i) => (
              <Reveal key={item.title} delay={i * 110}>
                <article className="group relative h-full overflow-hidden rounded-sm border border-white/[0.08]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image ?? "/images/gallery-panel.jpg"}
                    alt={item.title}
                    loading="lazy"
                    className="h-[420px] w-full object-cover transition-transform duration-1000 group-hover:scale-[1.06]"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-obsidian-950 via-obsidian-950/50 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-8">
                    <span className="font-serif text-[1rem] text-gold-400">0{i + 1}</span>
                    <h3 className="mt-3 font-serif text-[1.6rem] leading-tight text-ivory-50">{item.title}</h3>
                    <p className="mt-3 text-[13.5px] leading-[1.85] text-ivory-300/80">{item.description}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </Section>
      ) : null}

      {/* ================= FEATURED EVENT ================= */}
      {featuredEvent && (
        <Section className="bg-obsidian-soft">
          <Reveal className="relative overflow-hidden rounded-sm border border-gold-500/20">
            <Backdrop
              src={featuredEvent.coverImage ?? "/images/hero-stage.jpg"}
              overlay="none"
              className="opacity-45"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-obsidian-950 via-obsidian-950/90 to-obsidian-950/50" />
            <div className="relative grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.3fr_0.9fr] lg:p-16">
              <div>
                <Eyebrow align="left">The flagship gathering</Eyebrow>
                <h2 className="display-md mt-6 text-ivory-50">{featuredEvent.title}</h2>
                <p className="lead mt-5 max-w-xl">{featuredEvent.description}</p>

                <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-[13px] text-ivory-300/80">
                  <span className="flex items-center gap-2.5">
                    <CalendarDays className="h-4 w-4 text-gold-500" />
                    {formatDate(featuredEvent.startAt, { weekday: "long", month: "long", day: "numeric" })}
                  </span>
                  {featuredEvent.venue && (
                    <span className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4 text-gold-500" />
                      {featuredEvent.venue}
                    </span>
                  )}
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-5">
                  <Link
                    href={`/events/${featuredEvent.slug}`}
                    className="inline-flex h-[52px] items-center gap-3 bg-gold-gradient px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-obsidian-950 transition-all hover:brightness-[1.06]"
                  >
                    Reserve your seat
                  </Link>
                  {featuredEvent.price && <Badge variant="outline">{featuredEvent.price}</Badge>}
                </div>
              </div>

              <div className="flex flex-col justify-center border-t border-white/10 pt-10 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
                <p className="eyebrow mb-5">Begins in</p>
                <Countdown targetISO={featuredEvent.startAt} />
                <p className="mt-7 text-[12.5px] leading-relaxed text-ivory-400/80">
                  Held under the chandeliers of Grand Meridian Hall — with a private lounge for pass holders.
                </p>
              </div>
            </div>
          </Reveal>
        </Section>
      )}

      {/* ================= UPCOMING EVENTS ================= */}
      {events.items.length > 0 && (
        <Section className="bg-obsidian-950">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <SectionHeading
              align="left"
              script="The Calendar"
              eyebrow="Upcoming"
              title="Dates worth clearing"
              description="Keynotes, workshops and evening salons — each capped so the room stays worth your time."
            />
            <TextLink href="/events" className="group pb-2">
              All events
            </TextLink>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.items.map((e, i) => (
              <Reveal key={e.id} delay={i * 90}>
                <EventCard event={e} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* ================= SPEAKERS ================= */}
      {speakers.length > 0 && (
        <Section className="relative isolate overflow-hidden bg-obsidian-soft">
          <Backdrop src="/images/texture-marble.jpg" overlay="soft" className="opacity-40" />
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
                className="inline-flex h-[52px] items-center gap-3 border border-gold-500/40 px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-gold-200 transition-all hover:border-gold-400 hover:bg-gold-500/10"
              >
                The full roster
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </Section>
      )}

      {/* ================= GALLERY ================= */}
      <Section className="bg-obsidian-950">
        <SectionHeading
          script="Moments"
          eyebrow="The room"
          title="Inside the last edition"
          description="Unretouched, unposed — this is what the two days actually feel like."
        />
        <div className="mt-14">
          <Gallery items={gallery} columns={3} />
        </div>
      </Section>

      {/* ================= TICKETS ================= */}
      {tickets.length > 0 && (
        <Section tone="light" id="tickets">
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
                      ? "relative flex h-full flex-col border border-gold-500/50 bg-obsidian-950 p-9 text-ivory-100 shadow-luxe"
                      : "relative flex h-full flex-col border border-ink-900/10 bg-white p-9 shadow-sm"
                  }
                >
                  {tier.featured && (
                    <span className="absolute -top-3 left-9">
                      <Badge variant="solidGold">
                        <Sparkles className="h-3 w-3" /> Most chosen
                      </Badge>
                    </span>
                  )}
                  <p
                    className={
                      tier.featured
                        ? "font-sans text-[10.5px] uppercase tracking-[0.26em] text-gold-300"
                        : "font-sans text-[10.5px] uppercase tracking-[0.26em] text-gold-700"
                    }
                  >
                    {tier.note ?? "Pass"}
                  </p>
                  <h3 className={tier.featured ? "mt-4 font-serif text-[1.75rem] text-ivory-50" : "mt-4 font-serif text-[1.75rem] text-ink-900"}>
                    {tier.name}
                  </h3>
                  <p
                    className={
                      tier.featured
                        ? "mt-5 font-serif text-[2.6rem] leading-none text-gold-200"
                        : "mt-5 font-serif text-[2.6rem] leading-none text-ink-900"
                    }
                  >
                    {tier.price}
                  </p>
                  <span className={tier.featured ? "mt-7 h-px w-full bg-white/10" : "mt-7 h-px w-full bg-ink-900/10"} />
                  <ul className="mt-7 flex-1 space-y-3.5">
                    {tier.perks.map((perk) => (
                      <li key={perk} className="flex gap-3">
                        <Diamond
                          className={
                            tier.featured
                              ? "mt-2 h-1 w-1 shrink-0 bg-gold-400"
                              : "mt-2 h-1 w-1 shrink-0 bg-gold-600"
                          }
                        />
                        <span
                          className={
                            tier.featured
                              ? "text-[13.5px] leading-relaxed text-ivory-300/80"
                              : "text-[13.5px] leading-relaxed text-ink-500"
                          }
                        >
                          {perk}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/contact"
                    className={
                      tier.featured
                        ? "mt-9 inline-flex h-[52px] items-center justify-center bg-gold-gradient px-6 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-obsidian-950 transition-all hover:brightness-[1.06]"
                        : "mt-9 inline-flex h-[52px] items-center justify-center border border-ink-900/20 px-6 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-ink-900 transition-colors hover:border-gold-600 hover:text-gold-700"
                    }
                  >
                    Request this pass
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* ================= TESTIMONIALS ================= */}
      {testimonials.length > 0 && (
        <Section className="bg-obsidian-soft">
          <div className="grid gap-8 lg:grid-cols-2">
            {testimonials.slice(0, 2).map((t, i) => (
              <QuoteBlock key={t.name + i} quote={t.quote} name={t.name} role={t.role} />
            ))}
          </div>
        </Section>
      )}

      {/* ================= JOURNAL ================= */}
      {posts.items.length > 0 && (
        <Section className="bg-obsidian-950">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <SectionHeading
              align="left"
              script="The Journal"
              eyebrow="Writing"
              title="Letters from the desk"
              description="Essays from the team and our speakers on building, pricing and keeping taste."
            />
            <TextLink href="/blog" className="group pb-2">
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

      {/* ================= FAQ ================= */}
      {faqs.length > 0 && (
        <Section tone="light">
          <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <SectionHeading
              align="left"
              tone="light"
              script="Good to know"
              eyebrow="Questions"
              title="Everything you might ask"
              description="Still unsure? Write to us — a human replies within two business days."
            />
            <div className="lg:pt-4">
              <Accordion items={faqs} tone="light" />
            </div>
          </div>
        </Section>
      )}

      {/* ================= CTA / NEWSLETTER ================= */}
      <section className="relative isolate overflow-hidden">
        <Backdrop src="/images/cta-silk.jpg" overlay="none" />
        <div className="absolute inset-0 bg-obsidian-950/90" />
        <span aria-hidden className="pointer-events-none absolute inset-x-6 inset-y-6 hidden border border-gold-500/20 lg:block" />
        <div className="container relative py-24 text-center sm:py-28">
          <Reveal className="mx-auto max-w-2xl">
            <Script className="text-[2.6rem] leading-none sm:text-[3.2rem]">Join the inner circle</Script>
            <h2 className="display-lg mt-6 text-ivory-50">Never miss an announcement</h2>
            <p className="lead mt-5">
              Speaker drops, early-bird tickets and the occasional letter from the founders. One email a month, no noise.
            </p>
            <div className="mx-auto mt-10 max-w-lg">
              <NewsletterForm variant="dark" source="homepage" />
            </div>
            <p className="mt-5 flex items-center justify-center gap-3 text-[11.5px] uppercase tracking-[0.2em] text-ivory-500">
              <Diamond className="h-1 w-1" />
              Unsubscribe in one click
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
