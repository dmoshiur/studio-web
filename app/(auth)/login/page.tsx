"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { loginSchema, type LoginInput } from "@/lib/validation/schemas";

export default function LoginPage() {
  return (
    <React.Suspense fallback={<AuthLayout title="Sign in"><p className="text-sm text-ink-500">Loading…</p></AuthLayout>}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const next = params.get("next") && params.get("next")!.startsWith("/") ? params.get("next")! : "/";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    if (!isFirebaseConfigured) {
      toast({ kind: "error", title: "Authentication is not configured" });
      return;
    }
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Authentication is not configured");
      const cred = await signInWithEmailAndPassword(auth, values.email, values.password);
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Sign in failed");
      }
      toast({ kind: "success", title: "Welcome back!" });
      router.push(next);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      const friendly = /invalid-credential|wrong-password|user-not-found/i.test(message)
        ? "Invalid email or password."
        : /too-many-requests/i.test(message)
          ? "Too many attempts. Please wait and try again."
          : message;
      toast({ kind: "error", title: "Sign in failed", message: friendly });
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account"
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-semibold text-white underline underline-offset-2">
            Create an account
          </Link>
        </>
      }
    >
      {!isFirebaseConfigured && (
        <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-700">
          Firebase is not configured yet. See the deployment guide to connect your project.
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-[13px] font-semibold text-ink-700">Password</label>
            <Link href="/forgot-password" className="text-[13px] font-semibold text-brand-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" error={errors.password?.message} {...register("password")} />
          <FieldError message={errors.password?.message} />
        </div>
        <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
