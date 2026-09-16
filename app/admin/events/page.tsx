"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { TableShell, THead, TH, TBody, TD, RowActions } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableSkeleton, EmptyState, ErrorState, LoadMore } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { usePaginatedList, api } from "@/hooks/use-api";
import { formatDateTime } from "@/lib/utils";
import type { EventItem } from "@/types";

export default function AdminEventsPage() {
  const [deleting, setDeleting] = React.useState<EventItem | null>(null);
  const [busy, setBusy] = React.useState(false);
  const { toast } = useToast();
  const list = usePaginatedList<EventItem>("/api/admin/events");

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/admin/events/${deleting.id}`, { method: "DELETE" });
      list.removeItem(deleting.id);
      toast({ kind: "success", title: "Event deleted" });
      setDeleting(null);
    } catch (e) {
      toast({ kind: "error", title: "Delete failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Events"
        description="Manage the schedule, venues and sessions"
        action={<Link href="/admin/events/new"><Button><Plus /> New event</Button></Link>}
      />
      {list.loading ? (
        <TableSkeleton />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.items.length === 0 ? (
        <EmptyState
          title="No events yet"
          message="Create your first event to start building the schedule."
          action={<Link href="/admin/events/new"><Button><Plus /> New event</Button></Link>}
        />
      ) : (
        <>
          <TableShell>
            <THead>
              <TH>Event</TH>
              <TH>Status</TH>
              <TH>Starts</TH>
              <TH>Venue</TH>
              <TH className="text-right">Actions</TH>
            </THead>
            <TBody>
              {list.items.map((e) => (
                <tr key={e.id} className="transition-colors hover:bg-ink-50/50">
                  <TD>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink-900">{e.title}</span>
                      {e.featured && <Badge variant="brand">Featured</Badge>}
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-400">/{e.slug}</p>
                  </TD>
                  <TD>
                    <Badge variant={e.status === "published" ? "success" : e.status === "draft" ? "warning" : "default"}>
                      {e.status}
                    </Badge>
                  </TD>
                  <TD className="whitespace-nowrap text-ink-600">{formatDateTime(e.startAt)}</TD>
                  <TD className="text-ink-600">{e.venue || "—"}</TD>
                  <TD>
                    <RowActions>
                      {e.status === "published" && (
                        <Link href={`/events/${e.slug}`} target="_blank" aria-label="View event">
                          <Button variant="ghost" size="iconSm"><ExternalLink className="h-4 w-4" /></Button>
                        </Link>
                      )}
                      <Link href={`/admin/events/${e.id}`} aria-label="Edit event">
                        <Button variant="ghost" size="iconSm"><Pencil className="h-4 w-4" /></Button>
                      </Link>
                      <Button variant="ghost" size="iconSm" aria-label="Delete event" onClick={() => setDeleting(e)}>
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
        title="Delete event?"
        message={`"${deleting?.title}" will be permanently deleted.`}
        confirmLabel="Delete event"
      />
    </>
  );
}
