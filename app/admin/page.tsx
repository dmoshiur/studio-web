"use client";

import * as React from "react";
import Link from "next/link";
import { Newspaper, CalendarDays, Mic2, Image as ImageIcon, Inbox, Mail, ArrowRight } from "lucide-react";
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
  };
  recentMessages: ContactMessage[];
}

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
  }, [load ]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) {
    return (
      <>
        <PageHeader title="Dashboard" description="Site activity at a glance" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </>
    );
  }

  const stats = [
    { label: "Posts", value: data.counts.posts, icon: Newspaper, href: "/admin/posts", tint: "bg-brand-gradient-soft text-brand-600" },
    { label: "Events", value: data.counts.events, icon: CalendarDays, href: "/admin/events", tint: "bg-amber-50 text-amber-600" },
    { label: "Speakers", value: data.counts.speakers, icon: Mic2, href: "/admin/speakers", tint: "bg-violet-50 text-violet-600" },
    { label: "Media files", value: data.counts.media, icon: ImageIcon, href: "/admin/media", tint: "bg-sky-50 text-sky-600" },
    { label: "Unread messages", value: data.counts.unreadMessages, icon: Inbox, href: "/admin/messages", tint: "bg-red-50 text-red-600" },
    { label: "Subscribers", value: data.counts.subscribers, icon: Mail, href: "/admin/subscribers", tint: "bg-emerald-50 text-emerald-600" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="Welcome back — here's what's happening." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <CardContent className="flex items-center gap-4 p-5">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${s.tint}`}>
                  <s.icon className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-display text-2xl font-extrabold text-ink-900">{s.value}</p>
                  <p className="text-sm font-medium text-ink-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent messages</CardTitle>
            <Link href="/admin/messages" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {data.recentMessages.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-400">No messages yet.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {data.recentMessages.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {m.subject} <span className="font-normal text-ink-400">— {m.name}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-ink-500">{truncate(m.message, 100)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {!m.read && <Badge variant="brand">New</Badge>}
                    <span className="text-[12px] text-ink-400">{formatDateTime(m.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
