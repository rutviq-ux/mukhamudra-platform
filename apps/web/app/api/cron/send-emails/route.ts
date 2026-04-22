import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger, getServerEnv } from "@ru/config";
import { ListmonkEmailProvider, updateMessageStatus } from "@ru/notifications";
import { withCronAuth } from "@/lib/cron-auth";

const log = createLogger("cron:send-emails");

async function handler(request: NextRequest) {
  try {
    const env = getServerEnv();
    const provider = new ListmonkEmailProvider({
      url: env.LISTMONK_URL,
      username: env.LISTMONK_API_USER,
      password: env.LISTMONK_API_PASSWORD,
    });

    // Fetch queued email messages
    const messages = await prisma.messageLog.findMany({
      where: {
        channel: "EMAIL",
        status: "QUEUED",
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    if (messages.length === 0) {
      return NextResponse.json({ status: "ok", sent: 0, failed: 0 });
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const msg of messages) {
      try {
        // Optimistic lock: only claim this message if still QUEUED
        // Prevents duplicate sends when multiple cron instances run concurrently
        const claimed = await prisma.messageLog.updateMany({
          where: { id: msg.id, status: "QUEUED" },
          data: { status: "SENT" },
        });
        if (claimed.count === 0) {
          skipped++;
          continue; // Another instance already claimed this message
        }

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
          sent++;
        } else {
          await updateMessageStatus(msg.id, "FAILED", {
            error: result.error,
          });
          failed++;
        }
      } catch (error) {
        await updateMessageStatus(msg.id, "FAILED", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
        failed++;
        log.error({ err: error, messageId: msg.id }, "Failed to send email");
      }
    }

    log.info({ sent, failed, total: messages.length }, "Email send batch complete");

    return NextResponse.json({ status: "ok", sent, failed });
  } catch (error) {
    log.error({ err: error }, "Email send cron failed");
    return NextResponse.json(
      { error: "Email send cron failed" },
      { status: 500 },
    );
  }
}

export const POST = withCronAuth(handler);
