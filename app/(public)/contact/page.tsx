import type { Metadata } from "next";
import { MapPin, Phone, Mail } from "lucide-react";
import { getPublicSettings } from "@/lib/firestore/settings";
import { PageHero } from "@/components/public/cards";
import { Reveal } from "@/components/public/reveal";
import { ContactForm } from "@/components/public/contact-form";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch — speaking, tickets, partnerships and press.",
};

export default async function ContactPage() {
  const settings = await getPublicSettings();

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let's talk"
        description="Questions about tickets, speaking or partnerships? Send a message — we reply within two business days."
      />
      <section className="bg-white py-14 md:py-20">
        <div className="container grid gap-10 lg:grid-cols-[1fr_360px]">
          <Reveal className="rounded-3xl border border-ink-100 bg-white p-6 shadow-card md:p-8">
            <ContactForm />
          </Reveal>
          <Reveal delay={100}>
            <div className="rounded-3xl bg-ink-950 p-7 text-white lg:sticky lg:top-24">
              <h2 className="font-display text-lg font-bold">Contact information</h2>
              <ul className="mt-5 space-y-4 text-sm">
                {settings.address && (
                  <li className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                      <MapPin className="h-5 w-5 text-brand-400" />
                    </span>
                    <span className="pt-2 text-white/80">{settings.address}</span>
                  </li>
                )}
                {settings.phone && (
                  <li className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                      <Phone className="h-5 w-5 text-brand-400" />
                    </span>
                    <a href={`tel:${settings.phone}`} className="pt-2 text-white/80 hover:text-white">{settings.phone}</a>
                  </li>
                )}
                <li className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <Mail className="h-5 w-5 text-brand-400" />
                  </span>
                  <a href={`mailto:${settings.contactEmail}`} className="break-all pt-2 text-white/80 hover:text-white">
                    {settings.contactEmail}
                  </a>
                </li>
              </ul>
              <div className="mt-6 rounded-2xl bg-brand-gradient p-5">
                <p className="font-display text-[15px] font-bold">Press & partnerships</p>
                <p className="mt-1 text-sm text-white/85">
                  Include “Press” or “Partnership” in your subject line for a faster route.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
