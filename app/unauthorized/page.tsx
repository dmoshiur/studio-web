import Link from "next/link";
import { Lock } from "lucide-react";
import { Backdrop, Script } from "@/components/public/ui-kit";

export const metadata = { title: "Sign In Required", robots: { index: false, follow: false } };

export default function UnauthorizedPage() {
  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <Backdrop src="/images/hero-portrait.jpg" overlay="paper" priority />
      <div className="relative">
        <span className="mx-auto flex h-16 w-16 items-center justify-center border border-gold-600/40 bg-white text-gold-700 shadow-card">
          <Lock className="h-7 w-7" />
        </span>
        <Script className="mt-7 block">members only</Script>
        <h1 className="display-md mt-5 text-ink-900">Sign in required</h1>
        <p className="lead mx-auto mt-4 max-w-md">Sign in to continue to your studio or account.</p>
        <Link
          href="/login"
          className="btn-editorial mt-9"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
