import { prisma } from "@ru/db";

export const NOTIFICATION_CHANNELS_KEY = "notification_channels";

export interface NotificationChannelSettings {
  whatsapp: boolean;
  email: boolean;
  push: boolean;
}

const DEFAULTS: NotificationChannelSettings = {
  whatsapp: true,
  email: true,
  push: true,
};

export async function getNotificationChannels(): Promise<NotificationChannelSettings> {
  const setting = await prisma.setting.findUnique({
    where: { key: NOTIFICATION_CHANNELS_KEY },
  });
  const value = setting?.value as Partial<NotificationChannelSettings> | null;
  return {
    whatsapp: value?.whatsapp !== false,
    email: value?.email !== false,
    push: value?.push !== false,
  };
}

export async function isNotificationChannelEnabled(
  channel: string,
): Promise<boolean> {
  if (channel !== "WHATSAPP" && channel !== "EMAIL" && channel !== "PUSH") {
    return true;
  }
  const settings = await getNotificationChannels();
  if (channel === "WHATSAPP") return settings.whatsapp;
  if (channel === "EMAIL") return settings.email;
  return settings.push;
}
