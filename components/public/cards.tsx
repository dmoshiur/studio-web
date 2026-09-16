import Link from "next/link";
import { CalendarDays, MapPin, ArrowRight, Clock } from "lucide-react";
import type { EventItem, Post, Speaker } from "@/types";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function Cover({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-brand-gradient-soft ${className}`}>
        <span className="font-display text-4xl font-extrabold text-brand-200">{alt.charAt(0).toUpperCase()}</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
}

export function PostCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Cover src={post.coverImage} alt={post.title} className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
        {post.featured && <span className="absolute left-3 top-3"><Badge variant="brand">Featured</Badge></span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-[12px] font-medium text-ink-400">
          <span>{formatDate(post.publishedAt)}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{post.readingMinutes} min read</span>
        </div>
        <h3 className="mt-2 font-display text-lg font-bold leading-snug text-ink-900 transition-colors group-hover:text-brand-600">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-500">{post.excerpt}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
          Read more <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

export function EventCard({ event }: { event: EventItem }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <Cover src={event.coverImage} alt={event.title} className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute left-3 top-3 flex flex-col items-center rounded-xl bg-white/95 px-3 py-1.5 shadow">
          <span className="font-display text-lg font-extrabold leading-none text-ink-900">
            {new Date(event.startAt).getDate()}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-brand-600">
            {new Date(event.startAt).toLocaleString("en-US", { month: "short" })}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold leading-snug text-ink-900 transition-colors group-hover:text-brand-600">
          {event.title}
        </h3>
        <div className="mt-3 space-y-1.5 text-[13px] text-ink-500">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-brand-500" />
            {formatDate(event.startAt, { weekday: "short" })} ·{" "}
            {new Date(event.startAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </p>
          {event.venue && (
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-brand-500" />{event.venue}
            </p>
          )}
        </div>
        <p className="mt-3 line-clamp-2 text-sm text-ink-500">{event.description}</p>
      </div>
    </Link>
  );
}

export function SpeakerCard({ speaker }: { speaker: Speaker }) {
  return (
    <Link
      href={`/speakers/${speaker.slug}`}
      className="group overflow-hidden rounded-2xl border border-ink-100 bg-white text-center shadow-card transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-ink-50">
        {speaker.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={speaker.photoURL}
            alt={speaker.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-gradient-soft">
            <span className="font-display text-6xl font-extrabold text-brand-200">
              {speaker.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink-950/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="p-5">
        <h3 className="font-display text-lg font-bold text-ink-900 transition-colors group-hover:text-brand-600">
          {speaker.name}
        </h3>
        {(speaker.title || speaker.company) && (
          <p className="mt-1 text-sm text-ink-500">
            {[speaker.title, speaker.company].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </Link>
  );
}

export function PageHero({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <section className="relative overflow-hidden bg-ink-950 pb-16 pt-36 md:pb-20 md:pt-44">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-600/30 blur-[120px]" />
        <div className="absolute -right-32 top-10 h-96 w-96 rounded-full bg-ember-500/25 blur-[120px]" />
      </div>
      <div className="container relative">
        {eyebrow && (
          <span className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-white/80">
            {eyebrow}
          </span>
        )}
        <h1 className="max-w-3xl font-display text-4xl font-extrabold text-white md:text-5xl">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/65 md:text-base">{description}</p>}
      </div>
    </section>
  );
}
