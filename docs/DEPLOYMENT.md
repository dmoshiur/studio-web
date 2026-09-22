# Vercel Deployment

## Prerequisites

- Completed [FIREBASE_SETUP.md](FIREBASE_SETUP.md) (project, Auth, Firestore, Storage, rules).
- SMTP credentials (any provider: Google Workspace, SendGrid, SES, Postmark…). The app only needs
  host/port/user/password + from address.

## 1. Import the project

1. Push this repo to GitHub.
2. Vercel → **Add New → Project** → import the repo.
3. Framework preset: **Next.js**. Root directory: repo root. Build command: `npm run build`.

## 2. Environment variables (Vercel → Settings → Environment Variables)

Set for **Production** (and Preview if you want staging to work fully):

**Public (browser-visible):**
```
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=Photography
NEXT_PUBLIC_FIREBASE_API_KEY=…
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=…
NEXT_PUBLIC_FIREBASE_PROJECT_ID=…
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=…
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=…
NEXT_PUBLIC_FIREBASE_APP_ID=…
```

**Media storage — Cloudinary (recommended):**
```
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=…
CLOUDINARY_API_SECRET=…
CLOUDINARY_FOLDER=photography
# optional: CLOUDINARY_URL=cloudinary://key:secret@cloud
# optional: CLOUDINARY_UPLOAD_PRESET=<signed preset>
# optional: MAX_IMAGE_MB=10, MAX_VIDEO_MB=100, STORAGE_BACKEND=auto
```
With these set, the studio uploads images, video, audio and documents straight to Cloudinary
(signed, browser-direct) and the site serves them from Cloudinary's CDN — no server disk and no
serverless body-size limits. Without them the app falls back to Firebase Storage, then to the
embedded `./data/uploads` directory.

**Server-only (never NEXT_PUBLIC_):**
```
FIREBASE_PROJECT_ID=…
FIREBASE_CLIENT_EMAIL=…
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----\n"
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD="<strong initial password — quoted if it contains # or !>"
ADMIN_NAME=Master Admin
CONTACT_EMAIL=hello@photography.studio
OWNER_EMAILS=you@example.com
SETUP_TOKEN=<long random string>
SMTP_HOST=…
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=…
SMTP_PASSWORD=…
SMTP_FROM_EMAIL=no-reply@your-domain.com
SMTP_FROM_NAME=Photography
SMTP_REPLY_TO=
SESSION_COOKIE_NAME=__session
SESSION_MAX_AGE_DAYS=5
SESSION_SECRET=<openssl rand -hex 32>
```

Generate the setup token: `openssl rand -hex 32`.

`SESSION_SECRET` signs the session cookies. **Set it explicitly in production** so every
serverless instance signs and verifies with the same key (otherwise sessions can fail at random
after a cold start). Note: paste `ADMIN_PASSWORD` **without** surrounding quotes into the Vercel
UI (quotes from `.env` samples are treated literally there) — the app strips a matched pair
defensively either way. The env password is only the *initial* credential: the account is seeded
into the database on first boot and afterwards login/reset use that same database record.

## 2b. Deploy the Firestore indexes (required)

```
firebase deploy --only firestore:indexes
```

Public feeds (`/api/public/events`, `/api/public/posts`, the events/blog/speaker pages) use
composite queries (`where` + `orderBy`). Without the indexes in `firestore.indexes.json` deployed
to the project, Firestore rejects those queries (the app now falls back to an in-memory scan so
the site keeps working, but deploying the indexes is the proper fix).

## 3. Deploy

1. **Deploy**. The build runs `tsc` + ESLint — it must pass.
2. Add your domain: Vercel → **Settings → Domains** → add + configure DNS.
3. Add the domain to Firebase **Authentication → Settings → Authorized domains**.
4. Update `NEXT_PUBLIC_APP_URL` to the final domain and redeploy.

## 4. Post-deploy verification

1. `/api/health` → `status: operational`, email `configured`, `backend: firebase`.
2. Sign in at `/login` with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` account → lands on `/admin`;
   refresh the page → still signed in; **Logout** → `/admin` redirects to `/login`.
3. **Forgot password**: request a reset for the admin email → link arrives → set a new password →
   sign in with the new password immediately (the old one must stop working).
4. Register owner account → `/setup` → claim ownership.
5. `/hackeradmin` → all green; `/admin` → dashboard loads.
6. Create a test post/event/speaker → visible on the public site.
7. Submit the contact form → message in `/admin/messages` + notification email arrives.
8. Subscribe to the newsletter → subscriber row appears.
9. Upload an image in Media → renders on the site.
10. Toggle **maintenance mode** → public shows maintenance page; `/admin` + `/hackeradmin` work.
11. Release maintenance; test **emergency lock** the same way (needs typed CONFIRM).
12. `/sitemap.xml` + `/robots.txt` load; check a blog post's OG tags — every `<title>` must show
    `… · Photography`, never a legacy brand name.

## 5. Ongoing operations

- **Content**: all via `/admin` — no redeploys needed.
- **Settings/homepage/maintenance**: via `/hackeradmin` — effective in seconds.
- **Credential rotation**: update Vercel env → redeploy. Rotate `SETUP_TOKEN` after bootstrap.
- **Firebase rules**: edit `firestore.rules` / `storage.rules` → `firebase deploy --only firestore:rules,storage`.
- **Cloudinary**: assets live under `$CLOUDINARY_FOLDER` in your account; delete a file in the
  studio (Media → Delete) and the Cloudinary asset is destroyed too. Per-file ceilings are
  `MAX_IMAGE_MB` / `MAX_VIDEO_MB`; Cloudinary's own plan limit still applies (100 MB per video on
  the free plan).
- **Backups**: schedule Firestore export (GCP Scheduled Export) + Storage versioning for critical buckets.
- **Monitoring**: Vercel Analytics/Speed Insights (optional), plus `/api/health` in your uptime monitor
  (checks app + Firestore + Auth + Storage + SMTP + maintenance).
