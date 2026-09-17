"use client";

import * as React from "react";
import { Upload, Trash2, Copy, Check, Search, LayoutGrid, List, Play } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton, EmptyState, ErrorState, LoadMore } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { MediaThumb } from "@/components/admin/media-picker";
import { usePaginatedList } from "@/hooks/use-api";
import { formatBytes, formatDateTime, cn } from "@/lib/utils";
import { FOLDER_ACCEPT, MEDIA_FOLDERS, defaultFolderForKind } from "@/lib/media-folders";
import { uploadMediaFile } from "@/lib/media-upload-client";
import type { MediaItem } from "@/types";

interface MediaConfig {
  provider: "cloudinary" | "firebase" | "local";
  cloudName: string | null;
  directUpload: boolean;
  limitsMb: { image: number; video: number; audio: number; document: number };
}

function kindForFile(file: File): "image" | "video" | "audio" | "document" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

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
  const [config, setConfig] = React.useState<MediaConfig | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  React.useEffect(() => {
    fetch("/api/admin/media/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setConfig(d as MediaConfig | null))
      .catch(() => setConfig(null));
  }, []);

  const list = usePaginatedList<MediaItem>("/api/admin/media", {
    folder: folder || undefined,
    q: debouncedQ || undefined,
  }, 24);

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    let okCount = 0;
    for (const file of Array.from(files)) {
      // No folder filter → file into the matching library folder.
      const target = folder || defaultFolderForKind(kindForFile(file));
      try {
        setProgress(`Uploading ${file.name} — 0%`);
        await uploadMediaFile(file, {
          folder: target,
          onProgress: (percent) => setProgress(`Uploading ${file.name} — ${percent}%`),
        });
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

  const storageLabel =
    config?.provider === "cloudinary"
      ? `Cloudinary${config.cloudName ? ` · ${config.cloudName}` : ""} — images, video, audio and files`
      : config?.provider === "firebase"
        ? "Firebase Storage"
        : "Embedded disk storage";

  return (
    <>
      <PageHeader
        title="Media library"
        description={`Uploads are stored in ${storageLabel}. Images up to ${config?.limitsMb.image ?? 10} MB, video up to ${config?.limitsMb.video ?? 100} MB.`}
        action={
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={FOLDER_ACCEPT}
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
        <p role="status" className="mb-4 rounded-sm border border-gold-500/25 bg-gold-500/[0.12] px-4 py-2.5 text-sm font-medium text-gold-700">
          {progress}
        </p>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ivory-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" className="pl-10" aria-label="Search media" />
        </div>
        <Select value={folder} onChange={(e) => setFolder(e.target.value)} className="sm:w-56" aria-label="Filter by folder">
          <option value="">All folders</option>
          {MEDIA_FOLDERS.map((f) => (
            <option key={f.id} value={f.id}>{f.label} ({f.id})</option>
          ))}
        </Select>
        <div className="flex gap-1 rounded-sm border border-white/10 bg-white/[0.03] p-1">
          <button
            onClick={() => setView("grid")}
            aria-label="Grid view"
            className={cn("rounded-sm p-2", view === "grid" ? "bg-gold-500 text-obsidian-950" : "text-ivory-500")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            aria-label="List view"
            className={cn("rounded-sm p-2", view === "list" ? "bg-gold-500 text-obsidian-950" : "text-ivory-500")}
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
          message="Upload images, video, audio or documents for posts, events, speakers and the owner section."
          action={<Button onClick={() => fileRef.current?.click()}><Upload /> Upload files</Button>}
        />
      ) : view === "grid" ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {list.items.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className="group overflow-hidden rounded-sm border border-white/[0.08] bg-white/[0.03] text-left shadow-luxe transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative aspect-square bg-white/[0.03]">
                  <MediaThumb item={m} />
                  {m.mimeType.startsWith("video/") && (
                    <span className="absolute inset-0 flex items-center justify-center bg-ink-950/25">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-400/60 bg-ink-950/70 text-gold-200">
                        <Play className="h-4 w-4" />
                      </span>
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-[13px] font-semibold text-ivory-50">{m.originalName}</p>
                  <p className="mt-0.5 text-[12px] text-ivory-500">
                    {formatBytes(m.sizeBytes)}
                    {m.durationSeconds ? ` · ${Math.round(m.durationSeconds)}s` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoad={list.loadMore} />
        </>
      ) : (
        <div className="overflow-hidden rounded-sm border border-white/[0.08] bg-white/[0.03]">
          {list.items.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className="flex w-full items-center gap-4 border-b border-white/[0.08] p-3 text-left last:border-0 hover:bg-white/[0.03]"
            >
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-white/[0.03]">
                <MediaThumb item={m} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ivory-50">{m.originalName}</span>
                <span className="text-[12px] text-ivory-500">
                  {m.folder} · {formatBytes(m.sizeBytes)}
                  {m.provider ? ` · ${m.provider}` : ""}
                </span>
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
              <img src={selected.downloadUrl} alt={selected.alt || selected.fileName} className="max-h-72 w-full rounded-sm object-contain bg-white/[0.03]" />
            )}
            {selected.mimeType.startsWith("video/") && selected.downloadUrl && (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={selected.downloadUrl}
                poster={selected.posterUrl || undefined}
                controls
                preload="metadata"
                className="max-h-72 w-full rounded-sm bg-black"
              />
            )}
            {selected.mimeType.startsWith("audio/") && selected.downloadUrl && (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <audio src={selected.downloadUrl} controls className="w-full" />
            )}
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-ivory-500">Type</dt><dd className="font-medium">{selected.mimeType}</dd></div>
              <div><dt className="text-ivory-500">Visibility</dt><dd className="font-medium">{selected.visibility}</dd></div>
              {selected.width && selected.height && (
                <div><dt className="text-ivory-500">Dimensions</dt><dd className="font-medium">{selected.width} × {selected.height}</dd></div>
              )}
              {selected.durationSeconds ? (
                <div><dt className="text-ivory-500">Duration</dt><dd className="font-medium">{Math.round(selected.durationSeconds)}s</dd></div>
              ) : null}
              {selected.provider && (
                <div><dt className="text-ivory-500">Storage</dt><dd className="font-medium">{selected.provider}</dd></div>
              )}
              {selected.alt && <div className="col-span-2"><dt className="text-ivory-500">Alt text</dt><dd className="font-medium">{selected.alt}</dd></div>}
            </dl>
            <div className="flex flex-wrap gap-2">
              {selected.downloadUrl && (
                <Button variant="ghost" size="sm" onClick={() => copyUrl(selected.downloadUrl)}>
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
        message={`"${deleting?.originalName}" will be removed from ${config?.provider === "cloudinary" ? "Cloudinary" : "storage"} and the library. Pages using it will break.`}
        confirmLabel="Delete file"
      />
    </>
  );
}
