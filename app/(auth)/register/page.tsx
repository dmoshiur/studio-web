"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { registerSchema } from "@/lib/validation/schemas";
import { z } from "zod";

type FormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: FormValues) {
    if (!isFirebaseConfigured) {
      toast({ kind: "error", title: "Authentication is not configured" });
      return;
    }
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Authentication is not configured");
      const cred = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(cred.user, { displayName: values.displayName });
      await sendEmailVerification(cred.user).catch(() => undefined);
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error("Account created — please sign in.");
      toast({ kind: "success", title: "Account created", message: "A verification email is on its way." });
      router.push("/");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      const friendly = /email-already-in-use/i.test(message)
        ? "This email is already registered. Try signing in."
        : message;
      toast({ kind: "error", title: "Registration failed", message: friendly });
    }
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="Join the community"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-white underline underline-offset-2">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <div>
          <Label htmlFor="displayName">Full name</Label>
          <Input id="displayName" autoComplete="name" placeholder="Jane Doe" error={errors.displayName?.message} {...register("displayName")} />
          <FieldError message={errors.displayName?.message} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" placeholder="Min. 8 characters, letters + numbers" error={errors.password?.message} {...register("password")} />
          <FieldError message={errors.password?.message} />
        </div>
        <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
          Create account
        </Button>
        <p className="text-center text-[12px] text-ink-400">
          By signing up you agree to our <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </form>
    </AuthLayout>
  );
}
