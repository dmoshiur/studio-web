import Link from "next/link";
import { ShieldX } from "lucide-react";

export const metadata = { title: "Access Denied", robots: { index: false, follow: false } };

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-4 text-center">
      <ShieldX className="h-14 w-14 text-danger" />
      <h1 className="mt-5 font-display text-3xl font-extrabold text-white">Access denied</h1>
      <p className="mt-2 max-w-sm text-white/60">
        You don't have permission to view this area. If you believe this is a mistake, contact the site owner.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="inline-flex h-12 items-center rounded-xl bg-brand-gradient px-7 text-[15px] font-semibold text-white hover:brightness-105">
          Home
        </Link>
        <Link href="/login" className="inline-flex h-12 items-center rounded-xl border border-white/20 bg-white/5 px-7 text-[15px] font-semibold text-white hover:bg-white/10">
          Sign in
        </Link>
      </div>
    </main>
  );
}
