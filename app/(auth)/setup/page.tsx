"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

/**
 * One-time owner bootstrap UI.
 * Requires: allowlisted OWNER_EMAIL account + SETUP_TOKEN.
 * The API permanently disables itself after the first owner exists.
 */
export default function SetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = React.useState<{ available: boolean; reason?: string } | null>(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [setupToken, setSetupToken] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ available: false, reason: "Unable to reach setup service" }));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFirebaseConfigured) {
      toast({ kind: "error", title: "Firebase is not configured" });
      return;
    }
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase is not configured");
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/setup/claim-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, setupToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Setup failed");
      // Establish session cookie
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: await cred.user.getIdToken(true) }),
      });
      toast({ kind: "success", title: "Owner provisioned", message: "Welcome to the control panel." });
      router.push("/hackeradmin");
    } catch (err) {
      toast({ kind: "error", title: "Setup failed", message: err instanceof Error ? err.message : undefined });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Owner setup"
      subtitle="One-time bootstrap for the site owner"
      footer={
        <Link href="/login" className="font-semibold text-white underline underline-offset-2">
          Back to sign in
        </Link>
      }
    >
      {status === null ? (
        <p className="text-sm text-ink-500">Checking setup availability…</p>
      ) : !status.available ? (
        <div className="rounded-2xl bg-ink-50 p-5 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-emerald-600" />
          <p className="mt-3 font-semibold text-ink-900">Setup is disabled</p>
          <p className="mt-1 text-sm text-ink-500">{status.reason ?? "This site already has an owner."}</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="flex gap-2.5 rounded-2xl bg-amber-50 p-3.5 text-[13px] leading-relaxed text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>
              Sign in with your owner email, then paste the <strong>SETUP_TOKEN</strong> from your server
              environment. This page stops working after the first owner is created.
            </span>
          </div>
          <div>
            <Label htmlFor="setup-email">Owner email</Label>
            <Input id="setup-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="setup-password">Password</Label>
            <Input id="setup-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="setup-token">Setup token</Label>
            <Input id="setup-token" type="password" autoComplete="off" placeholder="SETUP_TOKEN from server env" value={setupToken} onChange={(e) => setSetupToken(e.target.value)} required />
          </div>
          <Button type="submit" loading={loading} size="lg" className="w-full">
            Claim ownership
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
