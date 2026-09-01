"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@ru/db";
import { membershipStatusSchema, createLogger } from "@ru/config";
import { createAdminAction } from "@/lib/actions/safe-action";
import { syncUserMeetGroups } from "@/lib/sync-meet-group";

const log = createLogger("action:updateMembershipStatus");

const updateMembershipStatusSchema = membershipStatusSchema.extend({
  id: z.string().cuid(),
});

export const updateMembershipStatus = createAdminAction(
  "updateMembershipStatus",
  {
    schema: updateMembershipStatusSchema,
    audit: {
      action: "membership.update_status",
      targetType: "Membership",
      getTargetId: (data) => data.id,
      getMetadata: (data, result) => ({
        userId: result.userId,
        userEmail: result.userEmail,
        from: result.previousStatus,
        to: data.status,
        ...(data.periodEnd ? { periodEnd: data.periodEnd } : {}),
      }),
    },
    handler: async ({ data }) => {
      const { id, status: newStatus, periodEnd } = data;

      const membership = await prisma.membership.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, email: true } },
          plan: { include: { product: { select: { type: true } } } },
        },
      });

      if (!membership) {
        throw new Error("Membership not found");
      }

      if (newStatus === membership.status) {
        throw new Error("Status is already " + newStatus);
      }

      const updateData: Record<string, unknown> = { status: newStatus };

      // Set timestamps based on status transition
      if (newStatus === "ACTIVE" && !membership.periodStart) {
        updateData.periodStart = new Date();
      }
      if (newStatus === "CANCELLED") {
        updateData.cancelledAt = new Date();
      }
      if (newStatus === "PAUSED") {
        updateData.pausedAt = new Date();
      }

      // Optional periodEnd override
      if (periodEnd) {
        updateData.periodEnd = new Date(periodEnd);
      }

      await prisma.membership.update({ where: { id }, data: updateData });

      syncUserMeetGroups(
        membership.user.email,
        membership.plan.product.type,
        newStatus === "ACTIVE" ? "add" : "remove",
      ).catch((err) =>
        log.error({ err }, "Failed to sync Meet group after status change"),
      );

      log.info(
        { membershipId: id, from: membership.status, to: newStatus },
        "Membership status updated by admin",
      );

      revalidatePath("/admin/users");
      revalidatePath(`/admin/users/${membership.user.id}`);

      return {
        userId: membership.user.id,
        userEmail: membership.user.email,
        previousStatus: membership.status,
      };
    },
  },
);
