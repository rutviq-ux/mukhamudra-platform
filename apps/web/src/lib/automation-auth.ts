import { NextRequest, NextResponse } from "next/server";

/**
 * Read-only automation auth helper.
 *
 * NEW, ADDITIVE FILE — not used by any existing route. Intended only for a
 * small set of new, read-only automation endpoints (e.g. syncing member/lead
 * data into a Google Sheet). Kept separate from `withCronAuth` / `getCurrentUser`
 * so it can never be confused with, or reused for, any endpoint that mutates data.
 *
 * Requests must send the key in an `x-automation-key` header. Requires an
 * `AUTOMATION_API_KEY` environment variable to be set — if it is not set,
 * every request is rejected (fails closed).
 */
export function requireAutomationKey(request: NextRequest): NextResponse | null {
    const expected = process.env.AUTOMATION_API_KEY;
    if (!expected) {
          return NextResponse.json(
            { error: "Automation API is not configured" },
            { status: 503 },
                );
    }

  const provided = request.headers.get("x-automation-key");
    if (!provided || provided !== expected) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  return null;
}
