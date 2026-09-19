"use client";

import * as React from "react";
import { Eye, Users, Radio, CalendarDays, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";
import { api } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

interface AnalyticsSummary {
  totalViews: number;
  totalVisitors: number;
  todayViews: number;
  todayVisitors: number;
  last7dViews: number;
  activeNow: number;
  series: { day: string; views: number }[];
  topPages: { path: string; views: number }[];
  topReferrers: { host: string; views: number }[];
}

/**
 * Visitor metrics for the operations dashboard — total traffic plus a
 * real-time "active now" counter (unique visitors in the last 5 minutes).
 * Auto-refreshes every 20 seconds.
 */
export function VisitorAnalytics() {
  const [data, setData] = React.useState<AnalyticsSummary | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<Date | null>(null);

  const load = React.useCallback(async () => {
    try {
      setData(await api<AnalyticsSummary>("/api/owner/analytics"));
      setUpdatedAt(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    }
  }, []);

  React.useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 20_000);
    return () => clearInterval(t);
  }, [load]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visitors</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[13px] text-ivory-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visitors</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const max = Math.max(1, ...data.series.map((s) => s.views));
  const today = new Date().toISOString().slice(0, 10);
  const last7 = data.series.slice(-7).reduce((n, s) => n + s.views, 0);
  const prev7 = data.series.slice(0, 7).reduce((n, s) => n + s.views, 0);
  const trend = prev7 === 0 ? null : Math.round(((last7 - prev7) / prev7) * 100);

  const stats = [
    {
      label: "Total visitors",
      value: data.totalVisitors.toLocaleString(),
      icon: Users,
      note: "all time · unique",
    },
    {
      label: "Total page views",
      value: data.totalViews.toLocaleString(),
      icon: Eye,
      note: "all time",
    },
    {
      label: "Today",
      value: data.todayVisitors.toLocaleString(),
      icon: CalendarDays,
      note: `${data.todayViews.toLocaleString()} views · unique visitors`,
    },
    {
      label: "Active now",
      value: data.activeNow.toLocaleString(),
      icon: Radio,
      note: "last 5 minutes · live",
      pulse: true,
    },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Visitors</CardTitle>
        <span className="flex items-center gap-2 font-mono text-[11px] text-ivory-500">
          <span className="relative flex h-2 w-2">
            <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          live · {updatedAt ? updatedAt.toLocaleTimeString() : "…"}
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-sm border border-white/[0.07] bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ivory-500">{s.label}</p>
                <s.icon className={cn("h-4 w-4", s.pulse ? "text-emerald-400" : "text-gold-500")} />
              </div>
              <p className="mt-2 font-serif text-[1.9rem] leading-none text-ivory-50">{s.value}</p>
              <p className="mt-1.5 text-[11.5px] text-ivory-500">{s.note}</p>
            </div>
          ))}
        </div>

        {/* 14-day traffic chart */}
        <div className="mt-6 rounded-sm border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ivory-400">
              Page views · last 14 days
            </p>
            {trend !== null && (
              <p
                className={cn(
                  "flex items-center gap-1.5 text-[12px] font-semibold",
                  trend >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                <TrendingUp className={cn("h-3.5 w-3.5", trend < 0 && "rotate-180")} />
                {trend >= 0 ? "+" : ""}
                {trend}% vs previous week
              </p>
            )}
          </div>
          <div className="flex h-24 items-end gap-1.5 sm:gap-2">
            {data.series.map((s) => (
              <div key={s.day} className="group relative flex h-full flex-1 items-end">
                <div
                  className={cn(
                    "w-full rounded-t-sm transition-all",
                    s.day === today
                      ? "bg-gradient-to-t from-gold-700 to-gold-400"
                      : "bg-gradient-to-t from-white/15 to-white/25 group-hover:from-gold-700/60 group-hover:to-gold-500/70"
                  )}
                  style={{ height: `${Math.max(4, (s.views / max) * 100)}%` }}
                  title={`${s.day}: ${s.views} views`}
                />
                <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-sm border border-white/10 bg-obsidian-950 px-2 py-1 font-mono text-[10px] text-ivory-200 group-hover:block">
                  {s.views}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between font-mono text-[9.5px] text-ivory-600">
            <span>{data.series[0]?.day}</span>
            <span>today</span>
          </div>
        </div>

        {/* Top pages */}
        {data.topPages.length > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-ivory-400">
                Top pages · 14 days
              </p>
              <ul className="space-y-1.5">
                {data.topPages.slice(0, 6).map((p) => (
                  <li key={p.path} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                    <span className="truncate font-mono text-ivory-300">{p.path}</span>
                    <span className="shrink-0 text-ivory-500">{p.views}</span>
                  </li>
                ))}
              </ul>
            </div>
            {data.topReferrers.length > 0 && (
              <div>
                <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-ivory-400">
                  Top referrers
                </p>
                <ul className="space-y-1.5">
                  {data.topReferrers.map((r) => (
                    <li key={r.host} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                      <span className="truncate font-mono text-ivory-300">{r.host}</span>
                      <span className="shrink-0 text-ivory-500">{r.views}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <p className="mt-5 border-t border-white/[0.06] pt-4 text-[11.5px] leading-relaxed text-ivory-600">
          First-party, cookie-based counting — opaque visitor ids only, no IPs or cross-site
          tracking. Bots and crawlers are excluded.
        </p>
      </CardContent>
    </Card>
  );
}
