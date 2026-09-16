# Owner Guide — `/hackeradmin`

The owner console is a **separate, owner-only control center** for infrastructure, security and
global settings. Knowing the URL grants nothing: every page is gated server-side to `role: owner`,
and every `/api/owner/*` route independently verifies the session + claim. Admins are rejected.

## First-time bootstrap

1. Register an account with your owner email (must be listed in `OWNER_EMAILS`).
2. Visit `/setup`, sign in, paste `SETUP_TOKEN` (server env var).
3. You are promoted to `owner` (custom claim + `users`/`admins` docs) and redirected here.
4. The setup API **permanently disables itself** once an owner exists.
5. Rotate `SETUP_TOKEN` in Vercel afterwards.
6. Escape hatch: `npx tsx scripts/set-owner.ts you@example.com` (needs Admin env vars).

To add more owners: **Users & Roles** → change a user's role to `owner` (requires typed CONFIRM).
To remove yourself: promote someone else first (last-owner protection).

## Overview (`/hackeradmin`)

- Live site status banner (online / maintenance / locked).
- Health cards: app, Firestore, Auth, Storage, SMTP, maintenance — statuses only, **no secrets**.
- Content inventory counts and quick links. Raw JSON at `/api/health`.

## Site Status (`/hackeradmin/status`)

- **Maintenance mode** (ONLINE ⇄ MAINTENANCE): public routes show a branded maintenance page;
  `/admin`, `/hackeradmin`, auth, health and the status API keep working. Stored in
  `siteSettings/maintenance`, effective within seconds (middleware checks a cached endpoint).
- **Emergency lock** (kill switch): incident control that overrides everything public. Requires
  typing `CONFIRM`. Both actions are audit-logged with actor + timestamp.
- Edit the maintenance page title/message/expected-return text.

## Firebase (`/hackeradmin/firebase`)

Safe connection details: project ID, auth domain, bucket (copyable), masked API key / App ID,
service-account presence indicator. **The private key is never displayed** — rotate it in the
Firebase console + Vercel env vars (instructions on the page).

## Site Settings (`/hackeradmin/settings`)

Global configuration stored in `siteSettings/public`, live within seconds:

- **General**: site name, tagline, logo, favicon, contact email/phone/address, timezone.
- **Homepage**: hero badge/title/subtitle/CTAs/image, event date (countdown) + venue, about
  title/body/image, stat blocks.
- **SEO**: default meta title/description/keywords, OG image, Twitter card.
- **Social**: profile URLs per network.
- **Appearance**: brand primary/secondary colors, theme default.

## Email / SMTP (`/hackeradmin/smtp`)

- Connection form (host/port/TLS/user/from/reply-to). The **password field is write-only**:
  accepted on save, never stored in the browser, never echoed back. Real credentials live in
  Vercel env vars (`SMTP_*`); this page records display metadata and verifies input.
- Masked status panel + last-test info.
- **Send test email** (rate-limited) to verify deliverability.

## Users & Roles (`/hackeradmin/users`)

- Paginated user list from Firebase Auth with role selector (`user`/`admin`/`owner`),
  active/disabled status, verification badge, last sign-in.
- Role changes set the custom claim, mirror `users`/`admins` docs, and **revoke sessions**
  so the new role applies immediately. Owner grants require typed CONFIRM.
- Disable/enable accounts (cannot disable yourself; cannot demote the last owner).

## Audit Logs (`/hackeradmin/audit-logs`)

Append-only record: logins, role changes, content/media mutations, settings/SMTP/maintenance
changes. Each entry stores actor, action, resource, result, metadata (secrets redacted), IP and
timestamp. Filter by action; click a row for full metadata JSON.

## Maintenance mode — how it works

1. Owner toggles in **Site Status** → `siteSettings/maintenance` updated (audit-logged).
2. Middleware fetches `/api/maintenance/status` (20s cache) for public routes and rewrites to
   `/maintenance` when enabled or locked.
3. Admin/owner/auth/health/API-form routes are exempt so operations continue.
4. Emergency override: set server env `MAINTENANCE_MODE=true` if Firestore is unreachable.
