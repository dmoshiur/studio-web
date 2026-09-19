"use client";

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Speaker } from "@/types";

/**
 * Speaker grid — ManUp-style feature structure:
 *  - photo card with a hover overlay that reveals the social links
 *  - speaker name + topic under the portrait
 *  - clicking a card opens a detail modal (bio, topic, socials, link to the
 *    full profile page); focus is trapped and Escape closes it.
 */

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function SpeakerModal({ speaker, onClose }: { speaker: Speaker; onClose: () => void }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-obsidian-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${speaker.name} — details`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-line bg-white shadow-luxe sm:rounded-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/95 text-ink-900 shadow-card transition-colors hover:border-gold-600/50 hover:text-gold-800"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid sm:grid-cols-[240px_1fr]">
          {/* Portrait */}
          <div className="relative min-h-[220px] overflow-hidden border-b border-line sm:border-b-0 sm:border-r">
            {speaker.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={speaker.photoURL}
                alt={speaker.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[220px] items-center justify-center bg-paper-200">
                <span className="font-serif text-[4rem] text-gold-600/60">{initials(speaker.name)}</span>
              </div>
            )}
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-gold-700 via-gold-500 to-gold-300"
            />
          </div>

          {/* Details */}
          <div className="p-6 sm:p-9">
            {(speaker.title || speaker.company) && (
              <p className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.22em] text-gold-700">
                {[speaker.title, speaker.company].filter(Boolean).join(" · ")}
              </p>
            )}
            <h3 className="mt-3 font-serif text-[2rem] leading-tight text-ink-900">{speaker.name}</h3>
            {speaker.topic && (
              <p className="mt-3 inline-flex items-center gap-2.5 rounded-full border border-gold-600/25 bg-gold-50 px-4 py-2 font-sans text-[11px] font-semibold text-gold-800">
                <span aria-hidden className="h-1 w-6 rounded-full bg-gold-600" />
                {speaker.topic}
              </p>
            )}
            <div className="mt-5 space-y-4">
              {(speaker.bio ?? "").split("\n\n").map((para, i) => (
                <p key={i} className="text-[14px] leading-[1.9] text-ink-500">
                  {para}
                </p>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-line pt-6">
              {speaker.socials?.map((s) => (
                <a
                  key={s.url + s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-700 transition-colors hover:border-gold-600/50 hover:text-gold-800"
                >
                  {s.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
              <Link
                href={`/speakers/${speaker.slug}`}
                className="inline-flex items-center gap-2 rounded-full bg-gold-700 px-5 py-2.5 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-gold-sm transition-all hover:-translate-y-0.5 hover:shadow-gold"
              >
                Full profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SpeakerGrid({ speakers, className }: { speakers: Speaker[]; className?: string }) {
  const [selected, setSelected] = React.useState<Speaker | null>(null);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <>
      <div
        className={cn(
          "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
          className
        )}
      >
        {speakers.map((speaker) => (
          <button
            key={speaker.id}
            type="button"
            onClick={() => setSelected(speaker)}
            aria-haspopup="dialog"
            className="group block w-full cursor-pointer text-left"
          >
            <div className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-all duration-500 hover:-translate-y-1 hover:border-gold-600/30 hover:shadow-lift">
              {speaker.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={speaker.photoURL}
                  alt={speaker.name}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover grayscale-[35%] transition-all duration-700 group-hover:scale-[1.04] group-hover:grayscale-0"
                />
              ) : (
                <div className="flex aspect-[4/5] w-full items-center justify-center bg-paper-200">
                  <span className="font-serif text-[5rem] text-gold-600/60">{initials(speaker.name)}</span>
                </div>
              )}

              {/* Gradient scrim */}
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-obsidian-950/95 via-obsidian-950/30 to-transparent"
              />
              {/* Gold inner frame on hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-3 rounded-xl border border-gold-400/0 transition-colors duration-500 group-hover:border-gold-400/50"
              />

              {/* Social links — revealed on hover (desktop) / always tappable region on touch */}
              {speaker.socials && speaker.socials.length > 0 && (
                <div className="absolute inset-x-0 top-0 flex justify-center gap-2 p-4 opacity-0 transition-all duration-400 group-hover:opacity-100 group-focus-within:opacity-100 max-lg:opacity-100">
                  {speaker.socials.map((s) => (
                    <a
                      key={s.url + s.label}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`${speaker.name} on ${s.label}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-obsidian-950/60 font-sans text-[8.5px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm transition-colors hover:border-gold-400/70 hover:bg-gold-700 hover:text-white"
                    >
                      {s.label.slice(0, 2)}
                    </a>
                  ))}
                </div>
              )}

              {/* Name + topic */}
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <h3 className="font-serif text-[1.35rem] leading-tight text-ivory-50">{speaker.name}</h3>
                {speaker.topic ? (
                  <p className="mt-2 line-clamp-2 font-sans text-[10px] uppercase tracking-[0.18em] text-gold-300">
                    {speaker.topic}
                  </p>
                ) : (
                  (speaker.title || speaker.company) && (
                    <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.18em] text-gold-300">
                      {[speaker.title, speaker.company].filter(Boolean).join(" · ")}
                    </p>
                  )
                )}
              </div>

              {/* Bottom gold bar */}
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-gold-700 via-gold-500 to-gold-300 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            </div>
          </button>
        ))}
      </div>

      {mounted && selected && createPortal(<SpeakerModal speaker={selected} onClose={() => setSelected(null)} />, document.body)}
    </>
  );
}
