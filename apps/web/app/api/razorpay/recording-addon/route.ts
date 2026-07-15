import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { getServerEnv, createLogger } from "@ru/config";
import { createRazorpayOrder } from "@/lib/razorpay";
import { getCurrentUser } from "@/lib/auth";
import { getPostHogServer } from "@/lib/posthog-server";

const log = createLogger("api:razorpay:recording-addon");

/**
 * POST /api/razorpay/recording-addon
 *
 * Creates a Razorpay order for the recording add-on (₹1,000/year).
 * Eligibility: user must have an ACTIVE membership of ANY interval (monthly
 * or annual) whose periodEnd is in the future, and no existing active
 * recording access. This covers members regardless of how they originally
 * paid (online via Razorpay, or legacy offline via GPay/pre-website) — the
 * only requirement is a current, non-expired subscription with a known end
 * date. Members whose term has lapsed (periodEnd in the past) are not
 * eligible, even if the nightly expire-memberships cron hasn't yet flipped
 * their status.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to continue" },
        { status: 401 },
      );
    }

    // Check: user must have at least one ACTIVE membership (any interval —
    // monthly or annual) whose subscription period is still current. We
    // require periodEnd to be set AND in the future: this both auto-cuts off
    // expired members and works for legacy/offline members, all of whom carry
    // a periodEnd. Members with no periodEnd at all are not treated as active
    // for purchasing purposes, since we can't verify their term is current.
    const activeMembership = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
        periodEnd: { gte: new Date() },
      },
    });

    if (!activeMembership) {
      return NextResponse.json(
        {
          error:
            "Recording access requires an active membership. Please make sure your subscription is current, or renew to continue.",
        },
        { status: 403 },
      );
    }

    // Check: no existing active recording access
    const existingAccess = await prisma.recordingAccess.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingAccess) {
      return NextResponse.json(
        {
          error: "You already have active recording access",
          expiresAt: existingAccess.expiresAt,
        },
        { status: 409 },
      );
    }

    // Get the recording add-on plan
    const addonPlan = await prisma.plan.findUnique({
      where: { slug: "recording-addon" },
    });

    if (!addonPlan || !addonPlan.isActive) {
      return NextResponse.json(
        { error: "Recording add-on is not available" },
        { status: 400 },
      );
    }

    // Create Razorpay order (one-time payment)
    const razorpayOrder = await createRazorpayOrder({
      amount: addonPlan.amountPaise,
      currency: "INR",
      receipt: `recording_${Date.now()}`,
      notes: {
        planId: addonPlan.id,
        planSlug: "recording-addon",
        userId: user.id,
      },
    });

    // Create order in our database
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        planId: addonPlan.id,
        razorpayOrderId: razorpayOrder.id,
        amountPaise: addonPlan.amountPaise,
        discountPaise: 0,
        status: "PENDING",
      },
    });

    const env = getServerEnv();

    const posthog = getPostHogServer();
    posthog.capture({
      distinctId: user.id,
      event: "recording_addon_checkout_initiated",
      properties: {
        order_id: order.id,
        amount_paise: addonPlan.amountPaise,
      },
    });
    await posthog.flush();

    return NextResponse.json({
      orderId: razorpayOrder.id,
      amount: addonPlan.amountPaise,
      currency: "INR",
      keyId: env.RAZORPAY_KEY_ID,
      orderDbId: order.id,
      prefill: {
        name: user.name || "",
        email: user.email,
        contact: user.phone || "",
      },
    });
  } catch (error) {
    log.error({ err: error }, "Failed to create recording add-on order");
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 },
    );
  }
}
