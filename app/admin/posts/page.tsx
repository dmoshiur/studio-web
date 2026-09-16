"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { TableShell, THead, TH, TBody, TD, RowActions } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { TableSkeleton, EmptyState, ErrorState, LoadMore } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { usePaginatedList, api } from "@/hooks/use-api";
import { formatDate } from "@/lib/utils";
import type { Post } from "@/types";

export default function AdminPostsPage() {
  const [status, setStatus] = React.useState<string>("");
  const [deleting, setDeleting] = React.useState<Post | null>(null);
  const [busy, setBusy] = React.useState(false);
  const { toast } = useToast();
  const list = usePaginatedList<Post>("/api/admin/posts", { status: status || undefined });

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/admin/posts/${deleting.id}`, { method: "DELETE" });
      list.removeItem(deleting.id);
      toast({ kind: "success", title: "Post deleted" });
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
        title="Posts"
        description="Create, edit and publish blog stories"
        action={
          <Link href="/admin/posts/new">
            <Button><Plus /> New post</Button>
          </Link>
        }
      />
      <div className="mb-4 flex gap-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-48" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      {list.loading ? (
        <TableSkeleton />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.items.length === 0 ? (
        <EmptyState
          title="No posts yet"
          message="Write your first story to get the blog going."
          action={<Link href="/admin/posts/new"><Button><Plus /> New post</Button></Link>}
        />
      ) : (
        <>
          <TableShell>
            <THead>
              <TH>Title</TH>
              <TH>Status</TH>
              <TH>Author</TH>
              <TH>Updated</TH>
              <TH className="text-right">Actions</TH>
            </THead>
            <TBody>
              {list.items.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-ink-50/50">
                  <TD>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink-900">{p.title}</span>
                      {p.featured && <Badge variant="brand">Featured</Badge>}
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-400">/{p.slug}</p>
                  </TD>
                  <TD>
                    <Badge variant={p.status === "published" ? "success" : p.status === "draft" ? "warning" : "default"}>
                      {p.status}
                    </Badge>
                  </TD>
                  <TD className="text-ink-600">{p.authorName}</TD>
                  <TD className="whitespace-nowrap text-ink-500">{formatDate(p.updatedAt)}</TD>
                  <TD>
                    <RowActions>
                      {p.status === "published" && (
                        <Link href={`/blog/${p.slug}`} target="_blank" aria-label="View post">
                          <Button variant="ghost" size="iconSm"><ExternalLink className="h-4 w-4" /></Button>
                        </Link>
                      )}
                      <Link href={`/admin/posts/${p.id}`} aria-label="Edit post">
                        <Button variant="ghost" size="iconSm"><Pencil className="h-4 w-4" /></Button>
                      </Link>
                      <Button variant="ghost" size="iconSm" aria-label="Delete post" onClick={() => setDeleting(p)}>
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
        title="Delete post?"
        message={`"${deleting?.title}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete post"
      />
    </>
  );
}
