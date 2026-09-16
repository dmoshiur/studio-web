"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { CheckCircle2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { passwordResetRequestSchema } from "@/lib/validation/schemas";
import { z } from "zod";

type FormValues = z.infer<typeof passwordResetRequestSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [sent, setSent] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(passwordResetRequestSchema) });

  async function onSubmit(values: FormValues) {
    if (!isFirebaseConfigured) {
      toast({ kind: "error", title: "Authentication is not configured" });
      return;
    }
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Authentication is not configured");
      await sendPasswordResetEmail(auth, values.email);
      setSent(true);
    } catch {
      // Always show success to prevent account enumeration.
      setSent(true);
    }
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="We'll email you a reset link"
      footer={
        <Link href="/login" className="font-semibold text-white underline underline-offset-2">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <p className="mt-4 font-semibold text-ink-900">Check your inbox</p>
          <p className="mt-1 text-sm text-ink-500">
            If an account exists for that email, a reset link is on its way.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
            <FieldError message={errors.email?.message} />
          </div>
          <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
