"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { TableShell, THead, TH, TBody, TD, RowActions } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api } from "@/hooks/use-api";
import type { Speaker } from "@/types";

export default function AdminSpeakersPage() {
  const [items, setItems] = React.useState<Speaker[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<Speaker | null>(null);
  const [busy, setBusy] = React.useState(false);
  const { toast } = useToast();

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const data = await api<{ items: Speaker[] }>("/api/admin/speakers");
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load ]);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/admin/speakers/${deleting.id}`, { method: "DELETE" });
      setItems((prev) => (prev ?? []).filter((s) => s.id !== deleting.id));
      toast({ kind: "success", title: "Speaker deleted" });
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
        title="Speakers"
        description="Manage the lineup"
        action={<Link href="/admin/speakers/new"><Button><Plus /> New speaker</Button></Link>}
      />
      {items === null ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No speakers yet"
          message="Add your first speaker to start building the lineup."
          action={<Link href="/admin/speakers/new"><Button><Plus /> New speaker</Button></Link>}
        />
      ) : (
        <TableShell>
          <THead>
            <TH>Speaker</TH>
            <TH>Role</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </THead>
          <TBody>
            {items.map((s) => (
              <tr key={s.id} className="transition-colors hover:bg-white/[0.03]">
                <TD>
                  <div className="flex items-center gap-3">
                    {s.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.photoURL} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-500/25 bg-gold-500/[0.12] font-serif text-gold-700">
                        {s.name.charAt(0)}
                      </span>
                    )}
                    <div>
                      <p className="font-semibold text-ivory-50">{s.name}</p>
                      {s.featured && <Badge variant="gold">Featured</Badge>}
                    </div>
                  </div>
                </TD>
                <TD className="text-ivory-300">{[s.title, s.company].filter(Boolean).join(" · ") || "—"}</TD>
                <TD>
                  <Badge variant={s.status === "published" ? "success" : "warning"}>{s.status}</Badge>
                </TD>
                <TD>
                  <RowActions>
                    {s.status === "published" && (
                      <Link href={`/speakers/${s.slug}`} target="_blank" aria-label="View speaker">
                        <Button variant="ghost" size="iconSm"><ExternalLink className="h-4 w-4" /></Button>
                      </Link>
                    )}
                    <Link href={`/admin/speakers/${s.id}`} aria-label="Edit speaker">
                      <Button variant="ghost" size="iconSm"><Pencil className="h-4 w-4" /></Button>
                    </Link>
                    <Button variant="ghost" size="iconSm" aria-label="Delete speaker" onClick={() => setDeleting(s)}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </RowActions>
                </TD>
              </tr>
            ))}
          </TBody>
        </TableShell>
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete speaker?"
        message={`"${deleting?.name}" will be permanently deleted.`}
        confirmLabel="Delete speaker"
      />
    </>
  );
}
