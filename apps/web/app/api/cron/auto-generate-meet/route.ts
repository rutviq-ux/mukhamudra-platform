import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { withCronAuth } from "@/lib/cron-auth";
import { getGoogleConfig } from "@/lib/google-config";
import {
  createMeetingWithAttendees,
  resolveSpaceName,
  setSpaceAccessType,
} from "@ru/google-workspace";
import {
  generateMeetingTitle,
  generateMeetingDescription,
} from "@/lib/meet-helpers";

const log = createLogger("cron:auto-generate-meet");

async function handler(request: NextRequest) {
  try {
    const googleConfig = getGoogleConfig();
    if (!googleConfig) {
      return NextResponse.json({
        status: "skipped",
        reason: "Google Workspace not configured",
      });
    }

    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Find sessions starting within 5 minutes that don't have a Meet link
    const sessions = await prisma.session.findMany({
      where: {
        status: "SCHEDULED",
        joinUrl: null,
        startsAt: { gt: now, lte: fiveMinutesFromNow },
      },
      include: {
        product: { select: { name: true } },
        bookings: {
          where: { status: "CONFIRMED" },
          select: { user: { select: { email: true } } },
        },
      },
      take: 5,
      orderBy: { startsAt: "asc" },
    });

    if (sessions.length === 0) {
      return NextResponse.json({ status: "ok", generated: 0 });
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
        const attendeeEmails = session.bookings.map((b) => b.user.email);

        const meetResult = await createMeetingWithAttendees(googleConfig, {
          title,
          description,
          startTime: session.startsAt,
          endTime: session.endsAt,
          attendeeEmails,
        });

        // Best-effort: resolve space name for recordings + TRUSTED access
        let spaceName: string | null = null;
        try {
          spaceName = await resolveSpaceName(googleConfig, meetResult.meetingId);
        } catch {
          // Space not ready yet
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

        // Best-effort TRUSTED access
        if (spaceName) {
          setSpaceAccessType(googleConfig, spaceName, "TRUSTED").catch(
            (err) => log.warn({ err, sessionId: session.id }, "Could not set TRUSTED access"),
          );
        }

        generated++;
        log.info({ sessionId: session.id }, "Auto-generated Meet link");
      } catch (error) {
        log.error(
          { err: error, sessionId: session.id },
          "Failed to auto-generate Meet link for session",
        );
      }
    }

    log.info({ generated, total: sessions.length }, "Auto-generate batch complete");
    return NextResponse.json({ status: "ok", generated, total: sessions.length });
  } catch (error) {
    log.error({ err: error }, "Auto-generate Meet cron failed");
    return NextResponse.json(
      { error: "Auto-generate Meet cron failed" },
      { status: 500 },
    );
  }
}

export const POST = withCronAuth(handler);
