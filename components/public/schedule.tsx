"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleDay, Speaker } from "@/types";
import { Reveal } from "@/components/public/reveal";

/**
 * Day-by-day tabbed schedule — ManUp-style.
 * Tabs switch purely client-side (no reload); each tab renders that day's
 * timeline: session title, timing, venue/track and the assigned speakers.
 */

function formatTime(t?: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""} ${suffix}`;
}

function dayDateLabel(day: ScheduleDay): string | null {
  if (!day.dateISO) return null;
  const d = new Date(day.dateISO);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function ScheduleTabs({ days, speakers }: { days: ScheduleDay[]; speakers: Speaker[] }) {
  const [activeId, setActiveId] = React.useState<string>(days[0]?.id ?? "");
  const active = days.find((d) => d.id === activeId) ?? days[0];

  const speakerById = React.useMemo(() => {
    const map = new Map<string, Speaker>();
    for (const s of speakers) map.set(s.id, s);
    return map;
  }, [speakers]);

  if (!days.length) return null;

  return (
    <div>
      {/* -------- Day tabs -------- */}
      <div
        role="tablist"
        aria-label="Schedule days"
        className="mx-auto flex w-full max-w-2xl flex-wrap items-stretch justify-center gap-2 sm:gap-3"
      >
        {days.map((day, i) => {
          const selected = day.id === active?.id;
          const dateLabel = dayDateLabel(day);
          return (
            <button
              key={day.id}
              role="tab"
              id={`schedule-tab-${day.id}`}
              aria-selected={selected}
              aria-controls={`schedule-panel-${day.id}`}
              onClick={() => setActiveId(day.id)}
              className={cn(
                "group relative flex min-w-[104px] flex-1 flex-col items-center justify-center border px-4 py-4 transition-all duration-300 sm:min-w-[150px] sm:px-8 sm:py-5",
                selected
                  ? "border-transparent bg-gold-gradient text-obsidian-950 shadow-gold-sm"
                  : "border-line bg-white text-ink-900 shadow-card hover:-translate-y-0.5 hover:border-gold-600/50 hover:text-gold-800"
              )}
            >
              <span
                className={cn(
                  "font-sans text-[9.5px] font-semibold uppercase tracking-[0.26em]",
                  selected ? "text-gold-200" : "text-gold-700"
                )}
              >
                {dateLabel ?? `Tab ${i + 1}`}
              </span>
              <span
                className={cn(
                  "mt-1.5 font-serif text-[1.35rem] leading-none sm:text-[1.6rem]",
                  selected ? "text-white" : "text-ink-900"
                )}
              >
                {day.label}
              </span>
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-6 bottom-0 h-[2px] rounded-full transition-transform duration-300",
                  selected ? "scale-x-100 bg-gold-400" : "scale-x-0 bg-gold-500 group-hover:scale-x-50"
                )}
              />
            </button>
          );
        })}
      </div>

      {/* -------- Day note -------- */}
      {active?.note && (
        <p className="mt-8 flex flex-wrap items-center justify-center gap-2.5 text-center font-sans text-[10.5px] font-semibold uppercase tracking-[0.22em] text-gold-700">
          <CalendarDays className="h-3.5 w-3.5" />
          {active.note}
        </p>
      )}

      {/* -------- Timeline -------- */}
      <div
        key={active?.id}
        role="tabpanel"
        id={`schedule-panel-${active?.id}`}
        aria-labelledby={`schedule-tab-${active?.id}`}
        className="relative mt-10 sm:mt-14"
      >
        {/* Vertical gold spine on md+ */}
        <span
          aria-hidden
          className="absolute bottom-6 left-[104px] top-2 hidden w-px bg-gradient-to-b from-gold-500/60 via-gold-500/35 to-transparent md:block"
        />
        <ol className="space-y-4 sm:space-y-5">
          {active?.sessions.map((session, i) => {
            const sessionSpeakers = session.speakerIds
              .map((id) => speakerById.get(id))
              .filter((s): s is Speaker => Boolean(s));
            return (
              <li key={session.id}>
                <Reveal delay={Math.min(i * 60, 240)}>
                  <article
                    className={cn(
                      "group relative border bg-white p-5 shadow-card transition-all duration-300 hover:border-gold-600/40 hover:shadow-lift sm:p-6 md:pl-8",
                      "border-line rounded-xl md:ml-[132px] md:rounded-2xl"
                    )}
                  >
                    {/* Time block (mobile: inline row; md+: absolute left column) */}
                    <div className="flex flex-col gap-3 md:absolute md:right-full md:top-6 md:mr-8 md:w-[104px] md:items-end md:text-right md:gap-1.5">
                      <p className="font-serif text-[1.2rem] leading-none text-gold-800">
                        {formatTime(session.startTime)}
                      </p>
                      {session.endTime && (
                        <p className="flex items-center gap-1.5 font-sans text-[10.5px] uppercase tracking-[0.14em] text-ink-400 md:justify-end">
                          <Clock className="h-3 w-3 text-gold-600" />– {formatTime(session.endTime)}
                        </p>
                      )}
                      {session.track && (
                        <span className="inline-flex w-fit items-center rounded-full border border-gold-600/25 bg-gold-50 px-2.5 py-1 font-sans text-[9px] font-semibold uppercase tracking-[0.16em] text-gold-700 md:ml-auto">
                          {session.track}
                        </span>
                      )}
                    </div>

                    <div className="md:pl-2">
                      <h3 className="font-serif text-[1.3rem] leading-snug text-ink-900 transition-colors group-hover:text-gold-800 sm:text-[1.45rem]">
                        {session.title}
                      </h3>
                      {session.description && (
                        <p className="mt-2 max-w-2xl text-[13.5px] leading-[1.85] text-ink-500">
                          {session.description}
                        </p>
                      )}

                      {session.venue && (
                        <p className="mt-3.5 flex items-center gap-2 font-sans text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                          <MapPin className="h-3.5 w-3.5 text-gold-600" />
                          {session.venue}
                        </p>
                      )}

                      {sessionSpeakers.length > 0 && (
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                          <span className="flex items-center gap-1.5 font-sans text-[9.5px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                            <Users className="h-3.5 w-3.5 text-gold-600" />
                            On stage
                          </span>
                          {sessionSpeakers.map((s) => (
                            <Link
                              key={s.id}
                              href={`/speakers/${s.slug}`}
                              className="group/speaker inline-flex items-center gap-2 rounded-full border border-line bg-paper-100 py-1 pl-1 pr-3.5 transition-colors hover:border-gold-600/40 hover:bg-gold-50"
                            >
                              {s.photoURL ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={s.photoURL}
                                  alt={s.name}
                                  loading="lazy"
                                  className="h-6 w-6 rounded-full object-cover"
                                />
                              ) : (
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-700 font-serif text-[11px] text-white">
                                  {s.name.charAt(0)}
                                </span>
                              )}
                              <span className="font-sans text-[11px] font-semibold text-ink-700 transition-colors group-hover/speaker:text-gold-800">
                                {s.name}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
