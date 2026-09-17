"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavLink } from "@/types";
import { useSession } from "@/hooks/use-session";
import { Diamond } from "@/components/ui/badge";

/**
 * Header — a solid white bar with a hairline border and a soft brand-tinted
 * shadow at all times, so it always reads as a layer raised above the
 * cinematic hero imagery beneath it. Desktop navigation is centred with a
 * left wordmark and right action, mirroring the editorial layout of the
 * rest of the site.
 */
export function SiteHeader({
  siteName,
  logoUrl,
  links,
  announcement,
}: {
  siteName: string;
  logoUrl?: string;
  links: NavLink[];
  announcement?: string;
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

  return (
    <>
      {announcement && (
        <div className="relative z-50 hidden items-center justify-center gap-3 bg-gold-500 py-2.5 text-center md:flex">
          <Diamond className="h-1 w-1 bg-obsidian-950" />
          <p className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.3em] text-obsidian-950">
            {announcement}
          </p>
          <Diamond className="h-1 w-1 bg-obsidian-950" />
        </div>
      )}

      <header
        className={cn(
          "fixed inset-x-0 z-50 transition-all duration-500",
          announcement ? "top-0 md:top-[34px]" : "top-0",
          scrolled
            ? "border-b border-brand-600/15 bg-white/95 shadow-[0_18px_46px_-18px_rgba(29,11,63,0.32)] backdrop-blur-xl"
            : "border-b border-ink-900/10 bg-white shadow-[0_14px_40px_-22px_rgba(29,11,63,0.3)]"
        )}
      >
        {/* Brand hairline — violet → gold → ember */}
        <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-brand-700 via-gold-500 to-ember-500" />
        <div className="container flex h-[78px] items-center justify-between gap-6">
          {/* Wordmark */}
          <Link href="/" className="group flex items-center gap-3" aria-label={`${siteName} — home`}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={siteName} className="h-9 w-auto" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center bg-brand-gradient font-serif text-[1.35rem] font-semibold text-white shadow-brand-sm transition-transform duration-300 group-hover:-translate-y-0.5">
                {siteName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="flex flex-col leading-none">
              <span className="font-serif text-[1.35rem] font-medium tracking-[0.06em] text-ink-900">
                {siteName}
              </span>
              <span className="mt-1 hidden font-sans text-[8.5px] uppercase tracking-luxe text-brand-700 sm:block">
                Summit &amp; Salon
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
                    "relative rounded-full px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors",
                    active ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-paper-200 hover:text-brand-700"
                  )}
                >
                  {link.label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-4 -bottom-0.5 h-[2px] rounded-full bg-gradient-to-r from-brand-600 to-ember-500 transition-transform duration-300",
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
                className="inline-flex items-center gap-2 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-600 transition-colors hover:text-gold-700"
              >
                <UserRound className="h-4 w-4" />
                {user.displayName?.split(" ")[0] ?? "Account"}
              </Link>
            ) : (
              <Link
                href="/login"
                className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-600 transition-colors hover:text-gold-700"
              >
                Sign in
              </Link>
            )}
            <Link
              href="/events"
              className="group inline-flex h-11 items-center gap-2 rounded-full bg-brand-gradient px-6 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-brand-sm transition-all hover:-translate-y-0.5 hover:shadow-brand"
            >
              Reserve Seat
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <button
            className="rounded-sm border border-line bg-white/70 p-2.5 text-ink-900 transition-colors hover:border-gold-600/60 hover:text-gold-700 lg:hidden"
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
          "fixed inset-0 z-40 bg-paper-100/[0.98] backdrop-blur-xl transition-all duration-400 lg:hidden",
          open ? "visible opacity-100" : "invisible opacity-0"
        )}
      >
        <div className="flex h-full flex-col px-6 pb-10 pt-28">
          <nav aria-label="Mobile" className="flex flex-col">
            {links.map((link, i) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                style={{ transitionDelay: open ? `${80 + i * 45}ms` : "0ms" }}
                className={cn(
                  "border-b border-line py-5 font-serif text-[1.65rem] text-ink-900 transition-all duration-500",
                  open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3 pt-10">
            <Link
              href={user ? "/profile" : "/login"}
              className="flex h-12 items-center justify-center border border-line bg-white font-sans text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-900"
            >
              {user ? "My account" : "Sign in"}
            </Link>
            <Link
              href="/events"
              className="flex h-12 items-center justify-center rounded-full bg-brand-gradient font-sans text-[11px] font-semibold uppercase tracking-[0.24em] text-white shadow-brand-sm"
            >
              Reserve your seat
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
