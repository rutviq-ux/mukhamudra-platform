"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@ru/db";
import { affiliateProductSchema } from "@ru/config";
import { createAdminAction } from "@/lib/actions/safe-action";

const updateAffiliateProductSchema = affiliateProductSchema.extend({ id: z.string().cuid() });
const deleteAffiliateProductSchema = z.object({ id: z.string().cuid() });

export const createAffiliateProduct = createAdminAction("createAffiliateProduct", {
  schema: affiliateProductSchema,
  audit: {
    action: "affiliateProduct.create",
    targetType: "AffiliateProduct",
    getTargetId: (_data, result) => result.id,
    getMetadata: (data) => ({
      name: data.name,
      slug: data.slug,
      category: data.category,
    }),
  },
  handler: async ({ data }) => {
    const existing = await prisma.affiliateProduct.findUnique({ where: { slug: data.slug } });
    if (existing) {
      throw new Error("An affiliate product with this slug already exists");
    }

    const product = await prisma.affiliateProduct.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        imageUrl: data.imageUrl,
        affiliateUrl: data.affiliateUrl,
        displayPrice: data.displayPrice,
        category: data.category,
        practiceTypes: data.practiceTypes,
        isFeatured: data.isFeatured,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    revalidatePath("/admin/affiliate-products");
    return product;
  },
});

export const updateAffiliateProduct = createAdminAction("updateAffiliateProduct", {
  schema: updateAffiliateProductSchema,
  audit: {
    action: "affiliateProduct.update",
    targetType: "AffiliateProduct",
    getTargetId: (data) => data.id,
    getMetadata: (data) => ({
      name: data.name,
      slug: data.slug,
      category: data.category,
    }),
  },
  handler: async ({ data }) => {
    const { id, ...rest } = data;

    const existing = await prisma.affiliateProduct.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Affiliate product not found");
    }

    if (rest.slug !== existing.slug) {
      const slugConflict = await prisma.affiliateProduct.findUnique({ where: { slug: rest.slug } });
      if (slugConflict) {
        throw new Error("An affiliate product with this slug already exists");
      }
    }

    const product = await prisma.affiliateProduct.update({
      where: { id },
      data: {
        name: rest.name,
        slug: rest.slug,
        description: rest.description ?? null,
        imageUrl: rest.imageUrl,
        affiliateUrl: rest.affiliateUrl,
        displayPrice: rest.displayPrice,
        category: rest.category,
        practiceTypes: rest.practiceTypes,
        isFeatured: rest.isFeatured,
        isActive: rest.isActive,
        sortOrder: rest.sortOrder,
      },
    });

    revalidatePath("/admin/affiliate-products");
    return product;
  },
});

export const deleteAffiliateProduct = createAdminAction("deleteAffiliateProduct", {
  schema: deleteAffiliateProductSchema,
  audit: {
    action: "affiliateProduct.delete",
    targetType: "AffiliateProduct",
    getTargetId: (data) => data.id,
    getMetadata: (_data, result) => ({
      deleted: result.deleted,
    }),
  },
  handler: async ({ data }) => {
    const { id } = data;

    const existing = await prisma.affiliateProduct.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Affiliate product not found");
    }

    await prisma.affiliateProduct.delete({ where: { id } });

    revalidatePath("/admin/affiliate-products");
    return { deleted: true as const };
  },
});
