import Link from "next/link";
import { ArrowUpRight, Mail, Phone, Play } from "lucide-react";
import { Reveal } from "@/components/public/reveal";
import { GoldRule, Section, SectionHeading, TextLink } from "@/components/public/ui-kit";
import type { OwnerProfile } from "@/types";

/**
 * Owner spotlight — portrait, name and a personal message.
 * Every word, image and link comes from the owner section in the studio
 * (Studio → Owner Section) or the owner console's Homepage tab.
 */
export function OwnerSpotlight({
  owner,
  placement,
}: {
  owner: OwnerProfile | undefined;
  placement: "home" | "about";
}) {
  if (!owner?.enabled) return null;
  if (placement === "home" && !owner.showOnHome) return null;
  if (placement === "about" && !owner.showOnAbout) return null;
  if (!owner.name && !owner.photoUrl && !owner.bio) return null;

  const photo = owner.photoUrl ?? "";
  const hasPhoto = photo.length > 0;
  const initials = (owner.name || "Owner")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  const paragraphs = (owner.bio ?? "").split("\n\n").filter((p) => p.trim().length > 0);
  const socials = (owner.socials ?? []).filter((s) => s.label && s.url);

  return (
    <Section className="relative isolate overflow-hidden bg-obsidian-soft" id="owner">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-24 top-10 hidden h-72 w-72 rounded-full bg-gold-500/[0.07] blur-3xl lg:block"
      />

      <div className="relative grid items-center gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        {/* Portrait */}
        <Reveal className="relative mx-auto w-full max-w-md lg:mx-0">
          <div className="relative overflow-hidden rounded-sm border border-white/[0.08] bg-obsidian-950">
            {hasPhoto ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt={owner.photoAlt || `${owner.name} — ${owner.role ?? "owner"}`}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover"
                />
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-obsidian-950/90 to-transparent"
                />
              </>
            ) : (
              /* No photo yet — an engraved monogram instead of a stock face */
              <div className="relative flex aspect-[4/5] w-full flex-col items-center justify-center gap-6 bg-grain px-8 text-center">
                <span className="font-serif text-[4.5rem] leading-none text-gold-400">{initials || "AM"}</span>
                <span className="h-px w-16 bg-gold-500/50" />
                <span className="font-sans text-[10px] uppercase tracking-[0.28em] text-ivory-400/80">
                  Upload a portrait in the studio
                </span>
              </div>
            )}
            <span aria-hidden className="absolute inset-4 border border-gold-500/25" />
          </div>

          {owner.signatureUrl && (
            <div className="mt-6 border border-gold-500/20 bg-obsidian-950/60 p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={owner.signatureUrl} alt={`${owner.name} signature`} className="h-12 w-auto opacity-90" />
            </div>
          )}
        </Reveal>

        {/* Message */}
        <div>
          <SectionHeading
            align="left"
            script={owner.script || undefined}
            eyebrow={owner.eyebrow || undefined}
            title={owner.title || "The person behind the stage"}
          />

          <Reveal className="mt-9" delay={80}>
            <p className="font-serif text-[1.9rem] leading-tight text-ivory-50 sm:text-[2.2rem]">{owner.name}</p>
            {owner.role && (
              <p className="mt-3 font-sans text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-400">
                {owner.role}
              </p>
            )}
            {owner.photoUrl && (
              <span className="mt-6 block h-px w-24 bg-gradient-to-r from-gold-500/70 to-transparent" />
            )}
          </Reveal>

          {paragraphs.length > 0 && (
            <Reveal className="mt-7 space-y-5" delay={140}>
              {paragraphs.map((para, i) => (
                <p key={i} className="lead">
                  {para}
                </p>
              ))}
            </Reveal>
          )}

          {owner.quote && (
            <Reveal className="relative mt-9 border-l-2 border-gold-500/50 pl-6" delay={180}>
              <span aria-hidden className="calligraphic absolute -top-6 left-3 text-[3.6rem] leading-none text-gold-500/25">
                &ldquo;
              </span>
              <p className="relative font-serif text-[1.3rem] italic leading-[1.7] text-ivory-100">{owner.quote}</p>
            </Reveal>
          )}

          <Reveal className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5" delay={220}>
            {owner.ctaLabel && owner.ctaHref && (
              <Link
                href={owner.ctaHref}
                className="group inline-flex h-[50px] items-center gap-3 bg-gold-gradient px-7 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-obsidian-950 transition-all hover:brightness-[1.06]"
              >
                {owner.ctaLabel}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            )}

            <span className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[12.5px] text-ivory-400/85">
              {owner.email && (
                <a href={`mailto:${owner.email}`} className="inline-flex items-center gap-2 transition-colors hover:text-gold-300">
                  <Mail className="h-4 w-4 text-gold-500" />
                  {owner.email}
                </a>
              )}
              {owner.phone && (
                <a
                  href={`tel:${owner.phone.replace(/\s+/g, "")}`}
                  className="inline-flex items-center gap-2 transition-colors hover:text-gold-300"
                >
                  <Phone className="h-4 w-4 text-gold-500" />
                  {owner.phone}
                </a>
              )}
            </span>
          </Reveal>

          {socials.length > 0 && (
            <Reveal className="mt-8 flex flex-wrap gap-x-7 gap-y-3" delay={260}>
              {socials.map((social) => (
                <TextLink key={`${social.label}-${social.url}`} href={social.url} external className="group">
                  {social.label}
                </TextLink>
              ))}
            </Reveal>
          )}

          {owner.videoUrl && (
            <Reveal className="mt-11" delay={300}>
              <div className="mb-4 flex items-center gap-2.5 font-sans text-[10.5px] uppercase tracking-[0.24em] text-gold-400">
                <Play className="h-3.5 w-3.5" />
                A personal message
              </div>
              <div className="overflow-hidden rounded-sm border border-white/[0.08] bg-obsidian-950">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  src={owner.videoUrl}
                  poster={owner.photoUrl || undefined}
                  controls
                  preload="metadata"
                  className="aspect-video w-full bg-black"
                />
              </div>
            </Reveal>
          )}

          {!owner.quote && !owner.ctaLabel && (
            <Reveal className="mt-10" delay={200}>
              <GoldRule className="!mx-0 !max-w-[220px]" />
            </Reveal>
          )}
        </div>
      </div>

    </Section>
  );
}
