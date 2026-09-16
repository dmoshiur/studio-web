"use client";

import * as React from "react";
import { OwnerPageHeader } from "@/components/hackeradmin/owner-ui";
import { TableShell, THead, TH, TBody, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { TableSkeleton, EmptyState, ErrorState, LoadMore } from "@/components/ui/feedback";
import { usePaginatedList } from "@/hooks/use-api";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/types";

export default function OwnerAuditLogsPage() {
  const [action, setAction] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [viewing, setViewing] = React.useState<AuditLog | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(action), 400);
    return () => clearTimeout(t);
  }, [action ]);

  const list = usePaginatedList<AuditLog>("/api/owner/audit-logs", { action: debounced || undefined }, 25);

  return (
    <>
      <OwnerPageHeader title="Audit logs" description="Append-only record of privileged actions" />
      <div className="mb-4 max-w-sm">
        <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Filter by action, e.g. users.role.change" aria-label="Filter by action" />
      </div>

      {list.loading ? (
        <TableSkeleton />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.items.length === 0 ? (
        <EmptyState title="No audit entries" message="Privileged actions will be recorded here." />
      ) : (
        <>
          <TableShell>
            <THead>
              <TH>Time</TH>
              <TH>Actor</TH>
              <TH>Action</TH>
              <TH>Resource</TH>
              <TH>Result</TH>
            </THead>
            <TBody>
              {list.items.map((l) => (
                <tr key={l.id} className="cursor-pointer transition-colors hover:bg-ink-50/50" onClick={() => setViewing(l)}>
                  <TD className="whitespace-nowrap text-ink-500">{formatDateTime(l.createdAt)}</TD>
                  <TD>
                    <p className="max-w-[200px] truncate font-medium text-ink-900">{l.actorEmail ?? l.actorId.slice(0, 12)}</p>
                    {l.actorRole && <p className="text-[12px] capitalize text-ink-400">{l.actorRole}</p>}
                  </TD>
                  <TD><code className="rounded bg-ink-50 px-2 py-1 font-mono text-[12px] text-ink-800">{l.action}</code></TD>
                  <TD className="max-w-[160px] truncate font-mono text-[12px] text-ink-500">{l.resource ?? "—"}</TD>
                  <TD>
                    <Badge variant={l.result === "success" ? "success" : l.result === "denied" ? "warning" : "danger"}>
                      {l.result}
                    </Badge>
                  </TD>
                </tr>
              ))}
            </TBody>
          </TableShell>
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoad={list.loadMore} />
        </>
      )}

      <Dialog
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.action ?? ""}
        description={viewing ? `${formatDateTime(viewing.createdAt)} · ${viewing.actorEmail ?? viewing.actorId}` : ""}
        wide
      >
        {viewing && (
          <div className="grid gap-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-ink-50 p-3">
                <p className="text-[12px] font-semibold text-ink-400">Result</p>
                <p className="font-semibold">{viewing.result}</p>
              </div>
              <div className="rounded-xl bg-ink-50 p-3">
                <p className="text-[12px] font-semibold text-ink-400">IP</p>
                <p className="font-mono text-[13px]">{viewing.ip ?? "—"}</p>
              </div>
            </div>
            <div>
              <p className="mb-1 text-[12px] font-semibold text-ink-400">Metadata</p>
              <pre className="max-h-64 overflow-auto rounded-xl bg-ink-900 p-4 font-mono text-[12px] text-emerald-200">
                {JSON.stringify(viewing.metadata ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
