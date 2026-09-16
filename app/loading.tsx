export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white" role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient font-display text-xl font-extrabold text-white">
          M
        </span>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-ink-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-gradient" />
        </div>
      </div>
    </div>
  );
}
