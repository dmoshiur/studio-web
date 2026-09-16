"use client";

import * as React from "react";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

export function Countdown({ targetISO, dark }: { targetISO?: string; dark?: boolean }) {
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  if (!targetISO) return null;
  const target = new Date(targetISO).getTime();
  if (Number.isNaN(target)) return null;

  const diff = Math.max(0, (now ?? target) - 0 >= 0 ? target - (now ?? target) : 0);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  const units = [
    { value: pad(days), label: "Days" },
    { value: pad(hours), label: "Hours" },
    { value: pad(minutes), label: "Minutes" },
    { value: pad(seconds), label: "Seconds" },
  ];

  return (
    <div className="flex gap-2.5 sm:gap-3" role="timer" aria-label="Countdown to event">
      {units.map((u) => (
        <div
          key={u.label}
          className={
            dark
              ? "min-w-[68px] rounded-2xl bg-white/10 px-3 py-3 text-center backdrop-blur-sm sm:min-w-[80px]"
              : "min-w-[68px] rounded-2xl bg-white px-3 py-3 text-center shadow-card sm:min-w-[80px]"
          }
        >
          <div className={`font-display text-2xl font-extrabold tabular-nums sm:text-3xl ${dark ? "text-white" : "text-ink-900"}`}>
            {now === null ? "--" : u.value}
          </div>
          <div className={`mt-0.5 text-[11px] font-semibold uppercase tracking-widest ${dark ? "text-white/60" : "text-ink-400"}`}>
            {u.label}
          </div>
        </div>
      ))}
    </div>
  );
}
