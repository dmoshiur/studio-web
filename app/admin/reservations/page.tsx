"use client";

import * as React from "react";
import { CalendarCheck2, CheckCircle2, Ticket, Trash2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { TableShell, THead, TH, TBody, TD, RowActions } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/dialog";
import { TableSkeleton, EmptyState, ErrorState, LoadMore } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { usePaginatedList } from "@/hooks/use-api";
import { formatDateTime } from "@/lib/utils";
import type { Reservation, ReservationStatus } from "@/types";

const STATUS_BADGE: Record<ReservationStatus, { label: string; variant: "gold" | "success" | "danger" }> = {
  requested: { label: "Requested", variant: "gold" },
  confirmed: { label: "Confirmed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

export default function AdminReservationsPage() {
  const [status, setStatus] = React.useState<"" | ReservationStatus>("");
  const [deleting, setDeleting] = React.useState<Reservation | null>(null);
  const [busy, setBusy] = React.useState(false);
  const { toast } = useToast();

  const list = usePaginatedList<Reservation>("/api/admin/reservations", {
    status: status || undefined,
  });

  async function updateStatus(id: string, next: ReservationStatus) {
    try {
      const res = await fetch(`/api/admin/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Update failed");
      }
      list.reload();
      toast({ kind: "success", title: next === "confirmed" ? "Reservation confirmed" : "Reservation cancelled" });
    } catch (e) {
      toast({ kind: "error", title: "Update failed", message: e instanceof Error ? e.message : undefined });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/reservations/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      list.removeItem(deleting.id);
      setDeleting(null);
      toast({ kind: "success", title: "Reservation removed" });
    } catch (e) {
      toast({ kind: "error", title: "Delete failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Reservations"
        description="Seat requests from the public events pages — confirm or cancel each one."
        action={
          <div className="w-44">
            <Select value={status} onChange={(e) => setStatus(e.target.value as "" | ReservationStatus)} aria-label="Filter by status">
              <option value="">All statuses</option>
              <option value="requested">Requested</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
        }
      />

      {list.loading ? (
        <TableSkeleton rows={5} />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.items.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck2 className="h-7 w-7" />}
          title={status ? `No ${status} reservations` : "No reservations yet"}
          message="Seat requests made on the events pages will appear here."
        />
      ) : (
        <TableShell>
          <table className="w-full min-w-[720px] text-left">
            <THead>
              <TH>Event</TH>
              <TH>Attendee</TH>
              <TH>Seats</TH>
              <TH>Status</TH>
              <TH>Requested</TH>
              <TH aria-label="Actions">
                <span className="sr-only">Actions</span>
              </TH>
            </THead>
            <TBody>
              {list.items.map((r) => (
                <tr key={r.id} className="border-t border-white/[0.06] transition-colors hover:bg-white/[0.02]">
                  <TD>
                    <p className="font-medium text-ivory-100">{r.eventTitle}</p>
                    <p className="mt-0.5 text-[12px] text-ivory-500">
                      {r.eventStartAt ? formatDateTime(r.eventStartAt) : "Date TBC"}
                    </p>
                  </TD>
                  <TD>
                    <p className="text-ivory-100">{r.name}</p>
                    <p className="mt-0.5 text-[12px] text-ivory-500">{r.email}</p>
                    {r.note && <p className="mt-1 max-w-[260px] truncate text-[12px] italic text-ivory-400">“{r.note}”</p>}
                  </TD>
                  <TD>
                    <span className="inline-flex items-center gap-1.5 text-ivory-100">
                      <Ticket className="h-3.5 w-3.5 text-gold-400" /> {r.seats}
                    </span>
                  </TD>
                  <TD>
                    <Badge variant={STATUS_BADGE[r.status].variant}>{STATUS_BADGE[r.status].label}</Badge>
                  </TD>
                  <TD>
                    <span className="text-[12.5px] text-ivory-400">{formatDateTime(r.createdAt)}</span>
                  </TD>
                  <TD>
                    <RowActions>
                      {r.status !== "confirmed" && (
                        <Button variant="ghost" size="iconSm" title="Confirm" aria-label="Confirm reservation" onClick={() => void updateStatus(r.id, "confirmed")}>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        </Button>
                      )}
                      {r.status !== "cancelled" && (
                        <Button variant="ghost" size="iconSm" title="Cancel" aria-label="Cancel reservation" onClick={() => void updateStatus(r.id, "cancelled")}>
                          <XCircle className="h-4 w-4 text-amber-400" />
                        </Button>
                      )}
                      <Button variant="ghost" size="iconSm" title="Delete" aria-label="Delete reservation" onClick={() => setDeleting(r)}>
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </RowActions>
                  </TD>
                </tr>
              ))}
            </TBody>
          </table>
        </TableShell>
      )}

      {!list.loading && !list.error && list.items.length > 0 && (
        <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoad={list.loadMore} />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        loading={busy}
        destructive
        title="Remove this reservation?"
        message={`${deleting?.name ?? "This attendee"} — ${deleting?.eventTitle ?? ""}. The record will be permanently deleted.`}
        confirmLabel="Delete"
      />
    </>
  );
}
