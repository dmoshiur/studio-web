# Security Model & Production Checklist

## Architecture principles

1. **Authentication ≠ authorization.** Firebase Auth proves identity; **custom claims**
   (`role: user|admin|owner`) grant power. Claims are set server-side only (setup API, owner API,
   scripts) — never from the browser.
2. **Server-side enforcement everywhere.** `/admin` and `/hackeradmin` layouts verify the session
   cookie with the Admin SDK; every `/api/admin/*` and `/api/owner/*` route re-verifies
   independently. Middleware does coarse gating only (maintenance rewrite, login redirect).
3. **Secrets stay server-side.** `FIREBASE_PRIVATE_KEY`, `SMTP_PASSWORD`, `SETUP_TOKEN` live in
   server env vars. No `NEXT_PUBLIC_` secret exists. The Admin SDK is imported only through
   `lib/firebase/admin.ts` guarded by `server-only` (client import = build error).
4. **Least privilege data access.** Firestore/Storage rules default-deny; public reads are limited
   to published docs; sensitive settings are server-only; audit logs are owner-read/append-only.
5. **Defense in depth.** Zod validation on client AND server, HTML sanitization, honeypot +
   rate limits on public forms, security headers + CSP, httpOnly session cookies, audit logging.

## Controls inventory

| Area | Control |
|------|---------|
| Sessions | Firebase session cookies, httpOnly + Secure + SameSite=Lax, 5-day default |
| Roles | Custom claims; mirrored `users`/`admins` docs; session revocation on change |
| Owner bootstrap | Allowlisted email + `SETUP_TOKEN`; self-disables after first owner |
| Rate limiting | Firestore-backed buckets (memory fallback): auth, contact, newsletter, upload, SMTP test, setup |
| Input validation | Zod schemas shared client/server; rich text sanitized (allowlist tags/schemes) |
| Uploads | Admin-only API; folder allowlist; MIME + size checks; private docs stay private |
| Secrets in UI | Masked (`••••`); SMTP password write-only; private key never rendered/logged |
| Audit | Actor/action/resource/result/metadata/IP/timestamp; secrets redacted |
| Headers | CSP (Firebase-compatible), X-Frame-Options SAMEORIGIN, nosniff, Referrer-Policy, Permissions-Policy |
| Maintenance | Firestore flag + env override; exempt routes for ops; kill switch with CONFIRM |

## Production checklist

- [ ] Real secrets in Vercel env (Production), none in git; `.env.local` gitignored
- [ ] `SETUP_TOKEN` is long/random; rotated after bootstrap
- [ ] Firebase authorized domains include production domain(s) only (+ localhost for dev)
- [ ] `firestore.rules` + `storage.rules` + indexes deployed (not simulator/test mode)
- [ ] Owner claimed via `/setup`; test admin promotion + demotion; verify `/forbidden` for non-owners
- [ ] `/api/health` green in production; uptime monitor pointed at it
- [ ] Contact form delivers email; newsletter subscribe/unsubscribe work
- [ ] Maintenance mode + emergency lock tested (public blocked, admin/owner open)
- [ ] SMTP test email received; `SMTP_FROM_EMAIL` uses a domain you control (SPF/DKIM set)
- [ ] Sitemap/robots live; OG tags verified on a post + event page
- [ ] Firestore scheduled exports enabled; Storage versioning/lifecycle reviewed
- [ ] (Recommended) Firebase App Check enforcement for Auth/Firestore/Storage
- [ ] (Recommended) Uptime + error alerting (Vercel + Firebase Alerts)

## Incident response (quick)

1. Engage **emergency lock** in `/hackeradmin/status` if the public site is being abused.
2. Disable the abusive account in **Users & Roles** (revokes sessions immediately).
3. Review **Audit Logs** for the blast radius; rotate SMTP key / service-account key if leaked.
4. Release the lock, verify `/api/health`, post-mortem the logs.
