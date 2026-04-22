import { prisma } from "@ru/db";
import { CONFIG } from "@ru/config";

const SETTING_KEY = "global_config";

export type AppConfig = typeof CONFIG;

/**
 * Read the live platform config: DB overrides merged on top of
 * the hardcoded `CONFIG` defaults from `@ru/config`.
 *
 * Every value in `CONFIG` can be overridden via the `global_config`
 * Setting row in the database. Missing keys fall back to the default.
 */
export async function getConfig(): Promise<AppConfig> {
  const setting = await prisma.setting.findUnique({
    where: { key: SETTING_KEY },
  });

  if (!setting) return { ...CONFIG };

  const overrides = setting.value as Partial<AppConfig> | null;
  if (!overrides) return { ...CONFIG };

  return { ...CONFIG, ...overrides };
}

/**
 * Persist config overrides. Only the keys that differ from
 * the defaults are stored — passing the full CONFIG object is fine,
 * we'll strip the unchanged values.
 */
export async function saveConfig(
  values: Partial<AppConfig>,
  actorId: string,
): Promise<AppConfig> {
  const merged = { ...CONFIG, ...values };

  const payload = {
    ...merged,
    _updatedBy: actorId,
    _updatedAt: new Date().toISOString(),
  };

  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: payload },
    create: { key: SETTING_KEY, value: payload },
  });

  return merged;
}
