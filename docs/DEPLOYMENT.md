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
NEXT_PUBLIC_APP_NAME=ManUp
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
CLOUDINARY_FOLDER=manup
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
OWNER_EMAILS=you@example.com
SETUP_TOKEN=<long random string>
SMTP_HOST=…
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=…
SMTP_PASSWORD=…
SMTP_FROM_EMAIL=no-reply@your-domain.com
SMTP_FROM_NAME=ManUp
SMTP_REPLY_TO=
SESSION_COOKIE_NAME=__session
SESSION_MAX_AGE_DAYS=5
```

Generate the setup token: `openssl rand -hex 32`.

## 3. Deploy

1. **Deploy**. The build runs `tsc` + ESLint — it must pass.
2. Add your domain: Vercel → **Settings → Domains** → add + configure DNS.
3. Add the domain to Firebase **Authentication → Settings → Authorized domains**.
4. Update `NEXT_PUBLIC_APP_URL` to the final domain and redeploy.

## 4. Post-deploy verification

1. `/api/health` → `status: operational`, email `configured`.
2. Register owner account → `/setup` → claim ownership.
3. `/hackeradmin` → all green; `/admin` → dashboard loads.
4. Create a test post/event/speaker → visible on the public site.
5. Submit the contact form → message in `/admin/messages` + notification email arrives.
6. Subscribe to the newsletter → subscriber row appears.
7. Upload an image in Media → renders on the site.
8. Toggle **maintenance mode** → public shows maintenance page; `/admin` + `/hackeradmin` work.
9. Release maintenance; test **emergency lock** the same way (needs typed CONFIRM).
10. `/sitemap.xml` + `/robots.txt` load; check a blog post's OG tags.

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
