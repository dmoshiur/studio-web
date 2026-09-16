import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { listPublishedEvents } from "@/lib/firestore/content";
import { getPublicSettings } from "@/lib/firestore/settings";
import { EventCard } from "@/components/public/cards";
import { Reveal } from "@/components/public/reveal";
import { EmptyState } from "@/components/ui/feedback";
import { Countdown } from "@/components/public/countdown";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, PageHero, Section, SectionHeading } from "@/components/public/ui-kit";
import { formatDate } from "@/lib/utils";
import { EventsClient } from "./events-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events",
  description: "The full ManUp calendar — summits, workshops and evening salons. Find your seat.",
};

export default async function EventsPage() {
  const [data, settings] = await Promise.all([
    listPublishedEvents({ limit: 12 }).catch(() => ({ items: [], nextCursor: null })),
    getPublicSettings(),
  ]);

  const upcoming = data.items.filter((e) => new Date(e.startAt).getTime() >= Date.now());
  const past = data.items.filter((e) => new Date(e.startAt).getTime() < Date.now());
  const next = upcoming[0];

  return (
    <>
      <PageHero
        script="The Calendar"
        eyebrow="Events"
        title="Dates worth clearing"
        description="Two-day summits, single-afternoon workshops and intimate evening salons — each capped so the room stays worth your time."
        image="/images/hero-stage.jpg"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Events" }]}
      >
        {next && (
          <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
            <div>
              <p className="eyebrow mb-4">Next doors open in</p>
              <Countdown targetISO={next.startAt} />
            </div>
            <div className="pb-1">
              <p className="font-sans text-[10.5px] uppercase tracking-[0.24em] text-ivory-500">Up next</p>
              <p className="mt-2 max-w-sm font-serif text-[1.35rem] text-ivory-100">{next.title}</p>
              <p className="mt-1 text-[12.5px] text-ivory-400/80">
                {formatDate(next.startAt, { weekday: "long", month: "long", day: "numeric" })}
                {next.venue ? ` · ${next.venue}` : ""}
              </p>
            </div>
          </div>
        )}
      </PageHero>

      <Section className="bg-obsidian-950">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-7 w-7" />}
            title="The next edition is being programmed"
            message="Join the invitation list and you will hear about it before the tickets go public."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-8">
              <SectionHeading
                align="left"
                script="Upcoming"
                eyebrow={`${upcoming.length} date${upcoming.length === 1 ? "" : "s"}`}
                title="On the schedule"
                description="Passes cover every session on the day, the hospitality and the recordings."
              />
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(upcoming.length ? upcoming : data.items).map((e, i) => (
                <Reveal key={e.id} delay={(i % 3) * 90}>
                  <EventCard event={e} />
                </Reveal>
              ))}
            </div>
            <EventsClient initialCursor={data.nextCursor} />
          </>
        )}
      </Section>

      {past.length > 0 && (
        <Section className="bg-obsidian-soft">
          <SectionHeading
            script="Archive"
            eyebrow="Past editions"
            title="Previously on stage"
            description="Recordings from these editions are available to pass holders."
          />
          <div className="mt-14 divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {past.map((e, i) => (
              <Reveal key={e.id} delay={i * 60}>
                <article className="grid items-center gap-4 py-7 sm:grid-cols-[130px_1fr_auto]">
                  <p className="font-sans text-[11px] uppercase tracking-[0.24em] text-gold-400">
                    {formatDate(e.startAt, { month: "long", year: "numeric" })}
                  </p>
                  <div>
                    <h3 className="font-serif text-[1.35rem] text-ivory-100">{e.title}</h3>
                    {e.venue && <p className="mt-1 text-[12.5px] text-ivory-500">{e.venue}</p>}
                  </div>
                  <Badge variant="default">Archived</Badge>
                </article>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      <Section tone="light">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Eyebrow>Hospitality</Eyebrow>
          <h2 className="display-lg mt-6 text-ink-900">Everything a pass includes</h2>
          <p className="lead-dark mx-auto mt-5 max-w-xl">
            Doors open at 08:00 with breakfast served. Every session is recorded, and pass holders keep the archive for
            twelve months. {settings.contactEmail ? `Questions? Write to ${settings.contactEmail}.` : ""}
          </p>
        </Reveal>
      </Section>
    </>
  );
}
