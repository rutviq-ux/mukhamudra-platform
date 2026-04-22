import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// CORS Configuration
// ============================================================================
const allowedOrigins = (() => {
  const origins = (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL);
  }

  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000", "http://localhost:3001");
  }

  return Array.from(new Set(origins));
})();

const corsHeadersForOrigin = (origin: string | null): Record<string, string> => {
  if (!origin || !allowedOrigins.includes(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, X-CSRF-Token",
    Vary: "Origin",
  };
};

// ============================================================================
// Rate Limiting (in-memory, resets on redeploy)
// ============================================================================
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
const PUBLIC_LIMIT = Number(process.env.RATE_LIMIT_PUBLIC_PER_MINUTE || 60);
const AUTH_LIMIT = Number(process.env.RATE_LIMIT_AUTH_PER_MINUTE || 120);
const WINDOW_MS = 60_000;

const getClientKey = (request: NextRequest) => {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const hasAuth =
    request.headers.has("authorization") ||
    request.cookies.has("__session") ||
    request.cookies.has("__clerk_db_jwt") ||
    request.cookies.has("__clerk_session");
  return { key: `${hasAuth ? "auth" : "public"}:${ip}`, isAuthed: hasAuth };
};

const checkRateLimit = (key: string, limit: number) => {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: limit - 1, resetAt: now + WINDOW_MS };
  }

  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  return { allowed: bucket.count <= limit, remaining, resetAt: bucket.resetAt };
};

// ============================================================================
// Route Matchers
// ============================================================================
const isPublicRoute = createRouteMatcher([
  "/",
  "/about",
  "/pricing",
  "/terms",
  "/privacy-policy",
  "/face-yoga",
  "/pranayama",
  "/trial",
  "/blog(.*)",
  "/checkout(.*)",
  "/auth(.*)",
  "/api/razorpay/webhook",
  "/api/newsletter/subscribe",
  "/api/leads",
  "/api/health(.*)",
  "/api/cron(.*)",
  "/api/webhooks(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isApiRoute = createRouteMatcher(["/api/:path*"]);

// ============================================================================
// Proxy (Next.js 16 middleware replacement)
// ============================================================================
export default clerkMiddleware(async (auth, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = corsHeadersForOrigin(origin);

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Apply rate limiting to API routes
  if (isApiRoute(request)) {
    const { key, isAuthed } = getClientKey(request);
    const limit = isAuthed ? AUTH_LIMIT : PUBLIC_LIMIT;
    const rate = checkRateLimit(key, limit);

    if (!rate.allowed) {
      const retryAfterSeconds = Math.ceil((rate.resetAt - Date.now()) / 1000);
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests",
          retryAfter: retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": retryAfterSeconds.toString(),
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.ceil(rate.resetAt / 1000).toString(),
          },
        },
      );
    }
  }

  // Allow public routes without auth
  if (isPublicRoute(request)) {
    return;
  }

  // Protect all other routes
  await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|webm|ogg|mp3|wav)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
