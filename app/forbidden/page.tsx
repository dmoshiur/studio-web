import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Backdrop, Script } from "@/components/public/ui-kit";

export const metadata = { title: "Access Denied", robots: { index: false, follow: false } };

export default function ForbiddenPage() {
  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <Backdrop src="/images/texture-marble.jpg" overlay="paper" priority />
      <div className="relative">
        <span className="mx-auto flex h-16 w-16 items-center justify-center border border-crimson-400/40 bg-white text-crimson-500 shadow-card">
          <ShieldX className="h-7 w-7" />
        </span>
        <Script className="mt-7 block">not your room</Script>
        <h1 className="display-md mt-5 text-ink-900">Access denied</h1>
        <p className="lead mx-auto mt-4 max-w-md">
          Your account does not have permission for this area. If you believe this is a mistake, contact the site owner.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="btn-editorial"
          >
            Home
          </Link>
          <Link
            href="/login"
            className="btn-quiet"
          >
            Switch account
          </Link>
        </div>
      </div>
    </main>
  );
}
