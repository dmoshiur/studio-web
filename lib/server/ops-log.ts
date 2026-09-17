import "server-only";

/**
 * =====================================================================
 * Operational log — real, in-process event log powering the
 * /hackeradmin live terminal.
 * =====================================================================
 * Entries live in a bounded in-memory ring buffer (fast, zero cost) and
 * warning/error entries are additionally persisted to the database so a
 * useful tail survives restarts. Secrets are never written here: callers
 * pass structured, pre-sanitized messages only, and `sanitizeLine` strips
 * anything that looks credential-shaped as a last line of defence.
 */

export type OpsLevel = "debug" | "info" | "warn" | "error";

export interface OpsEntry {
  id: number;
  ts: string; // ISO timestamp
  level: OpsLevel;
  source: string;
  message: string;
}

const RING_CAP = 1000;
const PERSIST_CAP = 400;

let ring: OpsEntry[] = [];
let nextId = 1;
let hydrated = false;
let hydrating: Promise<void> | null = null;
let persistQueue: Promise<unknown> = Promise.resolve();

/** Basic secret scrubbing — defence in depth, callers must not log secrets. */
function sanitizeLine(message: string): string {
  return message
    .replace(/(smtp[_-]?pass(word)?|password|passwd|secret|token|apikey|api[_-]?key|authorization)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [redacted]")
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[redacted private key]")
    .slice(0, 2000);
}

export function opsLog(level: OpsLevel, source: string, message: string): void {
  const entry: OpsEntry = {
    id: nextId++,
    ts: new Date().toISOString(),
    level,
    source,
    message: sanitizeLine(message),
  };
  ring.push(entry);
  if (ring.length > RING_CAP) ring = ring.slice(ring.length - RING_CAP);

  if (level === "warn" || level === "error") {
    // Persist important entries (fire and forget, serialized to keep order).
    persistQueue = persistQueue
      .then(() => persistEntry(entry))
      .catch(() => undefined);
  }
}

export const opsInfo = (source: string, message: string) => opsLog("info", source, message);
export const opsWarn = (source: string, message: string) => opsLog("warn", source, message);
export const opsError = (source: string, message: string) => opsLog("error", source, message);
export const opsDebug = (source: string, message: string) => opsLog("debug", source, message);

async function persistEntry(entry: OpsEntry): Promise<void> {
  try {
    const { getAdminDb } = await import("@/lib/firebase/admin");
    const db = getAdminDb();
    if (!db) return;
    await db.collection("opsLogs").doc(String(entry.id)).set({
      ts: entry.ts,
      level: entry.level,
      source: entry.source,
      message: entry.message,
    });
    // Prune to keep the collection bounded.
    const snap = await db.collection("opsLogs").orderBy("ts", "desc").limit(PERSIST_CAP + 50).get();
    if (snap.size > PERSIST_CAP) {
      const overflow = snap.docs.slice(PERSIST_CAP);
      await Promise.all(overflow.map((d) => d.ref.delete()));
    }
  } catch {
    /* persistence is best-effort; the ring buffer still serves the terminal */
  }
}

/** Seed the ring buffer with the persisted tail after a restart. */
export async function hydrateOpsLog(): Promise<void> {
  if (hydrated) return;
  if (!hydrating) {
    hydrating = (async () => {
      try {
        const { getAdminDb } = await import("@/lib/firebase/admin");
        const db = getAdminDb();
        if (!db) return;
        const snap = await db.collection("opsLogs").orderBy("ts", "desc").limit(200).get();
        const persisted: OpsEntry[] = snap.docs
          .map((d) => {
            const data = d.data() as { ts?: string; level?: string; source?: string; message?: string };
            return {
              id: 0, // reassigned below
              ts: data.ts ?? new Date(0).toISOString(),
              level: (data.level as OpsLevel) ?? "info",
              source: data.source ?? "system",
              message: data.message ?? "",
            };
          })
          .reverse();
        // Re-id so cursors stay monotonic, and keep entries newer than what
        // this process already produced (multi-instance friendliness).
        for (const p of persisted) {
          if (ring.some((r) => r.ts === p.ts && r.message === p.message)) continue;
          ring.unshift({ ...p, id: nextId++ });
        }
        ring.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
        ring = ring.map((e, i) => ({ ...e, id: i + 1 }));
        nextId = ring.length + 1;
        if (ring.length > RING_CAP) ring = ring.slice(ring.length - RING_CAP);
      } catch {
        /* nothing persisted yet */
      } finally {
        hydrated = true;
      }
    })();
  }
  await hydrating;
}

export interface OpsLogQuery {
  afterId?: number;
  level?: OpsLevel | "all";
  search?: string;
  limit?: number;
}

export function queryOpsLog(q: OpsLogQuery): { entries: OpsEntry[]; latestId: number } {
  let entries = ring;
  if (q.afterId) entries = entries.filter((e) => e.id > q.afterId!);
  if (q.level && q.level !== "all") entries = entries.filter((e) => e.level === q.level);
  if (q.search) {
    const needle = q.search.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.message.toLowerCase().includes(needle) ||
        e.source.toLowerCase().includes(needle)
    );
  }
  const limit = Math.min(q.limit ?? 200, 500);
  if (entries.length > limit) entries = entries.slice(entries.length - limit);
  return { entries, latestId: ring.length ? ring[ring.length - 1].id : 0 };
}

export function clearOpsLog(): number {
  const removed = ring.length;
  ring = [];
  nextId = 1;
  // Async best-effort wipe of the persisted tail.
  void (async () => {
    try {
      const { getAdminDb } = await import("@/lib/firebase/admin");
      const db = getAdminDb();
      if (!db) return;
      const snap = await db.collection("opsLogs").limit(500).get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
    } catch {
      /* ignore */
    }
  })();
  return removed;
}

/* ------------------------------------------------------------------ */
/* Lightweight runtime counters (real observations, not mock stats)     */
/* ------------------------------------------------------------------ */

export interface OpsCounters {
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

const startedAt = new Date().toISOString();

const counters: Omit<OpsCounters, "startedAt"> = {
  apiErrors: 0,
  authSuccess: 0,
  authFailures: 0,
  passcodeAttempts: 0,
  passcodeFailures: 0,
  emailsSent: 0,
  emailsFailed: 0,
  rateLimited: 0,
  maintenanceToggles: 0,
};

export function bumpCounter(key: keyof Omit<OpsCounters, "startedAt">, by = 1): void {
  counters[key] += by;
}

export function getOpsCounters(): OpsCounters {
  return { startedAt, ...counters };
}
