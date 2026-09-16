# ManUp Platform v2

A premium, fully dynamic, serverless event/conference platform — rebuilt from the classic
[ManUp template](https://github.com/themewagon/manup) (Colorlib, CC BY 3.0 — attribution retained in the footer)
into a production-ready **Next.js + Firebase + Vercel** application with a secure admin studio and a
separate owner control center.

## Highlights

- **Modern public site** — home, about, events/schedule, speakers, blog, contact, privacy; mobile-first,
  accessible, SEO-ready (metadata, OG/Twitter cards, sitemap, robots, JSON-LD).
- **Firestore-driven CMS** — posts, events, speakers, categories, pages, navigation, social links, site settings.
- **Admin studio (`/admin`)** — SaaS-grade dashboard: content, media library (Firebase Storage uploads),
  messages, subscribers, navigation, profile.
- **Owner console (`/hackeradmin`)** — infrastructure control: system health, Firebase status (secrets masked),
  site settings, SMTP, users & roles, audit logs, maintenance mode, emergency kill switch.
- **Security-first** — Firebase Auth sessions (httpOnly cookies), custom-claim roles (`user`/`admin`/`owner`),
  server-side authorization on every privileged route, strict Firestore/Storage rules (default deny),
  Zod validation client + server, sanitized rich text, Firestore-backed rate limiting, security headers, CSP.
- **Serverless** — no traditional backend; Next.js route handlers + Firebase Admin SDK (server-only) on Vercel.

## Tech stack

Next.js 14 (App Router) · TypeScript (strict) · React 18 · Tailwind CSS · Firebase Auth / Firestore /
Storage · Firebase Admin SDK (server-only) · Zod + React Hook Form · Nodemailer (SMTP) · Lucide icons

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Firebase + SMTP values
npm run dev                  # http://localhost:3000
```

The app renders with safe defaults even before Firebase is configured (dynamic sections appear once
connected). Full setup: **[docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)**, then
**[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for Vercel.

```bash
npm run build        # production build (must pass before deploy)
npm run typecheck    # tsc --noEmit
npx tsx scripts/seed.ts       # starter content (needs Admin env vars)
npx tsx scripts/set-owner.ts you@example.com   # owner escape hatch
```

## Project structure

```
app/
  (public)/            # home, about, events, speakers, blog, contact, privacy, unsubscribe
  (auth)/              # login, register, forgot-password, setup (owner bootstrap)
  admin/               # admin studio (server-gated: admin/owner)
  hackeradmin/         # owner console (server-gated: owner only)
  api/
    auth/ contact/ newsletter/ health/ maintenance/ setup/
    public/            # cached public feeds (published content only)
    admin/             # content/media/messages/navigation CRUD (requireAdmin)
    owner/             # settings/smtp/users/audit/maintenance (requireOwner)
  maintenance/ forbidden/ unauthorized/  # system pages
  sitemap.ts robots.ts
components/
  ui/                  # design-system primitives (button, dialog, toast, table…)
  public/              # header, footer, hero helpers, cards, forms
  admin/               # shell, rich editor, media picker, content forms
  hackeradmin/         # owner shell + health UI
lib/
  firebase/  client.ts (public SDK) · admin.ts (server-only Admin SDK)
  firestore/ content.ts · engagement.ts · settings.ts   # data-access layer
  server/    auth.ts · api-helpers.ts · rate-limit.ts · audit.ts
  security/  sanitize.ts
  validation/ schemas.ts      # Zod schemas shared by client + server
  email/     mailer.ts        # server-only SMTP
  utils.ts
types/  hooks/  scripts/  docs/
firestore.rules  storage.rules  firestore.indexes.json  firebase.json
middleware.ts    # maintenance rewrite + coarse auth gating (real auth is server-side)
```

## Roles & access

| Role | Capabilities |
|------|--------------|
| `user` | Public site, account |
| `admin` | Everything in `/admin`: content, media, messages, subscribers, navigation |
| `owner` | Admin + `/hackeradmin`: settings, SMTP, users/roles, audit, maintenance, kill switch |

Roles are Firebase Auth **custom claims** set server-side only. First owner: sign up, then visit
`/setup` with the `SETUP_TOKEN` (allowlisted `OWNER_EMAILS`) — the endpoint self-disables afterwards.
Details: [docs/OWNER_GUIDE.md](docs/OWNER_GUIDE.md).

## Environment variables

See [`.env.example`](.env.example). Rule: anything starting with `NEXT_PUBLIC_` is browser-visible —
**never** put `FIREBASE_PRIVATE_KEY`, `SMTP_PASSWORD`, `SETUP_TOKEN` or any secret behind that prefix.

## Documentation

- [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) — Firebase project, Auth, Firestore, Storage, rules, indexes
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Vercel deployment, env vars, domain, verification
- [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) — `/admin` manual
- [docs/OWNER_GUIDE.md](docs/OWNER_GUIDE.md) — `/hackeradmin` manual + bootstrap + maintenance
- [docs/SECURITY.md](docs/SECURITY.md) — threat model, controls, production checklist

## License & attribution

Application code in this repository is provided for this project. The visual design is adapted from the
**Colorlib "Manup" template** ([CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)), which requires
attribution — a credit link is retained in the site footer. Do not remove it unless you hold an appropriate
Colorlib license.
