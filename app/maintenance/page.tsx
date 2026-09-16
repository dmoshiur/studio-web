import type { Metadata } from "next";
import Link from "next/link";
import { Clock } from "lucide-react";
import { getMaintenanceState, getPublicSettings } from "@/lib/firestore/settings";
import { Backdrop, GoldRule, Script } from "@/components/public/ui-kit";
import { Diamond } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Under Maintenance",
  robots: { index: false, follow: false },
};

export default async function MaintenancePage() {
  const [state, settings] = await Promise.all([getMaintenanceState(), getPublicSettings()]);

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-6 py-24">
      <Backdrop src={state.imageUrl || "/images/hero-stage.jpg"} overlay="obsidian" priority />
      <span aria-hidden className="pointer-events-none absolute inset-6 hidden border border-gold-500/20 lg:block" />

      <div className="relative w-full max-w-xl text-center">
        {state.emergencyLock ? (
          <>
            <Script className="text-[2.9rem] leading-none">we will return</Script>
            <p className="mt-6 font-sans text-[10.5px] uppercase tracking-luxe text-ivory-500">Temporarily unavailable</p>
          </>
        ) : (
          <>
            <Script className="text-[2.9rem] leading-none">{settings.siteName}</Script>
            <p className="mt-6 font-sans text-[10.5px] uppercase tracking-luxe text-gold-400">Private viewings only</p>
          </>
        )}

        <h1 className="display-lg mt-6 text-ivory-50 text-shadow-luxe">{state.title}</h1>
        <GoldRule className="mt-8" />
        <p className="lead mx-auto mt-7 max-w-md">{state.message}</p>

        {state.expectedReturn && (
          <p className="mt-8 inline-flex items-center gap-3 border border-gold-500/30 px-5 py-2.5 font-sans text-[10.5px] uppercase tracking-[0.2em] text-gold-200">
            <Clock className="h-3.5 w-3.5" />
            {state.expectedReturn}
          </p>
        )}

        <div className="mt-10 flex flex-col items-center gap-4">
          <span className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-ivory-500">
            <Diamond className="h-1 w-1" />
            Contact the team
            <Diamond className="h-1 w-1" />
          </span>
          <a
            href={`mailto:${settings.contactEmail}`}
            className="font-serif text-[1.2rem] text-gold-200 underline-offset-4 transition-colors hover:text-gold-100 hover:underline"
          >
            {settings.contactEmail}
          </a>
        </div>

        <p className="mt-12 text-[11px] uppercase tracking-[0.2em] text-ivory-500">
          <Link href="/login" className="transition-colors hover:text-gold-300">
            Studio sign in →
          </Link>
        </p>
      </div>
    </main>
  );
}
