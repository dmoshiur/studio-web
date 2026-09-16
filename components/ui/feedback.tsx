import * as React from "react";
import { Inbox, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-sm", className)} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] p-7">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="mt-4 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-5/6" />
      <div className="mt-6 flex gap-3">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="studio-panel overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={cn("flex items-center gap-4 p-5", i > 0 && "border-t border-white/[0.06]")}>
          <Skeleton className="h-10 w-10" />
          <div className="flex-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-white/15 bg-white/[0.02] px-8 py-16 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center border border-gold-500/40 text-gold-300">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="font-serif text-[1.35rem] text-ivory-50">{title}</h3>
      {message && <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-ivory-400/80">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-400/[0.07] px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-red-500 shadow-card">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h3 className="font-serif text-lg font-bold text-ink-900">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-ink-500">{message}</p>}
      {onRetry && (
        <Button variant="ghost" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function LoadMore({ hasMore, loading, onLoad }: { hasMore: boolean; loading: boolean; onLoad: () => void }) {
  if (!hasMore) return null;
  return (
    <div className="mt-6 flex justify-center">
      <Button variant="outline" onClick={onLoad} loading={loading}>
        Load more
      </Button>
    </div>
  );
}

export function Pager({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  label,
}: {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  label?: string;
}) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <p className="text-sm text-ink-400">{label}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={!hasPrev} onClick={onPrev}>
          <ChevronLeft /> Previous
        </Button>
        <Button variant="outline" size="sm" disabled={!hasNext} onClick={onNext}>
          Next <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
