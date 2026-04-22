"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@ru/db";
import { couponSchema } from "@ru/config";
import { createAdminAction } from "@/lib/actions/safe-action";

const updateCouponSchema = couponSchema.extend({ id: z.string().cuid() });
const deleteCouponSchema = z.object({ id: z.string().cuid() });

export const createCoupon = createAdminAction("createCoupon", {
  schema: couponSchema,
  audit: {
    action: "coupon.create",
    targetType: "Coupon",
    getTargetId: (_data, result) => result.id,
    getMetadata: (data) => ({
      code: data.code,
      discountType: data.discountType,
      discountValue: data.discountValue,
    }),
  },
  handler: async ({ data }) => {
    const { code, discountType, discountValue, minOrderPaise, maxDiscountPaise, maxUses, validFrom, validUntil, isActive } = data;

    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      throw new Error("A coupon with this code already exists");
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        discountType,
        discountValue,
        minOrderPaise,
        maxDiscountPaise,
        maxUses,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        isActive,
      },
    });

    revalidatePath("/admin/coupons");
    return coupon;
  },
});

export const updateCoupon = createAdminAction("updateCoupon", {
  schema: updateCouponSchema,
  audit: {
    action: "coupon.update",
    targetType: "Coupon",
    getTargetId: (data) => data.id,
    getMetadata: (data) => ({
      code: data.code,
      discountType: data.discountType,
      discountValue: data.discountValue,
    }),
  },
  handler: async ({ data }) => {
    const { id, code, discountType, discountValue, minOrderPaise, maxDiscountPaise, maxUses, validFrom, validUntil, isActive } = data;

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Coupon not found");
    }

    if (code !== existing.code) {
      const codeConflict = await prisma.coupon.findUnique({ where: { code } });
      if (codeConflict) {
        throw new Error("A coupon with this code already exists");
      }
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code,
        discountType,
        discountValue,
        minOrderPaise,
        maxDiscountPaise,
        maxUses,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validUntil: validUntil ? new Date(validUntil) : null,
        isActive,
      },
    });

    revalidatePath("/admin/coupons");
    return coupon;
  },
});

export const deleteCoupon = createAdminAction("deleteCoupon", {
  schema: deleteCouponSchema,
  audit: {
    action: "coupon.delete",
    targetType: "Coupon",
    getTargetId: (data) => data.id,
    getMetadata: (_data, result) => ({
      code: result.code,
      deactivated: result.deactivated,
    }),
  },
  handler: async ({ data }) => {
    const { id } = data;

    const existing = await prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!existing) {
      throw new Error("Coupon not found");
    }

    if (existing._count.orders > 0) {
      await prisma.coupon.update({
        where: { id },
        data: { isActive: false },
      });

      revalidatePath("/admin/coupons");
      return { deleted: false, deactivated: true, code: existing.code };
    }

    await prisma.coupon.delete({ where: { id } });

    revalidatePath("/admin/coupons");
    return { deleted: true, deactivated: false, code: existing.code };
  },
});
