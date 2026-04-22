import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { withCronAuth } from "@/lib/cron-auth";
import { getRazorpay } from "@/lib/razorpay";
import { getSubscriptionPeriod } from "@/lib/memberships";
import {
  notifySubscriptionActivated,
  notifyBundleWelcome,
  notifyPaymentSuccess,
  notifyRecordingAddonPurchased,
  queueWhatsAppGroupAdd,
} from "@ru/notifications";

const log = createLogger("cron:sync-payments");

// Only sync records older than 15 minutes (give webhooks time to arrive first)
const STALE_THRESHOLD_MS = 15 * 60_000;

/**
 * POST /api/cron/sync-payments
 *
 * Reconciliation cron (every 10 min): polls Razorpay API for PENDING
 * memberships and orders, and syncs their status.
 *
 * This is the safety net for missed/failed webhooks. The webhook handler
 * is the primary real-time path; this cron catches anything it missed.
 */
async function handler(request: NextRequest) {
  const razorpay = getRazorpay();
  const staleDate = new Date(Date.now() - STALE_THRESHOLD_MS);

  const results = {
    memberships: { synced: 0, failed: 0, skipped: 0 },
    orders: { synced: 0, failed: 0, skipped: 0 },
  };

  // ─── 1. Sync stale PENDING memberships ───────────────────────────
  try {
    const pendingMemberships = await prisma.membership.findMany({
      where: {
        status: "PENDING",
        razorpaySubscriptionId: { not: null },
        createdAt: { lt: staleDate },
      },
      include: {
        plan: { include: { product: true } },
        user: { select: { id: true, phone: true } },
      },
      take: 50,
    });

    for (const membership of pendingMemberships) {
      try {
        const sub = await razorpay.subscriptions.fetch(
          membership.razorpaySubscriptionId!,
        );

        if (sub.status === "active") {
          // Activate — same logic as webhook handleSubscriptionActivated
          const { periodStart, periodEnd } = getSubscriptionPeriod(sub as any);

          await prisma.membership.update({
            where: { id: membership.id },
            data: {
              status: "ACTIVE",
              periodStart,
              periodEnd,
            },
          });

          log.info(
            { membershipId: membership.id, subscriptionId: sub.id },
            "Membership activated via sync",
          );
          results.memberships.synced++;

          // Fire notifications (same as webhook)
          const isBundle = membership.plan.product.type === "BUNDLE";
          if (isBundle && periodEnd) {
            notifyBundleWelcome({
              userId: membership.userId,
              periodEnd,
            }).catch((err) =>
              log.error({ err }, "Sync: failed to queue bundle welcome"),
            );
          } else {
            notifySubscriptionActivated({
              userId: membership.userId,
              planName: membership.plan.name,
              endDate: periodEnd
                ? periodEnd.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Ongoing",
            }).catch((err) =>
              log.error({ err }, "Sync: failed to queue activation notification"),
            );
          }

          // Queue WhatsApp group adds
          if (membership.user.phone) {
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
              queueWhatsAppGroupAdd(membership.user.phone, batch.slug).catch(
                (err) =>
                  log.error(
                    { err, batchSlug: batch.slug },
                    "Sync: failed to queue WA group add",
                  ),
              );
            }
          }
        } else if (
          sub.status === "cancelled" ||
          sub.status === "expired"
        ) {
          await prisma.membership.update({
            where: { id: membership.id },
            data: {
              status: "CANCELLED",
              cancelledAt: new Date(),
            },
          });

          log.info(
            { membershipId: membership.id, razorpayStatus: sub.status },
            "Membership cancelled via sync",
          );
          results.memberships.synced++;
        } else {
          // Still pending/created at Razorpay — skip for now
          results.memberships.skipped++;
        }
      } catch (error) {
        log.error(
          { err: error, membershipId: membership.id },
          "Failed to sync membership",
        );
        results.memberships.failed++;
      }
    }
  } catch (error) {
    log.error({ err: error }, "Failed to query pending memberships");
  }

  // ─── 2. Sync stale PENDING orders ────────────────────────────────
  try {
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: "PENDING",
        createdAt: { lt: staleDate },
      },
      include: {
        plan: true,
        user: { select: { id: true } },
      },
      take: 50,
    });

    for (const order of pendingOrders) {
      try {
        const payments = await razorpay.orders.fetchPayments(
          order.razorpayOrderId,
        );

        // Find a captured (successful) payment
        const captured = (payments as any).items?.find(
          (p: any) => p.status === "captured",
        );

        if (captured) {
          // Mark as paid — same logic as webhook handlePaymentCaptured
          await prisma.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: "PAID",
                razorpayPaymentId: captured.id,
                paidAt: new Date(),
              },
            });

            // Recording add-on: create RecordingAccess
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

              notifyRecordingAddonPurchased({
                userId: order.userId,
                expiresAt,
              }).catch((err) =>
                log.error(
                  { err },
                  "Sync: failed to queue recording addon notification",
                ),
              );
            }

            // Update coupon usage
            if (order.couponId) {
              await tx.coupon.update({
                where: { id: order.couponId },
                data: { usedCount: { increment: 1 } },
              });
            }
          });

          log.info(
            { orderId: order.id, paymentId: captured.id },
            "Order paid via sync",
          );
          results.orders.synced++;

          // Notify (non-recording orders)
          if (order.plan.slug !== "recording-addon") {
            notifyPaymentSuccess({
              userId: order.userId,
              orderId: order.id,
              planName: order.plan.name,
              amount: (order.amountPaise / 100).toLocaleString("en-IN"),
            }).catch((err) =>
              log.error({ err }, "Sync: failed to queue payment notification"),
            );
          }
        } else {
          // Check if all payments failed
          const allFailed =
            (payments as any).items?.length > 0 &&
            (payments as any).items.every(
              (p: any) => p.status === "failed",
            );

          if (allFailed) {
            await prisma.order.update({
              where: { id: order.id },
              data: { status: "FAILED" },
            });

            log.info({ orderId: order.id }, "Order failed via sync");
            results.orders.synced++;
          } else {
            // No payments yet or still processing
            results.orders.skipped++;
          }
        }
      } catch (error) {
        log.error(
          { err: error, orderId: order.id },
          "Failed to sync order",
        );
        results.orders.failed++;
      }
    }
  } catch (error) {
    log.error({ err: error }, "Failed to query pending orders");
  }

  log.info({ results }, "Payment sync complete");

  return NextResponse.json({
    status: "ok",
    ...results,
  });
}

export const POST = withCronAuth(handler);
