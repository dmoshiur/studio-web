"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge, Flame, Globe, Power, Users, ScrollText, Menu, X,
  ExternalLink, LogOut, ShieldCheck, LayoutDashboard, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";
import { useSession } from "@/hooks/use-session";

const NAV = [
  { label: "Overview", href: "/hackeradmin", icon: Gauge, exact: true },
  { label: "Site Status", href: "/hackeradmin/status", icon: Power },
  { label: "Firebase", href: "/hackeradmin/firebase", icon: Flame },
  { label: "Site Settings", href: "/hackeradmin/settings", icon: Globe },
  { label: "Email / SMTP", href: "/hackeradmin/smtp", icon: Mail },
  { label: "Users & Roles", href: "/hackeradmin/users", icon: Users },
  { label: "Audit Logs", href: "/hackeradmin/audit-logs", icon: ScrollText },
];

export function OwnerShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const { logout } = useSession();

  React.useEffect(() => setOpen(false), [pathname]);

  const sidebar = (
    <div className="flex h-full flex-col bg-ink-950">
      <Link href="/hackeradmin" className="flex items-center gap-2.5 px-5 pt-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-amber-500 font-display text-lg font-extrabold text-white">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-[15px] font-extrabold leading-none text-white">Owner Console</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-red-400/90">Restricted · Owner only</p>
        </div>
      </Link>

      <div className="mx-4 mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5">
        <p className="text-[12px] font-semibold leading-relaxed text-red-200">
          Infrastructure controls. Actions here are <span className="underline underline-offset-2">audit-logged</span>.
        </p>
      </div>

      <nav aria-label="Owner" className="mt-4 flex-1 overflow-y-auto px-3 pb-4">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("h-[18px] w-[18px]", active ? "text-amber-400" : "text-white/40")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-amber-500 font-display text-sm font-bold text-white">
            {(user.displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user.displayName ?? "Owner"}</p>
            <p className="text-[12px] font-bold uppercase tracking-wider text-amber-400">Owner</p>
          </div>
          <button
            onClick={() => void logout()}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Link
            href="/admin"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[12px] font-semibold text-white/80 hover:bg-white/10"
          >
            <LayoutDashboard className="h-3.5 w-3.5" /> Admin
          </Link>
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[12px] font-semibold text-white/80 hover:bg-white/10"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Site
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] lg:block">{sidebar}</aside>
      <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "" : "pointer-events-none")}>
        <div
          className={cn("absolute inset-0 bg-ink-950/60 transition-opacity", open ? "opacity-100" : "opacity-0")}
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-[280px] shadow-2xl transition-transform duration-300",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute right-3 top-4 z-10 rounded-lg p-2 text-white/60 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
          {sidebar}
        </aside>
      </div>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-red-500/20 bg-ink-950/95 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 md:px-8">
            <button
              className="rounded-xl p-2 text-white/70 hover:bg-white/10 lg:hidden"
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
              <p className="text-sm font-semibold text-white/85">Owner Console</p>
            </div>
            <p className="ml-auto hidden font-mono text-[12px] text-white/40 sm:block">
              {process.env.NODE_ENV === "production" ? "production" : "development"}
            </p>
          </div>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
