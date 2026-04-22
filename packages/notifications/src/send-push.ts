// Push notification delivery
// Resolves all PushSubscription rows for a user and sends to each

import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import {
  VapidPushProvider,
  ConsolePushProvider,
  type PushProvider,
} from "./providers/push";
import { updateMessageStatus } from "./audit";

const log = createLogger("notifications:push");

function getPushProvider(): PushProvider {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (publicKey && privateKey && subject) {
    return new VapidPushProvider({ publicKey, privateKey, subject });
  }

  log.warn("VAPID keys not configured — using console push provider");
  return new ConsolePushProvider();
}

/**
 * Send a push notification for a QUEUED message log entry.
 * For PUSH channel messages, `to` stores the userId.
 * Sends to all of the user's registered push subscriptions.
 */
export async function sendPushForMessageLog(logId: string): Promise<void> {
  const messageLog = await prisma.messageLog.findUnique({
    where: { id: logId },
  });

  if (
    !messageLog ||
    messageLog.channel !== "PUSH" ||
    messageLog.status !== "QUEUED"
  ) {
    return;
  }

  const userId = messageLog.to;
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    await updateMessageStatus(logId, "FAILED", {
      error: "No push subscriptions found",
    });
    return;
  }

  const provider = getPushProvider();
  let anySuccess = false;
  const errors: string[] = [];

  for (const sub of subscriptions) {
    const result = await provider.send(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      {
        title: messageLog.subject || "Mukha Mudra",
        body: messageLog.body,
        url: "/app",
        tag: messageLog.templateId || undefined,
      },
    );

    if (result.success) {
      anySuccess = true;
    } else {
      errors.push(
        `${sub.endpoint.substring(0, 40)}: ${result.error}`,
      );
      // Clean up expired/invalid subscriptions (410 Gone or 404)
      if (result.statusCode === 410 || result.statusCode === 404) {
        await prisma.pushSubscription
          .delete({ where: { id: sub.id } })
          .catch(() => {});
        log.info(
          { subscriptionId: sub.id },
          "Removed expired push subscription",
        );
      }
    }
  }

  if (anySuccess) {
    await updateMessageStatus(logId, "SENT");
  } else {
    await updateMessageStatus(logId, "FAILED", {
      error: errors.join("; "),
    });
  }
}
