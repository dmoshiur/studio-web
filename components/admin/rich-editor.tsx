"use client";

import * as React from "react";
import { Bold, Italic, Link2, List, ListOrdered, Heading2, Quote, ImagePlus, Eye, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/input";
import { MediaPicker } from "./media-picker";

/**
 * Lightweight HTML editor: toolbar-assisted textarea + live preview.
 * Output is sanitized server-side before storage.
 */
export function RichEditor({
  value,
  onChange,
  label,
  minHeight = 280,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  minHeight?: number;
}) {
  const [tab, setTab] = React.useState<"write" | "preview">("write");
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const ref = React.useRef<HTMLTextAreaElement>(null);

  function wrap(before: string, after = "") {
    const el = ref.current;
    if (!el) {
      onChange(value + before + after);
      return;
    }
    const { selectionStart, selectionEnd } = el;
    const selected = value.slice(selectionStart, selectionEnd) || "text";
    const next = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selectionStart + before.length, selectionStart + before.length + selected.length);
    });
  }

  const tools = [
    { icon: Bold, label: "Bold", fn: () => wrap("<strong>", "</strong>") },
    { icon: Italic, label: "Italic", fn: () => wrap("<em>", "</em>") },
    { icon: Heading2, label: "Heading", fn: () => wrap("<h2>", "</h2>") },
    { icon: Quote, label: "Quote", fn: () => wrap("<blockquote>", "</blockquote>") },
    { icon: List, label: "Bullet list", fn: () => wrap("<ul>\n<li>", "</li>\n</ul>") },
    { icon: ListOrdered, label: "Numbered list", fn: () => wrap("<ol>\n<li>", "</li>\n</ol>") },
    { icon: Link2, label: "Link", fn: () => wrap('<a href="https://">', "</a>") },
  ];

  return (
    <div>
      {label && <p className="mb-1.5 block text-[13px] font-semibold text-ivory-200">{label}</p>}
      <div className="overflow-hidden rounded-sm border border-white/10 bg-white/[0.03]">
        <div className="flex flex-wrap items-center gap-1 border-b border-white/[0.08] bg-white/[0.03] p-2">
          {tools.map((t) => (
            <button
              key={t.label}
              type="button"
              title={t.label}
              aria-label={t.label}
              onClick={t.fn}
              className="rounded-sm p-2 text-ivory-400/80 hover:bg-white/[0.03] hover:text-ivory-50"
            >
              <t.icon className="h-4 w-4" />
            </button>
          ))}
          <button
            type="button"
            title="Insert image"
            aria-label="Insert image"
            onClick={() => setPickerOpen(true)}
            className="rounded-sm p-2 text-ivory-400/80 hover:bg-white/[0.03] hover:text-ivory-50"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              onClick={() => setTab("write")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[13px] font-semibold",
                tab === "write" ? "bg-white/[0.03] text-ivory-50 shadow-sm" : "text-ivory-500 hover:text-ivory-200"
              )}
            >
              <PenLine className="h-3.5 w-3.5" /> Write
            </button>
            <button
              type="button"
              onClick={() => setTab("preview")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[13px] font-semibold",
                tab === "preview" ? "bg-white/[0.03] text-ivory-50 shadow-sm" : "text-ivory-500 hover:text-ivory-200"
              )}
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
          </div>
        </div>
        {tab === "write" ? (
          <Textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ minHeight }}
            className="rounded-none border-0 font-mono text-[13px] leading-relaxed focus:ring-0"
            placeholder="<p>Start writing… HTML is supported and sanitized on save.</p>"
          />
        ) : (
          <div
            className="prose-editorial prose-on-dark max-w-none overflow-y-auto p-5 text-[15px]"
            style={{ minHeight }}
            dangerouslySetInnerHTML={{ __html: value || "<p class='text-ivory-500'>Nothing to preview yet.</p>" }}
          />
        )}
      </div>
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(url, alt) => {
          wrap(`<img src="${url}" alt="${(alt || "Image").replace(/"/g, "")}" loading="lazy" />`, "");
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
