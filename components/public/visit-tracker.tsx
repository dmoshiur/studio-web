"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/**
 * Visit tracker — a tiny first-party beacon. Fires once per rendered route
 * (not on every re-render), sends only the path and the referrer, and is
 * completely silent on failure. Powers the visitor metrics on the
 * operations dashboard.
 */
export function VisitTracker() {
  const pathname = usePathname();
  const lastPath = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;

    const payload = JSON.stringify({
      path: pathname,
      referrer: typeof document !== "undefined" && document.referrer ? document.referrer : undefined,
    });

    const opts: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    };

    try {
      void fetch("/api/analytics/visit", opts).catch(() => undefined);
    } catch {
      /* never block the page */
    }
  }, [pathname]);

  return null;
}
