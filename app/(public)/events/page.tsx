import type { Metadata } from "next";
import { listPublishedEvents } from "@/lib/firestore/content";
import { PageHero, EventCard } from "@/components/public/cards";
import { Reveal } from "@/components/public/reveal";
import { EmptyState } from "@/components/ui/feedback";
import { CalendarDays } from "lucide-react";
import { EventsClient } from "./events-client";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Events",
  description: "Browse upcoming conferences, workshops and meetups. Find your session and grab a seat.",
};

export default async function EventsPage() {
  const data = await listPublishedEvents({ limit: 12 }).catch(() => ({ items: [], nextCursor: null }));

  return (
    <>
      <PageHero
        eyebrow="Schedule"
        title="Events & schedule"
        description="Keynotes, workshops and networking sessions — all in one place."
      />
      <section className="bg-white py-14 md:py-20">
        <div className="container">
          {data.items.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-7 w-7" />}
              title="No events yet"
              message="We're curating the next edition. Check back soon or subscribe for announcements."
            />
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {data.items.map((e, i) => (
                  <Reveal key={e.id} delay={(i % 3) * 70}>
                    <EventCard event={e} />
                  </Reveal>
                ))}
              </div>
              <EventsClient initialCursor={data.nextCursor} />
            </>
          )}
        </div>
      </section>
    </>
  );
}
