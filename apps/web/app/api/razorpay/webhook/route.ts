import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import {
  getServerEnv,
  razorpayWebhookSchema,
  validateRequest,
  createLogger,
} from "@ru/config";
import {
  notifyPaymentSuccess,
  notifySubscriptionActivated,
  notifyRecordingAddonPurchased,
  notifyBundleWelcome,
  queueWhatsAppGroupAdd,
  queueWhatsAppGroupRemove,
  emitSequenceEvent,
  notifyPaymentFailed,
  notifyMembershipActivatedEmail,
  notifyMembershipCancelledEmail,
} from "@ru/notifications";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { getSubscriptionPeriod } from "@/lib/memberships";

const log = createLogger("api:razorpay:webhook");

export async function POST(request: NextRequest) {
  const env = getServerEnv();

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(
      rawBody,
      signature,
      env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!isValid) {
      log.warn("Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const validation = validateRequest(razorpayWebhookSchema, parsedPayload);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, errors: validation.errors },
        { status: 400 }
      );
    }

    const payload = validation.data;
    const event = payload.event;
    const entityId =
      payload.payload?.payment?.entity?.id ||
      payload.payload?.subscription?.entity?.id ||
      String(Date.now());
    // Prefix with event type to avoid collisions — e.g. payment.captured
    // and subscription.activated can share the same payment entity ID
    const eventId = `${event}:${entityId}`;

    // Idempotency check - have we already processed this event?
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent) {
      log.info({ eventId }, "Webhook event already processed");
      return NextResponse.json({ status: "already_processed" });
    }

    // Store webhook event for audit
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        provider: "razorpay",
        eventType: event,
        eventId,
        payload: JSON.parse(JSON.stringify(payload)),
        status: "PENDING",
      },
    });

    try {
      // Process based on event type
      switch (event) {
        case "payment.captured":
          await handlePaymentCaptured(payload);
          break;
        case "subscription.activated":
          await handleSubscriptionActivated(payload);
          break;
        case "subscription.charged":
          await handleSubscriptionCharged(payload);
          break;
        case "subscription.cancelled":
          await handleSubscriptionCancelled(payload);
          break;
        case "payment.failed":
          await handlePaymentFailed(payload);
          break;
        default:
          log.info({ event }, "Unhandled event type");
      }

      // Mark as processed
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: "PROCESSED", processedAt: new Date() },
      });

      return NextResponse.json({ status: "processed" });
    } catch (error) {
      // Mark as failed
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
      throw error;
    }
  } catch (error) {
    log.error({ err: error }, "Webhook processing failed");
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handlePaymentCaptured(payload: any) {
  const payment = payload.payload.payment.entity;
  const orderId = payment.order_id;

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { razorpayOrderId: orderId },
      include: { plan: true },
    });

    if (!order) {
      log.error({ orderId }, "Order not found for razorpay order");
      return { status: "not_found" as const };
    }

    // Idempotent check
    if (order.status === "PAID") {
      log.info({ orderId: order.id }, "Order already marked as paid");
      return { status: "already_paid" as const };
    }

    // Update order status
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        razorpayPaymentId: payment.id,
        paidAt: new Date(),
      },
    });

    // ─── Recording add-on: create RecordingAccess ───
    if (order.plan.slug === "recording-addon") {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await tx.recordingAccess.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          expiresAt,
          isActive: true,
        },
      });

      return {
        status: "recording_addon" as const,
        orderId: order.id,
        userId: order.userId,
        expiresAt,
      };
    }

    // Update coupon usage count if applicable
    if (order.couponId) {
      await tx.coupon.update({
        where: { id: order.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    // ─── One-time subscription plan: activate membership ───
    const periodEnd = new Date();
    periodEnd.setDate(
      periodEnd.getDate() + (order.plan.durationDays ?? (order.plan.interval === "ANNUAL" ? 365 : 30))
    );

    await tx.membership.upsert({
      where: { userId_planId: { userId: order.userId, planId: order.planId } },
      update: {
        status: "ACTIVE",
        periodStart: new Date(),
        periodEnd,
      },
      create: {
        userId: order.userId,
        planId: order.planId,
        status: "ACTIVE",
        periodStart: new Date(),
        periodEnd,
      },
    });

    return {
      status: "updated" as const,
      orderId: order.id,
      userId: order.userId,
      planId: order.planId,
      periodEnd,
    };
  });

  // Fire-and-forget notifications based on result
  if (result.status === "recording_addon") {
    log.info(
      { orderId: result.orderId },
      "Recording add-on purchased, access granted"
    );
    notifyRecordingAddonPurchased({
      userId: result.userId,
      expiresAt: result.expiresAt,
    }).catch((err) =>
      log.error({ err }, "Failed to queue recording addon notification")
    );
  } else if (result.status === "updated") {
    log.info({ orderId: result.orderId }, "Order paid, membership activated");

    const order = await prisma.order.findUnique({
      where: { razorpayOrderId: orderId },
      include: { plan: { include: { product: true } } },
    });
    if (order) {
      notifyPaymentSuccess({
        userId: order.userId,
        orderId: order.id,
        planName: order.plan.name,
        amount: (order.amountPaise / 100).toLocaleString("en-IN"),
      }).catch((err) =>
        log.error({ err }, "Failed to queue payment confirmation notification")
      );

      notifyMembershipActivatedEmail({
        userId: order.userId,
        planName: order.plan.name,
        endDate: result.periodEnd.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      }).catch((err) =>
        log.error({ err }, "Failed to queue membership activated email")
      );

      // Queue WhatsApp group adds
      const user = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { phone: true },
      });

      if (user?.phone) {
        const productTypes =
          order.plan.product.type === "BUNDLE"
            ? ["FACE_YOGA", "PRANAYAMA"]
            : [order.plan.product.type];

        const batches = await prisma.batch.findMany({
          where: {
            isActive: true,
            product: { type: { in: productTypes as any } },
          },
          select: { slug: true },
        });

        for (const batch of batches) {
          queueWhatsAppGroupAdd(user.phone, batch.slug).catch((err) =>
            log.error({ err, batchSlug: batch.slug }, "Failed to queue WhatsApp group add")
          );
        }
      }

      emitSequenceEvent("subscription.activated", {
        userId: order.userId,
      }).catch((err) =>
        log.error({ err }, "Failed to emit subscription.activated sequence event")
      );
    }
  }
}

async function handleSubscriptionActivated(payload: any) {
  const subscription = payload.payload.subscription.entity;
  const subscriptionId = subscription.id;

  // Find membership for this subscription
  const membership = await prisma.membership.findUnique({
    where: { razorpaySubscriptionId: subscriptionId },
    include: { plan: { include: { product: true } } },
  });

  if (!membership) {
    log.error({ subscriptionId }, "No membership found for subscription");
    return;
  }

  // Idempotency — already active, skip
  if (membership.status === "ACTIVE") {
    log.info({ subscriptionId }, "Membership already active");
    return;
  }

  const { periodStart: currentPeriodStart, periodEnd: currentPeriodEnd } =
    getSubscriptionPeriod(subscription);

  // Activate the membership
  await prisma.membership.update({
    where: { id: membership.id },
    data: {
      status: "ACTIVE",
      periodStart: currentPeriodStart,
      periodEnd: currentPeriodEnd,
    },
  });

  log.info({ subscriptionId }, "Membership activated");

  // Send notification
  const isBundle = membership.plan.product.type === "BUNDLE";

  if (isBundle && currentPeriodEnd) {
    notifyBundleWelcome({
      userId: membership.userId,
      periodEnd: currentPeriodEnd,
    }).catch((err) =>
      log.error({ err }, "Failed to queue bundle welcome notification")
    );
  } else {
    notifySubscriptionActivated({
      userId: membership.userId,
      planName: membership.plan.name,
      endDate: currentPeriodEnd
        ? currentPeriodEnd.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "Ongoing",
    }).catch((err) =>
      log.error(
        { err },
        "Failed to queue subscription activated notification"
      )
    );
  }

  // Queue WhatsApp group adds for all batches the product covers
  const user = await prisma.user.findUnique({
    where: { id: membership.userId },
    select: { phone: true },
  });

  if (user?.phone) {
    const productTypes =
      membership.plan.product.type === "BUNDLE"
        ? ["FACE_YOGA", "PRANAYAMA"]
        : [membership.plan.product.type];

    const batches = await prisma.batch.findMany({
      where: {
        isActive: true,
        product: { type: { in: productTypes as any } },
      },
      select: { slug: true },
    });

    for (const batch of batches) {
      queueWhatsAppGroupAdd(user.phone, batch.slug).catch((err) =>
        log.error(
          { err, batchSlug: batch.slug },
          "Failed to queue WhatsApp group add"
        )
      );
    }
  }

  // Cancel lead/onboarding sequences and trigger active-user engagement
  emitSequenceEvent("subscription.activated", {
    userId: membership.userId,
  }).catch((err) =>
    log.error({ err }, "Failed to emit subscription.activated sequence event")
  );

  // Send membership activation email
  notifyMembershipActivatedEmail({
    userId: membership.userId,
    planName: membership.plan.name,
    endDate: currentPeriodEnd
      ? currentPeriodEnd.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "Ongoing",
  }).catch((err) =>
    log.error({ err }, "Failed to queue membership activated email")
  );
}

async function handleSubscriptionCharged(payload: any) {
  const subscription = payload.payload.subscription.entity;
  const subscriptionId = subscription.id;

  const membership = await prisma.membership.findUnique({
    where: { razorpaySubscriptionId: subscriptionId },
    include: { plan: { include: { product: true } } },
  });

  if (!membership) return;

  const { periodStart: currentPeriodStart, periodEnd: currentPeriodEnd } =
    getSubscriptionPeriod(subscription);

  await prisma.membership.update({
    where: { id: membership.id },
    data: {
      status: "ACTIVE",
      periodStart: currentPeriodStart,
      periodEnd: currentPeriodEnd,
    },
  });

  log.info(
    { subscriptionId, periodEnd: currentPeriodEnd },
    "Membership renewed"
  );
}

async function handleSubscriptionCancelled(payload: any) {
  const subscription = payload.payload.subscription.entity;
  const subscriptionId = subscription.id;

  const membership = await prisma.membership.findUnique({
    where: { razorpaySubscriptionId: subscriptionId },
    include: { plan: { include: { product: true } } },
  });

  if (!membership) return;

  await prisma.membership.update({
    where: { id: membership.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });

  log.info({ subscriptionId }, "Membership cancelled");

  // Queue WhatsApp group removals for all batches the product covered
  const user = await prisma.user.findUnique({
    where: { id: membership.userId },
    select: { phone: true },
  });

  if (user?.phone) {
    const productTypes =
      membership.plan.product.type === "BUNDLE"
        ? ["FACE_YOGA", "PRANAYAMA"]
        : [membership.plan.product.type];

    const batches = await prisma.batch.findMany({
      where: {
        isActive: true,
        product: { type: { in: productTypes as any } },
      },
      select: { slug: true },
    });

    for (const batch of batches) {
      queueWhatsAppGroupRemove(user.phone, batch.slug).catch((err) =>
        log.error(
          { err, batchSlug: batch.slug },
          "Failed to queue WhatsApp group remove"
        )
      );
    }
  }

  // Trigger cancellation sequences (win-back flows)
  emitSequenceEvent("subscription.cancelled", {
    userId: membership.userId,
  }).catch((err) =>
    log.error({ err }, "Failed to emit subscription.cancelled sequence event")
  );

  // Send membership cancellation email
  notifyMembershipCancelledEmail({
    userId: membership.userId,
    planName: membership.plan.name,
    endDate: membership.periodEnd
      ? membership.periodEnd.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "N/A",
  }).catch((err) =>
    log.error({ err }, "Failed to queue membership cancelled email")
  );
}

async function handlePaymentFailed(payload: any) {
  const payment = payload.payload.payment.entity;
  const orderId = payment.order_id;

  if (orderId) {
    await prisma.order.updateMany({
      where: { razorpayOrderId: orderId, status: "PENDING" },
      data: { status: "FAILED" },
    });

    // Notify user about failed payment
    const order = await prisma.order.findFirst({
      where: { razorpayOrderId: orderId },
      include: { plan: true },
    });

    if (order) {
      notifyPaymentFailed({
        userId: order.userId,
        orderId: order.id,
        planName: order.plan.name,
        amount: (order.amountPaise / 100).toLocaleString("en-IN"),
        reason: payment.error_description || payment.error_reason || "Payment failed",
      }).catch((err) =>
        log.error({ err }, "Failed to queue payment failed notification")
      );
    }
  }

  log.warn({ orderId }, "Payment failed");
}
