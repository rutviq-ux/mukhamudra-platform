/**
 * WhatsApp send helper — uses Cloud API if configured, otherwise queues for wa-bot.
 *
 * This is the single place that decides which transport to use.
 * All notification functions route through here for WhatsApp.
 */

import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { WhatsAppBusinessProvider } from "./providers/whatsapp";
import { logMessage } from "./audit";
import { isNotificationChannelEnabled } from "./channel-gates";

const log = createLogger("send-whatsapp");

function getCloudProvider(): WhatsAppBusinessProvider | null {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (token && phoneNumberId) {
    return new WhatsAppBusinessProvider({ accessToken: token, phoneNumberId });
  }
  return null;
}

/**
 * Send a WhatsApp message to a user.
 * - If Cloud API is configured: sends immediately via Meta
 * - Otherwise: queues for the wa-bot service to pick up
 */
export async function sendWhatsApp(opts: {
  userId: string;
  phone: string;
  body: string;
  templateName?: string;
  templateParams?: string[];
}): Promise<void> {
  if (!(await isNotificationChannelEnabled("WHATSAPP"))) {
    log.info({ to: opts.phone }, "WhatsApp channel disabled");
    return;
  }

  if (opts.templateName) {
    const template = await prisma.messageTemplate.findUnique({
      where: { name: opts.templateName },
      select: { isActive: true },
    });
    if (template && !template.isActive) {
      log.info({ templateName: opts.templateName }, "WhatsApp template inactive");
      return;
    }
  }

  const cloud = getCloudProvider();

  if (cloud) {
    // Cloud API path — send immediately
    const result = await cloud.send({
      to: opts.phone,
      body: opts.body,
      templateName: opts.templateName,
      templateParams: opts.templateParams,
    });

    await logMessage({
      channel: "WHATSAPP",
      to: opts.phone,
      userId: opts.userId,
      body: opts.body,
      status: result.success ? "SENT" : "FAILED",
      providerMessageId: result.messageId,
      error: result.error,
    }).catch((err) => log.error({ err }, "Failed to log WhatsApp message"));

    if (!result.success) {
      log.error({ to: opts.phone, error: result.error }, "WhatsApp Cloud API send failed");
    }
  } else {
    // Legacy wa-bot path — queue in DB for the bot to pick up
    await logMessage({
      channel: "WHATSAPP",
      to: opts.phone,
      userId: opts.userId,
      body: opts.body,
      status: "QUEUED",
    }).catch((err) => log.error({ err }, "Failed to queue WhatsApp message"));
  }
}
