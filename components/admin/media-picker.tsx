"use client";

import * as React from "react";
import { Check, FileVideo, Music, FileText } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/types";

export type MediaPickerAccept = "image" | "video" | "media";

function matches(item: MediaItem, accept: MediaPickerAccept): boolean {
  const mime = item.mimeType || "";
  if (accept === "image") return mime.startsWith("image/");
  if (accept === "video") return mime.startsWith("video/") || mime.startsWith("audio/");
  return true;
}

/** Compact preview tile: image thumbnail, video poster or a file-type icon. */
export function MediaThumb({ item, className }: { item: MediaItem; className?: string }) {
  const mime = item.mimeType || "";
  if (mime.startsWith("image/")) {
    const src = item.thumbnailUrl || item.downloadUrl;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={item.alt || item.fileName} loading="lazy" className={cn("h-full w-full object-cover", className)} />
    );
  }
  if (mime.startsWith("video/")) {
    if (item.posterUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.posterUrl} alt={item.alt || item.fileName} loading="lazy" className={cn("h-full w-full object-cover", className)} />
      );
    }
    return (
      <span className={cn("flex h-full w-full items-center justify-center bg-obsidian-900 text-gold-400", className)}>
        <FileVideo className="h-7 w-7" />
      </span>
    );
  }
  if (mime.startsWith("audio/")) {
    return (
      <span className={cn("flex h-full w-full items-center justify-center bg-obsidian-900 text-gold-400", className)}>
        <Music className="h-7 w-7" />
      </span>
    );
  }
  return (
    <span className={cn("flex h-full w-full items-center justify-center bg-obsidian-900 text-ivory-500", className)}>
      <FileText className="h-7 w-7" />
    </span>
  );
}

/** Browse the media library and pick an asset URL (covers, editor embeds, video). */
export function MediaPicker({
  open,
  onClose,
  onSelect,
  accept = "image",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, alt?: string) => void;
  accept?: MediaPickerAccept;
}) {
  const [items, setItems] = React.useState<MediaItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/admin/media?limit=60")
      .then((r) => r.json())
      .then((d) => setItems((d as { items?: MediaItem[] }).items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open]);

  const allowed = items.filter((m) => matches(m, accept));
  const filtered = q
    ? allowed.filter((m) => `${m.fileName} ${m.alt ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    : allowed;

  const description =
    accept === "image"
      ? "Pick an image from your media library, or upload new files in Media."
      : accept === "video"
        ? "Pick a video or audio file, or upload new files in Media → Videos."
        : "Pick any file from your media library.";

  return (
    <Dialog open={open} onClose={onClose} title={accept === "video" ? "Choose a video" : "Choose media"} description={description} wide>
      <Input placeholder="Search files…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4" />
      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-ivory-500">
          {accept === "video" ? "No videos yet. Upload one in Media → Videos & audio first." : "No images found. Upload some in the Media section first."}
        </p>
      ) : (
        <div className="grid max-h-[50vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => m.downloadUrl && onSelect(m.downloadUrl, m.alt || m.fileName)}
              disabled={!m.downloadUrl}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-sm border border-white/[0.08] bg-white/[0.03]",
                m.downloadUrl ? "hover:border-brand-400" : "opacity-40"
              )}
              title={m.fileName}
            >
              {m.downloadUrl ? (
                <MediaThumb item={m} />
              ) : (
                <span className="flex h-full items-center justify-center text-[11px] text-ivory-500">Private</span>
              )}
              {m.mimeType.startsWith("video/") && (
                <span className="absolute bottom-1.5 left-1.5 rounded-sm bg-ink-950/80 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-gold-200">
                  Video
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-ink-950/0 transition-colors group-hover:bg-ink-950/30">
                <Check className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
            </button>
          ))}
        </div>
      )}
    </Dialog>
  );
}
