"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Ticket, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavLink } from "@/types";
import { useSession } from "@/hooks/use-session";

export function SiteHeader({
  siteName,
  logoUrl,
  links,
}: {
  siteName: string;
  logoUrl?: string;
  links: NavLink[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { user } = useSession();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open ]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "bg-ink-950/90 shadow-lg backdrop-blur-md" : "bg-gradient-to-b from-ink-950/70 to-transparent"
      )}
    >
      <div className="container flex h-[72px] items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${siteName} — home`}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={siteName} className="h-9 w-auto" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient font-display text-lg font-extrabold text-white">
              {siteName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="font-display text-xl font-extrabold tracking-tight text-white">
            {siteName}
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href + link.label}
                href={link.href}
                {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                  active ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/5 hover:text-white"
                )}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <Link
              href={user.role === "owner" ? "/hackeradmin" : user.role === "admin" ? "/admin" : "/"}
              className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              {user.displayName ?? user.email ?? "Account"}
              <ChevronDown className="h-4 w-4 opacity-70" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            >
              Sign in
            </Link>
          )}
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-pop transition-all hover:brightness-105 active:scale-[.98]"
          >
            <Ticket className="h-4 w-4" /> Tickets
          </Link>
        </div>

        <button
          className="rounded-xl p-2.5 text-white hover:bg-white/10 lg:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "overflow-hidden bg-ink-950/95 backdrop-blur-md transition-[max-height] duration-300 lg:hidden",
          open ? "max-h-[80vh] overflow-y-auto border-t border-white/10" : "max-h-0"
        )}
      >
        <nav aria-label="Mobile" className="container flex flex-col gap-1 py-4">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href + link.label}
                href={link.href}
                className={cn(
                  "rounded-xl px-4 py-3 text-[15px] font-medium",
                  active ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-4">
            {user ? (
              <Link
                href={user.role === "owner" ? "/hackeradmin" : user.role === "admin" ? "/admin" : "/"}
                className="rounded-xl bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white"
              >
                {user.role === "user" ? "My Account" : user.role === "owner" ? "Owner Console" : "Admin Dashboard"}
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-xl bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Sign in
              </Link>
            )}
            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white"
            >
              <Ticket className="h-4 w-4" /> Get Tickets
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
