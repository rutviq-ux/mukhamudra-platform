// Immediate email flush — sends a user's QUEUED emails right away instead of
// waiting for the 5-minute send-emails cron. Used on the payment-success path
// so confirmation emails arrive instantly. The cron remains the safety net for
// anything not flushed here (e.g. transient Resend errors).

import { prisma } from "@ru/db";
import { getServerEnv } from "@ru/config";
import { updateMessageStatus, failDisabledTemplateMessage, isTemplateDisabled } from "./audit";
import { isNotificationChannelEnabled } from "./channel-gates";
import {
  BULK_CLASS_EMAILS,
  classNoticeEmailKey,
  isBulkClassEmail,
  isMmMessageTemplate,
  sharedClassEmailHtml,
} from "./mm-templates";
import {
  CLASS_FROM,
  CLASS_MAILBOX,
  classGmailConfig,
  GMAIL_BCC_CHUNK,
  sendClassMailViaGmail,
  type ClassGmailConfig,
} from "./gmail-class-mail";
import {
  ResendEmailProvider,
  ListmonkEmailProvider,
  ConsoleEmailProvider,
  type EmailProvider,
} from "./providers/email";

async function releaseMmEmail(
  id: string,
  retryCount: number,
  error: string,
): Promise<void> {
  const retries = retryCount + 1;
  await prisma.messageLog.update({
    where: { id },
    data: {
      status: retries >= 3 ? "FAILED" : "QUEUED",
      sentAt: null,
      retryCount: retries,
      error,
    },
  });
}

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

const BCC_CHUNK = 49;

async function deliverBulkClassEmails(provider: EmailProvider): Promise<number> {
  const messages = await prisma.messageLog.findMany({
    where: {
      channel: "EMAIL",
      status: "QUEUED",
      template: { name: { in: [...BULK_CLASS_EMAILS] } },
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  const groups = new Map<string, typeof messages>();
  for (const msg of messages) {
    const key = classNoticeEmailKey(msg.body);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(msg);
    groups.set(key, group);
  }

  const gmail = classGmailConfig();
  let sent = 0;
  for (const group of groups.values()) {
    if (gmail) {
      sent += await sendClassEmailGmail(gmail, provider, group);
      continue;
    }
    if (provider.name !== "resend") {
      for (const msg of group) {
        sent += await sendOneMmEmail(provider, msg, CLASS_FROM);
      }
      continue;
    }
    sent += await sendClassEmailBcc(provider, group);
  }
  return sent;
}

async function sendClassEmailGmail(
  gmail: ClassGmailConfig,
  provider: EmailProvider,
  group: {
    id: string;
    to: string;
    subject: string | null;
    body: string;
    retryCount: number;
  }[],
): Promise<number> {
  const byEmail = new Map<string, typeof group>();
  for (const msg of group) {
    const address = msg.to.trim().toLowerCase();
    if (!address || address === CLASS_MAILBOX) continue;
    const rows = byEmail.get(address) ?? [];
    rows.push(msg);
    byEmail.set(address, rows);
  }

  let sent = 0;
  const addresses = [...byEmail.keys()];
  for (let i = 0; i < addresses.length; i += GMAIL_BCC_CHUNK) {
    const chunk = addresses.slice(i, i + GMAIL_BCC_CHUNK);
    const rows = chunk.flatMap((address) => byEmail.get(address) ?? []);
    const ids = rows.map((row) => row.id);
    const pending = await prisma.messageLog.findMany({
      where: { id: { in: ids }, status: "QUEUED" },
      select: { id: true, to: true, retryCount: true, body: true, subject: true },
    });
    if (pending.length === 0) continue;
    const pendingIds = pending.map((row) => row.id);
    const claimed = await prisma.messageLog.updateMany({
      where: { id: { in: pendingIds }, status: "QUEUED" },
      data: { status: "SENT", sentAt: new Date() },
    });
    if (claimed.count === 0) continue;

    const html = sharedClassEmailHtml(pending[0]?.body ?? "");
    const bcc = [...new Set(pending.map((row) => row.to.trim().toLowerCase()))];
    const subject = pending[0]?.subject || "";
    try {
      const result = await sendClassMailViaGmail(gmail, { bcc, subject, html });
      if (result.ok) {
        await prisma.messageLog.updateMany({
          where: { id: { in: pendingIds } },
          data: { providerMessageId: result.messageId, status: "SENT" },
        });
        sent += bcc.length;
        continue;
      }
      if (result.authError && provider.name === "resend") {
        let fallbackError = result.error;
        const succeeded = new Set<string>();
        for (let j = 0; j < bcc.length; j += BCC_CHUNK) {
          const slice = bcc.slice(j, j + BCC_CHUNK);
          const sliceRows = pending.filter((row) =>
            slice.includes(row.to.trim().toLowerCase()),
          );
          const fallback = await provider.send({
            from: CLASS_FROM,
            to: CLASS_MAILBOX,
            bcc: slice,
            subject,
            html,
            text: html.replace(/<[^>]*>/g, ""),
          });
          if (!fallback.success) {
            fallbackError = fallback.error || fallbackError;
            continue;
          }
          const sliceIds = sliceRows.map((row) => row.id);
          await prisma.messageLog.updateMany({
            where: { id: { in: sliceIds } },
            data: { providerMessageId: fallback.messageId, status: "SENT" },
          });
          for (const id of sliceIds) succeeded.add(id);
          sent += slice.length;
        }
        for (const row of pending) {
          if (succeeded.has(row.id)) continue;
          await releaseMmEmail(row.id, row.retryCount, fallbackError);
        }
        continue;
      }
      for (const row of pending) {
        await releaseMmEmail(row.id, row.retryCount, result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "flush failed";
      for (const row of pending) {
        await releaseMmEmail(row.id, row.retryCount, message);
      }
    }
  }
  return sent;
}

async function sendClassEmailBcc(
  provider: EmailProvider,
  group: {
    id: string;
    to: string;
    subject: string | null;
    body: string;
    retryCount: number;
  }[],
): Promise<number> {
  const studio = CLASS_MAILBOX;
  const byEmail = new Map<string, typeof group>();
  for (const msg of group) {
    const address = msg.to.trim().toLowerCase();
    if (!address || address === studio) continue;
    const rows = byEmail.get(address) ?? [];
    rows.push(msg);
    byEmail.set(address, rows);
  }

  let sent = 0;
  const addresses = [...byEmail.keys()];
  for (let i = 0; i < addresses.length; i += BCC_CHUNK) {
    const chunk = addresses.slice(i, i + BCC_CHUNK);
    const rows = chunk.flatMap((address) => byEmail.get(address) ?? []);
    const ids = rows.map((row) => row.id);
    const pending = await prisma.messageLog.findMany({
      where: { id: { in: ids }, status: "QUEUED" },
      select: { id: true, to: true, retryCount: true, body: true, subject: true },
    });
    if (pending.length === 0) continue;
    const pendingIds = pending.map((row) => row.id);
    const claimed = await prisma.messageLog.updateMany({
      where: { id: { in: pendingIds }, status: "QUEUED" },
      data: { status: "SENT", sentAt: new Date() },
    });
    if (claimed.count === 0) continue;

    const html = sharedClassEmailHtml(pending[0]?.body ?? "");
    const bcc = [...new Set(pending.map((row) => row.to.trim().toLowerCase()))];
    try {
      const result = await provider.send({
        from: CLASS_FROM,
        to: CLASS_MAILBOX,
        bcc,
        subject: pending[0]?.subject || "",
        html,
        text: html.replace(/<[^>]*>/g, ""),
      });
      if (result.success) {
        await prisma.messageLog.updateMany({
          where: { id: { in: pendingIds } },
          data: { providerMessageId: result.messageId, status: "SENT" },
        });
        sent += new Set(pending.map((row) => row.to.trim().toLowerCase())).size;
      } else {
        for (const row of pending) {
          await releaseMmEmail(row.id, row.retryCount, result.error || "Email send failed");
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "flush failed";
      for (const row of pending) {
        await releaseMmEmail(row.id, row.retryCount, message);
      }
    }
  }
  return sent;
}

async function sendOneMmEmail(
  provider: EmailProvider,
  msg: {
    id: string;
    to: string;
    subject: string | null;
    body: string;
    retryCount: number;
  },
  from?: string,
): Promise<number> {
  const claimed = await prisma.messageLog.updateMany({
    where: { id: msg.id, status: "QUEUED" },
    data: { status: "SENT", sentAt: new Date() },
  });
  if (claimed.count === 0) return 0;

  try {
    const result = await provider.send({
      from,
      to: msg.to,
      subject: msg.subject || "",
      html: msg.body,
      text: msg.body.replace(/<[^>]*>/g, ""),
    });
    if (result.success) {
      await updateMessageStatus(msg.id, "SENT", {
        providerMessageId: result.messageId,
      });
      return 1;
    }
    await releaseMmEmail(msg.id, msg.retryCount, result.error || "Email send failed");
  } catch (error) {
    await releaseMmEmail(
      msg.id,
      msg.retryCount,
      error instanceof Error ? error.message : "flush failed",
    );
  }
  return 0;
}

export async function deliverQueuedMmEmails(limit: number): Promise<number> {
  const provider = resolveEmailProvider();
  const bulkSent = await deliverBulkClassEmails(provider);
  const messages = await prisma.messageLog.findMany({
    where: {
      channel: "EMAIL",
      status: "QUEUED",
      template: { name: { startsWith: "mm_" } },
      NOT: { template: { name: { in: [...BULK_CLASS_EMAILS] } } },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = bulkSent;
  for (const msg of messages) {
    sent += await sendOneMmEmail(provider, msg);
  }
  return sent;
}

export async function flushQueuedEmailsForUser(userId: string): Promise<void> {
  const emailEnabled = await isNotificationChannelEnabled("EMAIL");
  const provider = resolveEmailProvider();

  const messages = await prisma.messageLog.findMany({
    where: { userId, channel: "EMAIL", status: "QUEUED" },
    include: { template: { select: { name: true, isActive: true } } },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  for (const msg of messages) {
    if (isBulkClassEmail(msg.template?.name)) continue;
    const mmMessage = isMmMessageTemplate(msg.template?.name);
    if (!mmMessage && !emailEnabled) continue;
    if (!mmMessage && isTemplateDisabled(msg.template)) {
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
