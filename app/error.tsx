"use client";

import * as React from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper-100 px-6 text-center">
      <p className="calligraphic gold-text text-[3.4rem] leading-none">something broke</p>
      <h1 className="display-md mt-5 text-ink-900">An unexpected error occurred</h1>
      <p className="lead mt-4 max-w-sm">
        The page could not be rendered. Try again — if it keeps happening, our team has been notified.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-4">
        <button
          onClick={reset}
          className="btn-editorial"
        >
          Try again
        </button>
        <a
          href="/"
          className="btn-quiet"
        >
          Home
        </a>
      </div>
    </main>
  );
}
