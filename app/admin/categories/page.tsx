"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { CardSkeleton, ErrorState, EmptyState } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { api } from "@/hooks/use-api";
import { slugify } from "@/lib/utils";
import type { Category } from "@/types";

export default function AdminCategoriesPage() {
  const [items, setItems] = React.useState<Category[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showNew, setShowNew] = React.useState(false);
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Category | null>(null);
  const [busy, setBusy] = React.useState(false);
  const { toast } = useToast();

  const load = React.useCallback(async () => {
    try {
      const data = await api<{ items: Category[] }>("/api/admin/categories");
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load ]);

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const created = await api<Category>("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), slug: slugify(name) }),
      });
      setItems((prev) => [...(prev ?? []), created]);
      setName("");
      setShowNew(false);
      toast({ kind: "success", title: "Category created" });
    } catch (e) {
      toast({ kind: "error", title: "Create failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/admin/categories/${deleting.id}`, { method: "DELETE" });
      setItems((prev) => (prev ?? []).filter((c) => c.id !== deleting.id));
      setDeleting(null);
      toast({ kind: "success", title: "Category deleted" });
    } catch (e) {
      toast({ kind: "error", title: "Delete failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Categories"
        description="Organize blog posts by topic"
        action={<Button onClick={() => setShowNew(true)}><Plus /> New category</Button>}
      />
      {items === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState title="No categories" message="Create categories to organize your posts." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="font-semibold text-ivory-50">{c.name}</p>
                  <p className="mt-0.5 truncate text-[12px] text-ivory-500">/{c.slug}</p>
                  {c.description && <Badge variant="default" className="mt-2">{c.description.slice(0, 40)}</Badge>}
                </div>
                <Button variant="ghost" size="iconSm" aria-label={`Delete ${c.name}`} onClick={() => setDeleting(c)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showNew} onClose={() => setShowNew(false)} title="New category" description="Group related posts together.">
        <div>
          <Label htmlFor="cat-name">Name</Label>
          <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Keynotes" autoFocus />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button onClick={create} loading={saving} disabled={!name.trim()}>Create</Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete category?"
        message={`"${deleting?.name}" will be deleted. Posts in it will keep working but lose their category link.`}
        confirmLabel="Delete category"
      />
    </>
  );
}
