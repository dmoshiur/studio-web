import type { OwnerProfile } from "@/types";

/**
 * Owner spotlight defaults — shared by the server (settings store, seed)
 * and the studio (form defaults). Client-safe: no server-only imports.
 */
export const DEFAULT_OWNER_PROFILE: OwnerProfile = {
  enabled: true,
  showOnHome: true,
  showOnAbout: true,
  script: "A word from",
  eyebrow: "From The Owner",
  title: "The person behind the stage",
  name: "Your Name",
  role: "Founder & Owner",
  photoUrl: "",
  photoAlt: "",
  bio: "I started ManUp because the rooms I remembered most were the small ones — the ones where you actually got to finish a thought with someone. That standard has not moved: every speaker earns the stage, and every guest leaves with something they can act on.\n\nIf you are new here, come say hello. The door is open.",
  quote: "If an idea cannot be used within a week of leaving the room, it does not belong on the stage.",
  signatureUrl: "",
  videoUrl: "",
  email: "",
  phone: "",
  ctaLabel: "Get in touch",
  ctaHref: "/contact",
  socials: [],
};

/** An owner profile with every optional field present — handy for forms. */
export const EMPTY_OWNER_PROFILE: OwnerProfile = {
  ...DEFAULT_OWNER_PROFILE,
  name: "",
  role: "",
  photoUrl: "",
  photoAlt: "",
  bio: "",
  quote: "",
  signatureUrl: "",
  videoUrl: "",
  ctaLabel: "",
  ctaHref: "",
  socials: [],
};

/** Fill in anything an older/partial document may be missing. */
export function normaliseOwnerProfile(owner: Partial<OwnerProfile> | undefined): OwnerProfile {
  return { ...DEFAULT_OWNER_PROFILE, ...(owner ?? {}) };
}
