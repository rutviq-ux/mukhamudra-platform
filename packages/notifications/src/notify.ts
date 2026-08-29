// Notification trigger service
// Resolves templates, fills variables, and queues messages

import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { logMessage } from "./audit";
import { sendPushForMessageLog } from "./send-push";
import { sendWhatsApp } from "./send-whatsapp";

const log = createLogger("notifications");

interface NotifyOptions {
  userId: string;
  templateName: string;
  variables: Record<string, string>;
}

/**
 * Resolve a template by name, fill in variables, and log the message.
 * Returns the message log ID or null if the template is not found / user not found.
 *
 * Note: Actual sending happens via the wa-bot service (WhatsApp) or
 * Listmonk (Email). This function creates a QUEUED message log entry
 * that the respective service can pick up.
 */
export async function queueNotification({
  userId,
  templateName,
  variables,
}: NotifyOptions): Promise<string | null> {
  const [template, user] = await Promise.all([
    prisma.messageTemplate.findUnique({ where: { name: templateName } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        marketingOptIn: true,
        whatsappOptIn: true,
        pushOptIn: true,
      },
    }),
  ]);

  if (!template) {
    log.warn({ templateName }, "Message template not found — notification skipped");
    return null;
  }
  if (!template.isActive) {
    log.warn({ templateName }, "Message template is inactive — notification skipped");
    return null;
  }
  if (!user) return null;

  // Check opt-in. Transactional templates (payment confirmations, membership
  // activation, etc.) bypass marketing opt-in — they are service messages the
  // user needs regardless. Only marketing templates respect marketingOptIn.
  if (
    template.channel === "EMAIL" &&
    !template.isTransactional &&
    !user.marketingOptIn
  )
    return null;
  if (template.channel === "WHATSAPP" && !user.whatsappOptIn) return null;
  if (template.channel === "PUSH" && !user.pushOptIn) return null;

  // Determine recipient (PUSH uses userId since targets are resolved at send time)
  const to =
    template.channel === "EMAIL"
      ? user.email
      : template.channel === "PUSH"
        ? user.id
        : user.phone;

  if (!to) return null;

  // Fill in template variables
  let body = template.body;
  let subject = template.subject || "";
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    body = body.replaceAll(placeholder, value);
    subject = subject.replaceAll(placeholder, value);
  }

  // Warn about unresolved template variables
  const unresolvedBody = body.match(/\{\{\w+\}\}/g);
  const unresolvedSubject = subject.match(/\{\{\w+\}\}/g);
  if (unresolvedBody || unresolvedSubject) {
    const unresolved = [...(unresolvedBody || []), ...(unresolvedSubject || [])];
    log.warn(
      { templateName, unresolved },
      "Template has unresolved variables — they will appear as literal text",
    );
  }

  // WhatsApp: send immediately via Cloud API (or queue for wa-bot fallback)
  if (template.channel === "WHATSAPP" && to) {
    await sendWhatsApp({
      userId: user.id,
      phone: to,
      body,
    });
    return null; // sendWhatsApp handles its own logging
  }

  const logId = await logMessage({
    channel: template.channel,
    to,
    userId: user.id,
    templateId: template.id,
    subject: template.channel === "EMAIL" ? subject : undefined,
    body,
    status: "QUEUED",
  });

  return logId;
}

/**
 * Send a welcome notification after first onboarding.
 */
export async function notifyWelcome(opts: {
  userId: string;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true },
  });

  const variables = {
    name: user?.name || "there",
    dashboard_link: `${process.env.NEXT_PUBLIC_APP_URL || "https://mukhamudra.com"}/app`,
  };

  await queueNotification({
    userId: opts.userId,
    templateName: "welcome_message",
    variables,
  });
}

/**
 * Send a subscription activated notification.
 */
export async function notifySubscriptionActivated(opts: {
  userId: string;
  planName: string;
  endDate: string;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true },
  });

  const variables = {
    name: user?.name || "there",
    plan_name: opts.planName,
    end_date: opts.endDate,
  };

  await queueNotification({
    userId: opts.userId,
    templateName: "subscription_activated",
    variables,
  });
}

/**
 * Send a booking confirmation notification.
 */
export async function notifyBookingConfirmed(opts: {
  userId: string;
  sessionType: string;
  date: string;
  time: string;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true },
  });

  const variables = {
    name: user?.name || "there",
    session_type: opts.sessionType,
    date: opts.date,
    time: opts.time,
  };

  // Queue both channels
  await Promise.all([
    queueNotification({
      userId: opts.userId,
      templateName: "booking_confirmed_wa",
      variables,
    }),
    queueNotification({
      userId: opts.userId,
      templateName: "booking_confirmed_email",
      variables,
    }),
  ]);
}

/**
 * Send a payment success notification.
 */
export async function notifyPaymentSuccess(opts: {
  userId: string;
  orderId: string;
  planName: string;
  amount: string;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true },
  });

  const variables = {
    name: user?.name || "there",
    order_id: opts.orderId,
    plan_name: opts.planName,
    amount: opts.amount,
  };

  await Promise.all([
    queueNotification({
      userId: opts.userId,
      templateName: "payment_success_wa",
      variables,
    }),
    queueNotification({
      userId: opts.userId,
      templateName: "payment_success",
      variables,
    }),
  ]);
}

export async function notifyRecordingAddonPurchased(opts: {
  userId: string;
  expiresAt: Date;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true },
  });

  await queueNotification({
    userId: opts.userId,
    templateName: "recording_addon_purchased",
    variables: {
      name: user?.name || "there",
      expiresAt: opts.expiresAt.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
  });
}

export async function notifyBundleWelcome(opts: {
  userId: string;
  periodEnd: Date;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true },
  });

  await queueNotification({
    userId: opts.userId,
    templateName: "bundle_welcome",
    variables: {
      userName: user?.name || "there",
      periodEnd: opts.periodEnd.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
  });
}

/**
 * Send session reminder notifications for upcoming sessions.
 * Called by the session reminder cron job.
 */
export async function sendSessionReminders(): Promise<number> {
  const now = new Date();
  const reminderWindow = new Date(now.getTime() + 15 * 60_000); // 15 min from now
  const reminderWindowEnd = new Date(now.getTime() + 16 * 60_000); // 16 min (1 min window)

  // Find sessions starting in ~15 minutes
  const sessions = await prisma.session.findMany({
    where: {
      status: "SCHEDULED",
      startsAt: {
        gte: reminderWindow,
        lt: reminderWindowEnd,
      },
    },
    include: {
      bookings: {
        where: { status: "CONFIRMED" },
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      batch: { select: { name: true, meetingLink: true } },
      product: { select: { type: true } },
    },
  });

  let sent = 0;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.mukhamudra.com";

  for (const session of sessions) {
    const sessionType = session.batch?.name || session.title || "Yoga";
    const joinLink = `${appUrl}/app/join/${session.id}`;
    const uniqueMeet =
      session.joinUrl && session.joinUrl !== session.batch?.meetingLink
        ? session.joinUrl
        : "";
    const meetingLink =
      uniqueMeet || "Available from your dashboard when class opens.";
    const dashboardUrl = `${appUrl}/app`;

    const recipientSelect = {
      id: true,
      name: true,
      phone: true,
      email: true,
      whatsappOptIn: true,
    } as const;

    const members = await prisma.user.findMany({
      where: {
        memberships: {
          some: {
            status: "ACTIVE",
            plan: {
              product: {
                type: { in: [session.product.type, "BUNDLE"] },
              },
            },
          },
        },
      },
      select: recipientSelect,
    });

    const recipients = new Map(
      members.map((user) => [user.id, user] as const),
    );
    for (const booking of session.bookings) {
      if (recipients.has(booking.user.id)) continue;
      const user = await prisma.user.findUnique({
        where: { id: booking.user.id },
        select: recipientSelect,
      });
      if (user) recipients.set(user.id, user);
    }

    for (const user of recipients.values()) {
      const name = user.name?.split(" ")[0] || "there";

      if (user.phone && user.whatsappOptIn) {
        await sendWhatsApp({
          userId: user.id,
          phone: user.phone,
          body: "",
          templateName: "mukhamudra_class_reminder",
          templateParams: [name, sessionType, dashboardUrl],
        });
        sent++;
      }

      const [, pushLogId] = await Promise.all([
        queueNotification({
          userId: user.id,
          templateName: "session_reminder_email",
          variables: {
            name,
            session_type: sessionType,
            join_link: joinLink,
            meeting_link: meetingLink,
          },
        }),
        queueNotification({
          userId: user.id,
          templateName: "session_reminder_push",
          variables: {
            name,
            session_type: sessionType,
            join_link: joinLink,
          },
        }),
      ]);
      if (pushLogId) {
        await sendPushForMessageLog(pushLogId).catch((err) =>
          log.error({ err }, "Failed to send push notification"),
        );
      }
    }
  }

  return sent;
}

/**
 * Notify user of a failed payment.
 */
export async function notifyPaymentFailed(opts: {
  userId: string;
  orderId: string;
  planName: string;
  amount: string;
  reason: string;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true },
  });

  await queueNotification({
    userId: opts.userId,
    templateName: "payment_failed_alert",
    variables: {
      name: user?.name || "there",
      order_id: opts.orderId,
      plan_name: opts.planName,
      amount: opts.amount,
      reason: opts.reason,
    },
  });
}

/**
 * Notify users when a session is cancelled by admin.
 */
export async function notifySessionCancelled(opts: {
  userId: string;
  sessionType: string;
  date: string;
  time: string;
  reason: string;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true },
  });

  const variables = {
    name: user?.name || "there",
    session_type: opts.sessionType,
    date: opts.date,
    time: opts.time,
    reason: opts.reason,
  };

  await Promise.all([
    queueNotification({
      userId: opts.userId,
      templateName: "session_cancelled_notice",
      variables,
    }),
    queueNotification({
      userId: opts.userId,
      templateName: "session_cancelled_email",
      variables,
    }),
  ]);
}

/**
 * Notify user when their booking is cancelled.
 */
export async function notifyBookingCancelled(opts: {
  userId: string;
  date: string;
  time: string;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true },
  });

  await queueNotification({
    userId: opts.userId,
    templateName: "booking_cancelled_email",
    variables: {
      name: user?.name || "there",
      date: opts.date,
      time: opts.time,
    },
  });
}

/**
 * Notify user when their membership is activated (email).
 */
export async function notifyMembershipActivatedEmail(opts: {
  userId: string;
  planName: string;
  endDate: string;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true },
  });

  await queueNotification({
    userId: opts.userId,
    templateName: "membership_activated_email",
    variables: {
      name: user?.name || "there",
      plan_name: opts.planName,
      end_date: opts.endDate,
    },
  });
}

/**
 * Notify user when their membership is cancelled (email).
 */
export async function notifyMembershipCancelledEmail(opts: {
  userId: string;
  planName: string;
  endDate: string;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true },
  });

  await queueNotification({
    userId: opts.userId,
    templateName: "membership_cancelled_email",
    variables: {
      name: user?.name || "there",
      plan_name: opts.planName,
      end_date: opts.endDate,
    },
  });
}

/**
 * Notify user when their subscription is expiring soon.
 */
export async function notifySubscriptionExpiringSoon(opts: {
  userId: string;
  planName: string;
  endDate: string;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mukhamudra.com";

  await queueNotification({
    userId: opts.userId,
    templateName: "subscription_expiring_soon",
    variables: {
      name: user?.name || "there",
      plan_name: opts.planName,
      end_date: opts.endDate,
      renewal_link: `${appUrl}/pricing`,
    },
  });
}

export async function notifyPaymentHealthWeekly(opts: {
  userId: string;
  failedCount: string;
  failedAmount: string;
  pendingCount: string;
  paidCount: string;
  details: string;
}): Promise<void> {
  await queueNotification({
    userId: opts.userId,
    templateName: "payment_health_weekly_email",
    variables: {
      failed_count: opts.failedCount,
      failed_amount: opts.failedAmount,
      pending_count: opts.pendingCount,
      paid_count: opts.paidCount,
      details: opts.details,
    },
  });
}

/**
 * Notify user of WhatsApp opt-out confirmation.
 */
export async function notifyOptOutConfirmation(opts: {
  userId: string;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true },
  });

  await queueNotification({
    userId: opts.userId,
    templateName: "optout_confirmation",
    variables: {
      name: user?.name || "there",
    },
  });
}
