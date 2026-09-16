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

- Upload images (≤8 MB: jpeg/png/webp/gif/svg/avif) or documents (≤20 MB, `media/documents` only).
- Files are validated (MIME + size + folder allowlist) and stored in Firebase Storage via the
  server API. Public folders get public URLs; documents stay private.
- Grid/list views, search, folder filter, detail view with copy-URL, rename metadata (alt text),
  delete (removes Storage object + record, with confirmation).

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
- Featured posts/events/speakers surface on the homepage and listing tops.
- Upload images **before** writing posts so you can pick covers from the library.
- Large uploads on slow networks: the uploader processes files sequentially with status text.
