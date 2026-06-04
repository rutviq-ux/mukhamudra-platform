import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { withCronAuth } from "@/lib/cron-auth";

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
    const result = await prisma.membership.updateMany({
      where: {
        status: "ACTIVE",
        periodEnd: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    log.info({ expired: result.count }, "Membership expiry complete");

    return NextResponse.json({ status: "ok", expired: result.count });
  } catch (error) {
    log.error({ err: error }, "Membership expiry cron failed");
    return NextResponse.json({ error: "Membership expiry failed" }, { status: 500 });
  }
}

export const POST = withCronAuth(handler);
