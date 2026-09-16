"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Newspaper, CalendarDays, Mic2, Tags, FileText, Image as ImageIcon,
  Inbox, Mail, Navigation as NavIcon, User, Menu, X, ExternalLink, LogOut, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";
import { useSession } from "@/hooks/use-session";

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
  { label: "Subscribers", href: "/admin/subscribers", icon: Mail },
  { section: "Site" },
  { label: "Navigation", href: "/admin/navigation", icon: NavIcon },
  { label: "Profile", href: "/admin/profile", icon: User },
];

export function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const { logout } = useSession();

  React.useEffect(() => setOpen(false), [pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-2.5 px-5 pt-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient font-display text-lg font-extrabold text-white">
          M
        </span>
        <div>
          <p className="font-display text-[15px] font-extrabold leading-none text-ink-900">ManUp Admin</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-ink-400">Content Studio</p>
        </div>
      </Link>
      <nav aria-label="Admin" className="mt-6 flex-1 overflow-y-auto px-3 pb-4">
        {NAV.map((item, i) =>
          "section" in item && !("label" in item) ? (
            <p key={i} className="mb-1.5 mt-5 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400 first:mt-0">
              {item.section}
            </p>
          ) : (
            <AdminNavLink
              key={("href" in item && item.href) || i}
              label={"label" in item ? item.label! : ""}
              href={"href" in item ? item.href! : "#"}
              icon={"icon" in item ? item.icon! : LayoutDashboard}
              exact={"exact" in item}
              active={
                "exact" in item
                  ? pathname === ("href" in item ? item.href : "")
                  : pathname.startsWith(("href" in item ? item.href : "") as string)
              }
            />
          )
        )}
      </nav>
      <div className="border-t border-ink-100 p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-ink-50 p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-900 font-display text-sm font-bold text-white">
            {(user.displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">{user.displayName ?? "Admin"}</p>
            <p className="truncate text-[12px] capitalize text-ink-400">{user.role}</p>
          </div>
          <button
            onClick={() => void logout()}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-lg p-2 text-ink-400 hover:bg-white hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        {user.role === "owner" && (
          <Link
            href="/hackeradmin"
            className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-ink-900 bg-ink-900 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-ink-700"
          >
            <ShieldCheck className="h-4 w-4" /> Owner Console
          </Link>
        )}
      </div>
    </div>
  );

  const crumbs = pathname.split("/").filter(Boolean);

  return (
    <div className="min-h-screen bg-ink-50/70">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-ink-100 bg-white lg:block">
        {sidebar}
      </aside>
      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "" : "pointer-events-none")}>
        <div
          className={cn("absolute inset-0 bg-ink-950/50 transition-opacity", open ? "opacity-100" : "opacity-0")}
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-[280px] bg-white shadow-2xl transition-transform duration-300",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute right-3 top-4 rounded-lg p-2 text-ink-400 hover:bg-ink-50"
          >
            <X className="h-5 w-5" />
          </button>
          {sidebar}
        </aside>
      </div>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 md:px-8">
            <button
              className="rounded-xl p-2 text-ink-600 hover:bg-ink-50 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
              {crumbs.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-ink-300">/</span>}
                  <span className={i === crumbs.length - 1 ? "truncate font-semibold capitalize text-ink-900" : "capitalize text-ink-400"}>
                    {c}
                  </span>
                </React.Fragment>
              ))}
            </nav>
            <div className="ml-auto">
              <Link
                href="/"
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 px-3.5 py-2 text-[13px] font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-600"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View site
              </Link>
            </div>
          </div>
        </header>
        <main className="p-4 md:p-8">{children}</main>
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
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "bg-brand-gradient-soft text-brand-700" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
      )}
    >
      <Icon className={cn("h-[18px] w-[18px]", active ? "text-brand-600" : "text-ink-400")} />
      {label}
    </Link>
  );
}
