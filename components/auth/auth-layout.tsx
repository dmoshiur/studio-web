import Link from "next/link";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-ink-950 px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-brand-600/25 blur-[140px]" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-ember-500/20 blur-[140px]" />
      </div>
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-gradient font-display text-xl font-extrabold text-white">
            M
          </span>
          <span className="font-display text-2xl font-extrabold text-white">ManUp</span>
        </Link>
        <div className="rounded-3xl border border-white/10 bg-white p-7 shadow-2xl md:p-9">
          <h1 className="font-display text-2xl font-extrabold text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-white/60">{footer}</div>}
      </div>
    </main>
  );
}
