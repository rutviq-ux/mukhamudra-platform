import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextRequest, NextResponse } from "next/server";

type CronHandler = (request: NextRequest) => Promise<NextResponse>;

/**
 * Wraps a cron route handler with authentication.
 *
 * - Production (QStash configured): verifies QStash request signature
 *   using QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY env vars.
 * - Production (legacy): falls back to Bearer token check via CRON_SECRET.
 * - Development: allows requests without any auth.
 */
export function withCronAuth(handler: CronHandler) {
  const isDev = process.env.NODE_ENV !== "production";
  const hasQStash = Boolean(process.env.QSTASH_CURRENT_SIGNING_KEY);

  // Development: no auth required
  if (isDev) {
    return handler;
  }

  // Production with QStash: verify signature
  if (hasQStash) {
    return verifySignatureAppRouter(handler);
  }

  // Production fallback: Bearer token (legacy Vercel Cron / manual calls)
  return async (request: NextRequest) => {
    const secret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(request);
  };
}
