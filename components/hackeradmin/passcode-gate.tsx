"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ShieldAlert, Mail } from "lucide-react";
import Link from "next/link";

/**
 * Secure entry screen for the operations panel. Server-rendered state tells
 * the client whether the passcode system is healthy — no passcode value,
 * hint or secret ever reaches this component.
 */
export function PasscodeGate({
  provisioned,
  smtpConfigured,
  lockedUntil,
}: {
  provisioned: boolean;
  smtpConfigured: boolean;
  lockedUntil: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lockUntil, setLockUntil] = React.useState<string | null>(lockedUntil);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !value.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/owner/passcode/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: value.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        lockedUntil?: string;
      };
      if (!res.ok) {
        if (data.lockedUntil) setLockUntil(data.lockedUntil);
        throw new Error(data.error ?? "Verification failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setValue("");
    } finally {
      setSubmitting(false);
    }
  }

  const healthy = provisioned && smtpConfigured;

  return (
    <div className="flex min-h-screen items-center justify-center bg-obsidian-950 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="border border-gold-500/25 bg-obsidian-900/80 p-8 shadow-luxe sm:p-10">
          <div className="mb-8 text-center">
            <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center border border-gold-500/40 text-gold-300">
              <KeyRound className="h-6 w-6" />
            </span>
            <p className="mb-3 font-sans text-[9.5px] font-semibold uppercase tracking-[0.3em] text-gold-400">
              Restricted · Operations
            </p>
            <h1 className="font-serif text-[1.9rem] text-ivory-50">Control Panel Access</h1>
            <p className="mt-3 text-[13px] leading-relaxed text-ivory-400">
              This panel is protected by a rotating passcode. A new passcode is generated every
              hour and delivered only to the registered security email address.
            </p>
          </div>

          {lockUntil ? (
            <div className="flex items-start gap-3 border border-red-400/30 bg-red-400/[0.08] p-4">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
              <p className="text-[13px] leading-relaxed text-red-200">
                Entry is temporarily locked after too many invalid attempts. Try again after{" "}
                {new Date(lockUntil).toLocaleTimeString()}.
              </p>
            </div>
          ) : !healthy ? (
            <div className="flex items-start gap-3 border border-amber-400/30 bg-amber-400/[0.08] p-4">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <p className="text-[13px] leading-relaxed text-amber-100/90">
                {!smtpConfigured
                  ? "Email delivery is not configured on this deployment, so no passcode can currently be issued. Configure SMTP in the server environment to enable access."
                  : "No valid passcode is active right now. A new one is issued automatically as soon as email delivery succeeds."}
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-4">
              <label
                htmlFor="passcode"
                className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-ivory-400/80"
              >
                Current passcode
              </label>
              <input
                id="passcode"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={submitting}
                className="h-[52px] w-full border border-white/15 bg-white/[0.04] px-4 font-mono text-[15px] tracking-[0.2em] text-ivory-50 outline-none transition-colors placeholder:text-ivory-600 focus:border-gold-400/70 disabled:opacity-60"
                placeholder="••••••••••••"
              />
              {error && (
                <p role="alert" className="text-[12.5px] text-red-300">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting || !value.trim()}
                className="inline-flex h-[52px] items-center justify-center gap-3 bg-gold-gradient px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-obsidian-950 transition-all hover:brightness-[1.06] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                  </>
                ) : (
                  "Enter the panel"
                )}
              </button>
            </form>
          )}

          <div className="mt-8 border-t border-white/[0.08] pt-5">
            <p className="text-center text-[11.5px] leading-relaxed text-ivory-500">
              Every attempt is rate-limited and written to the audit log. The passcode is never
              shown in this interface, in URLs or in application logs.
            </p>
            <p className="mt-4 text-center">
              <Link
                href="/"
                className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.22em] text-ivory-400 transition-colors hover:text-gold-300"
              >
                ← Back to site
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
