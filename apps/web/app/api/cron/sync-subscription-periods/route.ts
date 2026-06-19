import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { getRazorpay } from "@/lib/razorpay";
import { getSubscriptionPeriod } from "@/lib/memberships";
import { withCronAuth } from "@/lib/cron-auth";

const log = createLogger("cron:sync-subscription-periods");

/**
 * POST /api/cron/sync-subscription-periods
 *
 * Self-healing reconciliation for missed subscription webhooks. periodEnd is
 * normally set by the subscription.activated / subscription.charged webhooks,
 * but if a webhook is missed (delivery failure, downtime), an ACTIVE
 * Razorpay-linked membership can be left with a null periodEnd. Such rows are
 * invisible to the expire-memberships cron (which filters on periodEnd) and
 * break periodEnd-based eligibility checks.
 *
 * This cron finds those rows and backfills periodEnd from Razorpay's current
 * subscription period. Safe to run frequently; it only touches rows where
 * periodEnd is null.
 */
async function handler(_request: NextRequest) {
  try {
    const razorpay = getRazorpay();

    const affected = await prisma.membership.findMany({
      where: {
        razorpaySubscriptionId: { not: null },
        status: "ACTIVE",
        periodEnd: null,
      },
      select: { id: true, razorpaySubscriptionId: true },
      take: 100,
    });

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const m of affected) {
      const subId = m.razorpaySubscriptionId as string;
      try {
        const sub = (await razorpay.subscriptions.fetch(subId)) as {
          current_start?: number;
          current_end?: number;
          status?: string;
        };

        if (!sub.current_end || !sub.current_start) {
          skipped++;
          continue;
        }

        const { periodStart, periodEnd } = getSubscriptionPeriod({
          current_start: sub.current_start,
          current_end: sub.current_end,
        });

        await prisma.membership.update({
          where: { id: m.id },
          data: { periodStart, periodEnd },
        });
        updated++;
      } catch (err) {
        log.error({ err, membershipId: m.id, subId }, "Failed to sync period");
        failed++;
      }
    }

    log.info(
      { found: affected.length, updated, skipped, failed },
      "Subscription period sync complete",
    );

    return NextResponse.json({
      status: "ok",
      found: affected.length,
      updated,
      skipped,
      failed,
    });
  } catch (error) {
    log.error({ err: error }, "Subscription period sync cron failed");
    return NextResponse.json(
      { error: "Subscription period sync failed" },
      { status: 500 },
    );
  }
}

export const POST = withCronAuth(handler);
