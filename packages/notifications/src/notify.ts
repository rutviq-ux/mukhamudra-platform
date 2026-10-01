// Notification trigger service
// Resolves templates, fills variables, and queues messages

import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { logMessage } from "./audit";
import { sendPushForMessageLog } from "./send-push";
import { sendWhatsApp } from "./send-whatsapp";
import {
  deliverInteraktTemplate,
  ensureMmEmailTemplates,
  prePaymentImageUrl,
} from "./mm-messages";
import {
  MM,
  firstName,
  formatInDate,
  joinTemplateForStartTime,
  meetCodeFromJoinUrl,
  programLabel,
  welcomeTemplateForSlug,
} from "./mm-templates";

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

  // Select plan-specific email template based on which program was purchased
    const planLower = opts.planName.toLowerCase();
    let emailTemplateName = "payment_success"; // fallback for unknown plans
    if (planLower.includes("face yoga + pranayama") || planLower.includes("bundle")) {
          emailTemplateName = "payment_success_bundle";
    } else if (planLower.includes("face yoga")) {
          emailTemplateName = "payment_success_face_yoga";
    } else if (planLower.includes("pranayama")) {
          emailTemplateName = "payment_success_pranayama";
    }
  
  await Promise.all([
    queueNotification({
      userId: opts.userId,
      templateName: "payment_success_wa",
      variables,
    }),
    queueNotification({
      userId: opts.userId,
      templateName: emailTemplateName,
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

  await ensureMmEmailTemplates();

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
      batch: { select: { name: true, startTime: true, remindersEnabled: true } },
      product: { select: { type: true } },
    },
  });

  let sent = 0;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.mukhamudra.com";

  for (const session of sessions) {
    if (session.batch && !session.batch.remindersEnabled) {
      log.info(
        { sessionId: session.id, batchId: session.batchId },
        "Skipping reminders, disabled on batch",
      );
      continue;
    }

    const sessionType = session.batch?.name || session.title || "Yoga";
    const joinLink = `${appUrl}/app/join/${session.id}`;
    const templateName = joinTemplateForStartTime(session.batch?.startTime ?? "");
    const meetCode = meetCodeFromJoinUrl(session.joinUrl);
    const canSendJoin = Boolean(templateName && meetCode && session.joinUrl);

    if (!templateName) {
      log.warn(
        { sessionId: session.id, startTime: session.batch?.startTime },
        "No class-join template for this start time",
      );
    } else if (!canSendJoin) {
      log.warn(
        { sessionId: session.id },
        "Skipping class join messages, Meet link is not ready",
      );
    }

    const recipients = await sessionRecipients(session);

    const reminderSince = new Date(now.getTime() - 60 * 60_000);
    const reminderKey = `session-reminder:${session.id}`;

    for (const user of recipients.values()) {
      const name = firstName(user.name);
      const alreadySent = await prisma.messageLog.findFirst({
        where: {
          userId: user.id,
          createdAt: { gte: reminderSince },
          status: { in: ["QUEUED", "SENT", "DELIVERED"] },
          OR: [
            { body: { contains: reminderKey } },
            { body: { contains: `/app/join/${session.id}` } },
          ],
        },
        select: { id: true },
      });
      if (alreadySent) continue;

      if (canSendJoin && templateName && meetCode && session.joinUrl) {
        let waSent = false;
        if (user.phone && user.whatsappOptIn) {
          waSent = await deliverInteraktTemplate({
            rawPhone: user.phone,
            logTo: user.phone,
            userId: user.id,
            templateName,
            bodyValues: [name],
            buttonValues: { "0": [meetCode] },
            logBody: reminderKey,
          });
          if (waSent) sent++;
        }

        const emailLogId = await queueNotification({
          userId: user.id,
          templateName: `${templateName}_email`,
          variables: {
            name,
            join_link: session.joinUrl,
          },
        });
        if (emailLogId && !waSent) {
          await logMessage({
            channel: "EMAIL",
            to: user.id,
            userId: user.id,
            body: reminderKey,
            status: "SENT",
          });
        }
      }

      const pushLogId = await queueNotification({
        userId: user.id,
        templateName: "session_reminder_push",
        variables: {
          name,
          session_type: sessionType,
          join_link: joinLink,
        },
      });
      if (pushLogId) {
        await sendPushForMessageLog(pushLogId).catch((err) =>
          log.error({ err }, "Failed to send push notification"),
        );
      }
    }
  }

  return sent;
}

const recipientSelect = {
  id: true,
  name: true,
  phone: true,
  whatsappOptIn: true,
} as const;

async function sessionRecipients(session: {
  product: { type: "FACE_YOGA" | "PRANAYAMA" | "BUNDLE" };
  bookings: { user: { id: string } }[];
}) {
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

  const recipients = new Map(members.map((user) => [user.id, user] as const));
  for (const booking of session.bookings) {
    if (recipients.has(booking.user.id)) continue;
    const user = await prisma.user.findUnique({
      where: { id: booking.user.id },
      select: recipientSelect,
    });
    if (user) recipients.set(user.id, user);
  }
  return recipients;
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
export async function sendPlanWelcome(opts: {
  userId: string;
  planSlug: string;
}): Promise<void> {
  const templateName = welcomeTemplateForSlug(opts.planSlug);
  if (!templateName) return;

  await ensureMmEmailTemplates();

  const since = new Date(Date.now() - 24 * 60 * 60_000);
  const emailTemplate = await prisma.messageTemplate.findUnique({
    where: { name: `${templateName}_email` },
    select: { id: true },
  });
  const alreadySent = await prisma.messageLog.findFirst({
    where: {
      userId: opts.userId,
      createdAt: { gte: since },
      status: { in: ["QUEUED", "SENT", "DELIVERED"] },
      OR: [
        { channel: "WHATSAPP", body: templateName },
        ...(emailTemplate ? [{ templateId: emailTemplate.id }] : []),
      ],
    },
    select: { id: true },
  });
  if (alreadySent) return;

  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true, phone: true, whatsappOptIn: true },
  });
  const name = firstName(user?.name);

  if (user?.phone && user.whatsappOptIn) {
    await deliverInteraktTemplate({
      rawPhone: user.phone,
      logTo: user.phone,
      userId: opts.userId,
      templateName,
      bodyValues: [name],
      logBody: templateName,
    });
  }

  await queueNotification({
    userId: opts.userId,
    templateName: `${templateName}_email`,
    variables: { name },
  });
}

export async function sendPrePaymentNotice(opts: {
  rawPhone: string;
  logTo: string;
  userId?: string;
  profileName?: string | null;
}): Promise<boolean> {
  const imageUrl = prePaymentImageUrl();
  if (!imageUrl) {
    log.warn("Skipping pre-payment WhatsApp, WHATSAPP_PREPAYMENT_IMAGE_URL is not set");
    return false;
  }

  await ensureMmEmailTemplates();

  const user = opts.userId
    ? await prisma.user.findUnique({
        where: { id: opts.userId },
        select: { name: true },
      })
    : null;
  const name = firstName(user?.name || opts.profileName);

  const ok = await deliverInteraktTemplate({
    rawPhone: opts.rawPhone,
    logTo: opts.logTo,
    userId: opts.userId,
    templateName: MM.PRE_PAYMENT,
    bodyValues: [name],
    headerValues: [imageUrl],
    logBody: MM.PRE_PAYMENT,
  });

  if (ok && opts.userId) {
    await queueNotification({
      userId: opts.userId,
      templateName: "mm_pre_payment_info_email",
      variables: { name },
    });
  }

  return ok;
}

export async function notifyNoLiveSession(sessionId: string): Promise<void> {
  try {
    await ensureMmEmailTemplates();

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        bookings: {
          where: { status: "CONFIRMED" },
          include: { user: { select: { id: true } } },
        },
        batch: { select: { name: true } },
        product: { select: { type: true } },
      },
    });
    if (!session) return;

    const sessionType = session.batch?.name || session.title || "class";
    const date = formatInDate(session.startsAt);
    const recipients = await sessionRecipients(session);

    for (const user of recipients.values()) {
      const name = firstName(user.name);
      if (user.phone && user.whatsappOptIn) {
        await deliverInteraktTemplate({
          rawPhone: user.phone,
          logTo: user.phone,
          userId: user.id,
          templateName: MM.NO_LIVE_SESSION,
          bodyValues: [name],
          logBody: `${MM.NO_LIVE_SESSION}:${sessionId}`,
        });
      }
      await queueNotification({
        userId: user.id,
        templateName: "mm_no_live_session_email",
        variables: { name, session_type: sessionType, date },
      });
    }
  } catch (err) {
    log.error({ err, sessionId }, "Failed to send no-live-session notices");
  }
}

export async function sendRenewalReminders(): Promise<number> {
  await ensureMmEmailTemplates();

  const start = new Date(Date.now() + 7 * 24 * 60 * 60_000);
  const end = new Date(Date.now() + 8 * 24 * 60 * 60_000);
  const memberships = await prisma.membership.findMany({
    where: {
      status: "ACTIVE",
      periodEnd: { gte: start, lt: end },
    },
    include: {
      user: { select: { id: true, name: true, phone: true, whatsappOptIn: true } },
      plan: { include: { product: { select: { type: true } } } },
    },
  });

  let sent = 0;
  for (const membership of memberships) {
    if (!membership.periodEnd) continue;
    const marker = `${MM.RENEWAL}:${membership.id}`;
    const alreadySent = await prisma.messageLog.findFirst({
      where: {
        userId: membership.userId,
        body: marker,
        status: { in: ["SENT", "DELIVERED", "QUEUED"] },
      },
      select: { id: true },
    });
    if (alreadySent) continue;

    const name = firstName(membership.user.name);
    const endDate = formatInDate(membership.periodEnd);
    const program = programLabel(membership.plan.product.type);

    let marked = false;
    if (membership.user.phone && membership.user.whatsappOptIn) {
      const ok = await deliverInteraktTemplate({
        rawPhone: membership.user.phone,
        logTo: membership.user.phone,
        userId: membership.userId,
        templateName: MM.RENEWAL,
        bodyValues: [name, endDate, program],
        logBody: marker,
      });
      if (ok) {
        sent++;
        marked = true;
      }
    }

    const emailLogId = await queueNotification({
      userId: membership.userId,
      templateName: "mm_renewal_email",
      variables: { name, end_date: endDate, program },
    });
    if (emailLogId && !marked) {
      await logMessage({
        channel: "EMAIL",
        to: membership.userId,
        userId: membership.userId,
        body: marker,
        status: "SENT",
      });
    }
  }

  return sent;
}

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
