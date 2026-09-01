import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { withCronAuth } from "@/lib/cron-auth";
import { getGoogleConfig } from "@/lib/google-config";
import { getConfig } from "@/lib/config";
import { clearReusedBatchMeetingLinks } from "@/lib/clear-reused-meet-links";
import { syncSessionJoinUrlToSheet } from "@/lib/sync-session-join-url";
import { createSessionMeet } from "@/lib/create-session-meet";
import { reconcileMeetGroups } from "@/lib/sync-meet-group";
import { onMeetLinkGenerated } from "@ru/notifications";

const log = createLogger("cron:auto-generate-meet");

async function handler(request: NextRequest) {
  try {
    const cleared = await clearReusedBatchMeetingLinks();

    const googleConfig = getGoogleConfig();
    if (!googleConfig) {
      return NextResponse.json({
        status: "skipped",
        reason: "Google Workspace not configured",
        cleared,
      });
    }

    const now = new Date();
    const config = await getConfig();
    const generateBeforeMin = config.MEET_GENERATE_BEFORE_MIN;
    const generateBefore = new Date(now.getTime() + generateBeforeMin * 60 * 1000);

    const sessions = await prisma.session.findMany({
      where: {
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        joinUrl: null,
        startsAt: { lte: generateBefore },
        endsAt: { gt: now },
      },
      include: {
        product: { select: { name: true, type: true } },
      },
      take: 20,
      orderBy: { startsAt: "asc" },
    });

    if (sessions.length === 0) {
      return NextResponse.json({ status: "ok", generated: 0, cleared });
    }

    let generated = 0;

    for (const session of sessions) {
      try {
        const meetResult = await createSessionMeet(googleConfig, session);

        await prisma.session.update({
          where: { id: session.id },
          data: {
            joinUrl: meetResult.meetLink,
            meetingId: meetResult.meetingId,
            spaceName: meetResult.spaceName,
            ...(meetResult.calendarEventId
              ? { calendarEventId: meetResult.calendarEventId }
              : {}),
          },
        });

        generated++;
        log.info({ sessionId: session.id }, "Auto-generated Meet link");
        syncSessionJoinUrlToSheet(session, meetResult.meetLink).catch((err) =>
          log.warn(
            { err, sessionId: session.id },
            "Failed to write Join URL to paid-users sheet",
          ),
        );
        await onMeetLinkGenerated(session.id, meetResult.meetLink);
      } catch (error) {
        log.error(
          { err: error, sessionId: session.id },
          "Failed to auto-generate Meet link for session",
        );
      }
    }

    try {
      await reconcileMeetGroups();
    } catch (err) {
      log.warn({ err }, "Meet group reconcile failed after auto-generate");
    }

    log.info({ generated, total: sessions.length, cleared }, "Auto-generate batch complete");
    return NextResponse.json({ status: "ok", generated, total: sessions.length, cleared });
  } catch (error) {
    log.error({ err: error }, "Auto-generate Meet cron failed");
    return NextResponse.json(
      { error: "Auto-generate Meet cron failed" },
      { status: 500 },
    );
  }
}

export const POST = withCronAuth(handler);
