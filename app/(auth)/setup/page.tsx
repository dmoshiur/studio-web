"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ShieldCheck, AlertTriangle, ArrowUpRight } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

/**
 * One-time owner bootstrap UI.
 * Works with either backend: the embedded store (email + password + setup
 * token) or Firebase (client sign-in followed by an ID-token claim).
 * The API permanently disables itself once an owner exists.
 */
export default function SetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = React.useState<{ available: boolean; reason?: string } | null>(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [setupToken, setSetupToken] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [firebaseMode, setFirebaseMode] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ available: false, reason: "Unable to reach the setup service" }));
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { auth?: string }) => setFirebaseMode(d.auth === "firebase"))
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      let body: Record<string, string> = { email, password, setupToken };

      if (firebaseMode) {
        if (!isFirebaseConfigured) throw new Error("Firebase is not configured");
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Firebase is not configured");
        const cred = await signInWithEmailAndPassword(auth, email, password);
        body = { idToken: await cred.user.getIdToken(), setupToken };
      }

      const res = await fetch("/api/setup/claim-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Setup failed");

      // Establish the session cookie so the owner lands straight in the console.
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      toast({ kind: "success", title: "Owner provisioned", message: "Welcome to the control console." });
      router.push("/hackeradmin");
      router.refresh();
    } catch (err) {
      toast({ kind: "error", title: "Setup failed", message: err instanceof Error ? err.message : undefined });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Owner setup"
      script="the keys"
      subtitle="One-time bootstrap for the site owner. This screen disables itself after the first owner exists."
      image="/images/texture-marble.jpg"
      footer={
        <Link href="/login" className="font-semibold text-gold-300 underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      {status === null ? (
        <p className="text-[13.5px] text-ivory-400/80">Checking setup availability…</p>
      ) : !status.available ? (
        <div className="rounded-sm border border-white/[0.09] bg-white/[0.03] p-6 text-center">
          <ShieldCheck className="mx-auto h-9 w-9 text-emerald-400" />
          <p className="mt-4 font-serif text-[1.35rem] text-ivory-50">Setup is disabled</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ivory-400/80">
            {status.reason ?? "This site already has an owner."}
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-5">
          <div className="flex gap-3 rounded-sm border border-amber-400/30 bg-amber-400/10 p-4 text-[12.5px] leading-relaxed text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Use an allowlisted owner address (<strong>OWNER_EMAILS</strong> / <strong>ADMIN_EMAIL</strong>) and paste the{" "}
              <strong>SETUP_TOKEN</strong> from the server environment.
            </span>
          </div>

          <div>
            <Label htmlFor="setup-email">Owner email</Label>
            <Input
              id="setup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="setup-password">Password</Label>
            <Input
              id="setup-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="setup-token">Setup token</Label>
            <Input
              id="setup-token"
              type="password"
              autoComplete="off"
              placeholder="SETUP_TOKEN from server env"
              value={setupToken}
              onChange={(e) => setSetupToken(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-[52px] items-center justify-center gap-3 bg-gold-gradient px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-obsidian-950 transition-all hover:brightness-[1.06] disabled:opacity-60"
          >
            {loading ? "Provisioning…" : "Claim ownership"}
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
