"use client";

import * as React from "react";
import { ImagePlus, X } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "./media-picker";

export function CoverInput({
  value,
  onChange,
  label = "Cover image",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… or pick from library" />
        <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>
          <ImagePlus /> Library
        </Button>
      </div>
      {value && (
        <div className="relative mt-3 overflow-hidden rounded-xl border border-ink-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Cover preview" className="max-h-48 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Remove image"
            className="absolute right-2 top-2 rounded-lg bg-ink-950/70 p-1.5 text-white hover:bg-danger"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(url) => { onChange(url); setPickerOpen(false); }} />
    </div>
  );
}
