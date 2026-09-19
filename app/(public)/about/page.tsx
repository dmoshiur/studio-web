import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Target, Heart, Zap } from "lucide-react";
import { getPublicSettings } from "@/lib/firestore/settings";
import { getPageBySlug } from "@/lib/firestore/content";
import { Reveal } from "@/components/public/reveal";
import { OwnerSpotlight } from "@/components/public/owner-spotlight";
import {
  Backdrop,
  Eyebrow,
  PageHero,
  Script,
  Section,
  SectionHeading,
  StatStrip,
} from "@/components/public/ui-kit";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About",
  description:
    "The story, the standard and the people behind Photography — a curated event management studio for photographers, filmmakers and creatives.",
};

const VALUES = [
  {
    icon: Target,
    title: "Signal over noise",
    body: "Every session is programmed, not sponsored. Each speaker is asked for one idea they have never presented publicly.",
  },
  {
    icon: Heart,
    title: "Hospitality as strategy",
    body: "Long tables, real introductions and a team that remembers your name. The room is the product.",
  },
  {
    icon: Zap,
    title: "Actionable by Monday",
    body: "You leave with decisions made, playbooks written and three people worth emailing back.",
  },
];

export default async function AboutPage() {
  const settings = await getPublicSettings();
  const customPage = await getPageBySlug("about").catch(() => null);
  const h = settings.homepage;
  const stats = h.stats ?? h.aboutStats ?? [];

  return (
    <>
      <PageHero
        script={settings.siteName}
        eyebrow="Our Story"
        title="A stage for people who refuse to settle"
        description={settings.tagline}
        image="/images/page-header.jpg"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "About" }]}
      />

      {/* Narrative */}
      <Section tone="light">
        <div className="grid items-start gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <SectionHeading
              align="left"
              tone="light"
              script="Seven editions"
              eyebrow="About the house"
              title={h.aboutTitle}
            />
            <Reveal className="mt-8">
              {customPage?.status === "published" ? (
                <div
                  className="space-y-5 text-[15.5px] leading-[1.95] text-ink-500 [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-[1.7rem] [&_h2]:text-ink-900 [&_p]:mt-5"
                  dangerouslySetInnerHTML={{ __html: customPage.contentHtml }}
                />
              ) : (
                (h.aboutBody ?? "").split("\n\n").map((para, i) => (
                  <p key={i} className="lead-dark mt-5">
                    {para}
                  </p>
                ))
              )}
            </Reveal>
          </div>

          <Reveal delay={120} className="relative">
            <div className="relative overflow-hidden rounded-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={h.aboutImage ?? "/images/audience.jpg"}
                alt="The audience"
                loading="lazy"
                className="aspect-[4/5] w-full object-cover"
              />
              <span aria-hidden className="absolute inset-4 border border-white/30" />
            </div>
            <div className="mt-8 border border-line bg-white p-7 shadow-luxe">
              <Script className="text-[2.1rem] leading-none">our promise</Script>
              <p className="mt-3 font-serif text-[1.15rem] italic leading-relaxed text-ink-700">
                “If an idea cannot be used within a week of leaving the room, it does not belong on the stage.”
              </p>
            </div>
          </Reveal>
        </div>

        <div className="mt-24">
          <StatStrip stats={stats} tone="light" />
        </div>
      </Section>

      {/* The owner — portrait, name and a personal message */}
      <OwnerSpotlight owner={settings.homepage.owner} placement="about" />

      {/* Values */}
      <Section className="relative isolate overflow-hidden bg-white">
        <Backdrop src="/images/texture-marble.jpg" overlay="none" className="opacity-[0.05]" />
        <div className="relative">
          <SectionHeading
            script="What we hold to"
            eyebrow="Values"
            title="Three things we refuse to compromise"
          />
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 110}>
                <article className="h-full rounded-sm border border-line bg-white p-9 shadow-card transition-shadow duration-500 hover:shadow-lift">
                  <span className="flex h-12 w-12 items-center justify-center border border-gold-600/40 bg-white text-gold-700">
                    <v.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-7 font-serif text-[1.4rem] text-ink-900">{v.title}</h3>
                  <p className="mt-3 text-[13.5px] leading-[1.9] text-ink-500">{v.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section tone="light">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Eyebrow>Next step</Eyebrow>
          <h2 className="display-lg mt-6 text-ink-900">Come and see the room for yourself</h2>
          <p className="lead-dark mx-auto mt-5 max-w-xl">
            Seats are released in three waves and the Founder&apos;s Pass has sold out every edition.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link
              href="/events"
              className="btn-editorial group"
            >
              Browse the calendar
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/contact"
              className="btn-quiet"
            >
              Talk to the team
            </Link>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
