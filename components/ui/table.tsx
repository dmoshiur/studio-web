import * as React from "react";
import { cn } from "@/lib/utils";

/** Studio table shell — obsidian panels with gold hairlines. */
export function TableShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("studio-panel overflow-x-auto", className)}>
      <table className="w-full min-w-[680px] border-collapse text-left text-[13.5px]">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-white/[0.08] bg-white/[0.02]">{children}</tr>
    </thead>
  );
}

export function TH({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "px-5 py-3.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ivory-500",
        className
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-white/[0.05]">{children}</tbody>;
}

export function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-5 py-4 align-middle text-ivory-300", className)}>{children}</td>;
}

export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-1.5">{children}</div>;
}
