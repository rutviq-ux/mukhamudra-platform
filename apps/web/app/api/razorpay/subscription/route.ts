import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import {
  getServerEnv,
  subscriptionSchema,
  validateRequest,
  createLogger,
} from "@ru/config";
import { createRazorpaySubscription, createRazorpayOrder } from "@/lib/razorpay";
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
    const { planSlug, termsAccepted, autoRenew } = validation.data;

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

    // Create Razorpay subscription OR one-time order
    const env = getServerEnv();

    let responsePayload: Record<string, unknown>;

    if (autoRenew === false) {
      // One-time order (no autopay)
      let order;
      try {
        order = await createRazorpayOrder({
          amount: plan.price, // already in paise
          notes: {
            planId: plan.id,
            userId: user.id,
            productType: plan.product.type,
          },
        });
      } catch (rzpError: unknown) {
        const errMsg = rzpError instanceof Error ? rzpError.message : String(rzpError);
        log.error({ error: errMsg }, "Razorpay order creation failed");
        return NextResponse.json(
          { error: "Payment provider error. Please try again." },
          { status: 502 }
        );
      }

      await prisma.membership.upsert({
        where: { userId_planId: { userId: user.id, planId: plan.id } },
        update: { razorpayOrderId: order.id, status: "PENDING" },
        create: {
          userId: user.id,
          planId: plan.id,
          razorpayOrderId: order.id,
          status: "PENDING",
        },
      });

      responsePayload = {
        orderId: order.id,
        keyId: env.RAZORPAY_KEY_ID,
        amount: plan.price,
        prefill: {
          name: user.name || "",
          email: user.email,
          contact: user.phone || "",
        },
      };
    } else {
      // Subscription (autopay)
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
        log.error({ error: errMsg }, "Razorpay subscription creation failed");
        return NextResponse.json(
          { error: "Payment provider error. Please try again." },
          { status: 502 }
        );
      }

      await prisma.membership.upsert({
        where: { userId_planId: { userId: user.id, planId: plan.id } },
        update: { razorpaySubscriptionId: subscription.id, status: "PENDING" },
        create: {
          userId: user.id,
          planId: plan.id,
          razorpaySubscriptionId: subscription.id,
          status: "PENDING",
        },
      });

      responsePayload = {
        subscriptionId: subscription.id,
        keyId: env.RAZORPAY_KEY_ID,
        prefill: {
          name: user.name || "",
          email: user.email,
          contact: user.phone || "",
        },
      };
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    log.error({ err: error }, "Failed to create subscription");
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
