import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-4 text-center">
      <p className="font-display text-8xl font-extrabold text-gradient">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-white">Page not found</h1>
      <p className="mt-2 max-w-sm text-white/60">
        The page you're looking for doesn't exist or was moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center rounded-xl bg-brand-gradient px-7 text-[15px] font-semibold text-white shadow-pop hover:brightness-105"
      >
        Back to home
      </Link>
    </main>
  );
}
