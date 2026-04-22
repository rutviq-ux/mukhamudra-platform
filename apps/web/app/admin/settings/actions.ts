"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@ru/db";
import { whatsappRateLimitSchema } from "@ru/config";
import { createAdminAction } from "@/lib/actions/safe-action";

const SETTING_KEY = "whatsapp_rate_limit";

export const updateWhatsappRateLimit = createAdminAction(
  "updateWhatsappRateLimit",
  {
    schema: whatsappRateLimitSchema,
    audit: {
      action: "whatsapp.rate_limit.update",
      targetType: "Setting",
      getTargetId: (_data, result) => result.id,
      getMetadata: (data) => ({
        perMinute: data.perMinute,
        perDay: data.perDay,
      }),
    },
    handler: async ({ data, user }) => {
      const { perMinute, perDay } = data;

      const setting = await prisma.setting.upsert({
        where: { key: SETTING_KEY },
        update: {
          value: {
            perMinute,
            perDay,
            updatedBy: user.id,
            updatedAt: new Date().toISOString(),
          },
        },
        create: {
          key: SETTING_KEY,
          value: {
            perMinute,
            perDay,
            updatedBy: user.id,
            updatedAt: new Date().toISOString(),
          },
        },
      });

      revalidatePath("/admin/settings");
      return setting;
    },
  },
);
