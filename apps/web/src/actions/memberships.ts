"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { createAuthAction } from "@/lib/actions/safe-action";
import { getRazorpay } from "@/lib/razorpay";

const log = createLogger("action:memberships");

const cancelSubscriptionSchema = z.object({
  membershipId: z.string().cuid("Invalid membership ID"),
});

export const cancelSubscription = createAuthAction("cancelSubscription", {
  schema: cancelSubscriptionSchema,
  handler: async ({ data, user }) => {
    const { membershipId } = data;

    // Get the membership
    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
      include: { plan: true },
    });

    if (!membership) {
      throw new Error("Membership not found");
    }

    if (membership.userId !== user.id) {
      throw new Error("Not your membership");
    }

    if (membership.status !== "ACTIVE") {
      throw new Error("Membership is not active");
    }

    // Cancel via Razorpay if there's a subscription ID
    if (membership.razorpaySubscriptionId) {
      try {
        const razorpay = getRazorpay();
        await razorpay.subscriptions.cancel(
          membership.razorpaySubscriptionId,
          true,
        );
      } catch (razorpayError) {
        log.error({ err: razorpayError }, "Razorpay cancellation failed");
        // Continue with local cancellation even if Razorpay fails
      }
    }

    // Update membership status
    await prisma.membership.update({
      where: { id: membershipId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });

    revalidatePath("/app/billing");

    return {
      message:
        "Subscription cancelled. Access continues until end of billing period.",
    };
  },
});
