"use client";

import * as React from "react";
import Link from "next/link";
import { Database, KeyRound, HardDrive, Mail, Power, ArrowRight, RefreshCw } from "lucide-react";
import { OwnerPageHeader, HealthCard } from "@/components/hackeradmin/owner-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardSkeleton, ErrorState } from "@/components/ui/feedback";
import { api } from "@/hooks/use-api";

interface Overview {
  app: { status: string; environment: string; commit: string | null; url: string | null };
  firebase: {
    configured: boolean; projectId: string | null; authDomain: string | null;
    storageBucket: string | null; firestore: string; auth: string; storage: string;
  };
  email: { configured: boolean };
  maintenance: { enabled: boolean; emergencyLock: boolean; updatedAt: string };
  counts: { posts: number; events: number; speakers: number; media: number; unreadMessages: number; subscribers: number } | null;
  site: { name: string; contactEmail: string };
}

type Health = "operational" | "configured" | "unavailable" | "error";

export default function OwnerOverviewPage() {
  const [data, setData] = React.useState<Overview | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      setData(await api<Overview>("/api/owner/overview"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load ]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (error) return (
    <>
      <OwnerPageHeader title="Overview" description="System health and status" />
      <ErrorState message={error} onRetry={load} />
    </>
  );

  if (!data) {
    return (
      <>
        <OwnerPageHeader title="Overview" description="System health and status" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </>
    );
  }

  const offline = data.maintenance.enabled || data.maintenance.emergencyLock;

  return (
    <>
      <OwnerPageHeader
        title="Overview"
        description={`Environment: ${data.app.environment}${data.app.commit ? ` · commit ${data.app.commit}` : ""}`}
        action={
          <Button variant="ghost" size="sm" onClick={refresh} loading={refreshing}>
            <RefreshCw /> Refresh
          </Button>
        }
      />

      {/* Site status banner */}
      <div
        className={
          offline
            ? "mb-6 flex flex-col gap-3 rounded-sm border border-red-400/25 bg-red-400/[0.07] p-5 sm:flex-row sm:items-center"
            : "mb-6 flex flex-col gap-3 rounded-sm border border-emerald-400/25 bg-emerald-400/[0.07] p-5 sm:flex-row sm:items-center"
        }
      >
        <span className="relative flex h-3 w-3 shrink-0">
          <span className={`absolute h-full w-full animate-ping rounded-full opacity-60 ${offline ? "bg-red-500" : "bg-emerald-500"}`} />
          <span className={`relative h-3 w-3 rounded-full ${offline ? "bg-red-500" : "bg-emerald-500"}`} />
        </span>
        <div className="flex-1">
          <p className="font-serif text-[1.35rem] text-ivory-50">
            Site is {offline ? (data.maintenance.emergencyLock ? "LOCKED (emergency)" : "in MAINTENANCE") : "ONLINE"}
          </p>
          <p className="text-sm text-ivory-400/80">
            {offline ? "Public visitors see the maintenance page. Admin and owner panels stay accessible." : "All public routes are serving traffic."}
          </p>
        </div>
        <Link href="/hackeradmin/status">
          <Button variant={offline ? "danger" : "ghost"} size="sm">
            Manage status <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <HealthCard label="Application" status="operational" detail={`${data.site.name} · ${data.app.url ?? "no public URL set"}`} icon={<Power className="h-4 w-4 text-ivory-500" />} />
        <HealthCard label="Firestore" status={data.firebase.firestore as Health} detail={data.firebase.projectId ?? "not configured"} icon={<Database className="h-4 w-4 text-ivory-500" />} />
        <HealthCard label="Authentication" status={data.firebase.auth as Health} detail={data.firebase.authDomain ?? "not configured"} icon={<KeyRound className="h-4 w-4 text-ivory-500" />} />
        <HealthCard label="Storage" status={data.firebase.storage as Health} detail={data.firebase.storageBucket ?? "not configured"} icon={<HardDrive className="h-4 w-4 text-ivory-500" />} />
        <HealthCard label="Email (SMTP)" status={data.email.configured ? "configured" : "unavailable"} detail={data.email.configured ? "credentials present" : "SMTP_HOST/USER/PASS missing"} icon={<Mail className="h-4 w-4 text-ivory-500" />} />
        <HealthCard label="Maintenance" status={offline ? "unavailable" : "operational"} detail={offline ? "visitors redirected" : "site online"} icon={<Power className="h-4 w-4 text-ivory-500" />} />
      </div>

      {data.counts && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Content inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Posts", data.counts.posts],
                ["Events", data.counts.events],
                ["Speakers", data.counts.speakers],
                ["Media", data.counts.media],
                ["Unread", data.counts.unreadMessages],
                ["Subscribers", data.counts.subscribers],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-sm bg-white/[0.03] p-4 text-center">
                  <p className="font-serif text-[1.8rem] text-ivory-50">{value as number}</p>
                  <p className="mt-0.5 text-[12px] font-semibold uppercase tracking-wider text-ivory-500">{label as string}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/hackeradmin/status"><Button variant="ghost" size="sm">Site status</Button></Link>
          <Link href="/hackeradmin/settings"><Button variant="ghost" size="sm">Site settings</Button></Link>
          <Link href="/hackeradmin/smtp"><Button variant="ghost" size="sm">SMTP</Button></Link>
          <Link href="/hackeradmin/users"><Button variant="ghost" size="sm">Users & roles</Button></Link>
          <Link href="/hackeradmin/audit-logs"><Button variant="ghost" size="sm">Audit logs</Button></Link>
          <a href="/api/health" target="_blank" rel="noreferrer"><Button variant="ghost" size="sm">Raw health JSON</Button></a>
        </CardContent>
      </Card>

      <p className="mt-6 text-[12px] text-ivory-500">
        Contact: {data.site.contactEmail} · <Badge variant="default">Secrets are never displayed in this console</Badge>
      </p>
    </>
  );
}
