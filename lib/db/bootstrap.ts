import "server-only";
import { seedIfEmpty } from "@/lib/db/seed";

/**
 * Seeds the embedded store once per process. Public pages, the admin studio
 * and the owner console all render against populated content from the very
 * first request. Idempotent and safe when Firebase is the active backend.
 */

let seedPromise: Promise<void> | null = null;

export function ensureSeededOnce(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedIfEmpty()
      .then(() => undefined)
      .catch((err) => {
        console.error("[bootstrap] seeding failed:", err);
      });
  }
  return seedPromise;
}
