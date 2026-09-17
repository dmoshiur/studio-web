"use client";

import * as React from "react";
import { ImagePlus, X } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MediaPicker, type MediaPickerAccept } from "./media-picker";

const VIDEO_EXT = /\.(mp4|webm|mov|mkv|ogv|m4v)(\?.*)?$/i;

export function CoverInput({
  value,
  onChange,
  label = "Cover image",
  accept = "image",
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  /** Which library assets may be picked (image / video / any media). */
  accept?: MediaPickerAccept;
  hint?: string;
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const placeholder =
    accept === "video"
      ? "https://res.cloudinary.com/… (mp4) or pick from library"
      : accept === "media"
        ? "https://… image, video or file URL"
        : "https://… or pick from library";
  const isVideo = accept === "video" || VIDEO_EXT.test(value);

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        <Button type="button" variant="ghost" onClick={() => setPickerOpen(true)}>
          <ImagePlus /> Library
        </Button>
      </div>
      {hint && <p className="mt-2 text-[12px] text-ivory-500">{hint}</p>}
      {value && (
        <div className="relative mt-3 overflow-hidden rounded-sm border border-white/[0.08]">
          {isVideo ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={value} controls preload="metadata" className="max-h-56 w-full bg-black object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={`${label} preview`} className="max-h-48 w-full object-cover" />
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Remove ${label.toLowerCase()}`}
            className="absolute right-2 top-2 rounded-sm bg-ink-950/70 p-1.5 text-white hover:bg-danger"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <MediaPicker
        open={pickerOpen}
        accept={accept}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => {
          onChange(url);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
