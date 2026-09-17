"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge, Flame, Globe, Power, Users, ScrollText, Menu, X,
  ExternalLink, LogOut, ShieldCheck, LayoutDashboard, Mail, Database,
  KeyRound, TerminalSquare, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Diamond } from "@/components/ui/badge";

const NAV = [
  { label: "Overview", href: "/hackeradmin", icon: Gauge, exact: true },
  { label: "Site Status", href: "/hackeradmin/status", icon: Power },
  { label: "Runtime & Controls", href: "/hackeradmin/runtime", icon: Activity },
  { label: "Live Logs", href: "/hackeradmin/logs", icon: TerminalSquare },
  { label: "Passcode & Access", href: "/hackeradmin/passcode", icon: KeyRound },
  { label: "Backend & Firebase", href: "/hackeradmin/firebase", icon: Flame },
  { label: "Site Settings", href: "/hackeradmin/settings", icon: Globe },
  { label: "Email / SMTP", href: "/hackeradmin/smtp", icon: Mail },
  { label: "Users & Roles", href: "/hackeradmin/users", icon: Users },
  { label: "Audit Logs", href: "/hackeradmin/audit-logs", icon: ScrollText },
];

/**
 * Operations console shell — the most privileged surface, dressed
 * accordingly. Identity comes from the passcode-verified session, never
 * from client-supplied data.
 */
export function OwnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  React.useEffect(() => setOpen(false), [pathname]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/owner/passcode", { method: "DELETE" });
    } finally {
      window.location.href = "/";
    }
  }

  const sidebar = (
    <div className="studio-sidebar flex h-full flex-col">
      <Link href="/hackeradmin" className="flex items-center gap-3 px-6 pt-7">
        <span className="flex h-10 w-10 items-center justify-center border border-gold-500/50 text-gold-300">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="font-serif text-[1.1rem] leading-none text-ivory-50">Operations Console</p>
          <p className="mt-1.5 font-sans text-[9px] font-semibold uppercase tracking-[0.24em] text-gold-400/90">
            Passcode protected
          </p>
        </div>
      </Link>

      <div className="mx-4 mt-6 border border-gold-500/25 bg-gold-500/[0.07] px-4 py-3">
        <p className="text-[11.5px] leading-relaxed text-gold-100/90">
          Infrastructure controls. Every action on these screens is written to the audit log.
        </p>
      </div>

      <nav aria-label="Operations" className="mt-6 flex-1 overflow-y-auto px-3 pb-4">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn("studio-nav-item mb-0.5", active && "is-active")}
            >
              <item.icon className={cn("h-[17px] w-[17px]", active ? "text-gold-300" : "text-ivory-500")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.07] p-4">
        <div className="flex items-center gap-3 rounded-sm bg-white/[0.03] p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-gold-500/40 text-gold-300">
            <KeyRound className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ivory-100">Operations Session</p>
            <p className="font-sans text-[9.5px] uppercase tracking-[0.2em] text-gold-400/90">Passcode verified</p>
          </div>
          <button
            onClick={() => void signOut()}
            aria-label="Leave the panel"
            title="Leave the panel"
            disabled={signingOut}
            className="rounded-sm p-2 text-ivory-400 transition-colors hover:bg-white/[0.06] hover:text-danger disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href="/admin"
            className="flex items-center justify-center gap-1.5 border border-white/12 px-3 py-2.5 font-sans text-[9.5px] font-semibold uppercase tracking-[0.18em] text-ivory-300 transition-colors hover:border-gold-500/50 hover:text-gold-200"
          >
            <LayoutDashboard className="h-3.5 w-3.5" /> Studio
          </Link>
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-center gap-1.5 border border-white/12 px-3 py-2.5 font-sans text-[9.5px] font-semibold uppercase tracking-[0.18em] text-ivory-300 transition-colors hover:border-gold-500/50 hover:text-gold-200"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Site
          </Link>
        </div>
      </div>
    </div>
  );

  const crumbs = pathname.split("/").filter(Boolean).slice(1);

  return (
    <div className="min-h-screen bg-obsidian-950 text-ivory-100">
      <aside className="studio-sidebar fixed inset-y-0 left-0 z-40 hidden w-[272px] border-r border-gold-500/[0.14] lg:block">
        {sidebar}
      </aside>

      <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "" : "pointer-events-none")}>
        <div
          className={cn("absolute inset-0 bg-obsidian-950/70 transition-opacity", open ? "opacity-100" : "opacity-0")}
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "studio-sidebar absolute inset-y-0 left-0 w-[288px] border-r border-gold-500/[0.14] shadow-2xl transition-transform duration-300",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute right-3 top-4 z-10 rounded-sm p-2 text-ivory-400 hover:bg-white/[0.06]"
          >
            <X className="h-5 w-5" />
          </button>
          {sidebar}
        </aside>
      </div>

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-30 border-b border-gold-500/[0.16] bg-obsidian-950/90 backdrop-blur-xl">
          <div className="flex h-[68px] items-center gap-4 px-4 md:px-9">
            <button
              className="rounded-sm border border-white/12 p-2 text-ivory-300 transition-colors hover:border-gold-500/50 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <p className="font-sans text-[10.5px] uppercase tracking-[0.22em] text-ivory-300">Session secured</p>
            </div>

            {crumbs.length > 0 && (
              <nav aria-label="Breadcrumb" className="hidden items-center gap-2.5 text-[11px] uppercase tracking-[0.2em] md:flex">
                <Diamond className="h-1 w-1 opacity-60" />
                {crumbs.map((c, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <Diamond className="h-1 w-1 opacity-60" />}
                    <span className={i === crumbs.length - 1 ? "text-gold-300" : "text-ivory-500"}>
                      {c.replace(/-/g, " ")}
                    </span>
                  </React.Fragment>
                ))}
              </nav>
            )}

            <p className="ml-auto hidden items-center gap-2 font-mono text-[11px] text-ivory-500 sm:flex">
              <Database className="h-3.5 w-3.5 text-gold-500" />
              {process.env.NODE_ENV === "production" ? "production" : "development"}
            </p>
          </div>
        </header>

        <main className="px-4 py-8 md:px-9 md:py-10">{children}</main>
      </div>
    </div>
  );
}
