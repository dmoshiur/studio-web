import * as React from "react";
import { cn } from "@/lib/utils";

/** Editorial surface — dark (default) or ivory via `tone="light"`. */
export function Card({
  className,
  tone = "dark",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: "dark" | "light" }) {
  return (
    <div
      className={cn(
        "rounded-sm transition-colors",
        tone === "light"
          ? "border border-ink-900/[0.08] bg-white shadow-luxe"
          : "border border-white/[0.08] bg-white/[0.025] backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2 p-7 pb-4", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-serif text-[1.5rem] font-medium text-ivory-50", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[14px] leading-relaxed text-ivory-400/80", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-7 pt-2", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-3 border-t border-white/[0.08] p-7", className)} {...props} />;
}
