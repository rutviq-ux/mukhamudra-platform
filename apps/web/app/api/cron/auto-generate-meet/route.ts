import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { withCronAuth } from "@/lib/cron-auth";
import { getGoogleConfig } from "@/lib/google-config";
import { getConfig } from "@/lib/config";
import { clearReusedBatchMeetingLinks } from "@/lib/clear-reused-meet-links";
import {
  createMeetingWithAttendees,
  waitForMeetSpaceName,
  configureMeetSpace,
} from "@ru/google-workspace";
import {
  generateMeetingTitle,
  generateMeetingDescription,
} from "@/lib/meet-helpers";
import {
  getSessionMeetAttendeeEmails,
  syncSessionJoinUrlToSheet,
} from "@/lib/sync-session-join-url";

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
        coach: { select: { email: true } },
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
        const title = generateMeetingTitle(
          session.product.name,
          session.modalities,
          session.startsAt,
        );
        const description = generateMeetingDescription(
          session,
          session.product.name,
          session.modalities,
        );
        const attendeeEmails = await getSessionMeetAttendeeEmails(session);

        const meetResult = await createMeetingWithAttendees(googleConfig, {
          title,
          description,
          startTime: session.startsAt,
          endTime: session.endsAt,
          attendeeEmails,
        });

        let spaceName: string | null = null;
        try {
          spaceName = await waitForMeetSpaceName(
            googleConfig,
            meetResult.meetingId,
          );
        } catch {
        }

        if (spaceName) {
          try {
            const configured = await configureMeetSpace(googleConfig, spaceName);
            if (!configured.autoRecord) {
              log.warn(
                { sessionId: session.id },
                "Meet auto-record could not be enabled; access is TRUSTED",
              );
            }
          } catch (err) {
            log.warn({ err, sessionId: session.id }, "Could not configure Meet space");
          }
        }

        await prisma.session.update({
          where: { id: session.id },
          data: {
            joinUrl: meetResult.meetLink,
            calendarEventId: meetResult.calendarEventId,
            meetingId: meetResult.meetingId,
            spaceName,
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
      } catch (error) {
        log.error(
          { err: error, sessionId: session.id },
          "Failed to auto-generate Meet link for session",
        );
      }
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
