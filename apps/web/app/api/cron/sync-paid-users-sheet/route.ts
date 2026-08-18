import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@ru/config";
import { withCronAuth } from "@/lib/cron-auth";
import { reconcileAllPaidUsersToSheet } from "@/lib/sync-paid-user-sheet";

const log = createLogger("cron:sync-paid-users-sheet");

/**
 * POST /api/cron/sync-paid-users-sheet
 *
 * Bootstrap + daily reconcile: creates the Paid Users tab if missing, writes
 * headers, and upserts all active paid members who have a phone number.
 */
async function handler(_request: NextRequest) {
  try {
    const result = await reconcileAllPaidUsersToSheet();

    log.info(result, "Paid users sheet reconcile complete");

    return NextResponse.json({
      status: "ok",
      ...result,
    });
  } catch (error) {
    log.error({ err: error }, "Paid users sheet reconcile failed");
    return NextResponse.json(
      { error: "Paid users sheet reconcile failed" },
      { status: 500 },
    );
  }
}

export const POST = withCronAuth(handler);
