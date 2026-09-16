"use client";

import * as React from "react";
import { Trash2, Download } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { TableShell, THead, TH, TBody, TD, RowActions } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { TableSkeleton, EmptyState, ErrorState, LoadMore } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { usePaginatedList } from "@/hooks/use-api";
import { formatDate } from "@/lib/utils";
import type { Subscriber } from "@/types";

export default function AdminSubscribersPage() {
  const [deleting, setDeleting] = React.useState<Subscriber | null>(null);
  const [busy, setBusy] = React.useState(false);
  const { toast } = useToast();
  const list = usePaginatedList<Subscriber>("/api/admin/subscribers");

  function exportCsv() {
    const rows = ["email,status,source,createdAt", ...list.items.map((s) => `${s.email},${s.status},${s.source ?? ""},${s.createdAt}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/subscribers/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      list.removeItem(deleting.id);
      setDeleting(null);
      toast({ kind: "success", title: "Subscriber removed" });
    } catch (e) {
      toast({ kind: "error", title: "Delete failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Subscribers"
        description="Newsletter audience"
        action={<Button variant="secondary" onClick={exportCsv} disabled={list.items.length === 0}><Download /> Export CSV</Button>}
      />
      {list.loading ? (
        <TableSkeleton />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.items.length === 0 ? (
        <EmptyState title="No subscribers yet" message="Newsletter signups will appear here." />
      ) : (
        <>
          <TableShell>
            <THead>
              <TH>Email</TH>
              <TH>Status</TH>
              <TH>Source</TH>
              <TH>Joined</TH>
              <TH className="text-right">Actions</TH>
            </THead>
            <TBody>
              {list.items.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-ink-50/50">
                  <TD className="font-medium text-ink-900">{s.email}</TD>
                  <TD>
                    <Badge variant={s.status === "active" ? "success" : "default"}>{s.status}</Badge>
                  </TD>
                  <TD className="text-ink-500">{s.source ?? "—"}</TD>
                  <TD className="text-ink-500">{formatDate(s.createdAt)}</TD>
                  <TD>
                    <RowActions>
                      <Button variant="ghost" size="iconSm" aria-label="Remove subscriber" onClick={() => setDeleting(s)}>
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </RowActions>
                  </TD>
                </tr>
              ))}
            </TBody>
          </TableShell>
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoad={list.loadMore} />
        </>
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Remove subscriber?"
        message={`${deleting?.email} will be removed from the list.`}
        confirmLabel="Remove"
      />
    </>
  );
}
