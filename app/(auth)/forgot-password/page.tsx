"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ArrowUpRight, KeyRound, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { passwordResetRequestSchema } from "@/lib/validation/schemas";
import { z } from "zod";

type FormValues = z.infer<typeof passwordResetRequestSchema>;

export default function ForgotPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <AuthLayout title="Reset password" script="recover">
          <p className="text-[13.5px] text-ivory-400">Loading…</p>
        </AuthLayout>
      }
    >
      <ResetFlow />
    </React.Suspense>
  );
}

function ResetFlow() {
  const params = useSearchParams();
  const token = params.get("token");
  const { toast } = useToast();
  const [sent, setSent] = React.useState(false);
  const [resetToken, setResetToken] = React.useState<string | null>(token);
  const [newPassword, setNewPassword] = React.useState("");
  const [done, setDone] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const [slowNetwork, setSlowNetwork] = React.useState(false);
  const slowTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(passwordResetRequestSchema) });

  async function onSubmit(values: FormValues) {
    if (submitting) return;
    setSubmitting(true);
    setSlowNetwork(false);
    slowTimerRef.current = setTimeout(() => setSlowNetwork(true), 500);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = (await res.json().catch(() => ({}))) as { resetToken?: string; delivered?: boolean };
      if (data.resetToken) setResetToken(data.resetToken);
      setSent(true);
    } catch {
      // Never reveal whether an account exists.
      setSent(true);
    } finally {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setSubmitting(false);
      setSlowNetwork(false);
    }
  }

  async function completeReset() {
    if (!resetToken || resetting) return;
    setResetting(true);
    setSlowNetwork(false);
    slowTimerRef.current = setTimeout(() => setSlowNetwork(true), 500);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch("/api/auth/password-reset", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: newPassword }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not update the password");
      toast({ kind: "success", title: "Password updated", message: "You can sign in now." });
      setDone(true);
    } catch (err) {
      let message = "Something went wrong. Please try again.";
      if (err instanceof DOMException && err.name === "AbortError") {
        message = "The request is taking too long. Please try again.";
      } else if (err instanceof Error) {
        if (/expired|invalid/i.test(err.message)) {
          message = "This reset link is invalid or has expired. Please request a new one.";
        } else {
          message = err.message;
        }
      }
      toast({ kind: "error", title: "Reset failed", message });
    } finally {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setResetting(false);
      setSlowNetwork(false);
    }
  }

  /* ---------------- Step 3: password updated ---------------- */
  if (done) {
    return (
      <AuthLayout title="Password updated" script="all set">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
          <p className="mt-5 font-serif text-[1.35rem] text-ivory-50">Your new password is active</p>
          <p className="mt-2 text-[13.5px] text-ivory-400/80">Sign in with it and we will take you to your studio.</p>
          <Link
            href="/login"
            className="mt-8 inline-flex h-[50px] items-center gap-3 bg-gold-gradient px-7 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-obsidian-950"
          >
            Sign in
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </AuthLayout>
    );
  }

  /* ---------------- Step 2: choose a new password ---------------- */
  if (resetToken) {
    return (
      <AuthLayout title="Choose a new password" script="almost there">
        <div className="grid gap-5">
          <div>
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={resetting}
            />
          </div>
          <button
            type="button"
            onClick={completeReset}
            disabled={newPassword.length < 8 || resetting}
            className="group inline-flex h-[52px] items-center justify-center gap-3 bg-gold-gradient px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-obsidian-950 transition-all hover:brightness-[1.06] disabled:opacity-50"
          >
            {resetting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating password…
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                Update password
              </>
            )}
          </button>
          {slowNetwork && (
            <p className="text-center text-[12.5px] text-ivory-400/80 animate-pulse">
              Still working… please wait.
            </p>
          )}
          <p className="text-[12px] leading-relaxed text-ivory-500">
            Reset links expire after 30 minutes. If yours has expired, request a new one.
          </p>
        </div>
      </AuthLayout>
    );
  }

  /* ---------------- Step 1: request a link ---------------- */
  return (
    <AuthLayout
      title="Reset password"
      script="no trouble"
      subtitle="We will email you a secure link to choose a new password."
      footer={
        <Link href="/login" className="font-semibold text-gold-300 underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
          <p className="mt-5 font-serif text-[1.35rem] text-ivory-50">Check your inbox</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ivory-400/80">
            If an account exists for that address, a reset link is on its way. The link stays valid for 30 minutes.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              disabled={submitting}
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="group inline-flex h-[52px] items-center justify-center gap-3 bg-gold-gradient px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-obsidian-950 transition-all hover:brightness-[1.06] disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                Send reset link
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </>
            )}
          </button>
          {slowNetwork && (
            <p className="text-center text-[12.5px] text-ivory-400/80 animate-pulse">
              Still working… please wait.
            </p>
          )}
        </form>
      )}
    </AuthLayout>
  );
}
