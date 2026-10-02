import { prisma, Prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { updateMessageStatus } from "./audit";
import { formatPhone, sendTemplate } from "./interakt";
import { deliverQueuedMmEmails } from "./flush-emails";
import { sendPushForMessageLog } from "./send-push";
import {
  firstName,
  joinTemplateForStartTime,
  meetCodeFromJoinUrl,
  MM,
} from "./mm-templates";

const log = createLogger("mm-outbox");

export const MM_OUTBOX_BATCH = 40;

export function isMmOutboxWhatsApp(body: string): boolean {
  return (
    body.startsWith("mm_no_live_session:") ||
    body.startsWith("session-reminder:")
  );
}

export function fillTemplate(
  body: string,
  subject: string | null | undefined,
  variables: Record<string, string>,
): { body: string; subject: string } {
  let nextBody = body;
  let nextSubject = subject ?? "";
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    nextBody = nextBody.replaceAll(placeholder, value);
    nextSubject = nextSubject.replaceAll(placeholder, value);
  }
  return { body: nextBody, subject: nextSubject };
}

type QueuedLog = {
  channel: "WHATSAPP" | "EMAIL" | "PUSH";
  to: string;
  userId: string;
  templateId?: string;
  subject?: string;
  body: string;
};

type LogDb = Prisma.TransactionClient | typeof prisma;

export async function withOutboxLock<T>(
  key: string,
  run: (db: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key})::bigint)`;
      return run(tx);
    },
    { maxWait: 10_000, timeout: 20_000 },
  );
}

export async function createQueuedLogs(
  rows: QueuedLog[],
  db: LogDb = prisma,
): Promise<number> {
  if (rows.length === 0) return 0;
  const data = rows.map((row) => ({
    channel: row.channel,
    to: row.to,
    userId: row.userId,
    ...(row.templateId ? { templateId: row.templateId } : {}),
    ...(row.subject ? { subject: row.subject } : {}),
    body: row.body,
    status: "QUEUED" as const,
  }));
  let created = 0;
  for (let i = 0; i < data.length; i += 200) {
    const result = await db.messageLog.createMany({
      data: data.slice(i, i + 200),
    });
    created += result.count;
  }
  return created;
}

export async function drainMmOutbox(
  limit = MM_OUTBOX_BATCH,
): Promise<{ whatsapp: number; email: number; push: number }> {
  const whatsapp = await drainOutboxWhatsApp(limit);
  const email = await deliverQueuedMmEmails(limit);
  const push = await drainOutboxPush(limit);
  log.info({ whatsapp, email, push, limit }, "Drained queued class notices");
  return { whatsapp, email, push };
}

async function drainOutboxWhatsApp(limit: number): Promise<number> {
  const rows = await prisma.messageLog.findMany({
    where: {
      channel: "WHATSAPP",
      status: "QUEUED",
      OR: [
        { body: { startsWith: "mm_no_live_session:" } },
        { body: { startsWith: "session-reminder:" } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: { user: { select: { name: true } } },
  });

  let sent = 0;
  for (const row of rows) {
    const payload = await whatsAppPayload(row.body, row.user?.name);
    if (payload === "wait") continue;
    if (payload === "drop") {
      await updateMessageStatus(row.id, "FAILED", {
        error: "Class notice can no longer be sent",
      });
      continue;
    }

    const claimed = await prisma.messageLog.updateMany({
      where: { id: row.id, status: "QUEUED" },
      data: { status: "SENT", sentAt: new Date() },
    });
    if (claimed.count === 0) continue;

    const phone = formatPhone(row.to);
    if (!phone) {
      await updateMessageStatus(row.id, "FAILED", { error: "Phone unusable" });
      continue;
    }

    const ok = await sendTemplate({
      phoneNumber: phone.local,
      countryCode: phone.countryCode,
      templateName: payload.templateName,
      languageCode: "en",
      bodyValues: payload.bodyValues,
      buttonValues: payload.buttonValues,
    });
    if (ok) {
      sent++;
      continue;
    }

    const retries = row.retryCount + 1;
    if (retries >= 3) {
      await updateMessageStatus(row.id, "FAILED", {
        error: "Interakt template send failed",
      });
      await prisma.messageLog.update({
        where: { id: row.id },
        data: { retryCount: retries },
      });
      continue;
    }
    await prisma.messageLog.update({
      where: { id: row.id },
      data: {
        status: "QUEUED",
        sentAt: null,
        retryCount: retries,
        error: "Interakt template send failed",
      },
    });
  }
  return sent;
}

async function whatsAppPayload(
  body: string,
  userName: string | null | undefined,
): Promise<
  | {
      templateName: string;
      bodyValues: string[];
      buttonValues?: Record<string, string[]>;
    }
  | "wait"
  | "drop"
> {
  const name = firstName(userName);
  if (body.startsWith("mm_no_live_session:")) {
    return { templateName: MM.NO_LIVE_SESSION, bodyValues: [name] };
  }

  const sessionId = body.slice("session-reminder:".length);
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      status: true,
      startsAt: true,
      joinUrl: true,
      batch: { select: { startTime: true } },
    },
  });
  if (!session || session.status === "CANCELLED") return "drop";
  const templateName = joinTemplateForStartTime(session.batch?.startTime ?? "");
  const meetCode = meetCodeFromJoinUrl(session.joinUrl);
  if (!templateName || !meetCode) {
    if (session.startsAt.getTime() <= Date.now()) return "drop";
    return "wait";
  }
  return {
    templateName,
    bodyValues: [name],
    buttonValues: { "0": [meetCode] },
  };
}

async function drainOutboxPush(limit: number): Promise<number> {
  const rows = await prisma.messageLog.findMany({
    where: {
      channel: "PUSH",
      status: "QUEUED",
      template: { name: "session_reminder_push" },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });
  let sent = 0;
  for (const row of rows) {
    await sendPushForMessageLog(row.id);
    const updated = await prisma.messageLog.findUnique({
      where: { id: row.id },
      select: { status: true },
    });
    if (updated?.status === "SENT") sent++;
  }
  return sent;
}
