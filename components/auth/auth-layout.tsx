import Link from "next/link";
import { Backdrop, Script } from "@/components/public/ui-kit";
import { Diamond } from "@/components/ui/badge";

/** Shared shell for every authentication screen — paper white, ink, gold. */
export function AuthLayout({
  title,
  subtitle,
  script,
  children,
  footer,
  image = "/images/hero-portrait.jpg",
}: {
  title: string;
  subtitle?: string;
  script?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  image?: string;
}) {
  return (
    <main className="relative isolate flex min-h-screen items-stretch bg-paper-100">
      {/* Editorial imagery column */}
      <div className="relative hidden w-[46%] shrink-0 overflow-hidden lg:block">
        <Backdrop src={image} overlay="paper" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-paper-100/40 via-paper-100/20 to-paper-100" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center border border-ink-900/25 bg-white/60 font-serif text-[1.4rem] text-ink-900">
              M
            </span>
            <span className="font-serif text-[1.35rem] tracking-[0.06em] text-ink-900">ManUp</span>
          </Link>

          <div>
            <Script className="text-[2.6rem] leading-none">welcome back</Script>
            <p className="mt-6 max-w-sm font-serif text-[1.5rem] italic leading-relaxed text-ink-700">
              “The room, the standard and the work — all in one place.”
            </p>
            <span className="mt-7 flex items-center gap-3 text-[10.5px] uppercase tracking-luxe text-ink-400">
              <Diamond className="h-1 w-1" />
              Summit &amp; Salon
            </span>
          </div>

          <p className="text-[11px] uppercase tracking-[0.2em] text-ink-400">Member &amp; studio access</p>
        </div>
      </div>

      {/* Form column */}
      <div className="relative flex w-full items-center justify-center px-5 py-16 sm:px-10">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
          <Backdrop src={image} overlay="paper" />
        </div>
        <div className="relative w-full max-w-md">
          <Link href="/" className="mb-9 flex items-center justify-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center border border-ink-900/25 bg-white font-serif text-[1.4rem] text-ink-900">
              M
            </span>
            <span className="font-serif text-[1.35rem] text-ink-900">ManUp</span>
          </Link>

          <div className="relative border border-line bg-white p-8 shadow-luxe sm:p-10">
            <span aria-hidden className="pointer-events-none absolute inset-x-3 top-3 h-px bg-gradient-to-r from-transparent via-gold-600/50 to-transparent" />
            {script && <Script className="block text-[1.9rem] leading-none">{script}</Script>}
            <h1 className="mt-3 font-serif text-[2rem] leading-tight text-ink-900">{title}</h1>
            {subtitle && <p className="mt-3 text-[13.5px] leading-relaxed text-ink-500">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </div>

          {footer && <div className="mt-7 text-center text-[13.5px] text-ink-500">{footer}</div>}

          <p className="mt-8 text-center text-[11px] uppercase tracking-[0.2em] text-ink-400">
            <Link href="/" className="transition-colors hover:text-gold-700">
              ← Back to the site
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
