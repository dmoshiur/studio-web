import { redirect } from "next/navigation";
import { getPublicSettings } from "@/lib/firestore/settings";
import { getMaintenanceState, isSiteOffline } from "@/lib/firestore/settings";
import { getNavigation, listSocialLinks } from "@/lib/firestore/engagement";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // Check maintenance mode server-side (cached, no extra fetch needed)
  const [settings, maintenance, headerNav, footerNav, socialLinks] = await Promise.all([
    getPublicSettings(),
    getMaintenanceState(),
    getNavigation("header"),
    getNavigation("footer"),
    listSocialLinks(),
  ]);

  // Redirect to maintenance page if site is offline
  if (isSiteOffline(maintenance)) {
    redirect("/maintenance");
  }

  return (
    <>
      <SiteHeader siteName={settings.siteName} logoUrl={settings.logoUrl} links={headerNav.links} />
      <main id="main-content">{children}</main>
      <SiteFooter settings={settings} footerLinks={footerNav.links} socialLinks={socialLinks} />
    </>
  );
}
