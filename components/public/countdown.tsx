"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

/** Champagne-gold countdown with engraved numeral plates. */
export function Countdown({
  targetISO,
  dark = true,
  className,
}: {
  targetISO?: string;
  dark?: boolean;
  className?: string;
}) {
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  if (!targetISO) return null;
  const target = new Date(targetISO).getTime();
  if (Number.isNaN(target)) return null;

  const diff = Math.max(0, target - (now ?? target));
  const units = [
    { value: pad(Math.floor(diff / 86_400_000)), label: "Days" },
    { value: pad(Math.floor((diff % 86_400_000) / 3_600_000)), label: "Hours" },
    { value: pad(Math.floor((diff % 3_600_000) / 60_000)), label: "Minutes" },
    { value: pad(Math.floor((diff % 60_000) / 1000)), label: "Seconds" },
  ];

  return (
    <div className={cn("flex gap-3 sm:gap-4", className)} role="timer" aria-label="Countdown to the event">
      {units.map((u) => (
        <div
          key={u.label}
          className={cn(
            "relative min-w-[68px] border px-3 py-3.5 text-center sm:min-w-[86px] sm:px-4",
            dark ? "border-gold-500/25 bg-white/[0.03] backdrop-blur-sm" : "border-ink-900/10 bg-white shadow-luxe"
          )}
        >
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/70 to-transparent"
          />
          <div
            className={cn(
              "font-serif text-[1.7rem] tabular-nums leading-none sm:text-[2.1rem]",
              dark ? "text-gold-200" : "text-ink-900"
            )}
          >
            {now === null ? "--" : u.value}
          </div>
          <div
            className={cn(
              "mt-2 font-sans text-[9px] font-semibold uppercase tracking-[0.26em]",
              dark ? "text-ivory-500" : "text-ink-400"
            )}
          >
            {u.label}
          </div>
        </div>
      ))}
    </div>
  );
}
