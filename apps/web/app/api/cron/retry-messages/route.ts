import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { withCronAuth } from "@/lib/cron-auth";

const log = createLogger("cron:retry-messages");

const MAX_RETRIES = 5;

async function handler(request: NextRequest) {
  try {
    // Find QUEUED messages older than 2 minutes (potentially stuck)
    // Re-queue them so delivery workers pick them up again
    const staleThreshold = new Date(Date.now() - 2 * 60_000);

    const staleMessages = await prisma.messageLog.findMany({
      where: {
        status: "QUEUED",
        createdAt: { lt: staleThreshold },
        retryCount: { lt: MAX_RETRIES },
      },
      take: 50,
      orderBy: { createdAt: "asc" },
    });

    // Re-queue stale messages (bump retryCount so they're re-processed)
    if (staleMessages.length > 0) {
      for (const msg of staleMessages) {
        await prisma.messageLog.update({
          where: { id: msg.id },
          data: { retryCount: { increment: 1 } },
        });
      }
    }

    // Find FAILED messages from the last 24 hours to re-queue (max 5 retries)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60_000);

    const failedMessages = await prisma.messageLog.findMany({
      where: {
        status: "FAILED",
        createdAt: { gte: dayAgo },
        retryCount: { lt: MAX_RETRIES },
      },
      take: 20,
      orderBy: { createdAt: "asc" },
    });

    // Abandon messages that have exceeded max retries
    const abandonedCount = await prisma.messageLog.updateMany({
      where: {
        status: "FAILED",
        createdAt: { gte: dayAgo },
        retryCount: { gte: MAX_RETRIES },
      },
      data: {
        error: "Abandoned after max retries",
      },
    });

    const total = staleMessages.length + failedMessages.length;

    if (total === 0) {
      return NextResponse.json({ status: "ok", retried: 0, abandoned: abandonedCount.count });
    }

    // Re-queue failed messages with incremented retry count
    if (failedMessages.length > 0) {
      for (const msg of failedMessages) {
        await prisma.messageLog.update({
          where: { id: msg.id },
          data: {
            status: "QUEUED",
            error: null,
            retryCount: { increment: 1 },
          },
        });
      }
    }

    log.info(
      { stale: staleMessages.length, retried: failedMessages.length, abandoned: abandonedCount.count },
      "Message retry complete"
    );

    return NextResponse.json({
      status: "ok",
      stale: staleMessages.length,
      retried: failedMessages.length,
      abandoned: abandonedCount.count,
    });
  } catch (error) {
    log.error({ err: error }, "Message retry failed");
    return NextResponse.json(
      { error: "Message retry failed" },
      { status: 500 }
    );
  }
}

export const POST = withCronAuth(handler);
