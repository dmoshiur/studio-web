import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { listPublishedScheduleDays, listPublishedSpeakers } from "@/lib/firestore/content";
import { ScheduleTabs } from "@/components/public/schedule";
import { EmptyState } from "@/components/ui/feedback";
import { PageHero, Section, SectionHeading } from "@/components/public/ui-kit";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Schedule",
  description:
    "The day-by-day schedule — keynotes, live-shoot workshops, portfolio reviews and evening sessions across the summit.",
};

export default async function SchedulePage() {
  const [days, speakers] = await Promise.all([
    listPublishedScheduleDays().catch(() => []),
    listPublishedSpeakers({ limit: 100 }).catch(() => []),
  ]);

  const totalSessions = days.reduce((n, d) => n + d.sessions.length, 0);

  return (
    <>
      <PageHero
        script="The Program"
        eyebrow="Schedule"
        title="Three days, hour by hour"
        description="Every session on the calendar — keynotes, lighting labs, portfolio reviews and the closing gala. Pick a day and build your route through the summit."
        image="/images/gallery-panel.jpg"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Schedule" }]}
      />

      <Section className="bg-white">
        {days.length === 0 ? (
          <EmptyState
            tone="light"
            icon={<CalendarDays className="h-7 w-7" />}
            title="The schedule is being finalised"
            message="Dates and sessions are confirmed with speakers right now — check back shortly."
          />
        ) : (
          <>
            <SectionHeading
              script="the running order"
              eyebrow={`${days.length} days · ${totalSessions} sessions`}
              title="Pick a day"
              description="Tabs switch instantly — no page reloads. Tap any session to see its speakers."
            />
            <div className="mt-14">
              <ScheduleTabs days={days} speakers={speakers} />
            </div>
          </>
        )}
      </Section>
    </>
  );
}
