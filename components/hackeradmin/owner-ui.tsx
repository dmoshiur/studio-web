import * as React from "react";
import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/ui/badge";

export function OwnerPageHeader({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-9 flex flex-col gap-5 border-b border-gold-500/[0.16] pb-7 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="mb-3 font-sans text-[9.5px] font-semibold uppercase tracking-[0.26em] text-gold-400">
          {eyebrow ?? "Owner console"}
        </p>
        <h1 className="font-serif text-[2rem] leading-tight text-ivory-50 md:text-[2.35rem]">{title}</h1>
        {description && <p className="mt-2.5 max-w-2xl text-[13.5px] leading-relaxed text-ivory-400">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-3">{action}</div>}
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
    <div className="rounded-sm border border-white/[0.08] bg-white/[0.03] p-5 shadow-luxe">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {icon}
          <p className="text-sm font-semibold text-ivory-200">{label}</p>
        </div>
        <StatusDot status={status} />
      </div>
      <p
        className={cn(
          "mt-3 font-serif text-[1.35rem] capitalize",
          status === "operational" || status === "configured" ? "text-emerald-400" : status === "unavailable" ? "text-amber-300" : "text-red-400"
        )}
      >
        {status}
      </p>
      {detail && <p className="mt-1 font-mono text-[12px] text-ivory-500">{detail}</p>}
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
    <div className="rounded-sm border border-amber-200 bg-amber-50/60 p-4">
      <p className="text-sm font-bold text-ivory-50">
        {label} <span className="ml-1 rounded-sm border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-amber-200">Secret</span>
      </p>
      {hint && <p className="mt-1 text-[13px] text-ivory-400">{hint}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function MaskedValue({ value, mono = true }: { value: string; mono?: boolean }) {
  return (
    <code className={cn("rounded-sm border border-white/[0.08] bg-black/40 px-3 py-1.5 text-[12.5px] text-emerald-300", mono && "font-mono")}>
      {value}
    </code>
  );
}
