"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero, Section } from "@/components/public/ui-kit";
import { Script } from "@/components/public/ui-kit";

export default function UnsubscribePage() {
  return (
    <>
      <PageHero
        script="Until next time"
        eyebrow="Newsletter"
        title="Unsubscribe"
        description="No hard feelings — you are welcome back any time."
        image="/images/texture-marble.jpg"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Unsubscribe" }]}
      />
      <Section tone="light">
        <div className="mx-auto max-w-lg">
          <React.Suspense fallback={<p className="text-center text-ink-500">Loading…</p>}>
            <UnsubscribeForm />
          </React.Suspense>
        </div>
      </Section>
    </>
  );
}

function UnsubscribeForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = React.useState("");
  const [email, setEmail] = React.useState("");

  async function confirm() {
    const payload = token ? { token } : { email };
    if (!token && !email) return;
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("We could not process that request. Please try again.");
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to unsubscribe");
      setState("error");
    }
  }

  /* No token in the URL — accept the address directly. */
  if (!token) {
    return (
      <form
        className="border border-line bg-white p-10 shadow-luxe"
        onSubmit={(e) => {
          e.preventDefault();
          void confirm();
        }}
      >
        <AlertCircle className="mx-auto h-9 w-9 text-gold-600" />
        <p className="mt-5 text-center font-serif text-[1.5rem] text-ink-900">Leave the list</p>
        <p className="mx-auto mt-2 max-w-sm text-center text-[13.5px] leading-relaxed text-ink-500">
          Enter the address you subscribed with and we will remove it immediately. No questions asked.
        </p>
        <label htmlFor="unsub-email" className="mt-7 block font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
          Email address
        </label>
        <input
          id="unsub-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-2 h-12 w-full rounded-sm border border-ink-900/[0.12] bg-white px-4 text-[14px] text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
        />
        {state === "error" && (
          <p role="alert" className="mt-3 text-[13px] font-medium text-danger">
            {error}
          </p>
        )}
        <Button className="mt-5 w-full" variant="ink" size="lg" type="submit" loading={state === "loading"}>
          Unsubscribe me
        </Button>
      </form>
    );
  }

  if (state === "done") {
    return (
      <div className="border border-emerald-600/25 bg-white p-10 text-center shadow-luxe">
        <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
        <Script className="mt-5 block">thank you</Script>
        <p className="mt-3 font-serif text-[1.35rem] text-ink-900">You have been unsubscribed</p>
        <p className="mt-2 text-[13.5px] text-ink-500">
          You will not receive further newsletter emails. The archive and events remain open to you.
        </p>
        <Link href="/" className="mt-7 inline-block font-sans text-[11px] uppercase tracking-[0.22em] text-gold-700">
          Back to the summit
        </Link>
      </div>
    );
  }

  return (
    <div className="border border-line bg-white p-10 text-center shadow-luxe">
      <p className="font-serif text-[1.45rem] text-ink-900">Confirm unsubscribe?</p>
      <p className="mt-2 text-[13.5px] text-ink-500">
        You will stop receiving newsletter emails immediately and can resubscribe at any time.
      </p>
      {state === "error" && (
        <p role="alert" className="mt-4 text-[13px] font-medium text-danger">
          {error}
        </p>
      )}
      <Button className="mt-7 w-full" variant="ink" size="lg" loading={state === "loading"} onClick={confirm}>
        Yes, unsubscribe me
      </Button>
    </div>
  );
}
