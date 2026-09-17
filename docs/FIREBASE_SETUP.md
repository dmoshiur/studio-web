# Firebase Setup

## 1. Create the project

1. Go to [Firebase Console](https://console.firebase.google.com) → **Add project**.
2. Name it (e.g. `manup-platform`), disable Google Analytics unless you need it.
3. Note the **Project ID**.

## 2. Authentication

1. **Build → Authentication → Get started** → enable **Email/Password** provider.
2. (Recommended) Enable **Email enumeration protection** (it's on by default in new projects).
3. **Settings → Authorized domains** → add your Vercel domain + custom domain
   (e.g. `your-app.vercel.app`, `example.com`). `localhost` is pre-authorized.

## 3. Firestore

1. **Build → Firestore Database → Create database** → **Production mode** → choose a region.
2. Deploy rules + indexes from this repo (install [Firebase CLI](https://firebase.google.com/docs/cli)):
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use --add          # select your project
   firebase deploy --only firestore:rules,firestore:indexes
   ```
   Or paste `firestore.rules` / `firestore.indexes.json` manually in the console.
3. Key collections (created automatically on first write; or run the seed script):
   `users, admins, siteSettings, pages, posts, events, speakers, categories, media,
   messages, newsletterSubscribers, navigation, socialLinks, auditLogs, rateLimits`.

## 4. Storage

1. **Build → Storage → Get started** → production mode, same region.
2. Deploy rules:
   ```bash
   firebase deploy --only storage
   ```
   Or paste `storage.rules` in **Storage → Rules**.
3. Note the bucket name (`<project-id>.appspot.com`) for `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`.
4. (Optional, recommended) Add a **CORS** config if you later upload directly from the browser.
   Uploads via the server API need no CORS; browser-direct uploads to Cloudinary never touch this
   bucket.

> **Using Cloudinary instead?** Firebase Storage is optional. Set `CLOUDINARY_CLOUD_NAME`,
> `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` (see `.env.example`) and every upload — images,
> video, audio, documents — goes to Cloudinary from the browser, leaving this bucket unused. The
> app picks Cloudinary automatically when those variables are present (`STORAGE_BACKEND=cloudinary`
> forces it). Firestore/Auth are unaffected: Cloudinary only replaces the file store.

## 5. Web app config (public)

1. **Project Overview → Add app → Web** → register (no hosting needed).
2. Copy the config values into Vercel / `.env.local`:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   NEXT_PUBLIC_FIREBASE_PROJECT_ID
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   NEXT_PUBLIC_FIREBASE_APP_ID
   ```
   These are **public identifiers**, not secrets — but keep them in env vars regardless.

## 6. Admin SDK credentials (SERVER-ONLY secrets)

1. **Project Settings → Service accounts → Generate new private key** (Node.js).
2. Set server-only env vars (Vercel + `.env.local`, never `NEXT_PUBLIC_`):
   ```
   FIREBASE_PROJECT_ID=<project-id>
   FIREBASE_CLIENT_EMAIL=<service-account email>
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
   Keep the `\n` escapes and surrounding quotes. Alternative: put the whole JSON file through
   base64 and set `FIREBASE_SERVICE_ACCOUNT_BASE64` instead.
3. Restrict the key: ideally use a dedicated service account with only
   `datastore` + `storage` + `identitytoolkit` roles. Rotate periodically.

## 7. Seed starter content

```bash
cp .env.example .env.local   # fill in Admin + public values
npx tsx scripts/seed.ts
```

## 8. Create the owner

1. Open the deployed (or local) site, **register** with your owner email.
2. Set `OWNER_EMAILS=you@example.com` and a long random `SETUP_TOKEN` in env.
3. Visit `/setup`, sign in, paste the token → you become `owner`.
4. The setup endpoint permanently refuses further claims afterwards.
5. Escape hatch (server terminal with Admin env): `npx tsx scripts/set-owner.ts you@example.com`.

## 9. Verify

- `/api/health` → all checks operational/configured.
- Sign in → `/admin` works (owner can access admin too).
- `/hackeradmin` → overview shows green statuses.
- Toggle maintenance in `/hackeradmin/status` → public pages show `/maintenance`, admin still works.
