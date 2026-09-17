"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, Loader2, TicketCheck } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

/**
 * Real seat reservation — creates a database-backed reservation tied to
 * the signed-in account. Guests are sent to sign in first and returned
 * straight back to this event afterwards.
 */
export function ReserveForm({ eventSlug, eventTitle }: { eventSlug: string; eventTitle: string }) {
  const pathname = usePathname();
  const { user, loading } = useSession();
  const { toast } = useToast();
  const [seats, setSeats] = React.useState(1);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || done) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/public/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug, seats, note: note.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!res.ok) throw new Error(data.error ?? "Reservation failed");
      setDone(true);
      toast({ kind: "success", title: "Seat requested", message: "Your reservation is in — track it from your account." });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reservation failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="h-[210px] animate-pulse border border-line bg-white" aria-hidden />
    );
  }

  if (!user) {
    return (
      <div className="border border-line bg-white p-7 shadow-card">
        <p className="font-serif text-[1.25rem] text-ink-900">Reserve your seat</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
          Sign in (or create a free account) to hold seats for {eventTitle}. Your reservation stays
          on your account.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className="btn-editorial mt-5 w-full"
        >
          <TicketCheck className="h-4 w-4" /> Sign in to reserve
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="border border-emerald-600/25 bg-emerald-600/[0.06] p-7 text-center shadow-card">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
        <p className="mt-3 font-serif text-[1.3rem] text-ink-900">Reservation received</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
          We have your request for {seats} seat{seats > 1 ? "s" : ""}. You will see its status in{" "}
          <Link href="/profile" className="text-gold-700 underline underline-offset-4">
            your account
          </Link>{" "}
          as soon as it is confirmed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border border-line bg-white p-7 shadow-card">
      <p className="font-serif text-[1.25rem] text-ink-900">Reserve your seat</p>
      <p className="mt-2 text-[13px] text-ink-500">
        Booking as <span className="text-ink-800">{user.email}</span>
      </p>
      <div className="mt-5 grid gap-4">
        <div>
          <Label htmlFor="seats" tone="light">Seats</Label>
          <select
            id="seats"
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
            disabled={submitting}
            className="h-11 w-full border border-line bg-white px-3 text-[13.5px] text-ink-900 outline-none focus:border-gold-600/70"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} seat{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="note" tone="light">Note for the organizers (optional)</Label>
          <textarea
            id="note"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={submitting}
            placeholder="Accessibility needs, seating preferences…"
            className="w-full resize-none border border-line-strong bg-white px-3 py-2.5 text-[13.5px] text-ink-800 outline-none placeholder:text-ink-400 focus:border-gold-600/70"
          />
        </div>
        {error && (
          <p role="alert" className="text-[12.5px] text-red-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="btn-editorial w-full disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Reserving…
            </>
          ) : (
            <>
              <TicketCheck className="h-4 w-4" /> Request {seats} seat{seats > 1 ? "s" : ""}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
