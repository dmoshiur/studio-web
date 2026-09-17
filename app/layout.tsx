import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getPublicSettings } from "@/lib/firestore/settings";
import { ToastProvider } from "@/components/ui/toast";
import { ensureSeededOnce } from "@/lib/db/bootstrap";

// NOTE: Fonts load at runtime via <link> below so production builds never
// depend on Google Fonts availability at compile time. System-font fallbacks
// in tailwind.config keep the UI intact if the font CDN is unreachable.

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    metadataBase: new URL(base),
    title: {
      default: settings.seo.metaTitle,
      template: `%s · ${settings.siteName}`,
    },
    description: settings.seo.metaDescription,
    keywords: settings.seo.keywords,
    openGraph: {
      title: settings.seo.metaTitle,
      description: settings.seo.metaDescription,
      type: "website",
      siteName: settings.siteName,
      images: settings.seo.ogImage ? [settings.seo.ogImage] : [],
    },
    twitter: {
      card: settings.seo.twitterCard,
      title: settings.seo.metaTitle,
      description: settings.seo.metaDescription,
    },
    robots: { index: true, follow: true },
    alternates: {
      canonical: "/",
      types: { "application/rss+xml": `${base}/feed.xml` },
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#fafaf8",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Populate the embedded store on first boot so every surface has content.
  await ensureSeededOnce();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Inter:wght@300;400;500;600&family=Great+Vibes&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-gold-500 focus:px-4 focus:py-2 focus:text-obsidian-950"
        >
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
