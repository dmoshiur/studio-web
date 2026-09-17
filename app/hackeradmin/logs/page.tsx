"use client";

import * as React from "react";
import { Pause, Play, Trash2, TerminalSquare } from "lucide-react";
import { OwnerPageHeader } from "@/components/hackeradmin/owner-ui";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface OpsEntry {
  id: number;
  ts: string;
  level: "debug" | "info" | "warn" | "error";
  source: string;
  message: string;
}

interface Counters {
  startedAt: string;
  apiErrors: number;
  authSuccess: number;
  authFailures: number;
  passcodeAttempts: number;
  passcodeFailures: number;
  emailsSent: number;
  emailsFailed: number;
  rateLimited: number;
  maintenanceToggles: number;
}

const LEVELS = ["all", "info", "warn", "error", "debug"] as const;
type Level = (typeof LEVELS)[number];

const LEVEL_STYLE: Record<OpsEntry["level"], string> = {
  debug: "text-ivory-500",
  info: "text-ivory-200",
  warn: "text-amber-300",
  error: "text-red-300",
};

/**
 * Live operational terminal. Polls the real server log feed every 2s —
 * entries are produced by the running application, never fabricated.
 */
export default function LiveLogsPage() {
  const { toast } = useToast();
  const [entries, setEntries] = React.useState<OpsEntry[]>([]);
  const [counters, setCounters] = React.useState<Counters | null>(null);
  const [afterId, setAfterId] = React.useState(0);
  const [level, setLevel] = React.useState<Level>("all");
  const [search, setSearch] = React.useState("");
  const [paused, setPaused] = React.useState(false);
  const [autoScroll, setAutoScroll] = React.useState(true);
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const pausedRef = React.useRef(paused);
  pausedRef.current = paused;

  const poll = React.useCallback(async () => {
    if (pausedRef.current) return;
    try {
      const params = new URLSearchParams({ after: String(afterId), limit: "200" });
      const res = await fetch(`/api/owner/logs?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { entries: OpsEntry[]; latestId: number; counters: Counters };
      if (data.entries.length) {
        setEntries((prev) => [...prev, ...data.entries].slice(-800));
        setAfterId(data.latestId);
      }
      setCounters(data.counters);
    } catch {
      /* transient — the next poll retries */
    }
  }, [afterId]);

  React.useEffect(() => {
    void poll();
    const t = setInterval(() => void poll(), 2000);
    return () => clearInterval(t);
  }, [poll]);

  React.useEffect(() => {
    if (autoScroll && !paused) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries, autoScroll, paused]);

  const visible = React.useMemo(() => {
    let list = entries;
    if (level !== "all") list = list.filter((e) => e.level === level);
    if (search.trim()) {
      const needle = search.toLowerCase();
      list = list.filter((e) => e.message.toLowerCase().includes(needle) || e.source.toLowerCase().includes(needle));
    }
    return list.slice(-400);
  }, [entries, level, search]);

  async function clearLogs() {
    setClearing(true);
    try {
      const res = await fetch("/api/owner/logs", { method: "DELETE" });
      if (!res.ok) throw new Error("Clear failed");
      setEntries([]);
      setAfterId(0);
      toast({ kind: "success", title: "Log cleared" });
    } catch (e) {
      toast({ kind: "error", title: "Could not clear logs", message: e instanceof Error ? e.message : undefined });
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  }

  return (
    <>
      <OwnerPageHeader
        title="Live Logs"
        description="Real application events: startup, database, authentication, passcode lifecycle, email delivery and errors."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setPaused((p) => !p)}>
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button variant="dangerOutline" size="sm" onClick={() => setConfirmClear(true)}>
              <Trash2 className="h-4 w-4" /> Clear
            </Button>
          </div>
        }
      />

      {counters && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          <Counter label="Auth OK" value={counters.authSuccess} />
          <Counter label="Auth fails" value={counters.authFailures} />
          <Counter label="Passcode tries" value={counters.passcodeAttempts} />
          <Counter label="Passcode fails" value={counters.passcodeFailures} />
          <Counter label="Emails sent" value={counters.emailsSent} />
          <Counter label="Emails failed" value={counters.emailsFailed} />
          <Counter label="Rate-limited" value={counters.rateLimited} />
          <Counter label="API errors" value={counters.apiErrors} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Log level filter">
          {LEVELS.map((l) => (
            <button
              key={l}
              role="tab"
              aria-selected={level === l}
              onClick={() => setLevel(l)}
              className={cn(
                "border px-3 py-1.5 font-sans text-[10.5px] font-semibold uppercase tracking-[0.16em] transition-colors",
                level === l
                  ? "border-gold-500/60 bg-gold-500/[0.14] text-gold-200"
                  : "border-white/10 text-ivory-400 hover:border-white/25 hover:text-ivory-200"
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter messages…"
          aria-label="Search logs"
          className="h-9 w-full max-w-xs border border-white/12 bg-white/[0.04] px-3 font-mono text-[12.5px] text-ivory-100 outline-none placeholder:text-ivory-600 focus:border-gold-400/60"
        />
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-[12px] text-ivory-400">
          <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} className="accent-gold-500" />
          Auto-scroll
        </label>
      </div>

      <div className="terminal-scroll h-[52vh] min-h-[320px] overflow-y-auto border border-gold-500/[0.16] bg-[#050507] p-4 font-mono text-[12.5px] leading-[1.7]">
        {visible.length === 0 ? (
          <p className="flex h-full items-center justify-center gap-2 text-ivory-600">
            <TerminalSquare className="h-4 w-4" /> No log entries match — new events appear here in real time.
          </p>
        ) : (
          visible.map((e) => (
            <div key={e.id} className="grid grid-cols-[86px_58px_92px_1fr] gap-2 whitespace-pre-wrap break-words sm:grid-cols-[86px_64px_110px_1fr]">
              <span className="text-ivory-600">{new Date(e.ts).toLocaleTimeString()}</span>
              <span className={cn("font-bold uppercase", LEVEL_STYLE[e.level])}>{e.level}</span>
              <span className="truncate text-gold-400/80">{e.source}</span>
              <span className={LEVEL_STYLE[e.level]}>{e.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <p className="mt-3 text-[11.5px] text-ivory-500">
        {paused ? "Streaming paused — resume to continue receiving events." : "Streaming live (2s interval)."} Secrets are never written to this log.
      </p>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => void clearLogs()}
        loading={clearing}
        destructive
        title="Clear the operational log?"
        message="All buffered and persisted log entries will be removed. This is recorded in the audit log."
        confirmLabel="Clear logs"
      />
    </>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-center">
      <p className={cn("font-serif text-[1.35rem]", value > 0 ? "text-ivory-50" : "text-ivory-600")}>{value}</p>
      <p className="mt-0.5 font-sans text-[9px] font-semibold uppercase tracking-[0.16em] text-ivory-500">{label}</p>
    </div>
  );
}
