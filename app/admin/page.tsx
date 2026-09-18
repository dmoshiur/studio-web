"use client";

import * as React from "react";
import Link from "next/link";
import { Newspaper, CalendarDays, Mic2, Image as ImageIcon, Inbox, Mail, ArrowRight, CalendarCheck2, CalendarClock, Settings } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton, ErrorState } from "@/components/ui/feedback";
import { formatDateTime, truncate } from "@/lib/utils";
import type { ContactMessage } from "@/types";

interface Overview {
  counts: {
    posts: number; events: number; speakers: number; media: number;
    unreadMessages: number; subscribers: number;
    reservations?: number; pendingReservations?: number;
    scheduleDays?: number;
  };
  recentMessages: ContactMessage[];
}

/** Studio dashboard — one tight stats grid + the inbox. Nothing else. */
export default function AdminDashboard() {
  const [data, setData] = React.useState<Overview | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load dashboard");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) {
    return (
      <>
        <PageHeader title="Dashboard" description="Site activity at a glance" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </>
    );
  }

  const stats = [
    { label: "Posts", value: data.counts.posts, icon: Newspaper, href: "/admin/posts", tint: "border border-gold-500/25 bg-gold-500/[0.12] text-gold-400" },
    { label: "Events", value: data.counts.events, icon: CalendarDays, href: "/admin/events", tint: "border border-amber-400/20 bg-amber-400/10 text-amber-300" },
    { label: "Speakers", value: data.counts.speakers, icon: Mic2, href: "/admin/speakers", tint: "border border-violet-400/20 bg-violet-400/10 text-violet-300" },
    { label: "Schedule days", value: data.counts.scheduleDays ?? 0, icon: CalendarClock, href: "/admin/schedule", tint: "border border-sky-400/20 bg-sky-400/10 text-sky-300" },
    { label: "Media files", value: data.counts.media, icon: ImageIcon, href: "/admin/media", tint: "border border-teal-400/20 bg-teal-400/10 text-teal-300" },
    { label: "Unread messages", value: data.counts.unreadMessages, icon: Inbox, href: "/admin/messages", tint: "border border-red-400/20 bg-red-400/10 text-red-300" },
    { label: "Subscribers", value: data.counts.subscribers, icon: Mail, href: "/admin/subscribers", tint: "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300" },
    { label: `Reservations${data.counts.pendingReservations ? ` · ${data.counts.pendingReservations} pending` : ""}`, value: data.counts.reservations ?? 0, icon: CalendarCheck2, href: "/admin/reservations", tint: "border border-gold-500/20 bg-gold-500/10 text-gold-300" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="Site activity at a glance" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-all hover:-translate-y-0.5 hover:border-gold-500/30 hover:shadow-lg">
              <CardContent className="flex items-center gap-4 p-4">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-sm ${s.tint}`}>
                  <s.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-serif text-[1.6rem] leading-none text-ivory-50">{s.value}</p>
                  <p className="mt-1 truncate text-[12px] font-medium text-ivory-400/80">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent messages</CardTitle>
              <Link href="/admin/messages" className="inline-flex items-center gap-1 text-sm font-semibold text-gold-500 hover:underline">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentMessages.length === 0 ? (
              <p className="py-4 text-center text-sm text-ivory-500">No messages yet.</p>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {data.recentMessages.map((m) => (
                  <li key={m.id} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ivory-50">
                        {m.subject} <span className="font-normal text-ivory-500">— {m.name}</span>
                      </p>
                      <p className="mt-0.5 truncate text-[13px] text-ivory-400/80">{truncate(m.message, 100)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {!m.read && <Badge variant="gold">New</Badge>}
                      <span className="text-[12px] text-ivory-500">{formatDateTime(m.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Site settings</CardTitle>
          </CardHeader>
          <CardContent className="text-[13px] leading-relaxed text-ivory-400">
            Branding, homepage copy and SEO are infrastructure controls — they live in the
            passcode-protected operations console.
            <Link
              href="/hackeradmin/settings"
              className="mt-4 inline-flex h-10 items-center gap-2 border border-gold-500/40 px-5 font-sans text-[10.5px] font-semibold uppercase tracking-[0.2em] text-gold-200 transition-colors hover:bg-gold-500/10"
            >
              <Settings className="h-3.5 w-3.5" /> Open settings
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
