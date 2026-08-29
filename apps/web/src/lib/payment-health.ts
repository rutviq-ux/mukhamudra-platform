import { prisma } from "@ru/db";

export const PAYMENT_HEALTH_WINDOW_DAYS = 7;

export function paymentHealthSince(
  now = new Date(),
  days = PAYMENT_HEALTH_WINDOW_DAYS,
): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function formatInrFromPaise(amountPaise: number): string {
  return `₹${(amountPaise / 100).toLocaleString("en-IN")}`;
}

export async function getPaymentHealthSummary(since = paymentHealthSince()) {
  const [failedOrders, pendingCount, paidCount] = await Promise.all([
    prisma.order.findMany({
      where: { status: "FAILED", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: { select: { name: true } },
      },
    }),
    prisma.order.count({
      where: { status: "PENDING", createdAt: { gte: since } },
    }),
    prisma.order.count({
      where: { status: "PAID", paidAt: { gte: since } },
    }),
  ]);

  const failedAmountPaise = failedOrders.reduce(
    (sum, order) => sum + order.amountPaise,
    0,
  );

  return {
    since,
    failedCount: failedOrders.length,
    failedAmountPaise,
    pendingCount,
    paidCount,
    failedOrders,
  };
}

export function formatPaymentHealthBody(summary: {
  failedCount: number;
  failedAmountPaise: number;
  pendingCount: number;
  paidCount: number;
  failedOrders: {
    user: { name: string | null; email: string };
    plan: { name: string };
    amountPaise: number;
  }[];
}): string {
  const lines = summary.failedOrders.slice(0, 20).map((order) => {
    const who = order.user.name || order.user.email;
    return `• ${who} — ${order.plan.name} — ${formatInrFromPaise(order.amountPaise)}`;
  });

  const extra =
    summary.failedOrders.length > 20
      ? `\n…and ${summary.failedOrders.length - 20} more`
      : "";

  return [
    `Failed orders (7 days): ${summary.failedCount} (${formatInrFromPaise(summary.failedAmountPaise)})`,
    `Pending orders (7 days): ${summary.pendingCount}`,
    `Paid orders (7 days): ${summary.paidCount}`,
    "",
    lines.length > 0 ? lines.join("\n") + extra : "No failed orders this week.",
  ].join("\n");
}
