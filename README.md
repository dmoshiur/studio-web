# ManUp Platform v2

A premium, fully dynamic event & publication platform — rebuilt from the classic
[ManUp template](https://github.com/themewagon/manup) (Colorlib, CC BY 3.0 — attribution retained in the footer)
into a production-ready **Next.js 14** application with an editorial public site, a content studio and a
separate owner control center.

It runs **with zero external services**: an embedded SQLite data layer, on-disk media storage, local
identity (email + password) and an administrator defined entirely by environment variables. Point it at
Firebase instead by supplying credentials — the same code paths serve both backends.

Uploads can be served by **Cloudinary** (recommended — images, video, audio and documents, signed
browser-direct uploads, CDN delivery), Firebase Storage, or the embedded disk. Set `CLOUDINARY_*`
and the studio switches over automatically.

---

## Design language — “Maison Lumière”

- **Warm paper & ink** — off-white surfaces (`#fafaf8`, `#f5f5f1`, `#ffffff`) with near-black ink (`#111111`),
  muted gray secondary text (`#6b6b6b`), hairline borders (`#e8e8e5`) and a restrained champagne-gold accent.
- **Dark endings** — the footer (and the internal studio/owner consoles) stay obsidian so the mostly-white
  site closes on a strong, high-contrast note.
- **Calligraphic display type** — Cormorant Garamond for headlines, *Great Vibes* for the script accents
  (“the door is open”, “join the circle”), Inter for UI text.
- **Editorial imagery** — full-bleed photographic backdrops ghosted through warm paper scrims on light
  sections, gold frames and grain textures; obsidian overlays remain on imagery and in the footer.
- **Motion** — reveal-on-scroll, marquee, count-up and gold-line animations, all respecting `prefers-reduced-motion`.
- Every surface is themed: public site, auth screens, error/utility pages and member profiles are light;
  the studio (`/admin`) and the owner console (`/hackeradmin`) remain intentionally dark,
  down to tables, dialogs, toasts, skeletons and empty states.

## Highlights

- **Public site** — home, about, events + detail, speakers + detail, journal (`/blog`) + post, contact, privacy,
  unsubscribe; SEO-ready (metadata, OG/Twitter, sitemap, robots, JSON-LD, **RSS at `/feed.xml`**).
- **Studio (`/admin`)** — dashboard, posts, events, speakers, categories, pages, media library (images,
  video, audio, documents), messages, subscribers, navigation & social links, **owner section**, accounts,
  profile. Role-gated to admin/owner/superadmin.
- **Owner section** — a portrait, a name, a personal message, a pull quote, an optional signature image
  and an optional video message, shown on the homepage and the about page. Every field (including the
  visibility per page) is editable from **Studio → Owner Section** and from the owner console.
- **Operations console (`/hackeradmin`)** — protected by a **rotating hourly passcode** emailed exclusively to the
  security recipient (never logged, never exposed; brute-force locked). Inside: live system status, runtime controls,
  a real live log terminal, passcode management, backend status (secrets masked), site settings, SMTP (+ test send),
  users & roles, audit logs, maintenance mode and the emergency lock.
- **User accounts & profiles** — self-registration, session persistence, real server-side logout, `/profile` dashboard
  with avatar upload (validated), password change and seat reservations.
- **Seat reservations** — database-backed requests from event pages, manageable in the studio and visible on the
  user's dashboard.
- **Master administrator from `.env`** — `ADMIN_EMAIL` / `ADMIN_PASSWORD` create an always-available
  `superadmin` with whole-platform access (content, users, roles, infrastructure). No database setup required.
- **Complete auth flows** — sign in, self-registration (`ALLOW_REGISTRATION`), password reset (link delivered
  by SMTP when configured), one-time owner bootstrap via `SETUP_TOKEN`.
- **Security-first** — signed httpOnly session cookies, scrypt-hashed credentials, roles
  `user` / `admin` / `owner` / `superadmin`, server-side authorization on every privileged route, Zod validation
  on both sides, rate limiting, security headers, CSP, and an audit log for privileged actions.

## Tech stack

Next.js 14 (App Router) · TypeScript (strict) · React 18 · Tailwind CSS · embedded SQLite (`node:sqlite`) **or**
Firestore · local credentials **or** Firebase Auth · **Cloudinary** / Firebase Storage / embedded disk ·
Zod + React Hook Form · Nodemailer (SMTP) · Lucide icons

## Quick start

```bash
npm install
cp .env.example .env.local        # set ADMIN_EMAIL / ADMIN_PASSWORD (quote any # or ! characters)
npm run dev                       # http://localhost:3000
```

That is the whole setup for the embedded mode: the store seeds itself with settings, navigation, socials,
categories, events, speakers, posts and pages on first boot.

Sign in at **`/login`** with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env.local` and you land in the owner
console with full access.

```bash
npm run typecheck    # tsc --noEmit
npm run build        # production build
npm run start        # serve the production build
npm run seed         # optional: re-run the content seed script
```

## Project layout

```
app/(public)/      editorial site — home, about, events, speakers, blog, contact, privacy, unsubscribe
app/(auth)/        login, register, forgot-password, one-time owner setup
app/admin/         content studio (admin · owner · superadmin)
app/hackeradmin/   owner console (owner · superadmin)
app/api/           route handlers: auth, admin, owner, public, media, newsletter, contact, setup, health
components/public/ shared editorial UI kit (heroes, sections, cards, reveal, forms)
components/ui/     design-system primitives (button, badge, input, card, table, dialog, feedback, toast)
lib/db/            embedded store + seed;  lib/server/ session, identity, auth, audit, rate limiting
lib/firestore/     content & settings repositories (backend-agnostic)
lib/storage/       media facade + Cloudinary client (signed uploads, deletes, transforms)
docs/              admin, owner, deployment, Firebase and security guides
```

## Media storage — Cloudinary

Add three values (locally in `.env.local`, in production in your host's environment) and every
upload — cover images, videos, audio, documents, avatars, the owner portrait — goes to Cloudinary:

```bash
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=…
CLOUDINARY_API_SECRET=…
CLOUDINARY_FOLDER=manup        # optional root folder
# or the single-variable form:
# CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
```

- Browsers upload **directly to Cloudinary** with a short-lived server signature
  (`/api/admin/media/sign` → Cloudinary → `/api/admin/media/record`), so large video uploads are not
  capped by serverless request-body limits. Allowed formats, size ceiling and target folder are
  signed in, and the asset is re-verified through the Cloudinary Admin API before it is filed.
- The API secret stays server-side; the browser never sees it.
- Deleting a file in the studio destroys the Cloudinary asset (CDN purge included).
- Fallbacks: Firebase Storage (when Firebase credentials exist) or the embedded
  `./data/uploads` directory — no configuration needed for local development.

## Documentation

- **[docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md)** — running the content studio + the owner section.
- **[docs/OWNER_GUIDE.md](docs/OWNER_GUIDE.md)** — infrastructure controls and the audit trail.
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — Vercel/hosted deployment and environment variables.
- **[docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)** — switching to Firebase Auth/Firestore/Storage.
- **[docs/SECURITY.md](docs/SECURITY.md)** — threat model, roles and hardening notes.

## Credits

Design inspiration: [ManUp](https://github.com/themewagon/manup) by Colorlib (CC BY 3.0). Photography and
generated artwork live in `public/images/`. Fonts: Cormorant Garamond, Inter and Great Vibes (Google Fonts).
