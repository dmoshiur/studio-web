import Link from "next/link";
import { CalendarDays, MapPin, ArrowUpRight, Clock } from "lucide-react";
import type { EventItem, Post, Speaker } from "@/types";
import { formatDate } from "@/lib/utils";
import { Badge, Diamond } from "@/components/ui/badge";

function ratioClass(ratio?: string) {
  return ratio ?? "aspect-[4/5]";
}

/** Image with an editorial fallback — gold monogram on paper. */
function Cover({
  src,
  alt,
  className,
  ratio = "aspect-[16/10]",
  letter,
}: {
  src?: string;
  alt: string;
  className?: string;
  ratio?: string;
  letter?: string;
}) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-paper-200 ${ratio} ${className ?? ""}`}>
        <span className="font-serif text-5xl text-gold-600/60">{letter ?? alt.charAt(0).toUpperCase()}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" className={`object-cover ${ratio} ${className ?? ""}`} />
  );
}

export function PostCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-sm border border-line bg-white shadow-card transition-all duration-500 hover:-translate-y-0.5 hover:border-gold-600/40 hover:shadow-lift"
    >
      <div className="relative overflow-hidden border-b border-line">
        <Cover
          src={post.coverImage}
          alt={post.title}
          ratio="aspect-[16/10]"
          className="w-full transition-transform duration-1000 group-hover:scale-[1.07]"
        />
        {post.featured && (
          <span className="absolute left-4 top-4">
            <Badge variant="solidGold">Featured</Badge>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-7">
        <div className="flex items-center gap-3 font-sans text-[10.5px] uppercase tracking-[0.2em] text-ink-400">
          <span>{formatDate(post.publishedAt, { month: "short" })}</span>
          <Diamond className="h-1 w-1" />
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {post.readingMinutes} min
          </span>
        </div>
        <h3 className="mt-4 font-serif text-[1.45rem] leading-[1.25] text-ink-900 transition-colors group-hover:text-gold-700">
          {post.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-[13.5px] leading-[1.85] text-ink-500">{post.excerpt}</p>
        <span className="mt-6 inline-flex items-center gap-2 font-sans text-[10.5px] font-semibold uppercase tracking-[0.22em] text-gold-700">
          Read the story
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export function EventCard({ event }: { event: EventItem }) {
  const start = new Date(event.startAt);
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-sm border border-line bg-white shadow-card transition-all duration-500 hover:-translate-y-0.5 hover:border-gold-600/40 hover:shadow-lift"
    >
      <div className="relative overflow-hidden border-b border-line">
        <Cover
          src={event.coverImage}
          alt={event.title}
          ratio="aspect-[16/10]"
          className="w-full transition-transform duration-1000 group-hover:scale-[1.07]"
        />
        <div className="absolute left-4 top-4 flex flex-col items-center border border-line bg-white px-3.5 py-2.5 shadow-card">
          <span className="font-serif text-[1.5rem] leading-none text-ink-900">{start.getDate()}</span>
          <span className="mt-1 font-sans text-[9.5px] font-semibold uppercase tracking-[0.22em] text-gold-700">
            {start.toLocaleString("en-US", { month: "short" })}
          </span>
        </div>
        {event.price && (
          <span className="absolute bottom-4 right-4 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
            {event.price}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-7">
        <h3 className="font-serif text-[1.45rem] leading-[1.25] text-ink-900 transition-colors group-hover:text-gold-700">
          {event.title}
        </h3>
        <div className="mt-4 space-y-2.5 text-[12.5px] text-ink-500">
          <p className="flex items-center gap-2.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-gold-600" />
            {formatDate(event.startAt, { weekday: "long", month: "long", day: "numeric" })}
            <span className="text-ink-400">
              · {start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </p>
          {event.venue && (
            <p className="flex items-center gap-2.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-gold-600" />
              {event.venue}
            </p>
          )}
        </div>
        <p className="mt-4 line-clamp-2 text-[13.5px] leading-[1.85] text-ink-500">{event.description}</p>
        <span className="mt-6 inline-flex items-center gap-2 font-sans text-[10.5px] font-semibold uppercase tracking-[0.22em] text-gold-700">
          View details
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export function SpeakerCard({ speaker }: { speaker: Speaker }) {
  return (
    <Link href={`/speakers/${speaker.slug}`} className="group block">
      <div className="relative overflow-hidden rounded-sm border border-line bg-white shadow-card transition-shadow duration-500 hover:shadow-lift">
        <Cover
          src={speaker.photoURL}
          alt={speaker.name}
          letter={speaker.name.charAt(0)}
          ratio={ratioClass("aspect-[4/5]")}
          className="w-full grayscale-[35%] transition-all duration-1000 group-hover:scale-[1.05] group-hover:grayscale-0"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-obsidian-950 via-obsidian-950/25 to-transparent opacity-90 transition-opacity group-hover:opacity-95" />
        <span className="pointer-events-none absolute inset-3 border border-gold-500/0 transition-colors duration-500 group-hover:border-gold-500/50" />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <h3 className="font-serif text-[1.4rem] leading-tight text-ivory-50">{speaker.name}</h3>
          {(speaker.title || speaker.company) && (
            <p className="mt-2 font-sans text-[10.5px] uppercase tracking-[0.2em] text-gold-300">
              {[speaker.title, speaker.company].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
