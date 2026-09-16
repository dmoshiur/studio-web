"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, ShieldCheck, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { loginSchema, type LoginInput } from "@/lib/validation/schemas";

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <AuthLayout title="Sign in" script="one moment">
          <p className="text-[13.5px] text-ivory-400">Loading…</p>
        </AuthLayout>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const next = params.get("next") && params.get("next")!.startsWith("/") ? params.get("next")! : null;
  const [submitting, setSubmitting] = React.useState(false);
  const [slowNetwork, setSlowNetwork] = React.useState(false);
  const slowTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    if (submitting) return; // Prevent double-submit
    setSubmitting(true);
    setSlowNetwork(false);

    // Show "still working" indicator after 500ms
    slowTimerRef.current = setTimeout(() => setSlowNetwork(true), 500);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email, password: values.password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = (await res.json().catch(() => ({}))) as { error?: string; redirect?: string; role?: string };
      if (!res.ok) throw new Error(data.error ?? "Sign in failed");

      toast({ kind: "success", title: "Welcome back", message: "Your studio is ready." });
      const target = next ?? data.redirect ?? "/";
      router.push(target);
      router.refresh();
    } catch (err) {
      let message: string;
      if (err instanceof DOMException && err.name === "AbortError") {
        message = "The request is taking too long. Please try again.";
      } else if (err instanceof TypeError && /fetch/i.test(err.message)) {
        message = "Connection problem. Please check your internet and try again.";
      } else if (err instanceof Error) {
        const msg = err.message;
        if (/invalid email or password|invalid-credential|wrong-password|user-not-found/i.test(msg)) {
          message = "Email or password is incorrect.";
        } else if (/too-many-requests|too many attempts|rate/i.test(msg)) {
          message = "Too many attempts. Please wait a moment and try again.";
        } else if (/not configured|unavailable|503/i.test(msg)) {
          message = "Authentication service is temporarily unavailable. Please try again.";
        } else if (/invalid request|400/i.test(msg)) {
          message = "Please check your input and try again.";
        } else {
          message = "Something went wrong. Please try again.";
        }
      } else {
        message = "Something went wrong. Please try again.";
      }
      toast({ kind: "error", title: "Sign in failed", message });
    } finally {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setSubmitting(false);
      setSlowNetwork(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      script="the door is open"
      subtitle="Members, speakers and studio staff — welcome back."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-semibold text-gold-300 underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
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

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="password" className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-ivory-400/80">
              Password
            </label>
            <Link href="/forgot-password" className="text-[12px] text-gold-300 transition-colors hover:text-gold-200">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message}
            disabled={submitting}
            {...register("password")}
          />
          <FieldError message={errors.password?.message} />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="group mt-1 inline-flex h-[52px] items-center justify-center gap-3 bg-gold-gradient px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-obsidian-950 transition-all hover:brightness-[1.06] disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Entering the studio…
            </>
          ) : (
            <>
              Enter the studio
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

      <div className="mt-7 flex items-start gap-3 border-t border-white/[0.08] pt-6">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
        <p className="text-[12px] leading-relaxed text-ivory-500">
          Sessions are signed and stored in an httpOnly cookie. Staff accounts with elevated roles are audited on every
          privileged action.
        </p>
      </div>
    </AuthLayout>
  );
}
