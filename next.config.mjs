/** @type {import("next").NextConfig} */

/**
 * When the app is served inside a hosting preview iframe (sandbox/preview
 * environments proxy it as https://<port>-<id>.e2b.app) the strict
 * "same-origin only" framing policy must be relaxed, otherwise the preview
 * shows a blank frame. Set ALLOW_EMBEDDING=true for those environments —
 * production deployments keep the strict defaults.
 */
const allowEmbedding = (process.env.ALLOW_EMBEDDING ?? "").toLowerCase() === "true";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // X-Frame-Options cannot express "any origin", so it is omitted (and the CSP
  // frame-ancestors directive below takes over) when embedding is allowed.
  ...(allowEmbedding ? [] : [{ key: "X-Frame-Options", value: "SAMEORIGIN" }]),
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    // Firebase + Google Fonts friendly CSP. Adjust if you add new third parties.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://apis.google.com https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: http:",
      "media-src 'self' blob: https:",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net wss://*.firebaseio.com https://*.google-analytics.com https://firebasestorage.googleapis.com https://storage.googleapis.com",
      "frame-src 'self' https://*.firebaseapp.com https://*.web.app",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      allowEmbedding ? "frame-ancestors *" : "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Embedded SQLite + filesystem uploads are server-only Node features.
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
    serverComponentsExternalPackages: ["node:sqlite", "firebase-admin"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    formats: ["image/avif", "image/webp"],
    // Sandboxes without outbound image fetching can disable the optimizer.
    unoptimized: (process.env.NEXT_PUBLIC_UNOPTIMIZED_IMAGES ?? "").toLowerCase() === "true",
  },
  // Cache static assets aggressively
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Cache static images/fonts for 1 year (immutable since hashed filenames)
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
