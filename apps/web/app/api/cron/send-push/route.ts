import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { sendPushForMessageLog, isNotificationChannelEnabled } from "@ru/notifications";
import { withCronAuth } from "@/lib/cron-auth";

const log = createLogger("cron:send-push");

async function handler(request: NextRequest) {
  try {
    if (!(await isNotificationChannelEnabled("PUSH"))) {
      return NextResponse.json({ status: "skipped", reason: "channel_disabled" });
    }

    // Fetch queued push messages
    const messages = await prisma.messageLog.findMany({
      where: {
        channel: "PUSH",
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

    for (const msg of messages) {
      try {
        await sendPushForMessageLog(msg.id);
        // sendPushForMessageLog updates the status internally
        const updated = await prisma.messageLog.findUnique({
          where: { id: msg.id },
          select: { status: true },
        });
        if (updated?.status === "SENT") {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        log.error({ err: error, messageId: msg.id }, "Failed to send push notification");
      }
    }

    log.info({ sent, failed, total: messages.length }, "Push send batch complete");

    return NextResponse.json({ status: "ok", sent, failed });
  } catch (error) {
    log.error({ err: error }, "Push send cron failed");
    return NextResponse.json(
      { error: "Push send cron failed" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const POST = withCronAuth(handler);
export const GET = POST;
