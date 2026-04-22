"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminAction } from "@/lib/actions/safe-action";
import { saveConfig } from "@/lib/config";

const numericKeys = [
  "JOIN_WINDOW_BEFORE_MIN",
  "JOIN_WINDOW_AFTER_MIN",
  "SESSION_GENERATION_DAYS",
  "WHATSAPP_RATE_LIMIT_PER_MINUTE",
  "WHATSAPP_RATE_LIMIT_PER_DAY",
  "CURRENCY_SUBUNIT",
  "RECORDING_ADDON_PAISE",
  "RECORDING_ACCESS_DAYS",
] as const;

const stringKeys = [
  "CURRENCY",
  "DEFAULT_TIMEZONE",
  "DEFAULT_COACH_EMAIL",
] as const;

const allKeys = [...numericKeys, ...stringKeys] as const;

const globalConfigSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.null()]))
  .refine(
    (obj) => {
      const keys = Object.keys(obj);
      return keys.length > 0 && keys.every((k) => (allKeys as readonly string[]).includes(k));
    },
    { message: "No valid config keys provided" },
  )
  .transform((obj) => {
    const updates: Record<string, string | number> = {};

    for (const key of numericKeys) {
      if (key in obj) {
        const val = Number(obj[key]);
        if (isNaN(val) || val < 0) {
          throw new Error(`${key} must be a non-negative number`);
        }
        updates[key] = val;
      }
    }

    for (const key of stringKeys) {
      if (key in obj) {
        const val = String(obj[key]).trim();
        if (!val) {
          throw new Error(`${key} must not be empty`);
        }
        updates[key] = val;
      }
    }

    return updates;
  });

export const updateGlobalConfig = createAdminAction("updateGlobalConfig", {
  schema: globalConfigSchema,
  audit: {
    action: "global_config.update",
    targetType: "Setting",
    getTargetId: () => "global_config",
    getMetadata: (_data, result) => result,
  },
  handler: async ({ data, user }) => {
    const saved = await saveConfig(data, user.id);
    revalidatePath("/admin/super-settings");
    return saved;
  },
});
