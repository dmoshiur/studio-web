import * as React from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/public/reveal";
import { Diamond } from "@/components/ui/badge";

/* ------------------------------------------------------------------ */
/* Imagery & backdrops                                                 */
/* ------------------------------------------------------------------ */

/**
 * Full-bleed background image. On the light theme imagery ghosts through
 * a warm paper scrim; the obsidian scrims remain for the dark footer and
 * studio surfaces. Rendered as a plain <img> so the sandbox never depends
 * on the Next.js image optimizer being able to reach the network.
 */
export function Backdrop({
  src,
  alt = "",
  className,
  overlay = "paper",
  priority = false,
  children,
}: {
  src: string;
  alt?: string;
  className?: string;
  overlay?: "paper" | "paper-soft" | "obsidian" | "editorial" | "soft" | "none";
  priority?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        aria-hidden={alt === ""}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className="h-full w-full scale-[1.02] object-cover"
      />
      {overlay !== "none" && (
        <div
          className={cn(
            "absolute inset-0",
            overlay === "paper" && "overlay-paper",
            overlay === "paper-soft" && "overlay-paper-soft",
            overlay === "obsidian" && "overlay-obsidian",
            overlay === "editorial" && "overlay-editorial",
            overlay === "soft" && "bg-obsidian-950/70"
          )}
        />
      )}
      {children}
    </div>
  );
}

/** Thin gold frame used inside imagery-heavy sections. */
export function GoldFrame({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("pointer-events-none absolute inset-3 border border-gold-600/30 sm:inset-5", className)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Typographic accents                                                 */
/* ------------------------------------------------------------------ */

/** Calligraphic accent word. */
export function Script({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn("calligraphic gold-text", className)}>{children}</span>;
}

export function Eyebrow({
  children,
  className,
  align = "center",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "center" | "left";
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 text-[11px] font-semibold uppercase tracking-luxe text-gold-700",
        align === "center" ? "justify-center" : "justify-start",
        className
      )}
    >
      <span aria-hidden className="h-px w-8 bg-gradient-to-r from-transparent to-gold-600/70" />
      {children}
      {align === "center" && <span aria-hidden className="h-px w-8 bg-gradient-to-l from-transparent to-gold-600/70" />}
    </p>
  );
}

export function GoldRule({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative block h-px w-full max-w-[220px] bg-gradient-to-r from-transparent via-gold-600/70 to-transparent", className)}>
      <Diamond className="absolute -top-[3px] left-1/2 -translate-x-1/2" />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

export function SectionHeading({
  eyebrow,
  script,
  title,
  description,
  align = "center",
  tone = "dark",
  className,
}: {
  eyebrow?: string;
  script?: string;
  title: React.ReactNode;
  description?: string;
  align?: "center" | "left";
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "max-w-3xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      {(eyebrow || script) && (
        <div className={cn("mb-5 flex flex-col gap-2", align === "center" ? "items-center" : "items-start")}>
          {script && <Script className="text-[2rem] leading-none sm:text-[2.4rem]">{script}</Script>}
          {eyebrow && <Eyebrow align={align}>{eyebrow}</Eyebrow>}
        </div>
      )}
      <h2
        className={cn(
          "display-lg",
          tone === "light" ? "text-ink-900" : "text-ink-900"
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={cn("mt-6", tone === "light" ? "lead-dark" : "lead")}>{description}</p>
      )}
      <span
        className={cn(
          "mt-8 block h-px w-24 bg-gradient-to-r via-gold-600 to-transparent",
          align === "center" ? "mx-auto from-transparent" : "from-gold-600/70 to-transparent"
        )}
      />
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Content blocks                                                      */
/* ------------------------------------------------------------------ */

export function StatStrip({
  stats,
  tone = "dark",
}: {
  stats: { value: string; label: string }[];
  tone?: "dark" | "light";
}) {
  if (!stats?.length) return null;
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-4",
        tone === "light" ? "text-ink-900" : "text-ink-900"
      )}
    >
      {stats.map((s, i) => (
        <Reveal
          key={`${s.label}-${i}`}
          delay={i * 90}
          className={cn(
            "px-4 py-8 text-center sm:px-6",
            i > 0 && "sm:border-l",
            "sm:border-line"
          )}
        >
          <p className="font-serif text-[2.5rem] font-medium leading-none tracking-[-0.02em] text-ink-900 sm:text-[3.1rem]">
            {s.value}
          </p>
          <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-[0.28em] text-gold-700">
            {s.label}
          </p>
        </Reveal>
      ))}
    </div>
  );
}

export function Marquee({ items, className }: { items: string[]; className?: string }) {
  if (!items?.length) return null;
  const doubled = [...items, ...items];
  return (
    <div className={cn("relative overflow-hidden border-y border-line bg-white py-6", className)}>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />
      <ul className="flex w-max animate-marquee items-center gap-14 whitespace-nowrap">
        {doubled.map((item, i) => (
          <li
            key={`${item}-${i}`}
            className="flex items-center gap-14 font-serif text-[1.15rem] tracking-[0.16em] text-ink-400"
          >
            <span className="uppercase">{item}</span>
            <Diamond className="opacity-70" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Accordion({
  items,
  tone = "dark",
}: {
  items: { q: string; a: string }[];
  tone?: "dark" | "light";
}) {
  if (!items?.length) return null;
  return (
    <div className={cn("divide-y", tone === "light" ? "divide-line" : "divide-line")}>
      {items.map((item, i) => (
        <details key={item.q + i} className="group py-1">
          <summary
            className={cn(
              "flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-left text-ink-900 transition-colors hover:text-gold-700"
            )}
          >
            <span className="font-serif text-[1.25rem] leading-snug sm:text-[1.4rem]">{item.q}</span>
            <ChevronDown className="h-5 w-5 shrink-0 text-gold-600 transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <p className="max-w-3xl pb-7 pr-10 text-[14.5px] leading-[1.9] text-ink-500 group-open:animate-fade">
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}

export function Gallery({
  items,
  columns = 3,
}: {
  items: { image: string; caption?: string }[];
  columns?: 2 | 3 | 4;
}) {
  if (!items?.length) return null;
  return (
    <div
      className={cn(
        "grid gap-5",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "sm:grid-cols-2 lg:grid-cols-4"
      )}
    >
      {items.map((item, i) => (
        <Reveal key={item.image + i} delay={i * 80}>
          <figure className="group relative overflow-hidden rounded-sm border border-line bg-white shadow-card transition-shadow duration-500 hover:shadow-lift">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image}
              alt={item.caption ?? ""}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover transition-transform duration-1000 group-hover:scale-[1.06]"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-obsidian-950/80 via-transparent to-transparent" />
            {item.caption && (
              <figcaption className="absolute bottom-0 left-0 right-0 p-5 font-serif text-[1.05rem] text-ivory-100">
                {item.caption}
              </figcaption>
            )}
          </figure>
        </Reveal>
      ))}
    </div>
  );
}

export function QuoteBlock({
  quote,
  name,
  role,
}: {
  quote: string;
  name: string;
  role?: string;
}) {
  return (
    <Reveal className="relative rounded-sm border border-line bg-white p-9 shadow-card sm:p-12">
      <span aria-hidden className="calligraphic absolute -top-2 left-7 text-[5rem] leading-none text-gold-500/40">
        &ldquo;
      </span>
      <blockquote className="relative font-serif text-[1.4rem] italic leading-[1.6] text-ink-800 sm:text-[1.65rem]">
        {quote}
      </blockquote>
      <figcaption className="mt-8 flex items-center gap-4">
        <span aria-hidden className="h-px w-10 bg-gold-600/70" />
        <span>
          <span className="block font-sans text-[12px] font-semibold uppercase tracking-[0.22em] text-gold-700">
            {name}
          </span>
          {role && <span className="mt-1 block text-[12.5px] text-ink-400">{role}</span>}
        </span>
      </figcaption>
    </Reveal>
  );
}

/** Inner-page hero with imagery, breadcrumbs and optional call to action. */
export function PageHero({
  eyebrow,
  script,
  title,
  description,
  image = "/images/page-header.jpg",
  breadcrumb,
  children,
}: {
  eyebrow?: string;
  script?: string;
  title: string;
  description?: string;
  image?: string;
  breadcrumb?: { label: string; href?: string }[];
  children?: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-line bg-paper-100 pb-20 pt-40 sm:pb-24 sm:pt-48">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt=""
          aria-hidden
          loading="eager"
          fetchPriority="high"
          className="h-full w-full scale-[1.02] object-cover opacity-[0.13] saturate-[0.85]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-paper-100/60 via-paper-100/85 to-paper-100" />
        <div className="absolute inset-0 bg-gradient-to-r from-paper-100 via-paper-100/60 to-paper-100/20" />
      </div>
      <div className="container relative">
        {breadcrumb?.length ? (
          <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-ink-400">
            {breadcrumb.map((crumb, i) => (
              <span key={crumb.label} className="flex items-center gap-2">
                {i > 0 && <Diamond className="opacity-60" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-gold-700">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gold-700">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <div className="max-w-3xl">
          {script && <Script className="text-[2.1rem] leading-none sm:text-[2.6rem]">{script}</Script>}
          {eyebrow && <Eyebrow align="left" className="mt-4">{eyebrow}</Eyebrow>}
          <h1 className="display-xl mt-6 font-semibold text-ink-900">{title}</h1>
          {description && <p className="lead mt-6 max-w-2xl">{description}</p>}
          {children && <div className="mt-9">{children}</div>}
        </div>
      </div>
    </section>
  );
}

/** Section wrapper that keeps spacing consistent across the site. */
export function Section({
  children,
  className,
  tone = "dark",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "dark" | "light" | "obsidian";
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative py-20 sm:py-24 lg:py-28",
        tone === "light" && "bg-paper-gradient text-ink-900",
        tone === "obsidian" && "bg-paper-200 text-ink-900",
        className
      )}
    >
      <div className="container relative">{children}</div>
    </section>
  );
}

export function TextLink({
  href,
  children,
  className,
  external,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
}) {
  const Tag = external ? "a" : Link;
  return (
    <Tag
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "link-underline inline-flex items-center gap-2 font-sans text-[11.5px] font-semibold uppercase tracking-[0.2em] text-gold-700 transition-colors hover:text-gold-600",
        className
      )}
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
    </Tag>
  );
}
