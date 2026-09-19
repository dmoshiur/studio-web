"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, MailCheck, ArrowUpRight } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { useToast } from "@/components/ui/toast";

/**
 * Email verification — completes the SMTP-delivered verification link
 * (token in ?token=…), or lets a signed-in user (re)request the email.
 */
export default function VerifyEmailPage() {
  return (
    <React.Suspense
      fallback={
        <AuthLayout title="Verify email" script="one moment">
          <p className="text-[13.5px] text-ink-500">Loading…</p>
        </AuthLayout>
      }
    >
      <VerifyFlow />
    </React.Suspense>
  );
}

function VerifyFlow() {
  const params = useSearchParams();
  const token = params.get("token");
  const { toast } = useToast();

  const [state, setState] = React.useState<"working" | "done" | "invalid" | "request">(
    token ? "working" : "request"
  );
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/verify", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Verification failed");
        }
        if (!cancelled) {
          setState("done");
          toast({ kind: "success", title: "Email verified", message: "Thank you — your account is fully active." });
        }
      } catch (err) {
        if (cancelled) return;
        setState("invalid");
        toast({
          kind: "error",
          title: "Verification failed",
          message:
            err instanceof Error && /expired|invalid/i.test(err.message)
              ? "This verification link is invalid or has expired. Request a new one."
              : "Something went wrong. Please try again.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, toast]);

  async function resend() {
    if (sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/auth/verify", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; sent?: boolean; alreadyVerified?: boolean };
      if (!res.ok) throw new Error(data.error ?? "Could not send the email");
      if (data.alreadyVerified) {
        toast({ kind: "success", title: "Already verified", message: "This account's email is confirmed." });
      } else if (data.sent) {
        toast({ kind: "success", title: "Email sent", message: "Check your inbox for the verification link." });
      } else {
        toast({
          kind: "error",
          title: "Email not sent",
          message: "Email delivery (SMTP) is not configured on this site yet. Please contact the studio.",
        });
      }
    } catch (err) {
      toast({
        kind: "error",
        title: "Could not send email",
        message: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSending(false);
    }
  }

  if (state === "working") {
    return (
      <AuthLayout title="Verifying your email" script="one moment">
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-gold-600" />
          <p className="text-[13.5px] text-ink-500">Confirming your verification link…</p>
        </div>
      </AuthLayout>
    );
  }

  if (state === "done") {
    return (
      <AuthLayout title="Email verified" script="all set">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
          <p className="mt-5 font-serif text-[1.35rem] text-ink-900">Your email is confirmed</p>
          <p className="mt-2 text-[13.5px] text-ink-500">Every part of the studio is now active for your account.</p>
          <Link href="/profile" className="btn-editorial group mt-8">
            Go to my account
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (state === "invalid") {
    return (
      <AuthLayout title="Link expired" script="try again">
        <div className="text-center">
          <MailCheck className="mx-auto h-10 w-10 text-gold-600" />
          <p className="mt-5 font-serif text-[1.35rem] text-ink-900">That link is no longer valid</p>
          <p className="mt-2 text-[13.5px] text-ink-500">
            Verification links expire after 24 hours. Sign in and request a fresh one.
          </p>
          <Link href="/login" className="btn-editorial group mt-8">
            Sign in
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Verify your email"
      script="nearly there"
      subtitle="Sign in first, then resend the verification link to your inbox."
      footer={
        <Link href="/login" className="font-semibold text-gold-700 underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      <button type="button" onClick={resend} disabled={sending} className="btn-editorial group w-full disabled:opacity-60">
        {sending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            Resend verification email
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </>
        )}
      </button>
      <p className="mt-5 text-[12px] leading-relaxed text-ink-400">
        Verification emails are delivered by the studio&apos;s own mail server. If nothing arrives within a
        few minutes, check your spam folder or contact the studio.
      </p>
    </AuthLayout>
  );
}
