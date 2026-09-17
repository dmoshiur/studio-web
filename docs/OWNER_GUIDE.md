# Owner Guide — `/hackeradmin`

The operations console is a **separate, highly protected control center** for infrastructure,
security and global settings. It is NOT opened by a password login — it is gated by a
**rotating passcode**:

- Every hour a cryptographically random passcode is generated and emailed **exclusively** to the
  security recipient (`mdmoshiurrahmanmohi1@gmail.com`, hard-coded in `lib/server/passcode.ts`).
- Only a salted scrypt **hash** is stored (in the shared database, so restarts and multiple
  instances agree). The passcode never appears in logs, URLs or API responses.
- Entry attempts are rate-limited per IP and globally locked after 5 failures (15 minutes).
- A successful entry issues a signed httpOnly session cookie (`__ha_session`, 2h, sliding) that
  is revoked whenever a manual rotation or custom passphrase is set.
- If email delivery fails, rotation is **blocked** and the previous passcode stays active —
  an undelivered code never becomes the active one. Without SMTP configured the console
  cannot be entered (by design).

**Passcode & Access** (`/hackeradmin/passcode`) lets you: rotate immediately, pause automatic
rotation by setting a custom passphrase, or resume hourly rotation. All of these require
re-entering the current passcode and are audit-logged.

## Roles & the studio

Regular user accounts (`/login`) still power the content studio (`/admin`, role `admin`+).
The master administrator from `ADMIN_EMAIL`/`ADMIN_PASSWORD` is seeded into the database on
first boot (hashed, idempotent) and keeps the `superadmin` role for studio access. To add more
admins use **Users & Roles** in this console (or the studio's Accounts page for owners).

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
