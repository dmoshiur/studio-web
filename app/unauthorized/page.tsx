import Link from "next/link";
import { Lock } from "lucide-react";

export const metadata = { title: "Sign In Required", robots: { index: false, follow: false } };

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-4 text-center">
      <Lock className="h-14 w-14 text-ember-400" />
      <h1 className="mt-5 font-display text-3xl font-extrabold text-white">Sign in required</h1>
      <p className="mt-2 max-w-sm text-white/60">Please sign in to continue.</p>
      <Link href="/login" className="mt-8 inline-flex h-12 items-center rounded-xl bg-brand-gradient px-7 text-[15px] font-semibold text-white hover:brightness-105">
        Sign in
      </Link>
    </main>
  );
}
