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

/** Footer — marble-textured obsidian slab with a calligraphic signature. */
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
    <footer className="relative isolate overflow-hidden border-t border-gold-500/20 bg-obsidian-950">
      <Backdrop src="/images/texture-marble.jpg" overlay="soft" className="opacity-[0.35]" />
      <div className="absolute inset-0 bg-gradient-to-b from-obsidian-950/70 via-obsidian-950/90 to-obsidian-950" />

      <div className="container relative py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_0.8fr_0.9fr_1.1fr]">
          {/* Identity */}
          <div>
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center border border-gold-500/50 font-serif text-[1.4rem] text-gold-300">
                {settings.siteName.charAt(0).toUpperCase()}
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-serif text-[1.4rem] text-ivory-50">{settings.siteName}</span>
                <span className="mt-1 font-sans text-[8.5px] uppercase tracking-luxe text-gold-400/80">
                  Summit &amp; Salon
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
                    className="flex h-10 w-10 items-center justify-center border border-white/10 text-ivory-400 transition-all hover:border-gold-500/60 hover:text-gold-300"
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
                    className="text-[13.5px] text-ivory-400/80 transition-colors hover:text-gold-200"
                  >
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
