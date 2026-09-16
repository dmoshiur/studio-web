"use client";

import * as React from "react";
import { Trash2, Search, MailOpen, Mail } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { TableShell, THead, TH, TBody, TD, RowActions } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { TableSkeleton, EmptyState, ErrorState, LoadMore } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { usePaginatedList } from "@/hooks/use-api";
import { formatDateTime } from "@/lib/utils";
import type { ContactMessage } from "@/types";

export default function AdminMessagesPage() {
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [viewing, setViewing] = React.useState<ContactMessage | null>(null);
  const [deleting, setDeleting] = React.useState<ContactMessage | null>(null);
  const [busy, setBusy] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(t);
  }, [q ]);

  const list = usePaginatedList<ContactMessage>("/api/admin/messages", {
    unread: unreadOnly ? "1" : undefined,
    q: debouncedQ || undefined,
  });

  async function setRead(id: string, read: boolean) {
    try {
      const res = await fetch(`/api/admin/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      });
      if (!res.ok) throw new Error("Update failed");
      if (unreadOnly && read) list.removeItem(id);
      else list.reload();
      if (viewing?.id === id) setViewing({ ...viewing, read });
    } catch (e) {
      toast({ kind: "error", title: "Update failed", message: e instanceof Error ? e.message : undefined });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/messages/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      list.removeItem(deleting.id);
      setDeleting(null);
      setViewing(null);
      toast({ kind: "success", title: "Message deleted" });
    } catch (e) {
      toast({ kind: "error", title: "Delete failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Messages" description="Contact form submissions" />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, subject…" className="pl-10" aria-label="Search messages" />
        </div>
        <Select value={unreadOnly ? "unread" : "all"} onChange={(e) => setUnreadOnly(e.target.value === "unread")} className="sm:w-44" aria-label="Filter messages">
          <option value="all">All messages</option>
          <option value="unread">Unread only</option>
        </Select>
      </div>

      {list.loading ? (
        <TableSkeleton />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.items.length === 0 ? (
        <EmptyState title="No messages" message={unreadOnly ? "All caught up — nothing unread." : "Contact submissions will appear here."} />
      ) : (
        <>
          <TableShell>
            <THead>
              <TH>From</TH>
              <TH>Subject</TH>
              <TH>Received</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </THead>
            <TBody>
              {list.items.map((m) => (
                <tr key={m.id} className="cursor-pointer transition-colors hover:bg-ink-50/50" onClick={() => { setViewing(m); if (!m.read) void setRead(m.id, true); }}>
                  <TD>
                    <p className="font-semibold text-ink-900">{m.name}</p>
                    <p className="text-[12px] text-ink-400">{m.email}</p>
                  </TD>
                  <TD className="max-w-[260px] truncate text-ink-700">{m.subject}</TD>
                  <TD className="whitespace-nowrap text-ink-500">{formatDateTime(m.createdAt)}</TD>
                  <TD>{m.read ? <Badge variant="default">Read</Badge> : <Badge variant="brand">New</Badge>}</TD>
                  <TD>
                    <RowActions>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        aria-label={m.read ? "Mark unread" : "Mark read"}
                        onClick={(e) => { e.stopPropagation(); void setRead(m.id, !m.read); }}
                      >
                        {m.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        aria-label="Delete message"
                        onClick={(e) => { e.stopPropagation(); setDeleting(m); }}
                      >
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

      <Dialog
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.subject ?? ""}
        description={viewing ? `From ${viewing.name} <${viewing.email}> · ${formatDateTime(viewing.createdAt)}` : ""}
        wide
      >
        {viewing && (
          <div>
            {viewing.phone && <p className="mb-3 text-sm text-ink-600"><strong>Phone:</strong> {viewing.phone}</p>}
            <p className="whitespace-pre-wrap rounded-xl bg-ink-50 p-4 text-[15px] leading-relaxed text-ink-800">{viewing.message}</p>
            <div className="mt-4 flex justify-between">
              <Button variant="secondary" size="sm" onClick={() => viewing && void setRead(viewing.id, !viewing.read)}>
                Mark as {viewing.read ? "unread" : "read"}
              </Button>
              <a href={`mailto:${viewing.email}?subject=${encodeURIComponent(`Re: ${viewing.subject}`)}`}>
                <Button size="sm">Reply by email</Button>
              </a>
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete message?"
        message="This message will be permanently deleted."
        confirmLabel="Delete message"
      />
    </>
  );
}
