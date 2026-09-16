import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { getMaintenanceState, getPublicSettings } from "@/lib/firestore/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Under Maintenance",
  robots: { index: false, follow: false },
};

export default async function MaintenancePage() {
  const [state, settings] = await Promise.all([getMaintenanceState(), getPublicSettings()]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-brand-600/20 blur-[140px]" />
        <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-ember-500/15 blur-[140px]" />
      </div>
      <div className="relative w-full max-w-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-gradient shadow-pop">
          <Wrench className="h-8 w-8 text-white" />
        </div>
        <p className="mt-6 text-[12px] font-bold uppercase tracking-[0.2em] text-white/50">
          {state.emergencyLock ? "Temporarily unavailable" : settings.siteName}
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold text-white md:text-5xl">{state.title}</h1>
        <p className="mt-4 leading-relaxed text-white/65">{state.message}</p>
        {state.expectedReturn && (
          <p className="mt-4 inline-block rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white/85">
            {state.expectedReturn}
          </p>
        )}
        <p className="mt-8 text-[13px] text-white/40">
          Need help? Contact us at{" "}
          <a href={`mailto:${settings.contactEmail}`} className="underline underline-offset-2 hover:text-white/70">
            {settings.contactEmail}
          </a>
        </p>
      </div>
    </main>
  );
}
