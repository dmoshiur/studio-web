import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Target, Heart, Zap, Users } from "lucide-react";
import { getPublicSettings } from "@/lib/firestore/settings";
import { getPageBySlug } from "@/lib/firestore/content";
import { PageHero } from "@/components/public/cards";
import { Reveal, SectionHeading } from "@/components/public/reveal";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "About",
  description: "Learn about the ManUp conference — our mission, values and the team behind the stage.",
};

const VALUES = [
  { icon: Target, title: "Signal over noise", body: "Every session is curated. No filler talks, no pay-to-play keynotes — only ideas worth your time." },
  { icon: Users, title: "Community first", body: "Hallway conversations matter as much as the stage. We design for connection, not just attendance." },
  { icon: Zap, title: "Actionable takeaways", body: "You'll leave with playbooks, contacts and experiments to run on Monday morning — not just inspiration." },
];

export default async function AboutPage() {
  const settings = await getPublicSettings();
  const customPage = await getPageBySlug("about").catch(() => null);
  const h = settings.homepage;

  return (
    <>
      <PageHero
        eyebrow="About"
        title="The conference for people who build what's next"
        description={settings.tagline}
      />

      <section className="bg-white py-16 md:py-24">
        <div className="container grid items-start gap-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-3xl font-extrabold text-ink-900">{h.aboutTitle}</h2>
            {customPage?.status === "published" ? (
              <div className="prose-manup mt-5" dangerouslySetInnerHTML={{ __html: customPage.contentHtml }} />
            ) : (
              <p className="mt-5 whitespace-pre-line leading-relaxed text-ink-500">{h.aboutBody}</p>
            )}
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {h.aboutStats.map((s) => (
                <div key={s.label} className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4 text-center">
                  <p className="font-display text-2xl font-extrabold text-ink-900">{s.value}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{s.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={100}>
            {h.aboutImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={h.aboutImage} alt="Conference audience" className="aspect-[4/5] w-full rounded-3xl object-cover shadow-card" loading="lazy" />
            ) : (
              <div className="flex aspect-[4/5] w-full flex-col justify-between rounded-3xl bg-ink-950 p-8">
                <div className="flex gap-3">
                  <span className="h-3 w-3 rounded-full bg-brand-500" />
                  <span className="h-3 w-3 rounded-full bg-ember-500" />
                  <span className="h-3 w-3 rounded-full bg-white/20" />
                </div>
                <div>
                  <Heart className="h-10 w-10 text-brand-400" />
                  <p className="mt-4 font-display text-2xl font-bold leading-snug text-white">
                    “The most energizing two days of my year. I came for the talks and stayed for the people.”
                  </p>
                  <p className="mt-3 text-sm text-white/60">— Past attendee</p>
                </div>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      <section className="bg-ink-50/60 py-16 md:py-24">
        <div className="container">
          <SectionHeading eyebrow="Values" title="What we optimize for" />
          <div className="grid gap-6 md:grid-cols-3">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 70} className="rounded-2xl border border-ink-100 bg-white p-7 shadow-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient-soft text-brand-600">
                  <v.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-ink-900">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{v.body}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10 text-center">
            <Link
              href="/events"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-gradient px-7 text-[15px] font-semibold text-white shadow-pop transition-all hover:brightness-105"
            >
              Browse events <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
