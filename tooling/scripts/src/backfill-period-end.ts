/**
 * Backfill Membership.periodEnd / periodStart for active Razorpay-linked
 * memberships where these fields are null.
 *
 * periodEnd is populated by the subscription.activated / subscription.charged
 * webhooks. Memberships created before the webhook was reliably wired up (or
 * where a webhook was missed) can have a razorpaySubscriptionId but null
 * periodEnd. That breaks logic relying on periodEnd (recording add-on
 * eligibility; the expire-memberships cron never expires a null-periodEnd row).
 *
 * Usage (from repo root):
 *   pnpm --filter @ru/scripts exec dotenv -e ../../.env -- tsx src/backfill-period-end.ts          # dry run
 *   pnpm --filter @ru/scripts exec dotenv -e ../../.env -- tsx src/backfill-period-end.ts --apply  # write
 *
 * Requires DATABASE_URL, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET in env.
 */
import { prisma } from "@ru/db";
import Razorpay from "razorpay";

const APPLY = process.argv.includes("--apply");

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set in env");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

async function main() {
  console.log(
    `\n=== periodEnd backfill — ${APPLY ? "APPLY (writing)" : "DRY RUN (no writes)"} ===\n`,
  );

  const razorpay = getRazorpay();

  const affected = await prisma.membership.findMany({
    where: {
      razorpaySubscriptionId: { not: null },
      status: "ACTIVE",
      periodEnd: null,
    },
    include: {
      user: { select: { email: true, name: true } },
      plan: { select: { name: true, interval: true } },
    },
  });

  console.log(`Found ${affected.length} active membership(s) with null periodEnd.\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const m of affected) {
    const subId = m.razorpaySubscriptionId as string;
    const who = `${m.user.email} (${m.plan.name})`;

    try {
      const sub: any = await razorpay.subscriptions.fetch(subId);
      const currentStart = sub.current_start;
      const currentEnd = sub.current_end;

      if (!currentEnd) {
        console.log(
          `  SKIP  ${who} — sub ${subId} has no current_end (status: ${sub.status})`,
        );
        skipped++;
        continue;
      }

      const periodStart = currentStart ? new Date(currentStart * 1000) : null;
      const periodEnd = new Date(currentEnd * 1000);

      console.log(
        `  ${APPLY ? "WRITE" : "WOULD"} ${who} — periodEnd=${periodEnd.toISOString()}` +
          (periodStart ? ` periodStart=${periodStart.toISOString()}` : ""),
      );

      if (APPLY) {
        await prisma.membership.update({
          where: { id: m.id },
          data: {
            periodEnd,
            ...(periodStart ? { periodStart } : {}),
          },
        });
      }
      updated++;
    } catch (err) {
      console.error(
        `  FAIL  ${who} — sub ${subId}:`,
        err instanceof Error ? err.message : err,
      );
      failed++;
    }
  }

  console.log(
    `\n=== Done. ${APPLY ? "Updated" : "Would update"}: ${updated}, skipped: ${skipped}, failed: ${failed} ===\n`,
  );

  if (!APPLY && updated > 0) {
    console.log("Re-run with --apply to write these changes.\n");
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
