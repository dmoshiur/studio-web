import Link from "next/link";
import { Backdrop, Script } from "@/components/public/ui-kit";

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <Backdrop src="/images/texture-marble.jpg" overlay="paper" priority />
      <div className="relative">
        <Script>lost the thread</Script>
        <h1 className="display-lg mt-6 text-ink-900">This page has moved on</h1>
        <p className="lead mx-auto mt-5 max-w-md">
          The address you followed does not exist. The calendar, the journal and the roster are all one click away.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="btn-editorial"
          >
            Back to home
          </Link>
          <Link
            href="/events"
            className="btn-quiet"
          >
            See the calendar
          </Link>
        </div>
      </div>
    </main>
  );
}
