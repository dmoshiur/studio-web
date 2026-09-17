# Admin Guide — `/admin`

The admin studio is for **content administrators** (`admin` or `owner` role). It never exposes
infrastructure secrets — those live in the owner console.

## Access

- Sign in at `/login`. Admins are promoted by the owner in `/hackeradmin/users`.
- All `/admin` pages are gated **server-side** (layout) and every `/api/admin/*` route re-verifies
  the session + role. There is no client-only protection.

## Dashboard (`/admin`)

Live counts (posts, events, speakers, media, unread messages, subscribers) + recent contact messages.

## Posts (`/admin/posts`)

- **New/Edit**: title (slug auto-generated), excerpt (auto-generated if empty), rich content with
  live preview, cover image (upload or media-library picker), category, tags, author, status
  (`draft`/`published`/`archived`), featured flag, SEO overrides.
- Publishing sets `publishedAt` and makes the post live at `/blog/[slug]`.
- Deleting requires confirmation and is audit-logged.

## Events (`/admin/events`)

Fields: title/slug, short description, rich agenda/details, start/end datetime, timezone, venue,
address, cover image, linked speakers, registration URL, price label, status, featured.
Published events appear at `/events` + `/events/[slug]` (with Event JSON-LD for SEO).

## Speakers (`/admin/speakers`)

Name/slug, title, company, bio, photo (library picker), social links, featured, status.
Published profiles appear at `/speakers` + `/speakers/[slug]`.

## Categories (`/admin/categories`)

Blog topics. Posts reference a category; the blog can be filtered via `?category=slug`.

## Pages (`/admin/pages`)

Custom content pages by slug. Publishing a page with slug `about` or `privacy` overrides the
built-in content for `/about` and `/privacy`. Rich HTML is sanitized on save.

## Media (`/admin/media`)

- Upload **images** (jpeg/png/webp/avif/gif/svg), **video** (mp4/webm/mov/ogv/mkv/avi),
  **audio** (mp3/m4a/wav/ogg/aac/flac) and **documents** (pdf/txt/csv, ≤25 MB — kept private).
  Sizes are capped per kind (image 10 MB, video/audio 100 MB by default, `MAX_VIDEO_MB` overrides).
- Storage is **Cloudinary** when `CLOUDINARY_*` is configured (otherwise Firebase Storage, or the
  embedded disk). Uploads to Cloudinary are signed server-side and sent **straight from the
  browser**, so large videos are not limited by serverless request-body limits; formats, size and
  destination folder are enforced by the signature and re-verified server-side when the asset is
  recorded.
- Folders: Images, Videos & audio, Public assets, Events, Speakers, Journal, Owner section,
  Avatars, Documents.
- Grid/list views, search, folder filter, video posters, detail view with inline video/audio
  preview and copy-URL, delete (removes the Cloudinary/Storage object + record, with confirmation).

## Owner Section (`/admin/owner`)

The owner spotlight — portrait, name and personal message — shown on the homepage and the
about page. Everything is editable here; nothing needs a code change:

- **Visibility**: master switch, plus separate toggles for the homepage and the about page.
- **Portrait**: owner photo (media-library picker or URL), alt text, optional handwritten
  signature image. With no photo, an engraved gold monogram with the owner's initials is shown.
- **Name & texts**: name, role/title, script accent, eyebrow, section heading, the message
  (blank line = new paragraph), an optional pull quote and an optional **video message**
  (uploaded to Cloudinary, plays inline on the site).
- **Contact & links**: email, phone, button label + link, and up to six social links.
- The section is stored in `siteSettings/public → homepage.owner`; a **Discard** button reverts
  unsaved edits and *View on site* opens the live section.

## Messages (`/admin/messages`)

Contact submissions: read/unread, search, unread filter, full view, reply-by-email link, delete.

## Subscribers (`/admin/subscribers`)

Newsletter audience with status/source/joined date, CSV export, removal.

## Navigation (`/admin/navigation`)

- **Header / Footer** link lists: label, URL (internal or external), reorder.
- **Social links**: label, URL, icon key (`facebook`, `instagram`, `youtube`, `linkedin`,
  `twitter`, `globe`). Rendered in the footer.

## Profile (`/admin/profile`)

View role/verification status; change password via secure email link.

## Tips

- Use **draft** status to stage content, then publish when ready.
- The owner section doubles as a founder's note — update it whenever the message changes.
- Featured posts/events/speakers surface on the homepage and listing tops.
- Upload images **before** writing posts so you can pick covers from the library.
- Large uploads on slow networks: the uploader processes files sequentially with status text.
