import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getPublicSettings } from "@/lib/firestore/settings";
import { ToastProvider } from "@/components/ui/toast";

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
  };
}

export const viewport: Viewport = {
  themeColor: "#f9488b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Work+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
