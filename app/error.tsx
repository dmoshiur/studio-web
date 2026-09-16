"use client";

import * as React from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-4 text-center">
      <p className="font-display text-7xl font-extrabold text-gradient">500</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-white">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-white/60">
        An unexpected error occurred. Our team has been notified — please try again.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          onClick={reset}
          className="inline-flex h-12 items-center rounded-xl bg-brand-gradient px-7 text-[15px] font-semibold text-white shadow-pop hover:brightness-105"
        >
          Try again
        </button>
        <a
          href="/"
          className="inline-flex h-12 items-center rounded-xl border border-white/20 bg-white/5 px-7 text-[15px] font-semibold text-white hover:bg-white/10"
        >
          Home
        </a>
      </div>
    </main>
  );
}
