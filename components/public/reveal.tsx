"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** IntersectionObserver reveal-on-scroll wrapper. Respects reduced motion via CSS. */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    // @ts-expect-error dynamic tag
    <Tag ref={ref} className={cn("reveal", className)} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  dark,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  dark?: boolean;
}) {
  return (
    <Reveal
      className={cn(
        "mb-10 max-w-2xl md:mb-14",
        align === "center" ? "mx-auto text-center" : "text-left"
      )}
    >
      {eyebrow && (
        <span
          className={cn(
            "mb-3 inline-block rounded-full px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.14em]",
            dark ? "bg-white/10 text-white" : "bg-brand-gradient-soft text-brand-700"
          )}
        >
          {eyebrow}
        </span>
      )}
      <h2 className={cn("font-display text-3xl font-extrabold md:text-[2.75rem] md:leading-[1.1]", dark ? "text-white" : "text-ink-900")}>
        {title}
      </h2>
      {description && (
        <p className={cn("mt-4 text-[15px] leading-relaxed md:text-base", dark ? "text-white/70" : "text-ink-500")}>
          {description}
        </p>
      )}
    </Reveal>
  );
}
