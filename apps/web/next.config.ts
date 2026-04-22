import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const isVercelProd = process.env.VERCEL_ENV === "production";

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isVercelProd ? "" : " 'unsafe-eval'"} https://*.clerk.accounts.dev https://*.mukhamudra.com https://challenges.cloudflare.com https://*.cloudflare.com https://*.posthog.com https://checkout.razorpay.com${isVercelProd ? "" : " https://vercel.live"};
  worker-src 'self' blob:;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: blob:;
  font-src 'self' data: https:;
  connect-src 'self' https: http: ws: wss:;
  frame-src https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.mukhamudra.com https://api.razorpay.com https://checkout.razorpay.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  transpilePackages: [
    "@ru/ui",
    "@ru/db",
    "@ru/config",
    "@ru/ghost-client",
    "@ru/google-workspace",
    "@ru/listmonk-client",
    "@ru/notifications",
  ],
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withSentryConfig(withNextIntl(nextConfig), {
  // Suppress source map upload logs in CI
  silent: !process.env.CI,

  // Upload source maps for better stack traces
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Automatically tree-shake Sentry logger statements (Turbopack doesn't support this yet)
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },

  // Control source map handling
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
