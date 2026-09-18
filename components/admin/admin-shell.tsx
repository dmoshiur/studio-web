"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Newspaper, CalendarDays, Mic2, Tags, FileText, Image as ImageIcon,
  Inbox, Mail, Navigation as NavIcon, User, Menu, X, ExternalLink, LogOut, ShieldCheck, Users,
  CalendarCheck2, UserRound, CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";
import { isOwnerRole } from "@/types";
import { useSession } from "@/hooks/use-session";
import { Diamond } from "@/components/ui/badge";

const NAV = [
  { section: "Overview" },
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { section: "Content" },
  { label: "Posts", href: "/admin/posts", icon: Newspaper },
  { label: "Events", href: "/admin/events", icon: CalendarDays },
  { label: "Speakers", href: "/admin/speakers", icon: Mic2 },
  { label: "Categories", href: "/admin/categories", icon: Tags },
  { label: "Pages", href: "/admin/pages", icon: FileText },
  { section: "Engagement" },
  { label: "Media", href: "/admin/media", icon: ImageIcon },
  { label: "Messages", href: "/admin/messages", icon: Inbox },
  { label: "Reservations", href: "/admin/reservations", icon: CalendarCheck2 },
  { label: "Subscribers", href: "/admin/subscribers", icon: Mail },
  { label: "Accounts", href: "/admin/users", icon: Users },
  { section: "Site" },
  { label: "Owner Section", href: "/admin/owner", icon: UserRound },
  { label: "Navigation", href: "/admin/navigation", icon: NavIcon },
  { label: "Profile", href: "/admin/profile", icon: User },
];

/** Content studio shell — obsidian rail, gold accents, editorial type. */
export function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const { logout } = useSession();

  React.useEffect(() => setOpen(false), [pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-3 px-6 pt-7">
        <span className="flex h-10 w-10 items-center justify-center border border-gold-500/50 font-serif text-[1.25rem] text-gold-300">
          M
        </span>
        <div>
          <p className="font-serif text-[1.1rem] leading-none text-ivory-50">Photography Studio</p>
          <p className="mt-1.5 font-sans text-[9px] font-semibold uppercase tracking-[0.24em] text-gold-400/90">
            Content &amp; Editorial
          </p>
        </div>
      </Link>

      <nav aria-label="Admin" className="mt-7 flex-1 overflow-y-auto px-3 pb-4">
        {NAV.map((item, i) =>
          "section" in item && !("label" in item) ? (
            <p
              key={i}
              className="mb-1.5 mt-6 flex items-center gap-2.5 px-3 font-sans text-[9.5px] font-bold uppercase tracking-[0.26em] text-ivory-500 first:mt-0"
            >
              {item.section}
              <span className="h-px flex-1 bg-white/[0.07]" />
            </p>
          ) : (
            <AdminNavLink
              key={("href" in item && item.href) || i}
              label={"label" in item ? item.label! : ""}
              href={"href" in item ? item.href! : "#"}
              icon={"icon" in item ? item.icon! : LayoutDashboard}
              active={
                "exact" in item
                  ? pathname === ("href" in item ? item.href : "")
                  : pathname.startsWith(("href" in item ? item.href : "") as string)
              }
            />
          )
        )}
      </nav>

      <div className="border-t border-white/[0.07] p-4">
        <div className="flex items-center gap-3 rounded-sm bg-white/[0.03] p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-gold-500/40 font-serif text-[1rem] text-gold-300">
            {(user.displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ivory-100">{user.displayName ?? "Admin"}</p>
            <p className="truncate font-sans text-[9.5px] uppercase tracking-[0.2em] text-gold-400/90">{user.role}</p>
          </div>
          <button
            onClick={() => void logout()}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-sm p-2 text-ivory-400 transition-colors hover:bg-white/[0.06] hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        {isOwnerRole(user.role) && (
          <Link
            href="/hackeradmin"
            className="mt-3 flex items-center justify-center gap-2 border border-gold-500/40 px-4 py-3 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-200 transition-colors hover:bg-gold-500/10"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Owner Console
          </Link>
        )}
      </div>
    </div>
  );

  const crumbs = pathname.split("/").filter(Boolean);

  return (
    <div className="min-h-screen bg-obsidian-950 text-ivory-100">
      {/* Desktop sidebar */}
      <aside className="studio-sidebar fixed inset-y-0 left-0 z-40 hidden w-[272px] border-r border-white/[0.07] lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "" : "pointer-events-none")}>
        <div
          className={cn("absolute inset-0 bg-obsidian-950/70 transition-opacity", open ? "opacity-100" : "opacity-0")}
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "studio-sidebar absolute inset-y-0 left-0 w-[288px] border-r border-white/[0.07] shadow-2xl transition-transform duration-300",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute right-3 top-4 rounded-sm p-2 text-ivory-400 hover:bg-white/[0.06]"
          >
            <X className="h-5 w-5" />
          </button>
          {sidebar}
        </aside>
      </div>

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-obsidian-950/80 backdrop-blur-xl">
          <div className="flex h-[68px] items-center gap-3 px-4 md:px-9">
            <button
              className="rounded-sm border border-white/12 p-2 text-ivory-300 transition-colors hover:border-gold-500/50 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2.5 text-[11px] uppercase tracking-[0.2em]">
              {crumbs.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <Diamond className="h-1 w-1 opacity-60" />}
                  <span className={i === crumbs.length - 1 ? "truncate text-gold-300" : "truncate text-ivory-500"}>
                    {c.replace(/-/g, " ")}
                  </span>
                </React.Fragment>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-3">
              <Link
                href="/"
                target="_blank"
                className="inline-flex items-center gap-2 border border-white/12 px-4 py-2.5 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-ivory-300 transition-colors hover:border-gold-500/50 hover:text-gold-200"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View site
              </Link>
            </div>
          </div>
        </header>

        <main className="px-4 py-8 md:px-9 md:py-10">{children}</main>
      </div>
    </div>
  );
}

function AdminNavLink({
  label, href, icon: Icon, active,
}: {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  exact?: boolean;
}) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn("studio-nav-item mb-0.5", active && "is-active")}>
      <Icon className={cn("h-[17px] w-[17px]", active ? "text-gold-300" : "text-ivory-500")} />
      {label}
    </Link>
  );
}
