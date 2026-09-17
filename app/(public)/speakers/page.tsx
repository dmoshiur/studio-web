import type { Metadata } from "next";
import { Mic2 } from "lucide-react";
import { listPublishedSpeakers } from "@/lib/firestore/content";
import { SpeakerCard } from "@/components/public/cards";
import { Reveal } from "@/components/public/reveal";
import { EmptyState } from "@/components/ui/feedback";
import { PageHero, Section, SectionHeading } from "@/components/public/ui-kit";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Speakers",
  description: "The founders, operators and storytellers taking the ManUp stage this edition.",
};

export default async function SpeakersPage() {
  const speakers = await listPublishedSpeakers({ limit: 60 }).catch(() => []);
  const featured = speakers.filter((s) => s.featured);
  const rest = speakers.filter((s) => !s.featured);

  return (
    <>
      <PageHero
        script="The Lineup"
        eyebrow="Speakers"
        title="Voices that have earned the room"
        description="Each speaker is asked for one idea they have never presented publicly. No panels that say nothing."
        image="/images/gallery-panel.jpg"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Speakers" }]}
      />

      <Section className="relative isolate overflow-hidden bg-white">
        {speakers.length === 0 ? (
          <EmptyState
            tone="light"
            icon={<Mic2 className="h-7 w-7" />}
            title="The lineup is being confirmed"
            message="Join the invitation list and you will meet the first names before they are announced publicly."
          />
        ) : (
          <>
            <SectionHeading
              script="Main stage"
              eyebrow={`${speakers.length} confirmed`}
              title="This edition's roster"
              description="Talks run forty minutes with no filler, followed by twenty minutes of open questions."
            />

            {featured.length > 0 && (
              <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {featured.map((s, i) => (
                  <Reveal key={s.id} delay={(i % 4) * 90}>
                    <SpeakerCard speaker={s} />
                  </Reveal>
                ))}
              </div>
            )}

            {rest.length > 0 && (
              <>
                <div className="mt-20 flex items-center gap-6">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-500/40 to-gold-500/40" />
                  <span className="font-sans text-[10.5px] uppercase tracking-luxe text-gold-700">Also on stage</span>
                  <span className="h-px flex-1 bg-gradient-to-l from-transparent via-gold-500/40 to-gold-500/40" />
                </div>
                <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {rest.map((s, i) => (
                    <Reveal key={s.id} delay={(i % 4) * 70}>
                      <SpeakerCard speaker={s} />
                    </Reveal>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </Section>

      <Section tone="light">
        <div className="grid gap-12 lg:grid-cols-3">
          {[
            {
              title: "Propose a talk",
              body: "Send an outline, a recording and the single idea you would bring to the stage.",
            },
            {
              title: "Rehearsed, not scripted",
              body: "Every session is workshopped with a producer so the timing and the story land.",
            },
            {
              title: "Paid, as it should be",
              body: "Speakers are paid and travel is covered. We do not sell stage time — ever.",
            },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 90}>
              <div className="border-t border-ink-900/20 pt-7">
                <h3 className="font-serif text-[1.4rem] text-ink-900">{item.title}</h3>
                <p className="mt-3 text-[13.5px] leading-[1.9] text-ink-500">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
