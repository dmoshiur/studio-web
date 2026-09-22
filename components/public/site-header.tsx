"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight, UserRound, Phone, Mail, MapPin, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavLink } from "@/types";
import { useSession } from "@/hooks/use-session";

/**
 * Header — a navy utility bar over a clean white navigation layer.
 * Trust signals and contact details stay visible above the fold; the gold
 * accent is reserved for the primary CTA and interaction states.
 */
export function SiteHeader({
  siteName,
  logoUrl,
  links,
  announcement,
  contact,
}: {
  siteName: string;
  logoUrl?: string;
  links: NavLink[];
  announcement?: string;
  contact?: { phone?: string; email?: string; address?: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { user } = useSession();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => setOpen(false), [pathname]);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const hasTopbar = Boolean(contact?.phone || contact?.email || contact?.address);

  return (
    <>
      {/* Navy utility bar — contact details and trust signals */}
      {hasTopbar && (
        <div className="relative z-50 hidden bg-obsidian-950 md:block">
          <div className="container flex h-9 items-center justify-between gap-6">
            <div className="flex items-center gap-6 text-[12px] text-ivory-300">
              {contact?.phone && (
                <a
                  href={`tel:${contact.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 transition-colors hover:text-gold-300"
                >
                  <Phone className="h-3.5 w-3.5 text-gold-500" />
                  {contact.phone}
                </a>
              )}
              {contact?.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 transition-colors hover:text-gold-300"
                >
                  <Mail className="h-3.5 w-3.5 text-gold-500" />
                  {contact.email}
                </a>
              )}
              {contact?.address && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-gold-500" />
                  {contact.address}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-gold-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Trusted professional service
            </div>
          </div>
        </div>
      )}

      {announcement && (
        <div className="relative z-50 flex items-center justify-center gap-3 bg-gradient-to-r from-[#EAB308] via-[#FACC15] to-[#EAB308] py-2 text-center">
          <p className="font-sans text-[10.5px] font-bold uppercase tracking-[0.25em] text-obsidian-950">
            {announcement}
          </p>
        </div>
      )}

      <header
        className={cn(
          "fixed inset-x-0 z-50 transition-all duration-500",
          announcement ? "top-0 md:top-[34px]" : hasTopbar ? "top-0 md:top-9" : "top-0",
          scrolled
            ? "border-b border-line-strong/80 bg-white/95 shadow-[0_18px_46px_-18px_rgba(15,30,54,0.18)] backdrop-blur-xl"
            : "border-b border-line bg-white shadow-[0_10px_30px_-18px_rgba(15,30,54,0.14)]"
        )}
      >
        {/* Gold accent bar */}
        <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-gold-gradient" />
        <div className="container flex h-[78px] items-center justify-between gap-6">
          {/* Wordmark */}
          <Link href="/" className="group flex items-center gap-3" aria-label={`${siteName} — home`}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={siteName} className="h-9 w-auto object-contain" />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-obsidian-gradient font-serif text-[1.4rem] font-bold text-gold-400 shadow-brand-sm transition-transform duration-300 group-hover:-translate-y-0.5">
                {siteName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="flex flex-col leading-none">
              <span className="font-serif text-[1.35rem] font-bold tracking-[-0.01em] text-obsidian-950">
                {siteName}
              </span>
              <span className="mt-1 hidden font-sans text-[8.5px] font-semibold uppercase tracking-[0.25em] text-gold-700 sm:block">
                Event Management Studio
              </span>
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {links.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative rounded-lg px-4 py-2 font-sans text-[11.5px] font-semibold uppercase tracking-[0.16em] transition-colors",
                    active ? "bg-gold-50 text-obsidian-700" : "text-ink-600 hover:bg-paper-200 hover:text-obsidian-700"
                  )}
                >
                  {link.label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-4 -bottom-0.5 h-[2px] rounded-full bg-gold-500 transition-transform duration-300",
                      active ? "scale-x-100" : "scale-x-0"
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="hidden items-center gap-5 lg:flex">
            {user ? (
              <Link
                href="/profile"
                aria-label="My account"
                className="inline-flex items-center gap-2 font-sans text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ink-600 transition-colors hover:text-obsidian-700"
              >
                <UserRound className="h-4 w-4" />
                {user.displayName?.split(" ")[0] ?? "Account"}
              </Link>
            ) : (
              <Link
                href="/login"
                className="font-sans text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ink-600 transition-colors hover:text-obsidian-700"
              >
                Sign in
              </Link>
            )}
            <Link
              href="/events"
              className="group inline-flex h-11 items-center gap-2 rounded-xl bg-gold-gradient px-6 font-sans text-[11.5px] font-bold uppercase tracking-[0.16em] text-obsidian-950 shadow-gold-sm transition-all hover:-translate-y-0.5 hover:shadow-gold active:scale-[0.98]"
            >
              Reserve Seat
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <button
            className="rounded-lg border border-line bg-white/70 p-2.5 text-ink-900 transition-colors hover:border-gold-500/60 hover:text-obsidian-700 lg:hidden"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Full-screen mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 overflow-y-auto bg-paper-100/[0.98] backdrop-blur-xl transition-all duration-400 lg:hidden",
          open ? "visible opacity-100" : "invisible opacity-0"
        )}
      >
        <div className="flex min-h-full flex-col px-6 pb-10 pt-28">
          <nav aria-label="Mobile" className="flex flex-col">
            {links.map((link, i) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  aria-current={active ? "page" : undefined}
                  style={{ transitionDelay: open ? `${80 + i * 45}ms` : "0ms" }}
                  className={cn(
                    "group flex items-center justify-between gap-4 border-b border-line py-4 pl-4 pr-3 transition-all duration-500",
                    active
                      ? "rounded-xl border-b-line bg-gold-50 shadow-[inset_0_0_0_1px_rgba(234,179,8,0.35)]"
                      : "",
                    open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                  )}
                >
                  <span className="flex flex-col leading-none">
                    <span
                      className={cn(
                        "font-serif text-[1.55rem] font-semibold transition-colors",
                        active ? "text-obsidian-700" : "text-ink-900"
                      )}
                    >
                      {link.label}
                    </span>
                    {active && (
                      <span className="mt-2 flex items-center gap-2 font-sans text-[9px] font-semibold uppercase tracking-[0.26em] text-gold-700">
                        <span aria-hidden className="h-1 w-4 rounded-full bg-gold-500" />
                        You are here
                      </span>
                    )}
                  </span>
                  {active ? (
                    <span
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-gradient text-obsidian-950 shadow-gold-sm"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  ) : (
                    <ArrowUpRight
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        "text-ink-300 group-hover:text-obsidian-700"
                      )}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Mobile contact strip */}
          {hasTopbar && (
            <div className="mt-6 space-y-2 rounded-xl border border-line bg-white p-4 text-[13px] text-ink-600">
              {contact?.phone && (
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="flex items-center gap-2.5 hover:text-obsidian-700">
                  <Phone className="h-4 w-4 text-gold-600" /> {contact.phone}
                </a>
              )}
              {contact?.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2.5 hover:text-obsidian-700">
                  <Mail className="h-4 w-4 text-gold-600" /> {contact.email}
                </a>
              )}
              {contact?.address && (
                <p className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-gold-600" /> {contact.address}
                </p>
              )}
            </div>
          )}

          <div className="mt-auto flex flex-col gap-3 pt-10">
            <Link
              href={user ? "/profile" : "/login"}
              className="flex h-12 items-center justify-center rounded-xl border border-line bg-white font-sans text-[11.5px] font-bold uppercase tracking-[0.18em] text-ink-900 shadow-card"
            >
              {user ? "My account" : "Sign in"}
            </Link>
            <Link
              href="/events"
              className="flex h-12 items-center justify-center rounded-xl bg-gold-gradient font-sans text-[11.5px] font-bold uppercase tracking-[0.18em] text-obsidian-950 shadow-gold-sm"
            >
              Reserve your seat
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
