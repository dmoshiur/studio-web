import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, handleApiError, requestIp } from "@/lib/server/api-helpers";
import { rateLimit } from "@/lib/server/rate-limit";
import { isBot, newVisitorId, recordVisit } from "@/lib/firestore/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "__photography_vid";
const ONE_YEAR_S = 365 * 24 * 60 * 60;

const visitSchema = z.object({
  path: z.string().min(1).max(300),
  referrer: z.string().max(200).optional(),
});

/**
 * First-party pageview beacon. Assigns (or reuses) an opaque visitor id in
 * a cookie, ignores bots, rate-limits per visitor and records the view.
 * Intentionally returns 204 with no body — it must never block a page.
 */
export async function POST(req: Request) {
  try {
    // Bots are not counted.
    if (isBot(req.headers.get("user-agent"))) {
      return new NextResponse(null, { status: 204 });
    }

    const cookieHeader = req.headers.get("cookie") ?? "";
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${VISITOR_COOKIE}=([^;]+)`));
    let visitorId = match?.[1];

    const rl = await rateLimit(`analytics:${visitorId ?? requestIp(req)}`, 60, 60_000);
    if (!rl.allowed) return new NextResponse(null, { status: 204 });

    if (!visitorId || visitorId.length < 8 || visitorId.length > 64) {
      visitorId = newVisitorId();
    }

    const body = await req.json().catch(() => null);
    const parsed = visitSchema.safeParse(body);
    if (!parsed.success) return new NextResponse(null, { status: 204 });

    await recordVisit({
      visitorId,
      path: parsed.data.path,
      referrer: parsed.data.referrer,
    });

    const res = new NextResponse(null, { status: 204 });
    res.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: false, // readable by nothing sensitive; opaque random id only
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ONE_YEAR_S,
    });
    return res;
  } catch (err) {
    // Analytics must never break the site.
    console.error("[analytics] record failed:", err);
    return apiError("Untracked", 204);
  }
}
