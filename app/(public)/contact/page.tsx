import type { Metadata } from "next";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { getPublicSettings } from "@/lib/firestore/settings";
import { ContactForm } from "@/components/public/contact-form";
import { Reveal } from "@/components/public/reveal";
import { Diamond } from "@/components/ui/badge";
import { Eyebrow, PageHero, Script, Section, SectionHeading } from "@/components/public/ui-kit";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact",
  description: "Tickets, speaking, partnerships and press — reach the ManUp team directly.",
};

export default async function ContactPage() {
  const settings = await getPublicSettings();

  return (
    <>
      <PageHero
        script="Correspondence"
        eyebrow="Contact"
        title="Let's talk"
        description="Questions about passes, speaking or partnerships? Send a note — a human replies within two business days."
        image="/images/page-header.jpg"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />

      <Section tone="light">
        <div className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          {/* Form */}
          <Reveal className="border border-ink-900/10 bg-white p-8 shadow-luxe sm:p-11">
            <Eyebrow align="left">Send a message</Eyebrow>
            <h2 className="display-md mt-5 text-ink-900">Tell us what you need</h2>
            <p className="lead-dark mt-4">
              For speaker submissions, please include a short outline and a link to a previous talk.
            </p>
            <div className="mt-9">
              <ContactForm />
            </div>
          </Reveal>

          {/* Details */}
          <Reveal delay={120} className="lg:sticky lg:top-28 lg:self-start">
            <div className="relative overflow-hidden border border-gold-500/20 bg-obsidian-950 p-9 text-ivory-100">
              <span aria-hidden className="pointer-events-none absolute inset-3 border border-gold-500/20" />
              <Script className="text-[2.2rem] leading-none">reach us</Script>
              <ul className="mt-8 space-y-7 text-[14px]">
                {settings.address && (
                  <li className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-gold-500/40 text-gold-300">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <span className="pt-2 leading-relaxed text-ivory-300/80">{settings.address}</span>
                  </li>
                )}
                {settings.phone && (
                  <li className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-gold-500/40 text-gold-300">
                      <Phone className="h-4 w-4" />
                    </span>
                    <a href={`tel:${settings.phone}`} className="pt-2 text-ivory-300/80 transition-colors hover:text-gold-200">
                      {settings.phone}
                    </a>
                  </li>
                )}
                <li className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-gold-500/40 text-gold-300">
                    <Mail className="h-4 w-4" />
                  </span>
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="break-all pt-2 text-ivory-300/80 transition-colors hover:text-gold-200"
                  >
                    {settings.contactEmail}
                  </a>
                </li>
                <li className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-gold-500/40 text-gold-300">
                    <Clock className="h-4 w-4" />
                  </span>
                  <span className="pt-2 leading-relaxed text-ivory-300/80">
                    Studio hours — Monday to Friday, 09:00–18:00
                    {settings.timezone ? ` (${settings.timezone})` : ""}
                  </span>
                </li>
              </ul>

              <span className="mt-9 block h-px w-full bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />

              <div className="mt-8">
                <p className="font-sans text-[10.5px] uppercase tracking-[0.26em] text-gold-300">Press &amp; Partnerships</p>
                <p className="mt-3 text-[13.5px] leading-relaxed text-ivory-400/80">
                  Add “Press” or “Partnership” to your subject line and your note routes straight to the founders.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4 border border-ink-900/10 bg-white p-6">
              <Diamond />
              <p className="text-[12.5px] leading-relaxed text-ink-500">
                We never share your details, and we do not run advertising trackers on this site.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section className="bg-obsidian-soft">
        <SectionHeading
          script="Before you write"
          eyebrow="Quick answers"
          title="The three questions we get most"
        />
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
          {[
            {
              q: "Can I transfer my ticket?",
              a: "Yes — transfers are free up to 72 hours before doors open. Forward your confirmation email and we will reissue it.",
            },
            {
              q: "Do you accept speaker submissions?",
              a: "We do, year round. Send an outline, a recording and the single idea you would bring to the stage.",
            },
            {
              q: "Is sponsorship available?",
              a: "A limited number of partner tables are released each edition. Ask for the partner pack in your message.",
            },
          ].map((item, i) => (
            <Reveal key={item.q} delay={i * 100}>
              <article className="h-full rounded-sm border border-white/[0.08] bg-white/[0.025] p-8">
                <h3 className="font-serif text-[1.3rem] text-ivory-50">{item.q}</h3>
                <p className="mt-3 text-[13.5px] leading-[1.9] text-ivory-400/80">{item.a}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
