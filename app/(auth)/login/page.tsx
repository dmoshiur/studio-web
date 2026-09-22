import * as React from "react";
import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { identityBackend } from "@/lib/server/identity";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  // Deterministic server-side knowledge of the credential store — the form
  // verifies against exactly the store the password-reset flow writes to.
  const authMode = identityBackend();
  return (
    <React.Suspense
      fallback={
        <AuthLayout title="Sign in" script="one moment">
          <p className="text-[13.5px] text-ink-500">Loading…</p>
        </AuthLayout>
      }
    >
      <LoginForm authMode={authMode} />
    </React.Suspense>
  );
}
