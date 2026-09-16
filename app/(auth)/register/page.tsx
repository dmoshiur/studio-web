"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { ArrowUpRight } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { registerSchema } from "@/lib/validation/schemas";
import { z } from "zod";

type FormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = React.useState<"session" | "firebase">("session");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(registerSchema) });

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { auth?: string }) => setMode(d.auth === "firebase" ? "firebase" : "session"))
      .catch(() => undefined);
  }, []);

  async function onSubmit(values: FormValues) {
    try {
      if (mode === "firebase" && isFirebaseConfigured) {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Authentication is not configured");
        const cred = await createUserWithEmailAndPassword(auth, values.email, values.password);
        await updateProfile(cred.user, { displayName: values.displayName });
        await sendEmailVerification(cred.user).catch(() => undefined);
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: await cred.user.getIdToken() }),
        });
        if (!res.ok) throw new Error("Account created — please sign in.");
      } else {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Registration failed");
        // Sign the new member straight in.
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: values.email, password: values.password }),
        });
      }

      toast({ kind: "success", title: "Welcome to ManUp", message: "Your account is ready." });
      router.push("/");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      const friendly = /email-already-in-use|already exists/i.test(message)
        ? "This email is already registered — try signing in instead."
        : message;
      toast({ kind: "error", title: "Registration failed", message: friendly });
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
            {...register("password")}
          />
          <FieldError message={errors.password?.message} />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="group mt-1 inline-flex h-[52px] items-center justify-center gap-3 bg-gold-gradient px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-obsidian-950 transition-all hover:brightness-[1.06] disabled:opacity-60"
        >
          {isSubmitting ? "Creating account…" : "Create my account"}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </button>

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
