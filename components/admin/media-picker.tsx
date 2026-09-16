"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/types";

/** Browse the media library and pick an image URL (for covers / editor embeds). */
export function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, alt?: string) => void;
}) {
  const [items, setItems] = React.useState<MediaItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/admin/media?limit=48")
      .then((r) => r.json())
      .then((d) => setItems(((d as { items?: MediaItem[] }).items ?? []).filter((m) => m.mimeType.startsWith("image/"))))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open ]);

  const filtered = q
    ? items.filter((m) => `${m.fileName} ${m.alt ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    : items;

  return (
    <Dialog open={open} onClose={onClose} title="Choose an image" description="Pick from your media library, or upload new files in Media." wide>
      <Input placeholder="Search images…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4" />
      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-ivory-500">No images found. Upload some in the Media section first.</p>
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
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.downloadUrl} alt={m.alt || m.fileName} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-[11px] text-ivory-500">Private</span>
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
