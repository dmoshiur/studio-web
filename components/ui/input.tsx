import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Form primitives — translucent obsidian surfaces with gold focus states.
 * `tone="light"` switches to the ivory studio surfaces.
 */

const base =
  "w-full rounded-sm border px-4 text-[14px] transition-colors placeholder:text-ivory-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

const darkTone =
  "border-white/[0.12] bg-white/[0.04] text-ivory-100 focus:border-gold-500/70 focus:bg-white/[0.06]";
const lightTone =
  "border-ink-900/[0.12] bg-white text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20";

function toneClasses(tone: "dark" | "light") {
  return tone === "light" ? lightTone : darkTone;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  tone?: "dark" | "light";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, tone = "dark", ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={Boolean(error)}
      className={cn(
        base,
        "h-12",
        toneClasses(tone),
        error && "border-danger focus:border-danger",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string; tone?: "dark" | "light" }
>(({ className, error, tone = "dark", ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={Boolean(error)}
    className={cn(
      base,
      "min-h-[132px] py-3 leading-relaxed",
      toneClasses(tone),
      error && "border-danger",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string; tone?: "dark" | "light" }
>(({ className, error, tone = "dark", children, ...props }, ref) => (
  <select
    ref={ref}
    aria-invalid={Boolean(error)}
    className={cn(
      base,
      "h-12 appearance-none bg-[length:14px] bg-[right_1rem_center] bg-no-repeat pr-10",
      toneClasses(tone),
      // Chevron drawn as an inline SVG so it works on both tones
      "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23c9a227%22 stroke-width=%221.75%22%3E%3Cpath d=%22M6 9l6 6 6-6%22/%3E%3C/svg%3E')]",
      error && "border-danger",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({ className, tone = "dark", ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { tone?: "dark" | "light" }) {
  return (
    <label
      className={cn(
        "mb-2 block font-sans text-[11px] font-semibold uppercase tracking-[0.18em]",
        tone === "light" ? "text-ink-500" : "text-ivory-400",
        className
      )}
      {...props}
    />
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-[12.5px] font-medium text-danger">
      {message}
    </p>
  );
}

export function FieldHint({
  children,
  tone = "dark",
}: {
  children: React.ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <p className={cn("mt-1.5 text-[12.5px] leading-relaxed", tone === "light" ? "text-ink-400" : "text-ivory-500")}>
      {children}
    </p>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ?? "Toggle"}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors disabled:opacity-50",
        checked ? "border-gold-500/50 bg-gold-500/25" : "border-white/20 bg-white/[0.06]"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full transition-transform",
          checked ? "translate-x-[24px] bg-gold-400" : "translate-x-[3px] bg-ivory-400"
        )}
      />
    </button>
  );
}
