import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-sans text-[10.5px] font-semibold uppercase tracking-[0.18em]",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-white/[0.05] text-ivory-300",
        gold: "border-gold-500/40 bg-gold-500/[0.12] text-gold-200",
        solidGold: "border-transparent bg-gold-gradient text-obsidian-950",
        success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
        warning: "border-amber-400/30 bg-amber-400/10 text-amber-200",
        danger: "border-red-400/30 bg-red-400/10 text-red-300",
        info: "border-sky-400/30 bg-sky-400/10 text-sky-200",
        ivory: "border-transparent bg-ivory-100 text-obsidian-900",
        outline: "border-gold-500/30 text-gold-200",
        /* Light-theme chips */
        neutral: "border-line bg-white text-ink-500 shadow-card",
        goldSoft: "border-gold-600/30 bg-gold-500/[0.08] text-gold-700",
        outlineInk: "border-ink-900/20 bg-white text-ink-700",
        successSoft: "border-emerald-600/25 bg-emerald-600/[0.08] text-emerald-700",
        dangerSoft: "border-red-500/25 bg-red-500/[0.06] text-red-600",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function StatusDot({
  status,
  className,
}: {
  status: "operational" | "configured" | "unavailable" | "error" | "online" | "offline";
  className?: string;
}) {
  const color =
    status === "operational" || status === "online" || status === "configured"
      ? "bg-emerald-400"
      : status === "unavailable"
        ? "bg-amber-400"
        : "bg-red-400";
  return (
    <span className={cn("relative flex h-2.5 w-2.5", className)}>
      <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-50", color)} />
      <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", color)} />
    </span>
  );
}

/** Small gold diamond — used as a separator throughout the editorial UI. */
export function Diamond({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block h-1.5 w-1.5 rotate-45 bg-gold-500", className)} />;
}
