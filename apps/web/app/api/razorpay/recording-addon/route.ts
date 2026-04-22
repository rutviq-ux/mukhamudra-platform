import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { getServerEnv, createLogger } from "@ru/config";
import { createRazorpayOrder } from "@/lib/razorpay";
import { getCurrentUser } from "@/lib/auth";

const log = createLogger("api:razorpay:recording-addon");

/**
 * POST /api/razorpay/recording-addon
 *
 * Creates a Razorpay order for the recording add-on (₹1,000/year).
 * Eligibility: user must have an ACTIVE annual membership and no active recording access.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to continue" },
        { status: 401 }
      );
    }

    // Check: user must have at least one ACTIVE membership
    const activeMembership = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
      },
      include: { plan: { include: { product: true } } },
    });

    if (!activeMembership) {
      return NextResponse.json(
        { error: "Recording access is available for active subscribers only" },
        { status: 403 }
      );
    }

    // Bundle annual already includes free recording access
    if (
      activeMembership.plan.product.type === "BUNDLE" &&
      activeMembership.plan.interval === "ANNUAL"
    ) {
      return NextResponse.json(
        {
          error:
            "Recording access is already included with your Bundle Annual plan",
        },
        { status: 409 }
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
        { status: 409 }
      );
    }

    // Get the recording add-on plan
    const addonPlan = await prisma.plan.findUnique({
      where: { slug: "recording-addon" },
    });

    if (!addonPlan || !addonPlan.isActive) {
      return NextResponse.json(
        { error: "Recording add-on is not available" },
        { status: 400 }
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
      { status: 500 }
    );
  }
}
