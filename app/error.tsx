"use client";

import * as React from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-obsidian-950 px-6 text-center">
      <p className="calligraphic gold-text text-[3.4rem] leading-none">something broke</p>
      <h1 className="display-md mt-5 text-ivory-50">An unexpected error occurred</h1>
      <p className="lead mt-4 max-w-sm">
        The page could not be rendered. Try again — if it keeps happening, our team has been notified.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-4">
        <button
          onClick={reset}
          className="inline-flex h-[52px] items-center bg-gold-gradient px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-obsidian-950 transition-all hover:brightness-[1.06]"
        >
          Try again
        </button>
        <a
          href="/"
          className="inline-flex h-[52px] items-center border border-white/20 px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-ivory-100 transition-colors hover:border-gold-400/60"
        >
          Home
        </a>
      </div>
    </main>
  );
}
