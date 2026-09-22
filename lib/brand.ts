/**
 * Brand normalizer — shared by server and client code.
 *
 * The product's brand name is **"Photography"**. Deployed databases and
 * environment variables may still carry earlier identity strings
 * ("ManUp", "AM IT Solution(s) Limited", …). Every surface that displays a
 * brand string (titles, metadata, mail, settings) runs values through
 * `normalizeBrandString` so the visible company name is consistent
 * everywhere — without touching generic uses of ordinary words (e.g. the
 * word "photography" describing the craft).
 */

export const BRAND_NAME = "Photography";

/** Known legacy brand identities that must never be displayed. */
const LEGACY_BRAND_PATTERNS: RegExp[] = [
  // Long forms first so they win over the bare logo form below:
  // "AM IT Solutions Limited", "AM IT Solution", "amit-solutions", …
  /\bam[\s.\-_]?it[\s.\-_]?solutions?(?:[\s.\-_]?(?:ltd|limited|llc|inc|bd))?\b/gi,
  // Bare logo form: "AM IT" (all-caps usage only — never ordinary prose).
  /\bAM IT\b/g,
  // "ManUp", "Man-Up", "manup"
  /\bman[\s.\-_]?up\b/gi,
];

/** Legacy web/e-mail domains built on the old brand names. */
const LEGACY_DOMAIN_PATTERNS: RegExp[] = [
  // "amitsolutions.com", "am-it-solutions.co.bd", …
  /\bam[\s.\-_]?it[\s.\-_]?solutions?\.(?:com|net|org|io|studio|co\.bd|co|bd|dev|app|tech)\b/gi,
  // "am-it.studio", "am it.com" (separator form — never e.g. "amit.com")
  /\bam[\s.\-_]it\.(?:com|net|org|io|studio|co\.bd|co|bd|dev|app|tech)\b/gi,
  // "manup.studio", "manup.com", …
  /\bman[\s.\-_]?up\.(?:com|net|org|io|studio|co\.bd|co|bd|dev|app|tech)\b/gi,
];

export const BRAND_DOMAIN = "photography.studio";

function isLegacyBrandString(value: string): boolean {
  const anyMatch = (res: RegExp[]) =>
    res.some((re) => {
      re.lastIndex = 0;
      return re.test(value);
    });
  return anyMatch(LEGACY_DOMAIN_PATTERNS) || anyMatch(LEGACY_BRAND_PATTERNS);
}

/** True when the value contains any legacy brand identity. */
export function containsLegacyBrand(value: unknown): boolean {
  return typeof value === "string" && isLegacyBrandString(value);
}

/**
 * Replace legacy brand identities with the current brand name.
 * Generic vocabulary is untouched — only the exact legacy brand tokens
 * listed above are rewritten. Legacy domains (e.g. an old company email
 * domain) map to the current brand domain.
 */
export function normalizeBrandString(value: string): string {
  let out = value;
  for (const re of LEGACY_DOMAIN_PATTERNS) {
    re.lastIndex = 0;
    out = out.replace(re, BRAND_DOMAIN);
  }
  for (const re of LEGACY_BRAND_PATTERNS) {
    re.lastIndex = 0;
    out = out.replace(re, (match) => {
      // Preserve lowercase forms (e.g. "manup team" → "photography team").
      if (match === match.toLowerCase()) return BRAND_NAME.toLowerCase();
      // ALL-CAPS or Title forms become the canonical brand.
      return BRAND_NAME;
    });
  }
  return out;
}

/**
 * Normalize a settings/site name. Anything carrying a legacy identity
 * becomes the canonical brand; genuinely custom names are respected.
 */
export function normalizeSiteName(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return BRAND_NAME;
  const normalized = normalizeBrandString(value).trim();
  return normalized || BRAND_NAME;
}

/** Deep-normalize every string in a JSON-ish structure. */
export function normalizeBrandDeep<T>(value: T): T {
  if (typeof value === "string") return normalizeBrandString(value) as unknown as T;
  if (Array.isArray(value)) return value.map((item) => normalizeBrandDeep(item)) as unknown as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = normalizeBrandDeep(v);
    }
    return out as unknown as T;
  }
  return value;
}
