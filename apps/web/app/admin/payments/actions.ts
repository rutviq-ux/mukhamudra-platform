"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@ru/db";
import { orderRefundSchema } from "@ru/config";
import { createAdminAction } from "@/lib/actions/safe-action";

const refundOrderSchema = orderRefundSchema.extend({
  id: z.string().cuid(),
});

export const refundOrder = createAdminAction("refundOrder", {
  schema: refundOrderSchema,
  audit: {
    action: "order.refund",
    targetType: "Order",
    getTargetId: (data) => data.id,
    getMetadata: (_data, result) => ({
      userId: result.userId,
      userEmail: result.userEmail,
      from: result.from,
      to: "REFUNDED",
      amountPaise: result.amountPaise,
    }),
  },
  handler: async ({ data }) => {
    const { id } = data;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== "PAID") {
      throw new Error("Can only refund orders with PAID status");
    }

    await prisma.order.update({
      where: { id },
      data: { status: "REFUNDED" },
    });

    revalidatePath("/admin/payments");

    return {
      userId: order.user.id,
      userEmail: order.user.email,
      from: order.status,
      amountPaise: order.amountPaise,
    };
  },
});
