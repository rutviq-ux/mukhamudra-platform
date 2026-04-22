import { NextRequest, NextResponse } from "next/server";
import { Prisma, prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { queueNotification, logMessage } from "@ru/notifications";
import { withCronAuth } from "@/lib/cron-auth";

const log = createLogger("cron:process-broadcasts");

/** Interpolate {{variables}} in a template body */
function interpolate(
  text: string,
  variables: Record<string, string>,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    key in variables ? variables[key]! : match,
  );
}

interface SegmentFilter {
  audience?: "users" | "leads" | "all";
  hasActiveMembership?: boolean;
  goal?: string[];
  onboardedBefore?: string;
  onboardedAfter?: string;
  lastAttendedBefore?: string;
  membershipStatus?: string[];
}

/** Build Prisma where clause for user segments */
function buildUserWhere(
  segment: SegmentFilter,
  channel: string,
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  if (segment.hasActiveMembership) {
    where.memberships = { some: { status: "ACTIVE" } };
  }
  if (segment.goal && segment.goal.length > 0) {
    where.goal = { in: segment.goal };
  }
  if (segment.onboardedBefore) {
    where.onboardedAt = { ...((where.onboardedAt as object) || {}), lt: new Date(segment.onboardedBefore) };
  }
  if (segment.onboardedAfter) {
    where.onboardedAt = { ...((where.onboardedAt as object) || {}), gte: new Date(segment.onboardedAfter) };
  }
  if (segment.lastAttendedBefore) {
    where.attendances = {
      none: { joinedAt: { gte: new Date(segment.lastAttendedBefore) } },
    };
  }

  // Auto-apply opt-in based on channel
  if (channel === "WHATSAPP") where.whatsappOptIn = true;
  if (channel === "EMAIL") where.marketingOptIn = true;
  if (channel === "PUSH") where.pushOptIn = true;

  return where;
}

const BATCH_SIZE = 50;

async function handler(request: NextRequest) {
  try {
    const now = new Date();

    // Find broadcasts ready to process
    const broadcasts = await prisma.broadcast.findMany({
      where: {
        OR: [
          // Scheduled broadcasts whose time has come
          {
            status: "DRAFT",
            scheduledFor: { lte: now },
          },
          // In-progress broadcasts (resume)
          { status: "SENDING" },
        ],
      },
      include: {
        template: true,
      },
      take: 5, // Process up to 5 broadcasts per cycle
    });

    if (broadcasts.length === 0) {
      return NextResponse.json({ status: "ok", processed: 0 });
    }

    let totalSent = 0;

    for (const broadcast of broadcasts) {
      const segment = broadcast.segment as SegmentFilter;
      const variables = broadcast.variables as Record<string, string>;
      const channel = broadcast.template.channel;
      const audience = segment.audience || "users";

      // Mark as SENDING
      if (broadcast.status === "DRAFT") {
        await prisma.broadcast.update({
          where: { id: broadcast.id },
          data: { status: "SENDING", startedAt: now },
        });
      }

      // Get IDs of recipients already messaged in this broadcast
      const alreadySent = await prisma.messageLog.findMany({
        where: { broadcastId: broadcast.id },
        select: { to: true },
      });
      const alreadySentSet = new Set(alreadySent.map((m) => m.to));

      let batchSent = 0;
      let batchFailed = 0;

      // Process users
      if (audience === "users" || audience === "all") {
        const userWhere = buildUserWhere(segment, channel);
        const users = await prisma.user.findMany({
          where: userWhere,
          select: { id: true, name: true, email: true, phone: true },
          take: BATCH_SIZE,
        });

        // Update total on first run
        if (broadcast.totalRecipients === 0) {
          const total = await prisma.user.count({ where: userWhere });
          await prisma.broadcast.update({
            where: { id: broadcast.id },
            data: { totalRecipients: total },
          });
        }

        for (const user of users) {
          const to =
            channel === "EMAIL" ? user.email
            : channel === "PUSH" ? user.id
            : user.phone;

          if (!to || alreadySentSet.has(to)) continue;

          try {
            const userVars = { ...variables, name: user.name || "there" };
            const logId = await queueNotification({
              userId: user.id,
              templateName: broadcast.template.name,
              variables: userVars,
            });

            if (logId) {
              await prisma.messageLog.update({
                where: { id: logId },
                data: { broadcastId: broadcast.id },
              });
              batchSent++;
            }
          } catch (err) {
            batchFailed++;
            log.error({ err, userId: user.id }, "Failed to queue broadcast message");
          }
        }
      }

      // Process leads (WhatsApp only)
      if ((audience === "leads" || audience === "all") && channel === "WHATSAPP") {
        const leads = await prisma.lead.findMany({
          select: { id: true, name: true, phone: true },
          take: BATCH_SIZE,
        });

        if (broadcast.totalRecipients === 0 && audience === "leads") {
          const total = await prisma.lead.count();
          await prisma.broadcast.update({
            where: { id: broadcast.id },
            data: { totalRecipients: total },
          });
        }

        for (const lead of leads) {
          if (alreadySentSet.has(lead.phone)) continue;

          try {
            const leadVars = { ...variables, name: lead.name || "there" };
            const body = interpolate(broadcast.template.body, leadVars);

            const logId = await logMessage({
              channel: "WHATSAPP",
              to: lead.phone,
              templateId: broadcast.templateId,
              body,
              status: "QUEUED",
            });

            await prisma.messageLog.update({
              where: { id: logId },
              data: { broadcastId: broadcast.id },
            });
            batchSent++;
          } catch (err) {
            batchFailed++;
            log.error({ err, leadId: lead.id }, "Failed to queue broadcast to lead");
          }
        }
      }

      // Update counts
      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: {
          sentCount: { increment: batchSent },
          failedCount: { increment: batchFailed },
        },
      });

      // Check if complete (all recipients processed)
      const updatedBroadcast = await prisma.broadcast.findUnique({
        where: { id: broadcast.id },
        select: { sentCount: true, failedCount: true, totalRecipients: true },
      });

      if (
        updatedBroadcast &&
        updatedBroadcast.sentCount + updatedBroadcast.failedCount >=
          updatedBroadcast.totalRecipients
      ) {
        await prisma.broadcast.update({
          where: { id: broadcast.id },
          data: { status: "COMPLETED", completedAt: now },
        });
      }

      totalSent += batchSent;

      log.info(
        { broadcastId: broadcast.id, sent: batchSent, failed: batchFailed },
        "Broadcast batch processed",
      );
    }

    return NextResponse.json({
      status: "ok",
      broadcasts: broadcasts.length,
      totalSent,
    });
  } catch (error) {
    log.error({ err: error }, "Broadcast processing failed");
    return NextResponse.json(
      { error: "Broadcast processing failed" },
      { status: 500 },
    );
  }
}

export const POST = withCronAuth(handler);
