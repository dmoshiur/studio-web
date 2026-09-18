import Link from "next/link";
import { MapPin, Phone, Mail, Facebook, Instagram, Youtube, Linkedin, Twitter, Globe } from "lucide-react";
import type { NavLink, PublicSiteSettings, SocialLink } from "@/types";
import { NewsletterForm } from "./newsletter-form";
import { Backdrop, GoldRule, Script } from "./ui-kit";
import { Diamond } from "@/components/ui/badge";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  linkedin: Linkedin,
  twitter: Twitter,
  x: Twitter,
  globe: Globe,
};

/** Footer — a near-black editorial slab with a restrained champagne accent. */
export function SiteFooter({
  settings,
  footerLinks,
  socialLinks,
}: {
  settings: PublicSiteSettings;
  footerLinks: NavLink[];
  socialLinks: SocialLink[];
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative isolate overflow-hidden bg-obsidian-950">
      <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-px bg-gold-600/70" />
      <Backdrop src="/images/texture-marble.jpg" overlay="soft" className="opacity-[0.14] grayscale" />
      <div className="absolute inset-0 bg-obsidian-950/90" />

      {/* Footer CTA strip */}
      <div className="container relative pt-14">
        <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-7 backdrop-blur-sm sm:px-10 lg:flex-row">
          <div className="text-center lg:text-left">
            <p className="font-serif text-[1.5rem] leading-tight text-ivory-50 sm:text-[1.7rem]">
              Seats for the next edition are open
            </p>
            <p className="mt-2 text-[13px] text-ivory-400/70">
              Capped rooms, curated introductions and two days that pay for themselves.
            </p>
          </div>
          <Link
            href="/events"
            className="group inline-flex h-[50px] shrink-0 items-center gap-2.5 rounded-full bg-gold-700 px-8 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-gold transition-all hover:-translate-y-0.5 hover:shadow-gold"
          >
            Get your ticket
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>

      <div className="container relative py-14 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_0.8fr_0.9fr_1.1fr]">
          {/* Identity */}
          <div>
            <Link href="/" className="group flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center bg-gold-700 font-serif text-[1.4rem] text-white shadow-gold-sm transition-transform duration-300 group-hover:-translate-y-0.5">
                {settings.siteName.charAt(0).toUpperCase()}
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-serif text-[1.4rem] text-ivory-50">{settings.siteName}</span>
                <span className="mt-1 font-sans text-[8.5px] uppercase tracking-luxe text-gold-400/80">
                  Event Management Studio
                </span>
              </span>
            </Link>
            <p className="mt-6 max-w-sm text-[14px] leading-[1.9] text-ivory-400/80">{settings.tagline}</p>
            <Script className="mt-7 block text-[2rem] leading-none">{settings.siteName}</Script>
            <div className="mt-6 flex gap-2">
              {socialLinks.map((s) => {
                const Icon = ICONS[s.icon.toLowerCase()] ?? Globe;
                return (
                  <a
                    key={s.id}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-ivory-400 transition-all hover:-translate-y-0.5 hover:border-gold-400/60 hover:bg-gold-600/15 hover:text-white"
                  >
                    <Icon className="h-[16px] w-[16px]" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Explore */}
          <nav aria-label="Footer">
            <h3 className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.3em] text-gold-400">
              Explore
            </h3>
            <ul className="mt-6 space-y-3.5">
              {footerLinks.map((l) => (
                <li key={l.href + l.label}>
                  <Link
                    href={l.href}
                    className="group/link inline-flex items-center gap-2 text-[13.5px] text-ivory-400/80 transition-colors hover:text-gold-200"
                  >
                    <span aria-hidden className="h-px w-0 bg-gradient-to-r from-gold-500 to-gold-500 transition-all duration-300 group-hover/link:w-4" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h3 className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.3em] text-gold-400">
              Contact
            </h3>
            <ul className="mt-6 space-y-4 text-[13.5px] text-ivory-400/80">
              {settings.address && (
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                  <span>{settings.address}</span>
                </li>
              )}
              {settings.phone && (
                <li className="flex gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                  <a href={`tel:${settings.phone}`} className="transition-colors hover:text-gold-200">
                    {settings.phone}
                  </a>
                </li>
              )}
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                <a href={`mailto:${settings.contactEmail}`} className="transition-colors hover:text-gold-200">
                  {settings.contactEmail}
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.3em] text-gold-400">
              The Invitation List
            </h3>
            <p className="mt-6 text-[13.5px] leading-relaxed text-ivory-400/80">
              Speaker drops, early-bird releases and the occasional letter from the founders. No noise.
            </p>
            <div className="mt-5">
              <NewsletterForm variant="dark" source="footer" />
            </div>
          </div>
        </div>

        <GoldRule className="my-12 max-w-none" />

        <div className="flex flex-col items-center justify-between gap-4 text-[12px] text-ivory-500 md:flex-row">
          <p className="flex items-center gap-3">
            <Diamond className="h-1 w-1" />© {year} {settings.siteName}. All rights reserved.
          </p>
          {/* License attribution: visual design adapted from the Colorlib "Manup" template (CC BY 3.0). */}
          <p className="flex items-center gap-3">
            Design language adapted from{" "}
            <a
              href="https://colorlib.com/wp/templates/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-300 underline underline-offset-4 hover:text-gold-200"
            >
              Colorlib Manup
            </a>{" "}
            (CC BY 3.0)
          </p>
        </div>
      </div>
    </footer>
  );
}
