"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./input";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-obsidian-950/75 p-4 backdrop-blur-sm animate-fade sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full border border-gold-500/20 bg-obsidian-900 p-7 shadow-2xl animate-scale-in",
          wide ? "max-w-2xl" : "max-w-md"
        )}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-[1.4rem] text-ivory-50">{title}</h2>
            {description && <p className="mt-2 text-[13px] leading-relaxed text-ivory-400/80">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-sm p-1.5 text-ivory-400 transition-colors hover:bg-white/[0.06] hover:text-ivory-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Dangerous-action confirmation. Optionally requires typing CONFIRM. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  description,
  confirmLabel = "Confirm",
  destructive,
  requireTyping,
  loading,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: string;
  /** Alias for `message` — both are accepted. */
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  requireTyping?: string;
  loading?: boolean;
  /** Extra confirmation UI (e.g. a re-authentication field). */
  children?: React.ReactNode;
}) {
  const [typed, setTyped] = React.useState("");
  React.useEffect(() => {
    if (open) setTyped("");
  }, [open ]);
  const canConfirm = !requireTyping || typed.trim() === requireTyping;
  return (
    <Dialog open={open} onClose={onClose} title={title} description={message ?? description}>
      {children && <div className="mb-4">{children}</div>}
      {requireTyping && (
        <div className="mb-4">
          <p className="mb-2 text-[13px] text-ivory-300">
            Type{" "}
            <code className="rounded-sm border border-white/[0.08] bg-black/40 px-1.5 py-0.5 font-mono text-[12.5px] font-bold text-gold-200">
              {requireTyping}
            </code>{" "}
            to confirm:
          </p>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={requireTyping} autoComplete="off" />
        </div>
      )}
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant={destructive ? "danger" : "gold"}
          onClick={() => void onConfirm()}
          disabled={!canConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
