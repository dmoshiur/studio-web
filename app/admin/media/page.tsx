"use client";

import * as React from "react";
import { Upload, Trash2, Copy, Check, Search, LayoutGrid, List } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton, EmptyState, ErrorState, LoadMore } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { usePaginatedList } from "@/hooks/use-api";
import { formatBytes, formatDateTime, cn } from "@/lib/utils";
import type { MediaItem } from "@/types";

const FOLDERS = ["media/images", "media/public", "events", "speakers", "posts", "avatars", "media/documents"];

export default function AdminMediaPage() {
  const [folder, setFolder] = React.useState("");
  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<MediaItem | null>(null);
  const [deleting, setDeleting] = React.useState<MediaItem | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(t);
  }, [q ]);

  const list = usePaginatedList<MediaItem>("/api/admin/media", {
    folder: folder || undefined,
    q: debouncedQ || undefined,
  }, 24);

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    let okCount = 0;
    for (const file of Array.from(files)) {
      setProgress(`Uploading ${file.name}…`);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("folder", folder || "media/images");
        const res = await fetch("/api/admin/media/upload", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as { error?: string }).error ?? `Failed: ${file.name}`);
        okCount++;
      } catch (e) {
        toast({ kind: "error", title: "Upload failed", message: e instanceof Error ? e.message : undefined });
      }
    }
    setProgress(null);
    setUploading(false);
    if (okCount > 0) {
      toast({ kind: "success", title: `${okCount} file${okCount > 1 ? "s" : ""} uploaded` });
      list.reload();
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/media/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      list.removeItem(deleting.id);
      setDeleting(null);
      setSelected(null);
      toast({ kind: "success", title: "File deleted" });
    } catch (e) {
      toast({ kind: "error", title: "Delete failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  function copyUrl(url: string) {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <>
      <PageHeader
        title="Media library"
        description="Images and documents stored in Firebase Storage"
        action={
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.csv"
              className="hidden"
              onChange={(e) => void onFiles(e.target.files)}
            />
            <Button onClick={() => fileRef.current?.click()} loading={uploading}>
              <Upload /> Upload
            </Button>
          </>
        }
      />

      {progress && (
        <p role="status" className="mb-4 rounded-xl bg-brand-gradient-soft px-4 py-2.5 text-sm font-medium text-brand-700">
          {progress}
        </p>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" className="pl-10" aria-label="Search media" />
        </div>
        <Select value={folder} onChange={(e) => setFolder(e.target.value)} className="sm:w-52" aria-label="Filter by folder">
          <option value="">All folders</option>
          {FOLDERS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </Select>
        <div className="flex gap-1 rounded-xl border border-ink-200 bg-white p-1">
          <button
            onClick={() => setView("grid")}
            aria-label="Grid view"
            className={cn("rounded-lg p-2", view === "grid" ? "bg-ink-900 text-white" : "text-ink-400")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            aria-label="List view"
            className={cn("rounded-lg p-2", view === "list" ? "bg-ink-900 text-white" : "text-ink-400")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {list.loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.items.length === 0 ? (
        <EmptyState
          title="No files yet"
          message="Upload images for posts, events and speakers."
          action={<Button onClick={() => fileRef.current?.click()}><Upload /> Upload files</Button>}
        />
      ) : view === "grid" ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {list.items.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className="group overflow-hidden rounded-2xl border border-ink-100 bg-white text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="aspect-square bg-ink-50">
                  {m.mimeType.startsWith("image/") && m.downloadUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.downloadUrl} alt={m.alt || m.fileName} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="rounded-lg bg-white px-3 py-1.5 text-[12px] font-bold uppercase text-ink-500">
                        {m.mimeType.split("/")[1]?.slice(0, 8) ?? "file"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-[13px] font-semibold text-ink-900">{m.originalName}</p>
                  <p className="mt-0.5 text-[12px] text-ink-400">{formatBytes(m.sizeBytes)}</p>
                </div>
              </button>
            ))}
          </div>
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoad={list.loadMore} />
        </>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
          {list.items.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className="flex w-full items-center gap-4 border-b border-ink-100 p-3 text-left last:border-0 hover:bg-ink-50/50"
            >
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-ink-50">
                {m.mimeType.startsWith("image/") && m.downloadUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.downloadUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-[10px] font-bold uppercase text-ink-400">file</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink-900">{m.originalName}</span>
                <span className="text-[12px] text-ink-400">{m.folder} · {formatBytes(m.sizeBytes)}</span>
              </span>
              <Badge variant={m.visibility === "public" ? "success" : "default"}>{m.visibility}</Badge>
            </button>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.originalName ?? ""} description={selected ? `${selected.folder} · ${formatBytes(selected.sizeBytes)} · ${formatDateTime(selected.createdAt)}` : ""} wide>
        {selected && (
          <div className="grid gap-4">
            {selected.mimeType.startsWith("image/") && selected.downloadUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.downloadUrl} alt={selected.alt || selected.fileName} className="max-h-72 w-full rounded-xl object-contain bg-ink-50" />
            )}
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-ink-400">Type</dt><dd className="font-medium">{selected.mimeType}</dd></div>
              <div><dt className="text-ink-400">Visibility</dt><dd className="font-medium">{selected.visibility}</dd></div>
              {selected.alt && <div className="col-span-2"><dt className="text-ink-400">Alt text</dt><dd className="font-medium">{selected.alt}</dd></div>}
            </dl>
            <div className="flex flex-wrap gap-2">
              {selected.downloadUrl && (
                <Button variant="secondary" size="sm" onClick={() => copyUrl(selected.downloadUrl)}>
                  {copied ? <Check /> : <Copy />} {copied ? "Copied!" : "Copy URL"}
                </Button>
              )}
              <Button variant="dangerOutline" size="sm" onClick={() => setDeleting(selected)}>
                <Trash2 /> Delete
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete file?"
        message={`"${deleting?.originalName}" will be removed from Storage and the library. Pages using it will break.`}
        confirmLabel="Delete file"
      />
    </>
  );
}
