import * as React from "react";
import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/ui/badge";

export function OwnerPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </div>
  );
}

export function HealthCard({
  label,
  status,
  detail,
  icon,
}: {
  label: string;
  status: "operational" | "configured" | "unavailable" | "error";
  detail?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {icon}
          <p className="text-sm font-semibold text-ink-700">{label}</p>
        </div>
        <StatusDot status={status} />
      </div>
      <p
        className={cn(
          "mt-3 font-display text-lg font-extrabold capitalize",
          status === "operational" || status === "configured" ? "text-emerald-600" : status === "unavailable" ? "text-amber-600" : "text-red-600"
        )}
      >
        {status}
      </p>
      {detail && <p className="mt-1 font-mono text-[12px] text-ink-400">{detail}</p>}
    </div>
  );
}

export function SecretField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <p className="text-sm font-bold text-ink-900">
        {label} <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Secret</span>
      </p>
      {hint && <p className="mt-1 text-[13px] text-ink-500">{hint}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function MaskedValue({ value, mono = true }: { value: string; mono?: boolean }) {
  return (
    <code className={cn("rounded-lg bg-ink-900 px-3 py-1.5 text-[13px] text-emerald-300", mono && "font-mono")}>
      {value}
    </code>
  );
}
