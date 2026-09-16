import Link from "next/link";
import { Backdrop, Script } from "@/components/public/ui-kit";

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <Backdrop src="/images/texture-marble.jpg" overlay="obsidian" priority />
      <div className="relative">
        <Script className="text-[3.4rem] leading-none">lost the thread</Script>
        <h1 className="display-lg mt-6 text-ivory-50">This page has moved on</h1>
        <p className="lead mx-auto mt-5 max-w-md">
          The address you followed does not exist. The calendar, the journal and the roster are all one click away.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="inline-flex h-[52px] items-center bg-gold-gradient px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-obsidian-950 transition-all hover:brightness-[1.06]"
          >
            Back to home
          </Link>
          <Link
            href="/events"
            className="inline-flex h-[52px] items-center border border-white/20 px-8 font-sans text-[11.5px] font-semibold uppercase tracking-[0.22em] text-ivory-100 transition-colors hover:border-gold-400/60"
          >
            See the calendar
          </Link>
        </div>
      </div>
    </main>
  );
}
