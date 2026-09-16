"use client";

import * as React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { TableShell, THead, TH, TBody, TD, RowActions } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { RichEditor } from "@/components/admin/rich-editor";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { api } from "@/hooks/use-api";
import { slugify, formatDate } from "@/lib/utils";
import type { PageDoc } from "@/types";

const EMPTY: { slug: string; title: string; contentHtml: string; status: PageDoc["status"] } = {
  slug: "",
  title: "",
  contentHtml: "",
  status: "draft",
};

export default function AdminPagesPage() {
  const [items, setItems] = React.useState<PageDoc[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<(typeof EMPTY & { id?: string }) | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<PageDoc | null>(null);
  const [busy, setBusy] = React.useState(false);
  const { toast } = useToast();

  const load = React.useCallback(async () => {
    try {
      const data = await api<{ items: PageDoc[] }>("/api/admin/pages");
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load ]);

  async function save() {
    if (!editing || !editing.slug.trim() || !editing.title.trim()) return;
    setSaving(true);
    try {
      const saved = await api<PageDoc>("/api/admin/pages", {
        method: "POST",
        body: JSON.stringify({ ...editing, slug: slugify(editing.slug) }),
      });
      setItems((prev) => {
        const rest = (prev ?? []).filter((p) => p.id !== saved.id);
        return [...rest, saved].sort((a, b) => a.slug.localeCompare(b.slug));
      });
      setEditing(null);
      toast({ kind: "success", title: "Page saved" });
    } catch (e) {
      toast({ kind: "error", title: "Save failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/admin/pages/${deleting.id}`, { method: "DELETE" });
      setItems((prev) => (prev ?? []).filter((p) => p.id !== deleting.id));
      setDeleting(null);
      toast({ kind: "success", title: "Page deleted" });
    } catch (e) {
      toast({ kind: "error", title: "Delete failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Pages"
        description="Custom content pages (about, privacy and more)"
        action={<Button onClick={() => setEditing({ ...EMPTY })}><Plus /> New page</Button>}
      />
      {items === null ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState title="No pages yet" message="Reserve slugs like about or privacy to override built-in content." />
      ) : (
        <TableShell>
          <THead>
            <TH>Slug</TH>
            <TH>Title</TH>
            <TH>Status</TH>
            <TH>Updated</TH>
            <TH className="text-right">Actions</TH>
          </THead>
          <TBody>
            {items.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-white/[0.03]">
                <TD className="font-mono text-[13px] text-ivory-50">/{p.slug}</TD>
                <TD className="font-semibold text-ivory-50">{p.title}</TD>
                <TD>
                  <Badge variant={p.status === "published" ? "success" : "warning"}>{p.status}</Badge>
                </TD>
                <TD className="text-ivory-400/80">{formatDate(p.updatedAt)}</TD>
                <TD>
                  <RowActions>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      aria-label="Edit page"
                      onClick={() => setEditing({ id: p.id, slug: p.slug, title: p.title, contentHtml: p.contentHtml, status: p.status })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="iconSm" aria-label="Delete page" onClick={() => setDeleting(p)}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </RowActions>
                </TD>
              </tr>
            ))}
          </TBody>
        </TableShell>
      )}

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit page" : "New page"}
        wide
      >
        {editing && (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Slug *</Label>
                <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="about" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as PageDoc["status"] })}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>Title *</Label>
              <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <RichEditor label="Content *" value={editing.contentHtml} onChange={(v) => setEditing({ ...editing, contentHtml: v })} minHeight={220} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} loading={saving}>Save page</Button>
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete page?"
        message={`"/${deleting?.slug}" will be permanently deleted.`}
        confirmLabel="Delete page"
      />
    </>
  );
}
