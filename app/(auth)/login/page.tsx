"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
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
  const [mode, setMode] = React.useState<"session" | "firebase">("session");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { auth?: string }) => setMode(d.auth === "firebase" ? "firebase" : "session"))
      .catch(() => undefined);
  }, []);

  async function onSubmit(values: LoginInput) {
    try {
      let payload: Record<string, string> = { email: values.email, password: values.password };

      // Firebase deployments exchange an ID token for the session cookie.
      if (mode === "firebase" && isFirebaseConfigured) {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Authentication is not configured");
        const cred = await signInWithEmailAndPassword(auth, values.email, values.password);
        payload = { idToken: await cred.user.getIdToken() };
      }

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; redirect?: string; role?: string };
      if (!res.ok) throw new Error(data.error ?? "Sign in failed");

      toast({ kind: "success", title: "Welcome back", message: "Your studio is ready." });
      const target = next ?? data.redirect ?? "/";
      router.push(target);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      const friendly = /invalid-credential|wrong-password|user-not-found|invalid email or password/i.test(message)
        ? "That email and password combination is not recognised."
        : /too-many-requests|too many attempts/i.test(message)
          ? "Too many attempts. Please wait a moment and try again."
          : message;
      toast({ kind: "error", title: "Sign in failed", message: friendly });
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
      {mode === "firebase" && !isFirebaseConfigured && (
        <p role="alert" className="mb-5 border border-amber-400/30 bg-amber-400/10 p-3.5 text-[12.5px] text-amber-200">
          Firebase is not configured yet. Add your web config to enable sign-in.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email?.message}
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
            {...register("password")}
          />
          <FieldError message={errors.password?.message} />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="group mt-1 inline-flex h-[52px] items-center justify-center gap-3 bg-gold-gradient px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-obsidian-950 transition-all hover:brightness-[1.06] disabled:opacity-60"
        >
          {isSubmitting ? "Signing in…" : "Enter the studio"}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </button>
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
