import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/admin/super-settings/env-example
 *
 * Returns a complete .env.example file for the project.
 * Uses current non-secret env values where safe, placeholders otherwise.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lines = [
    "# ─── Database ───",
    'DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"',
    "",
    "# ─── Clerk Auth ───",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...",
    "CLERK_SECRET_KEY=sk_test_...",
    "CLERK_WEBHOOK_SECRET=whsec_...",
    `NEXT_PUBLIC_CLERK_SIGN_IN_URL=${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/auth/sign-in"}`,
    `NEXT_PUBLIC_CLERK_SIGN_UP_URL=${process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/auth/sign-up"}`,
    `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL || "/app"}`,
    `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=${process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || "/onboarding"}`,
    "",
    "# ─── Razorpay ───",
    "NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...",
    "RAZORPAY_KEY_ID=rzp_test_...",
    "RAZORPAY_KEY_SECRET=...",
    "RAZORPAY_WEBHOOK_SECRET=...",
    "",
    "# ─── Ghost CMS ───",
    `GHOST_URL=${process.env.GHOST_URL || "http://localhost:2368"}`,
    "GHOST_CONTENT_API_KEY=...",
    "GHOST_ADMIN_API_KEY=...",
    "",
    "# ─── Listmonk ───",
    `LISTMONK_URL=${process.env.LISTMONK_URL || "http://localhost:9000"}`,
    "LISTMONK_API_USER=admin",
    "LISTMONK_API_PASSWORD=...",
    "",
    "# ─── WhatsApp Bot ───",
    `WA_BOT_ENABLED=${process.env.WA_BOT_ENABLED || "false"}`,
    `WA_BOT_SESSION_PATH=${process.env.WA_BOT_SESSION_PATH || "./wa-session"}`,
    "",
    "# ─── Google Workspace (optional — set to enable Meet link generation) ───",
    "GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=...",
    `GOOGLE_IMPERSONATE_EMAIL=${process.env.GOOGLE_IMPERSONATE_EMAIL || "rutviq@mukhamudra.com"}`,
    `GOOGLE_CALENDAR_ID=${process.env.GOOGLE_CALENDAR_ID || "primary"}`,
    "",
    "# ─── Instagram (optional — Meta Graph API) ───",
    "INSTAGRAM_ACCESS_TOKEN=",
    "INSTAGRAM_PAGE_ID=",
    "INSTAGRAM_VERIFY_TOKEN=",
    "INSTAGRAM_APP_SECRET=",
    "",
    "# ─── PostHog Analytics ───",
    "NEXT_PUBLIC_POSTHOG_KEY=phc_...",
    `NEXT_PUBLIC_POSTHOG_HOST=${process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com"}`,
    "",
    "# ─── App Config ───",
    `NEXT_PUBLIC_APP_URL=${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}`,
    `NODE_ENV=${process.env.NODE_ENV || "development"}`,
    "",
    "# ─── Push Notifications (VAPID) ───",
    "VAPID_PUBLIC_KEY=...",
    "VAPID_PRIVATE_KEY=...",
    "VAPID_SUBJECT=mailto:hello@yourdomain.com",
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY=...",
    "",
    "# ─── Cron / QStash ───",
    "CRON_SECRET=...",
    "QSTASH_TOKEN=",
    "QSTASH_URL=",
    "QSTASH_CURRENT_SIGNING_KEY=",
    "QSTASH_NEXT_SIGNING_KEY=",
  ];

  const content = lines.join("\n") + "\n";

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename=".env.example"',
    },
  });
}
