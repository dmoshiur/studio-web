import type { Metadata } from "next";
import { Mic2 } from "lucide-react";
import { listPublishedSpeakers } from "@/lib/firestore/content";
import { PageHero, SpeakerCard } from "@/components/public/cards";
import { Reveal } from "@/components/public/reveal";
import { EmptyState } from "@/components/ui/feedback";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Speakers",
  description: "Meet the founders, engineers and storytellers taking the ManUp stage.",
};

export default async function SpeakersPage() {
  const speakers = await listPublishedSpeakers({ limit: 60 }).catch(() => []);

  return (
    <>
      <PageHero
        eyebrow="Lineup"
        title="Speakers"
        description="The voices behind the ideas — founders, builders and world-class storytellers."
      />
      <section className="bg-white py-14 md:py-20">
        <div className="container">
          {speakers.length === 0 ? (
            <EmptyState
              icon={<Mic2 className="h-7 w-7" />}
              title="Speakers coming soon"
              message="We're confirming the lineup for the next edition. Stay tuned."
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {speakers.map((s, i) => (
                <Reveal key={s.id} delay={(i % 4) * 60}>
                  <SpeakerCard speaker={s} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
