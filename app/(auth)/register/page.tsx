"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { registerSchema } from "@/lib/validation/schemas";
import { z } from "zod";

type FormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [slowNetwork, setSlowNetwork] = React.useState(false);
  const slowTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: FormValues) {
    if (submitting) return; // Prevent double-submit
    setSubmitting(true);
    setSlowNetwork(false);

    // Show "still working" indicator after 500ms
    slowTimerRef.current = setTimeout(() => setSlowNetwork(true), 500);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = (await res.json().catch(() => ({}))) as { error?: string; redirect?: string };
      if (!res.ok) throw new Error(data.error ?? "Registration failed");

      // Registration now returns a session cookie directly — no second request needed
      toast({ kind: "success", title: "Welcome to ManUp", message: "Your account is ready." });
      router.push(data.redirect ?? "/");
      router.refresh();
    } catch (err) {
      let message: string;
      if (err instanceof DOMException && err.name === "AbortError") {
        message = "The request is taking too long. Please try again.";
      } else if (err instanceof TypeError && /fetch/i.test(err.message)) {
        message = "Connection problem. Please check your internet and try again.";
      } else if (err instanceof Error) {
        const msg = err.message;
        if (/email.*already.*exist|email-already-in-use|409/i.test(msg)) {
          message = "An account with this email already exists. Try signing in instead.";
        } else if (/too-many-requests|rate/i.test(msg)) {
          message = "Too many attempts. Please wait a moment and try again.";
        } else if (/validation|422/i.test(msg)) {
          message = "Please check your input and try again.";
        } else if (/closed|403/i.test(msg)) {
          message = "Registration is currently closed.";
        } else {
          message = "Something went wrong. Please try again.";
        }
      } else {
        message = "Something went wrong. Please try again.";
      }
      toast({ kind: "error", title: "Registration failed", message });
    } finally {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setSubmitting(false);
      setSlowNetwork(false);
    }
  }

  return (
    <AuthLayout
      title="Create account"
      script="join the circle"
      subtitle="Member access to the journal, the archive and priority ticket windows."
      image="/images/gallery-networking.jpg"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-gold-300 underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
        <div>
          <Label htmlFor="displayName">Full name</Label>
          <Input
            id="displayName"
            autoComplete="name"
            placeholder="Jane Doe"
            error={errors.displayName?.message}
            disabled={submitting}
            {...register("displayName")}
          />
          <FieldError message={errors.displayName?.message} />
        </div>
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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters with letters and numbers"
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
              Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </>
          )}
        </button>

        {slowNetwork && (
          <p className="text-center text-[12.5px] text-ivory-400/80 animate-pulse">
            Still working… please wait.
          </p>
        )}

        <p className="text-center text-[12px] leading-relaxed text-ivory-500">
          By continuing you agree to our{" "}
          <Link href="/privacy" className="text-gold-300 underline underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
      </form>
    </AuthLayout>
  );
}
