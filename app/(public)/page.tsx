import Link from "next/link";
import { ArrowRight, MapPin, CalendarDays, Mic2, Users, Sparkles, Ticket } from "lucide-react";
import { getPublicSettings } from "@/lib/firestore/settings";
import { listPublishedEvents, listPublishedPosts, listPublishedSpeakers } from "@/lib/firestore/content";
import { Reveal, SectionHeading } from "@/components/public/reveal";
import { Countdown } from "@/components/public/countdown";
import { EventCard, PostCard, SpeakerCard } from "@/components/public/cards";
import { NewsletterForm } from "@/components/public/newsletter-form";

export const revalidate = 120;

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
    safe(() => listPublishedSpeakers({ limit: 4, featuredOnly: true }).then(async (s) => (s.length ? s : listPublishedSpeakers({ limit: 4 }))), []),
    safe(() => listPublishedPosts({ limit: 3 }), { items: [], nextCursor: null }),
  ]);

  return (
    <>
      {/* ============ HERO (ManUp DNA: dark stage + gradient + countdown) ============ */}
      <section className="relative overflow-hidden bg-ink-950 pb-20 pt-36 md:pb-28 md:pt-48">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute -left-40 top-0 h-[480px] w-[480px] rounded-full bg-brand-600/25 blur-[140px]" />
          <div className="absolute -right-40 bottom-0 h-[480px] w-[480px] rounded-full bg-ember-500/20 blur-[140px]" />
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.5) 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        <div className="container relative grid items-center gap-12 lg:grid-cols-[1.15fr_.85fr]">
          <div className="animate-fade-up">
            {(h.heroBadge || h.eventVenue) && (
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[13px] font-semibold text-white/85 backdrop-blur">
                <Sparkles className="h-4 w-4 text-ember-400" />
                {h.heroBadge}
                {h.eventVenue ? ` · ${h.eventVenue}` : ""}
              </p>
            )}
            <h1 className="mt-6 font-display text-[2.6rem] font-extrabold leading-[1.05] text-white md:text-6xl">
              {h.heroTitle.split(" ").slice(0, -2).join(" ")}{" "}
              <span className="text-gradient">{h.heroTitle.split(" ").slice(-2).join(" ")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/65 md:text-lg">
              {h.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={h.heroCtaPrimary.href}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-gradient px-7 text-[15px] font-semibold text-white shadow-pop transition-all hover:brightness-105 active:scale-[.98]"
              >
                <Ticket className="h-4 w-4" /> {h.heroCtaPrimary.label}
              </Link>
              {h.heroCtaSecondary && (
                <Link
                  href={h.heroCtaSecondary.href}
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 text-[15px] font-semibold text-white backdrop-blur transition-all hover:bg-white/10"
                >
                  {h.heroCtaSecondary.label} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            {h.showCountdown && h.eventDateISO && (
              <div className="mt-10">
                <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em] text-white/50">
                  Countdown to the main event
                </p>
                <Countdown targetISO={h.eventDateISO} dark />
              </div>
            )}
          </div>

          <div className="relative hidden animate-fade-up lg:block" style={{ animationDelay: "120ms" }}>
            <div className="overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
              {h.heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={h.heroImage} alt="Conference stage" className="aspect-[4/5] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/5] w-full flex-col justify-end bg-brand-gradient p-8">
                  <CalendarDays className="h-12 w-12 text-white/80" />
                  <p className="mt-4 font-display text-3xl font-extrabold text-white">
                    {h.eventDateISO ? new Date(h.eventDateISO).getFullYear() : "Annual"} Edition
                  </p>
                  {h.eventVenue && <p className="mt-2 flex items-center gap-2 text-white/80"><MapPin className="h-4 w-4" />{h.eventVenue}</p>}
                </div>
              )}
            </div>
            <div className="absolute -bottom-6 -left-6 grid grid-cols-2 gap-3">
              {h.aboutStats.slice(0, 2).map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-ink-900/90 px-5 py-4 backdrop-blur">
                  <p className="font-display text-2xl font-extrabold text-white">{s.value}</p>
                  <p className="text-[12px] font-medium uppercase tracking-wider text-white/55">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS STRIP ============ */}
      <section className="border-b border-ink-100 bg-white">
        <div className="container grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
          {h.aboutStats.map((s, i) => (
            <Reveal key={s.label} delay={i * 60} className="text-center">
              <p className="font-display text-3xl font-extrabold text-ink-900 md:text-4xl">{s.value}</p>
              <p className="mt-1 text-[13px] font-semibold uppercase tracking-wider text-ink-400">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ ABOUT ============ */}
      <section className="bg-white py-20 md:py-28">
        <div className="container grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            {h.aboutImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={h.aboutImage} alt="About the conference" className="aspect-[4/3] w-full rounded-3xl object-cover shadow-card" loading="lazy" />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-3xl bg-brand-gradient p-8 pt-16">
                  <Mic2 className="h-10 w-10 text-white" />
                  <p className="mt-3 font-display text-xl font-bold text-white">World-class speakers</p>
                </div>
                <div className="mt-8 rounded-3xl bg-ink-900 p-8 pt-16">
                  <Users className="h-10 w-10 text-ember-400" />
                  <p className="mt-3 font-display text-xl font-bold text-white">Community first</p>
                </div>
              </div>
            )}
          </Reveal>
          <div>
            <SectionHeading align="left" eyebrow="About" title={h.aboutTitle} />
            <Reveal>
              <p className="-mt-6 whitespace-pre-line text-[15px] leading-relaxed text-ink-500">{h.aboutBody}</p>
              <Link
                href="/about"
                className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-brand-600 hover:text-brand-700"
              >
                Learn more about us <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ UPCOMING EVENTS ============ */}
      {events.items.length > 0 && (
        <section className="bg-ink-50/60 py-20 md:py-28">
          <div className="container">
            <SectionHeading
              eyebrow="Schedule"
              title="Upcoming events"
              description="Keynotes, workshops and networking — pick your sessions and grab a seat."
            />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.items.map((e, i) => (
                <Reveal key={e.id} delay={i * 70}>
                  <EventCard event={e} />
                </Reveal>
              ))}
            </div>
            <Reveal className="mt-10 text-center">
              <Link
                href="/events"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-ink-200 bg-white px-7 text-[15px] font-semibold text-ink-900 transition-all hover:border-brand-300 hover:text-brand-600"
              >
                View all events <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* ============ SPEAKERS ============ */}
      {speakers.length > 0 && (
        <section className="bg-ink-950 py-20 md:py-28">
          <div className="container">
            <SectionHeading
              dark
              eyebrow="Speakers"
              title="Meet the voices on stage"
              description="Founders, engineers and storytellers shaping what's next."
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {speakers.map((s, i) => (
                <Reveal key={s.id} delay={i * 70}>
                  <SpeakerCard speaker={s} />
                </Reveal>
              ))}
            </div>
            <Reveal className="mt-10 text-center">
              <Link
                href="/speakers"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white/10 px-7 text-[15px] font-semibold text-white backdrop-blur transition-all hover:bg-white/15"
              >
                All speakers <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* ============ BLOG ============ */}
      {posts.items.length > 0 && (
        <section className="bg-white py-20 md:py-28">
          <div className="container">
            <SectionHeading
              eyebrow="Stories"
              title="Latest from the blog"
              description="Recaps, speaker interviews and behind-the-scenes notes."
            />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.items.map((p, i) => (
                <Reveal key={p.id} delay={i * 70}>
                  <PostCard post={p} />
                </Reveal>
              ))}
            </div>
            <Reveal className="mt-10 text-center">
              <Link
                href="/blog"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-ink-200 bg-white px-7 text-[15px] font-semibold text-ink-900 transition-all hover:border-brand-300 hover:text-brand-600"
              >
                Visit the blog <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* ============ CTA / NEWSLETTER ============ */}
      <section className="relative overflow-hidden py-20 md:py-24">
        <div className="container">
          <Reveal className="relative overflow-hidden rounded-3xl bg-brand-gradient px-6 py-14 text-center md:px-16 md:py-16">
            <div
              aria-hidden
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.6) 1px, transparent 0)",
                backgroundSize: "26px 26px",
              }}
            />
            <div className="relative mx-auto max-w-xl">
              <h2 className="font-display text-3xl font-extrabold text-white md:text-4xl">
                Never miss an announcement
              </h2>
              <p className="mt-3 text-white/85">Speaker drops, early-bird tickets and schedules — straight to your inbox.</p>
              <div className="mx-auto mt-7 max-w-md">
                <NewsletterForm variant="dark" source="homepage" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
