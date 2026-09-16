"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/public/cards";

export default function UnsubscribePage() {
  return (
    <>
      <PageHero eyebrow="Newsletter" title="Unsubscribe" description="We're sorry to see you go." />
      <section className="bg-white py-14">
        <div className="container max-w-md">
          <React.Suspense fallback={<p className="text-center text-ink-500">Loading…</p>}>
            <UnsubscribeForm />
          </React.Suspense>
        </div>
      </section>
    </>
  );
}

function UnsubscribeForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = React.useState("");

  async function confirm() {
    if (!token) return;
    setState("loading");
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error("This unsubscribe link is invalid or has expired.");
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to unsubscribe");
      setState("error");
    }
  }

  if (!token) {
    return (
      <div className="rounded-3xl border border-ink-100 p-8 text-center shadow-card">
        <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
        <p className="mt-4 font-semibold text-ink-900">Missing unsubscribe link</p>
        <p className="mt-1 text-sm text-ink-500">Please use the link from one of our emails.</p>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <p className="mt-4 font-display text-lg font-bold text-ink-900">You've been unsubscribed</p>
        <p className="mt-1 text-sm text-ink-500">You won't receive further newsletter emails.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-ink-100 p-8 text-center shadow-card">
      <p className="font-display text-lg font-bold text-ink-900">Confirm unsubscribe?</p>
      <p className="mt-1 text-sm text-ink-500">You'll stop receiving newsletter emails immediately.</p>
      {state === "error" && <p role="alert" className="mt-3 text-sm font-medium text-danger">{error}</p>}
      <Button className="mt-6 w-full" loading={state === "loading"} onClick={confirm}>
        Yes, unsubscribe me
      </Button>
    </div>
  );
}
