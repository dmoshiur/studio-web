"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavLink } from "@/types";
import { useSession } from "@/hooks/use-session";
import { studioHrefFor } from "@/types";
import { Diamond } from "@/components/ui/badge";

/**
 * Header — a quiet obsidian bar that lifts into a gold hairline on scroll.
 * Desktop navigation is centred with a left wordmark and right action,
 * mirroring the editorial layout of the rest of the site.
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

  const studioHref = user ? studioHrefFor(user.role) : "/login";

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
            ? "border-b border-gold-500/20 bg-obsidian-950/90 backdrop-blur-xl"
            : "border-b border-transparent bg-gradient-to-b from-obsidian-950/80 via-obsidian-950/40 to-transparent"
        )}
      >
        <div className="container flex h-[78px] items-center justify-between gap-6">
          {/* Wordmark */}
          <Link href="/" className="group flex items-center gap-3" aria-label={`${siteName} — home`}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={siteName} className="h-9 w-auto" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center border border-gold-500/50 font-serif text-[1.3rem] font-semibold text-gold-300 transition-colors group-hover:border-gold-400 group-hover:bg-gold-500/10">
                {siteName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="flex flex-col leading-none">
              <span className="font-serif text-[1.35rem] font-medium tracking-[0.06em] text-ivory-50">
                {siteName}
              </span>
              <span className="mt-1 hidden font-sans text-[8.5px] uppercase tracking-luxe text-gold-400/80 sm:block">
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
                    "relative px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors",
                    active ? "text-gold-300" : "text-ivory-300/75 hover:text-ivory-50"
                  )}
                >
                  {link.label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-3.5 -bottom-0.5 h-px bg-gold-400 transition-transform duration-300",
                      active ? "scale-x-100" : "scale-x-0"
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href={studioHref}
              className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-ivory-300/75 transition-colors hover:text-gold-300"
            >
              {user ? "Studio" : "Sign in"}
            </Link>
            <Link
              href="/events"
              className="group inline-flex h-11 items-center gap-2 border border-gold-500/50 px-6 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-200 transition-all hover:border-gold-400 hover:bg-gold-500 hover:text-obsidian-950"
            >
              Reserve Seat
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <button
            className="rounded-sm border border-white/20 p-2.5 text-ivory-100 transition-colors hover:border-gold-400/60 hover:text-gold-200 lg:hidden"
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
          "fixed inset-0 z-40 bg-obsidian-950/95 backdrop-blur-xl transition-all duration-400 lg:hidden",
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
                  "border-b border-white/[0.07] py-5 font-serif text-[1.65rem] text-ivory-100 transition-all duration-500",
                  open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3 pt-10">
            <Link
              href={studioHref}
              className="flex h-12 items-center justify-center border border-white/20 font-sans text-[11px] font-semibold uppercase tracking-[0.24em] text-ivory-200"
            >
              {user ? "Open studio" : "Sign in"}
            </Link>
            <Link
              href="/events"
              className="flex h-12 items-center justify-center bg-gold-gradient font-sans text-[11px] font-semibold uppercase tracking-[0.24em] text-obsidian-950"
            >
              Reserve your seat
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
