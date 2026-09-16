import Link from "next/link";
import { MapPin, Phone, Mail, Facebook, Instagram, Youtube, Linkedin, Twitter, Globe } from "lucide-react";
import type { NavLink, PublicSiteSettings, SocialLink } from "@/types";
import { NewsletterForm } from "./newsletter-form";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  linkedin: Linkedin,
  twitter: Twitter,
  x: Twitter,
  globe: Globe,
};

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
    <footer className="bg-ink-gradient text-white">
      <div className="container grid gap-10 py-14 md:py-16 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient font-display text-lg font-extrabold text-white">
              {settings.siteName.charAt(0).toUpperCase()}
            </span>
            <span className="font-display text-xl font-extrabold">{settings.siteName}</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">{settings.tagline}</p>
          <div className="mt-5 flex gap-2">
            {socialLinks.map((s) => {
              const Icon = ICONS[s.icon.toLowerCase()] ?? Globe;
              return (
                <a
                  key={s.id}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/8 text-white/70 transition-all hover:bg-brand-gradient hover:text-white"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              );
            })}
          </div>
        </div>

        <nav aria-label="Footer">
          <h3 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-white/50">Explore</h3>
          <ul className="mt-4 space-y-2.5">
            {footerLinks.map((l) => (
              <li key={l.href + l.label}>
                <Link href={l.href} className="text-sm text-white/75 transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-white/50">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/75">
            {settings.address && (
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                <span>{settings.address}</span>
              </li>
            )}
            {settings.phone && (
              <li className="flex gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                <a href={`tel:${settings.phone}`} className="hover:text-white">{settings.phone}</a>
              </li>
            )}
            <li className="flex gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              <a href={`mailto:${settings.contactEmail}`} className="hover:text-white">{settings.contactEmail}</a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-white/50">Stay in the loop</h3>
          <p className="mt-4 text-sm text-white/60">Event announcements and stories. No spam, unsubscribe anytime.</p>
          <div className="mt-4">
            <NewsletterForm variant="dark" source="footer" />
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-3 py-5 text-[13px] text-white/50 md:flex-row">
          <p>© {year} {settings.siteName}. All rights reserved.</p>
          {/* License attribution: visual design adapted from the Colorlib "Manup" template (CC BY 3.0). */}
          <p>
            Design adapted from{" "}
            <a href="https://colorlib.com/wp/templates/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white/80">
              Colorlib Manup
            </a>{" "}
            (CC BY 3.0)
          </p>
        </div>
      </div>
    </footer>
  );
}
