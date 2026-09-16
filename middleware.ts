import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "__session";

const PUBLIC_ALWAYS = [
  "/api/health",
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
 *  1. Maintenance mode → public routes rewritten to /maintenance.
 *  2. /admin & /hackeradmin without a session cookie → /login.
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
  const isOwnerRoute = pathname === "/hackeradmin" || pathname.startsWith("/hackeradmin/");
  const isApiRoute = pathname.startsWith("/api/");

  // --- Maintenance gate for public pages (admin/owner/auth/health stay up) ---
  if (!isApiRoute && !isAlwaysPublic && !isAdminRoute && !isOwnerRoute) {
    try {
      const statusUrl = new URL("/api/maintenance/status", req.url);
      const res = await fetch(statusUrl, { cache: "no-store" });
      if (res.ok) {
        const { enabled, emergencyLock } = (await res.json()) as {
          enabled: boolean;
          emergencyLock: boolean;
        };
        if (enabled || emergencyLock) {
          const url = req.nextUrl.clone();
          url.pathname = "/maintenance";
          return NextResponse.rewrite(url);
        }
      }
    } catch {
      // Fail open: if the status endpoint errors, don't take the site down.
    }
  }

  // --- Coarse auth gate (real checks happen server-side) ---
  if (isAdminRoute || isOwnerRoute) {
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
