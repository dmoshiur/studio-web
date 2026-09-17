"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
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
    <form
      onSubmit={onSubmit}
      className={cn(
        "flex w-full gap-0 border bg-white p-1 transition-colors",
        dark
          ? "border-line shadow-card focus-within:border-gold-600/60"
          : "border-line focus-within:border-gold-600"
      )}
    >
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
        className="h-11 min-w-0 flex-1 bg-transparent px-4 text-[13.5px] text-ink-900 outline-none transition-colors placeholder:text-ink-300"
      />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 shrink-0 items-center gap-2 bg-ink-900 px-5 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-all hover:bg-gold-700 disabled:opacity-60"
      >
        <span className="hidden sm:inline">{loading ? "Joining" : "Join"}</span>
        <ArrowRight className="h-3.5 w-3.5 sm:hidden" />
      </button>
    </form>
  );
}
