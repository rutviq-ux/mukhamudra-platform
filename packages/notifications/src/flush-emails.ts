// Immediate email flush — sends a user's QUEUED emails right away instead of
// waiting for the 5-minute send-emails cron. Used on the payment-success path
// so confirmation emails arrive instantly. The cron remains the safety net for
// anything not flushed here (e.g. transient Resend errors).

import { prisma } from "@ru/db";
import { getServerEnv } from "@ru/config";
import { updateMessageStatus, failDisabledTemplateMessage, isTemplateDisabled } from "./audit";
import {
  ResendEmailProvider,
  ListmonkEmailProvider,
  ConsoleEmailProvider,
  type EmailProvider,
} from "./providers/email";

function resolveEmailProvider(): EmailProvider {
  const env = getServerEnv();
  if (env.RESEND_API_KEY) {
    return new ResendEmailProvider({
      apiKey: env.RESEND_API_KEY,
      defaultFrom: env.RESEND_FROM_EMAIL,
    });
  }
  if (env.LISTMONK_URL && env.LISTMONK_API_USER && env.LISTMONK_API_PASSWORD) {
    return new ListmonkEmailProvider({
      url: env.LISTMONK_URL,
      username: env.LISTMONK_API_USER,
      password: env.LISTMONK_API_PASSWORD,
    });
  }
  return new ConsoleEmailProvider();
}

/**
 * Immediately send all QUEUED email messages for a user. Safe to call
 * fire-and-forget. Uses the same optimistic-claim pattern as the cron so it
 * never double-sends if the cron races it.
 */
export async function flushQueuedEmailsForUser(userId: string): Promise<void> {
  const provider = resolveEmailProvider();

  const messages = await prisma.messageLog.findMany({
    where: { userId, channel: "EMAIL", status: "QUEUED" },
    include: { template: { select: { isActive: true } } },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  for (const msg of messages) {
    if (isTemplateDisabled(msg.template)) {
      await failDisabledTemplateMessage(msg.id);
      continue;
    }

    const claimed = await prisma.messageLog.updateMany({
      where: { id: msg.id, status: "QUEUED" },
      data: { status: "SENT" },
    });
    if (claimed.count === 0) continue; // cron or another flush got it

    try {
      const result = await provider.send({
        to: msg.to,
        subject: msg.subject || "",
        html: msg.body,
        text: msg.body.replace(/<[^>]*>/g, ""),
      });

      if (result.success) {
        await updateMessageStatus(msg.id, "SENT", {
          providerMessageId: result.messageId,
        });
      } else {
        // Re-queue so the cron retries rather than silently dropping.
        await updateMessageStatus(msg.id, "QUEUED", { error: result.error });
      }
    } catch (error) {
      await updateMessageStatus(msg.id, "QUEUED", {
        error: error instanceof Error ? error.message : "flush failed",
      });
    }
  }
}
