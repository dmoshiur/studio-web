"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

const ToastContext = React.createContext<{
  toast: (t: Omit<Toast, "id">) => void;
}>({ toast: () => undefined });

export function useToast() {
  return React.useContext(ToastContext);
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (t: Omit<Toast, "id">) => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 border bg-white/95 p-4 shadow-lift backdrop-blur-md animate-scale-in",
              t.kind === "success" && "border-emerald-600/30",
              t.kind === "error" && "border-red-500/30",
              t.kind === "info" && "border-gold-600/30"
            )}
          >
            {t.kind === "success" && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />}
            {t.kind === "error" && <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />}
            {t.kind === "info" && <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />}
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-ink-900">{t.title}</p>
              {t.message && <p className="mt-1 break-words text-[12.5px] leading-relaxed text-ink-500">{t.message}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="rounded-sm p-1 text-ink-400 transition-colors hover:bg-ink-900/[0.05] hover:text-ink-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
