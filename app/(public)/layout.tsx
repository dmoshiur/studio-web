import { getPublicSettings } from "@/lib/firestore/settings";
import { getNavigation, listSocialLinks } from "@/lib/firestore/engagement";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, headerNav, footerNav, socialLinks] = await Promise.all([
    getPublicSettings(),
    getNavigation("header"),
    getNavigation("footer"),
    listSocialLinks(),
  ]);

  return (
    <>
      <SiteHeader siteName={settings.siteName} logoUrl={settings.logoUrl} links={headerNav.links} />
      <main id="main-content">{children}</main>
      <SiteFooter settings={settings} footerLinks={footerNav.links} socialLinks={socialLinks} />
    </>
  );
}
