import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { WhatsAppBusinessProvider, updateMessageStatus } from "@ru/notifications";
import { withCronAuth } from "@/lib/cron-auth";

const log = createLogger("cron:send-whatsapp");

// Meta only allows free-text (non-template) messages inside a 24h customer
// service window. Queued messages older than this can't be delivered as plain
// text and are abandoned rather than retried forever.
const FREE_TEXT_WINDOW_MS = 24 * 60 * 60 * 1000;

async function handler(_request: NextRequest) {
  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      log.warn("WhatsApp Cloud API not configured; skipping send-whatsapp cron");
      return NextResponse.json({ status: "skipped", reason: "not_configured" });
    }

    const provider = new WhatsAppBusinessProvider({
      accessToken: token,
      phoneNumberId,
    });

    const messages = await prisma.messageLog.findMany({
      where: { channel: "WHATSAPP", status: "QUEUED" },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: { template: { select: { name: true } } },
    });

    if (messages.length === 0) {
      return NextResponse.json({ status: "ok", sent: 0, failed: 0, expired: 0 });
    }

    let sent = 0;
    let failed = 0;
    let expired = 0;
    let skipped = 0;

    const now = Date.now();

    for (const msg of messages) {
      const age = now - msg.createdAt.getTime();
      const hasTemplate = !!msg.template?.name;

      // A plain-text message past the 24h window can't be delivered by Meta.
      // Abandon it instead of cycling it forever.
      if (!hasTemplate && age > FREE_TEXT_WINDOW_MS) {
        await updateMessageStatus(msg.id, "FAILED", {
          error: "Outside 24h window and no template; cannot deliver",
        });
        expired++;
        continue;
      }

      // Optimistic claim — only send if still QUEUED, preventing double-sends.
      const claimed = await prisma.messageLog.updateMany({
        where: { id: msg.id, status: "QUEUED" },
        data: { status: "SENT" },
      });
      if (claimed.count === 0) {
        skipped++;
        continue;
      }

      try {
        const result = await provider.send({
          to: msg.to,
          body: msg.body,
          // If a template is linked, send as template; params aren't stored
          // separately, so template messages rely on body-less templates or
          // templates whose content is fixed. Free-text path uses body.
          templateName: hasTemplate ? msg.template!.name : undefined,
        });

        if (result.success) {
          await updateMessageStatus(msg.id, "SENT", {
            providerMessageId: result.messageId,
          });
          sent++;
        } else {
          // Re-queue for another attempt (retry cron enforces max retries).
          await updateMessageStatus(msg.id, "QUEUED", { error: result.error });
          failed++;
        }
      } catch (error) {
        await updateMessageStatus(msg.id, "QUEUED", {
          error: error instanceof Error ? error.message : "send failed",
        });
        failed++;
      }
    }

    log.info({ sent, failed, expired, skipped, total: messages.length }, "WhatsApp send batch complete");

    return NextResponse.json({ status: "ok", sent, failed, expired });
  } catch (error) {
    log.error({ err: error }, "WhatsApp send cron failed");
    return NextResponse.json({ error: "WhatsApp send cron failed" }, { status: 500 });
  }
}

export const POST = withCronAuth(handler);
