import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { getRazorpay } from "@/lib/razorpay";
import {
  RECORDING_ADDON_SLUG,
  monthlyOverlapsAnnual,
} from "@/lib/build-paid-user-row";

const log = createLogger("cancel-overlapping-monthly");

export async function cancelOverlappingMonthlyMemberships(
  keepMembershipId: string,
): Promise<number> {
  const kept = await prisma.membership.findUnique({
    where: { id: keepMembershipId },
    include: { plan: { include: { product: true } } },
  });

  if (!kept || kept.status !== "ACTIVE") return 0;
  if (kept.plan.interval !== "ANNUAL") return 0;
  if (kept.plan.slug === RECORDING_ADDON_SLUG) return 0;

  const candidates = await prisma.membership.findMany({
    where: {
      userId: kept.userId,
      status: "ACTIVE",
      id: { not: kept.id },
      plan: {
        interval: "MONTHLY",
        slug: { not: RECORDING_ADDON_SLUG },
      },
    },
    include: { plan: { include: { product: true } } },
  });

  const toCancel = candidates.filter((membership) =>
    monthlyOverlapsAnnual(
      membership.plan.product.type,
      kept.plan.product.type,
    ),
  );

  if (toCancel.length === 0) return 0;

  const needsRazorpay = toCancel.some((m) => m.razorpaySubscriptionId);
  const razorpay = needsRazorpay ? getRazorpay() : null;

  for (const membership of toCancel) {
    if (membership.razorpaySubscriptionId && razorpay) {
      try {
        await razorpay.subscriptions.cancel(
          membership.razorpaySubscriptionId,
          false,
        );
      } catch (error) {
        log.warn(
          {
            err: error,
            membershipId: membership.id,
            subscriptionId: membership.razorpaySubscriptionId,
          },
          "Could not cancel overlapping monthly Razorpay subscription",
        );
      }
    }

    await prisma.membership.update({
      where: { id: membership.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });

    log.info(
      {
        userId: kept.userId,
        cancelledMembershipId: membership.id,
        keptMembershipId: kept.id,
        cancelledPlan: membership.plan.slug,
      },
      "Cancelled overlapping monthly membership after annual activation",
    );
  }

  return toCancel.length;
}
