import { NextResponse } from "next/server";
import { requireHackerAdmin } from "@/lib/server/auth";
import { clearOpsLog, getOpsCounters, hydrateOpsLog, queryOpsLog, type OpsLevel } from "@/lib/server/ops-log";
import { handleApiError, ok } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live operational log feed for the /hackeradmin terminal.
 * Real entries produced by the running application (startup, database,
 * auth, passcode events, email results, errors) — never fabricated.
 */
export async function GET(req: Request) {
  try {
    await requireHackerAdmin();
    await hydrateOpsLog();
    const url = new URL(req.url);
    const afterId = Number(url.searchParams.get("after") ?? 0) || 0;
    const level = (url.searchParams.get("level") ?? "all") as OpsLevel | "all";
    const search = url.searchParams.get("q") ?? undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 200) || 200, 500);
    const { entries, latestId } = queryOpsLog({ afterId, level, search, limit });
    return ok({ entries, latestId, counters: getOpsCounters() });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Clear the operational log (ring buffer + persisted tail). */
export async function DELETE() {
  try {
    const actor = await requireHackerAdmin();
    const removed = clearOpsLog();
    await auditLog({ actor, action: "hackeradmin.logs.clear", result: "success", metadata: { removed } });
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    return handleApiError(err);
  }
}
