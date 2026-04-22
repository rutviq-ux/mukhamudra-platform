import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import {
  getServerEnv,
  subscriptionSchema,
  validateRequest,
  createLogger,
} from "@ru/config";
import { createRazorpaySubscription } from "@/lib/razorpay";
import { getCurrentUser } from "@/lib/auth";

const log = createLogger("api:razorpay:subscription");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateRequest(subscriptionSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, errors: validation.errors },
        { status: 400 }
      );
    }
    const { planSlug, termsAccepted } = validation.data;

    // Require authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to continue" },
        { status: 401 }
      );
    }

    // Record T&C acceptance (idempotent — only sets if not already set)
    if (termsAccepted && !user.termsAcceptedAt) {
      await prisma.user.update({
        where: { id: user.id },
        data: { termsAcceptedAt: new Date() },
      });
    }

    // Look up the plan by slug
    const plan = await prisma.plan.findUnique({
      where: { slug: planSlug },
      include: { product: true },
    });

    if (!plan || !plan.isActive || plan.type !== "SUBSCRIPTION") {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    if (!plan.razorpayPlanId) {
      return NextResponse.json(
        { error: "Subscription plan not configured" },
        { status: 400 }
      );
    }

    // Check if user already has an active membership for this plan
    const existingMembership = await prisma.membership.findUnique({
      where: { userId_planId: { userId: user.id, planId: plan.id } },
    });

    if (existingMembership?.status === "ACTIVE") {
      return NextResponse.json(
        { error: "You already have an active subscription for this plan" },
        { status: 400 }
      );
    }

    // Create Razorpay subscription
    const env = getServerEnv();
    const keyPreview = env.RAZORPAY_KEY_ID
      ? `${env.RAZORPAY_KEY_ID.slice(0, 8)}...${env.RAZORPAY_KEY_ID.slice(-4)}`
      : "MISSING";
    const secretPresent = env.RAZORPAY_KEY_SECRET ? `set (${env.RAZORPAY_KEY_SECRET.length} chars)` : "MISSING";
    log.info(
      { keyPreview, secretPresent, razorpayPlanId: plan.razorpayPlanId },
      "Creating Razorpay subscription"
    );

    let subscription;
    try {
      subscription = await createRazorpaySubscription({
        planId: plan.razorpayPlanId,
        totalCount: plan.interval === "ANNUAL" ? 10 : 120,
        notes: {
          planId: plan.id,
          userId: user.id,
          productType: plan.product.type,
        },
      });
    } catch (rzpError: unknown) {
      const errMsg = rzpError instanceof Error ? rzpError.message : String(rzpError);
      const errDetails = typeof rzpError === "object" && rzpError !== null
        ? JSON.stringify(rzpError, null, 2)
        : errMsg;
      log.error(
        { keyPreview, secretPresent, error: errDetails },
        "Razorpay API call failed"
      );
      return NextResponse.json(
        { error: "Payment provider error. Please try again." },
        { status: 502 }
      );
    }

    // Upsert a single membership row for this plan
    await prisma.membership.upsert({
      where: { userId_planId: { userId: user.id, planId: plan.id } },
      update: {
        razorpaySubscriptionId: subscription.id,
        status: "PENDING",
      },
      create: {
        userId: user.id,
        planId: plan.id,
        razorpaySubscriptionId: subscription.id,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: env.RAZORPAY_KEY_ID,
      prefill: {
        name: user.name || "",
        email: user.email,
        contact: user.phone || "",
      },
    });
  } catch (error) {
    log.error({ err: error }, "Failed to create subscription");
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
