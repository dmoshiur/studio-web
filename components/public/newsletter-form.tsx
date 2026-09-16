"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export function NewsletterForm({ variant = "light", source = "website" }: { variant?: "light" | "dark"; source?: string }) {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const dark = variant === "dark";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast({ kind: "error", title: "Please enter a valid email address" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Subscription failed");
      toast({
        kind: "success",
        title: (data as { duplicate?: boolean }).duplicate ? "You're already subscribed" : "Subscribed!",
        message: (data as { duplicate?: boolean }).duplicate ? undefined : "Welcome aboard — check your inbox soon.",
      });
      setEmail("");
    } catch (err) {
      toast({ kind: "error", title: "Subscription failed", message: err instanceof Error ? err.message : undefined });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full gap-2">
      <label htmlFor={`newsletter-${source}`} className="sr-only">
        Email address
      </label>
      <input
        id={`newsletter-${source}`}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email address"
        disabled={loading}
        className={cn(
          "h-12 min-w-0 flex-1 rounded-xl border px-4 text-sm outline-none transition-colors",
          dark
            ? "border-white/15 bg-white/10 text-white placeholder:text-white/40 focus:border-brand-400"
            : "border-ink-200 bg-white text-ink-900 placeholder:text-ink-300 focus:border-brand-500"
        )}
      />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-brand-gradient px-5 text-sm font-semibold text-white shadow-pop transition-all hover:brightness-105 disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        <span className="hidden sm:inline">{loading ? "Joining…" : "Subscribe"}</span>
      </button>
    </form>
  );
}
