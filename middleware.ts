import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "__session";

const PUBLIC_ALWAYS = [
  "/api/health",
  "/api/media",
  "/api/maintenance/status",
  "/api/auth",
  "/api/setup",
  "/api/contact",
  "/api/newsletter",
  "/maintenance",
  "/login",
  "/register",
  "/forgot-password",
  "/unauthorized",
  "/forbidden",
  "/unsubscribe",
  "/_next",
  "/favicon",
  "/robots.txt",
  "/sitemap.xml",
];

/**
 * Edge middleware — fast coarse gating ONLY.
 * Real authorization is enforced server-side (API routes + layouts).
 *  1. Maintenance mode → handled by the public layout (it reads
 *     the cached maintenance state server-side). No internal fetch here.
 *  2. /admin without a session cookie → /login.
 *  3. /hackeradmin is gated by the rotating-passcode session and renders
 *     its own secure entry screen — no redirect to /login here.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|avif|css|js|woff2?|txt|xml)$/)
  ) {
    return NextResponse.next();
  }

  const isAlwaysPublic = PUBLIC_ALWAYS.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  // --- Coarse auth gate (real checks happen server-side) ---
  if (isAdminRoute) {
    const session = req.cookies.get(SESSION_COOKIE)?.value;
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Authenticated users shouldn't see login/register again
  if ((pathname === "/login" || pathname === "/register") && req.cookies.get(SESSION_COOKIE)?.value) {
    const next = req.nextUrl.searchParams.get("next");
    const url = req.nextUrl.clone();
    url.pathname = next && next.startsWith("/") ? next : "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
