import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { withCronAuth } from "@/lib/cron-auth";
import { syncPaidUserToSheet } from "@/lib/sync-paid-user-sheet";
import { reconcileMeetGroups } from "@/lib/sync-meet-group";

const log = createLogger("cron:expire-memberships");

/**
 * POST /api/cron/expire-memberships
 *
 * Daily cron (midnight): marks memberships as EXPIRED when periodEnd has passed.
 * This keeps status accurate so eligibility checks (recording add-on, etc.) can
 * rely on status alone without also checking periodEnd.
 */
async function handler(_request: NextRequest) {
  try {
    const expiring = await prisma.membership.findMany({
      where: {
        status: "ACTIVE",
        periodEnd: { lt: new Date() },
      },
      select: { userId: true },
      distinct: ["userId"],
    });

    const result = await prisma.membership.updateMany({
      where: {
        status: "ACTIVE",
        periodEnd: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    for (const membership of expiring) {
      syncPaidUserToSheet(membership.userId).catch((err) =>
        log.error(
          { err, userId: membership.userId },
          "Failed to sync paid-user sheet after expiry",
        ),
      );
    }

    log.info({ expired: result.count }, "Membership expiry complete");

    reconcileMeetGroups().catch((err) =>
      log.error({ err }, "Failed to reconcile Meet groups after expiry"),
    );

    return NextResponse.json({ status: "ok", expired: result.count });
  } catch (error) {
    log.error({ err: error }, "Membership expiry cron failed");
    return NextResponse.json({ error: "Membership expiry failed" }, { status: 500 });
  }
}

export const POST = withCronAuth(handler);
