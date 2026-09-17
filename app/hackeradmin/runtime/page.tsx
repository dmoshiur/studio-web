"use client";

import * as React from "react";
import { Activity, Database, Mail, RefreshCw, Trash2, Cpu, MemoryStick, Clock } from "lucide-react";
import { OwnerPageHeader, HealthCard } from "@/components/hackeradmin/owner-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardSkeleton, ErrorState } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { api } from "@/hooks/use-api";

interface RuntimeInfo {
  serverTime: string;
  uptimeSeconds: number;
  process: {
    pid: number;
    nodeVersion: string;
    platform: string;
    memory: { rssBytes: number; heapUsedBytes: number; heapTotalBytes: number };
    cpuPercent: number;
    loadAvg: number[];
    cpus: number;
  };
  app: {
    environment: string;
    commit: string | null;
    backend: string;
    appUrl: string | null;
    dataDir: string;
    registrationOpen: boolean;
    sessionCookie: string;
  };
  database: { status: "operational" | "error"; latencyMs: number };
  email: { configured: boolean; host: string | null; port: number | null; user: string | null; fromEmail: string | null };
  passcode: { mode: string; valid: boolean; expiresAt: string | null; lastRotationResult: string | null; lockedUntil: string | null } | null;
  counters: { startedAt: string };
}

function fmtBytes(n: number): string {
  if (n > 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n > 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

function fmtUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

export default function RuntimePage() {
  const { toast } = useToast();
  const [data, setData] = React.useState<RuntimeInfo | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [actionBusy, setActionBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      setData(await api<RuntimeInfo>("/api/owner/runtime"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  React.useEffect(() => {
    void load();
    const t = setInterval(() => {
      void api<RuntimeInfo>("/api/owner/runtime").then(setData).catch(() => undefined);
    }, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function run(action: "test-db" | "test-smtp" | "flush-cache") {
    setActionBusy(action);
    try {
      const res = await api<{ ok: boolean; message: string }>("/api/owner/runtime", {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      toast({ kind: "success", title: "Action complete", message: res.message });
      await load();
    } catch (e) {
      toast({ kind: "error", title: "Action failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setActionBusy(null);
    }
  }

  if (error)
    return (
      <>
        <OwnerPageHeader title="Runtime & Controls" description="Live process status and safe runtime actions" />
        <ErrorState message={error} onRetry={load} />
      </>
    );

  if (!data)
    return (
      <>
        <OwnerPageHeader title="Runtime & Controls" description="Live process status and safe runtime actions" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </>
    );

  return (
    <>
      <OwnerPageHeader
        title="Runtime & Controls"
        description={`Server time ${new Date(data.serverTime).toLocaleString()} · refreshed every 5s`}
        action={
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HealthCard
          label="Application"
          status="operational"
          detail={`${data.app.environment}${data.app.commit ? ` · ${data.app.commit}` : ""} · ${data.app.backend} backend`}
          icon={<Activity className="h-4 w-4 text-ivory-500" />}
        />
        <HealthCard
          label="Database"
          status={data.database.status}
          detail={data.database.status === "operational" ? `responded in ${data.database.latencyMs}ms` : "connection failed"}
          icon={<Database className="h-4 w-4 text-ivory-500" />}
        />
        <HealthCard
          label="Email (SMTP)"
          status={data.email.configured ? "configured" : "unavailable"}
          detail={data.email.configured ? `${data.email.host}:${data.email.port}` : "SMTP env vars missing"}
          icon={<Mail className="h-4 w-4 text-ivory-500" />}
        />
        <HealthCard
          label="Passcode"
          status={data.passcode?.valid ? "operational" : "error"}
          detail={
            data.passcode
              ? `${data.passcode.mode} mode · ${data.passcode.valid && data.passcode.expiresAt ? `expires ${new Date(data.passcode.expiresAt).toLocaleTimeString()}` : "no active code"}`
              : "unavailable"
          }
          icon={<Clock className="h-4 w-4 text-ivory-500" />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-gold-400" /> Process
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2.5 text-[13px]">
              <InfoRow k="Uptime" v={fmtUptime(data.uptimeSeconds)} />
              <InfoRow k="PID" v={String(data.process.pid)} />
              <InfoRow k="Node" v={data.process.nodeVersion} />
              <InfoRow k="Platform" v={data.process.platform} />
              <InfoRow k="CPU" v={`${data.process.cpuPercent}% · load ${data.process.loadAvg.map((l) => l.toFixed(2)).join(" / ")} · ${data.process.cpus} cores`} />
              <InfoRow k="Memory (RSS)" v={fmtBytes(data.process.memory.rssBytes)} />
              <InfoRow k="Heap" v={`${fmtBytes(data.process.memory.heapUsedBytes)} / ${fmtBytes(data.process.memory.heapTotalBytes)}`} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MemoryStick className="h-4 w-4 text-gold-400" /> Configuration status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2.5 text-[13px]">
              <InfoRow k="Backend" v={data.app.backend} />
              <InfoRow k="App URL" v={data.app.appUrl ?? "not set"} />
              <InfoRow k="Data dir" v={data.app.dataDir} />
              <InfoRow k="Registration" v={data.app.registrationOpen ? "open" : "closed"} />
              <InfoRow k="Session cookie" v={data.app.sessionCookie} />
              <InfoRow k="SMTP user" v={data.email.user ?? "—"} />
              <InfoRow k="SMTP from" v={data.email.fromEmail ?? "—"} />
            </dl>
            <p className="mt-4 border-t border-white/[0.07] pt-3 text-[11.5px] text-ivory-500">
              Secrets (passwords, keys, connection strings) are never displayed in this console.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Runtime controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={() => void run("test-db")} loading={actionBusy === "test-db"}>
            <Database className="h-4 w-4" /> Test database connection
          </Button>
          <Button variant="outline" size="sm" onClick={() => void run("test-smtp")} loading={actionBusy === "test-smtp"}>
            <Mail className="h-4 w-4" /> Test SMTP connection
          </Button>
          <Button variant="outline" size="sm" onClick={() => void run("flush-cache")} loading={actionBusy === "flush-cache"}>
            <Trash2 className="h-4 w-4" /> Flush application cache
          </Button>
        </CardContent>
        <p className="px-6 pb-5 text-[11.5px] leading-relaxed text-ivory-500">
          Actions run for real and report their true result. Host-managed operations that this
          deployment cannot safely perform (e.g. restarting the server process) are intentionally
          not offered here.
        </p>
      </Card>
    </>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b border-white/[0.06] pb-2 last:border-0 last:pb-0">
      <dt className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ivory-500">{k}</dt>
      <dd className="break-all font-mono text-[12.5px] text-ivory-200">{v}</dd>
    </div>
  );
}
