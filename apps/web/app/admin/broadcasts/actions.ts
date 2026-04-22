"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@ru/db";
import { broadcastSchema } from "@ru/config";
import { createAdminAction } from "@/lib/actions/safe-action";

const updateBroadcastSchema = broadcastSchema.extend({
  id: z.string().cuid(),
});
const idSchema = z.object({ id: z.string().cuid() });

export const createBroadcast = createAdminAction("createBroadcast", {
  schema: broadcastSchema,
  audit: {
    action: "broadcast.create",
    targetType: "Broadcast",
    getTargetId: (_data, result) => result.id,
    getMetadata: (data) => ({ name: data.name, templateId: data.templateId }),
  },
  handler: async ({ data, user }) => {
    const { name, templateId, variables, segment, scheduledFor } = data;

    const template = await prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      throw new Error("Template not found");
    }

    const broadcast = await prisma.broadcast.create({
      data: {
        name,
        templateId,
        variables,
        segment,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        createdBy: user.id,
      },
      include: {
        template: { select: { name: true, channel: true } },
        creator: { select: { name: true, email: true } },
      },
    });

    revalidatePath("/admin/broadcasts");
    return broadcast;
  },
});

export const updateBroadcast = createAdminAction("updateBroadcast", {
  schema: updateBroadcastSchema,
  audit: {
    action: "broadcast.update",
    targetType: "Broadcast",
    getTargetId: (data) => data.id,
    getMetadata: (data) => ({ name: data.name }),
  },
  handler: async ({ data }) => {
    const { id, name, templateId, variables, segment, scheduledFor } = data;

    const existing = await prisma.broadcast.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Broadcast not found");
    }
    if (existing.status !== "DRAFT") {
      throw new Error("Can only edit draft broadcasts");
    }

    const broadcast = await prisma.broadcast.update({
      where: { id },
      data: {
        name,
        templateId,
        variables,
        segment,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      },
      include: {
        template: { select: { name: true, channel: true } },
        creator: { select: { name: true, email: true } },
      },
    });

    revalidatePath("/admin/broadcasts");
    return broadcast;
  },
});

export const deleteBroadcast = createAdminAction("deleteBroadcast", {
  schema: idSchema,
  audit: {
    action: "broadcast.delete",
    targetType: "Broadcast",
    getTargetId: (data) => data.id,
    getMetadata: (_data, result) => ({ name: result.name }),
  },
  handler: async ({ data }) => {
    const { id } = data;

    const existing = await prisma.broadcast.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Broadcast not found");
    }
    if (existing.status !== "DRAFT") {
      throw new Error(
        "Can only delete draft broadcasts. Cancel a sending broadcast instead.",
      );
    }

    await prisma.broadcast.delete({ where: { id } });

    revalidatePath("/admin/broadcasts");
    return { name: existing.name };
  },
});

/** Build Prisma where clause for user segments */
function buildUserWhere(
  segment: any,
  channel: string,
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  if (segment.hasActiveMembership) {
    where.memberships = { some: { status: "ACTIVE" } };
  }
  if (segment.goal && segment.goal.length > 0) {
    where.goal = { in: segment.goal };
  }
  if (segment.onboardedBefore) {
    where.onboardedAt = {
      ...((where.onboardedAt as object) || {}),
      lt: new Date(segment.onboardedBefore),
    };
  }
  if (segment.onboardedAfter) {
    where.onboardedAt = {
      ...((where.onboardedAt as object) || {}),
      gte: new Date(segment.onboardedAfter),
    };
  }
  if (segment.lastAttendedBefore) {
    where.attendances = {
      none: { joinedAt: { gte: new Date(segment.lastAttendedBefore) } },
    };
  }

  if (channel === "WHATSAPP") where.whatsappOptIn = true;
  if (channel === "EMAIL") where.marketingOptIn = true;
  if (channel === "PUSH") where.pushOptIn = true;

  return where;
}

export const previewBroadcast = createAdminAction("previewBroadcast", {
  schema: idSchema,
  audit: {
    action: "broadcast.preview",
    targetType: "Broadcast",
    getTargetId: (data) => data.id,
  },
  handler: async ({ data }) => {
    const { id } = data;

    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
      include: { template: true },
    });
    if (!broadcast) {
      throw new Error("Broadcast not found");
    }

    const segment = broadcast.segment as any;
    const channel = broadcast.template.channel;
    const audience = segment.audience || "users";
    let userCount = 0;
    let leadCount = 0;

    if (audience === "users" || audience === "all") {
      const where = buildUserWhere(segment, channel);
      userCount = await prisma.user.count({ where });
    }

    if (
      (audience === "leads" || audience === "all") &&
      channel === "WHATSAPP"
    ) {
      leadCount = await prisma.lead.count();
    }

    revalidatePath("/admin/broadcasts");
    return { userCount, leadCount, recipientCount: userCount + leadCount };
  },
});

export const sendBroadcast = createAdminAction("sendBroadcast", {
  schema: idSchema,
  audit: {
    action: "broadcast.send",
    targetType: "Broadcast",
    getTargetId: (data) => data.id,
    getMetadata: (_data, result) => ({ name: result.name }),
  },
  handler: async ({ data }) => {
    const { id } = data;

    const broadcast = await prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) {
      throw new Error("Broadcast not found");
    }
    if (broadcast.status !== "DRAFT") {
      throw new Error("Broadcast is not in draft status");
    }

    await prisma.broadcast.update({
      where: { id },
      data: { scheduledFor: new Date() },
    });

    revalidatePath("/admin/broadcasts");
    return { name: broadcast.name };
  },
});

export const cancelBroadcast = createAdminAction("cancelBroadcast", {
  schema: idSchema,
  audit: {
    action: "broadcast.cancel",
    targetType: "Broadcast",
    getTargetId: (data) => data.id,
    getMetadata: (_data, result) => ({ name: result.name }),
  },
  handler: async ({ data }) => {
    const { id } = data;

    const broadcast = await prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) {
      throw new Error("Broadcast not found");
    }
    if (broadcast.status === "COMPLETED" || broadcast.status === "DRAFT") {
      throw new Error(
        "Can only cancel sending or scheduled broadcasts",
      );
    }

    await prisma.broadcast.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/admin/broadcasts");
    return { name: broadcast.name };
  },
});
