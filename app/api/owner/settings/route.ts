import { requireOwner } from "@/lib/server/auth";
import { getPublicSettings, savePublicSettings } from "@/lib/firestore/settings";
import { publicSettingsSchema } from "@/lib/validation/schemas";
import { handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireOwner();
    return ok(await getPublicSettings());
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireOwner();
    const body = await parseBody(req, publicSettingsSchema);
    const saved = await savePublicSettings(
      {
        ...body,
        timezone: body.timezone ?? "UTC",
        seo: {
          metaTitle: body.seo.metaTitle,
          metaDescription: body.seo.metaDescription,
          keywords: body.seo.keywords ?? "",
          ogImage: body.seo.ogImage,
          twitterCard: body.seo.twitterCard ?? "summary_large_image",
        },
        social: body.social ?? {},
        appearance: {
          primaryColor: body.appearance.primaryColor ?? "#f9488b",
          secondaryColor: body.appearance.secondaryColor ?? "#ee8425",
          theme: body.appearance.theme ?? "light",
        },
        homepage: {
          ...body.homepage,
          showCountdown: body.homepage.showCountdown ?? true,
          aboutStats: body.homepage.aboutStats ?? [],
        },
      },
      user.uid
    );
    await auditLog({ actor: user, action: "settings.public.update", result: "success" });
    return ok(saved);
  } catch (err) {
    return handleApiError(err);
  }
}
