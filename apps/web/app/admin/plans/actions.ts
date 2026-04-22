"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@ru/db";
import { planSchema } from "@ru/config";
import { createAdminAction } from "@/lib/actions/safe-action";

const updatePlanSchema = planSchema.extend({ id: z.string().cuid() });
const deletePlanSchema = z.object({ id: z.string().cuid() });

const planInclude = {
  product: { select: { name: true, type: true } },
  _count: { select: { orders: true, memberships: true } },
} as const;

export const createPlan = createAdminAction("createPlan", {
  schema: planSchema,
  audit: {
    action: "plan.create",
    targetType: "Plan",
    getTargetId: (_data, result) => result.id,
    getMetadata: (data) => ({
      name: data.name,
      slug: data.slug,
      type: data.type,
      amountPaise: data.amountPaise,
    }),
  },
  handler: async ({ data }) => {
    const existing = await prisma.plan.findUnique({ where: { slug: data.slug } });
    if (existing) {
      throw new Error("A plan with this slug already exists");
    }

    const plan = await prisma.plan.create({
      data: { ...data },
      include: planInclude,
    });

    revalidatePath("/admin/plans");
    return plan;
  },
});

export const updatePlan = createAdminAction("updatePlan", {
  schema: updatePlanSchema,
  audit: {
    action: "plan.update",
    targetType: "Plan",
    getTargetId: (data) => data.id,
    getMetadata: (data) => ({
      name: data.name,
      slug: data.slug,
      type: data.type,
      amountPaise: data.amountPaise,
    }),
  },
  handler: async ({ data }) => {
    const { id, ...rest } = data;

    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Plan not found");
    }

    if (rest.slug !== existing.slug) {
      const slugConflict = await prisma.plan.findUnique({ where: { slug: rest.slug } });
      if (slugConflict) {
        throw new Error("A plan with this slug already exists");
      }
    }

    const plan = await prisma.plan.update({
      where: { id },
      data: { ...rest },
      include: planInclude,
    });

    revalidatePath("/admin/plans");
    return plan;
  },
});

export const deletePlan = createAdminAction("deletePlan", {
  schema: deletePlanSchema,
  audit: {
    action: "plan.delete",
    targetType: "Plan",
    getTargetId: (data) => data.id,
    getMetadata: (_data, result) => ({
      name: result.name,
      deleted: result.deleted,
      deactivated: result.deactivated,
    }),
  },
  handler: async ({ data }) => {
    const { id } = data;

    const existing = await prisma.plan.findUnique({
      where: { id },
      include: { _count: { select: { orders: true, memberships: true } } },
    });
    if (!existing) {
      throw new Error("Plan not found");
    }

    if (existing._count.orders > 0 || existing._count.memberships > 0) {
      await prisma.plan.update({
        where: { id },
        data: { isActive: false },
      });

      revalidatePath("/admin/plans");
      return { deleted: false, deactivated: true, name: existing.name };
    }

    await prisma.plan.delete({ where: { id } });

    revalidatePath("/admin/plans");
    return { deleted: true, deactivated: false, name: existing.name };
  },
});
