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
import { getFirebaseAuth } from "@/lib/firebase/client";
import { signInWithEmailAndPassword } from "firebase/auth";

interface SessionResponse {
  error?: string;
  code?: string;
  redirect?: string;
  role?: string;
}

/**
 * Login form.
 *
 * The server verifies passwords against the ACTIVE identity store:
 *  • embedded backend  — email + password checked server-side (scrypt), and
 *  • Firebase backend  — password is verified by Firebase Authentication on
 *    the client (same store the password-reset flow updates), then exchanged
 *    for a signed session cookie via the ID-token endpoint.
 * The form handles both transparently so a password that was just reset is
 * usable immediately.
 */
export function LoginForm({ authMode }: { authMode: "firebase" | "local" }) {
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

  function messageForError(err: unknown): string {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "The request is taking too long. Please try again.";
    }
    if (err instanceof TypeError && /fetch/i.test(err.message)) {
      return "Connection problem. Please check your internet and try again.";
    }
    const code = (err as { code?: string }).code;
    if (
      code === "auth/invalid-credential" ||
      code === "auth/wrong-password" ||
      code === "auth/user-not-found" ||
      code === "auth/invalid-email"
    ) {
      return "Email or password is incorrect.";
    }
    if (code === "auth/too-many-requests" || code === "rate_limited") {
      return "Too many attempts. Please wait a moment and try again.";
    }
    if (code === "auth/network-request-failed") {
      return "Connection problem. Please check your internet and try again.";
    }
    if (err instanceof Error) {
      const msg = err.message;
      if (/invalid email or password|invalid-credential|wrong-password|user-not-found/i.test(msg)) {
        return "Email or password is incorrect.";
      }
      if (/too-many-requests|too many attempts|rate/i.test(msg)) {
        return "Too many attempts. Please wait a moment and try again.";
      }
      if (/not configured|unavailable|503/i.test(msg)) {
        return "Authentication service is temporarily unavailable. Please try again.";
      }
    }
    return "Something went wrong. Please try again.";
  }

  /** Exchange credentials for a session cookie and finish the sign-in. */
  async function postSession(body: Record<string, unknown>, signal?: AbortSignal): Promise<SessionResponse> {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    const data = (await res.json().catch(() => ({}))) as SessionResponse;
    if (!res.ok) {
      const err = new Error(data.error ?? "Sign in failed") as Error & { code?: string; status?: number };
      err.code = data.code;
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function onSubmit(values: LoginInput) {
    if (submitting) return; // Prevent double-submit
    setSubmitting(true);
    setSlowNetwork(false);
    slowTimerRef.current = setTimeout(() => setSlowNetwork(true), 500);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      let data: SessionResponse;
      try {
        // 1) Server-side verification (embedded store + env break-glass).
        data = await postSession({ email: values.email, password: values.password }, controller.signal);
      } catch (err) {
        const code = (err as { code?: string }).code;
        // The server response code is authoritative (never a baked build-time
        // value): `use_firebase_client` means passwords for this deployment
        // live in Firebase Authentication.
        if (code === "use_firebase_client") {
          // 2) Firebase deployments: verify against Firebase Authentication —
          //    the very store the forgot-password flow writes — then exchange
          //    the ID token for the session cookie.
          const auth = getFirebaseAuth();
          if (!auth) throw new Error("Authentication service is temporarily unavailable.");
          const cred = await signInWithEmailAndPassword(auth, values.email, values.password);
          const idToken = await cred.user.getIdToken();
          data = await postSession({ idToken });
        } else {
          throw err;
        }
      }
      clearTimeout(timeoutId);

      toast({ kind: "success", title: "Welcome back", message: "Your studio is ready." });
      const target = next ?? data.redirect ?? "/";
      router.push(target);
      router.refresh();
    } catch (err) {
      toast({ kind: "error", title: "Sign in failed", message: messageForError(err) });
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
          <Link href="/register" className="font-semibold text-gold-700 underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
        <div>
          <Label tone="light" htmlFor="email">Email</Label>
          <Input
            tone="light"
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
            <label htmlFor="password" className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
              Password
            </label>
            <Link href="/forgot-password" className="text-[12px] text-gold-700 transition-colors hover:text-gold-700">
              Forgot password?
            </Link>
          </div>
          <Input
            tone="light"
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
          className="btn-editorial group mt-1 w-full disabled:opacity-60"
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
          <p className="text-center text-[12.5px] text-ink-500 animate-pulse">
            Still working… please wait.
          </p>
        )}
      </form>

      <div className="mt-7 flex items-start gap-3 border-t border-line pt-6">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
        <p className="text-[12px] leading-relaxed text-ink-400">
          {authMode === "firebase"
            ? "Credentials are verified by Firebase Authentication. "
            : "Credentials are verified against the studio's private credential store. "}
          Sessions are signed and stored in an httpOnly cookie. Staff accounts with elevated roles are audited on every
          privileged action.
        </p>
      </div>
    </AuthLayout>
  );
}
