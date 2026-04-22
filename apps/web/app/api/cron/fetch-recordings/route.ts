import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { findRecording, resolveSpaceName } from "@ru/google-workspace";
import { withCronAuth } from "@/lib/cron-auth";
import { queueNotification } from "@ru/notifications";
import { getGoogleConfig } from "@/lib/google-config";

const log = createLogger("cron:fetch-recordings");

async function handler(request: NextRequest) {
  try {
    const googleConfig = getGoogleConfig();
    if (!googleConfig) {
      return NextResponse.json({
        status: "skipped",
        reason: "Google Workspace not configured",
      });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Find completed sessions that need recording lookup
    // Include sessions with spaceName OR meetingId (to attempt space resolution)
    const sessions = await prisma.session.findMany({
      where: {
        status: "COMPLETED",
        recordingUrl: null,
        OR: [
          { spaceName: { not: null } },
          { meetingId: { not: null } },
        ],
        endsAt: { lt: oneHourAgo },
      },
      take: 20,
      orderBy: { endsAt: "desc" },
    });

    if (sessions.length === 0) {
      return NextResponse.json({ status: "ok", found: 0, total: 0 });
    }

    let found = 0;

    for (const session of sessions) {
      try {
        let spaceName = session.spaceName;

        // If no spaceName but we have a meetingId, try to resolve the space
        if ((!spaceName || !spaceName.startsWith("spaces/")) && session.meetingId) {
          const resolved = await resolveSpaceName(googleConfig, session.meetingId);
          if (resolved) {
            spaceName = resolved;
            // Cache the resolved space name
            await prisma.session.update({
              where: { id: session.id },
              data: { spaceName: resolved },
            });
          }
        }

        if (!spaceName || !spaceName.startsWith("spaces/")) continue;

        const recording = await findRecording(googleConfig, spaceName);
        if (recording) {
          await prisma.session.update({
            where: { id: session.id },
            data: { recordingUrl: recording.recordingUrl },
          });
          found++;

          // Notify users with recording access who had bookings for this session
          notifyRecordingAccessUsers(session.id, session.title || "Session", session.startsAt).catch(
            (err) => log.error({ err, sessionId: session.id }, "Failed to notify recording users"),
          );
        }
      } catch (error) {
        log.error(
          { err: error, sessionId: session.id },
          "Failed to fetch recording for session",
        );
      }
    }

    log.info(
      { found, total: sessions.length },
      "Recording fetch batch complete",
    );

    return NextResponse.json({ status: "ok", found, total: sessions.length });
  } catch (error) {
    log.error({ err: error }, "Recording fetch cron failed");
    return NextResponse.json(
      { error: "Recording fetch cron failed" },
      { status: 500 },
    );
  }
}

export const POST = withCronAuth(handler);

/**
 * Notify users who booked this session AND have active recording access.
 */
async function notifyRecordingAccessUsers(
  sessionId: string,
  sessionTitle: string,
  sessionDate: Date,
) {
  const bookings = await prisma.booking.findMany({
    where: { sessionId, status: { in: ["CONFIRMED", "COMPLETED"] } },
    select: { userId: true, user: { select: { name: true } } },
  });

  for (const booking of bookings) {
    // Check if user has recording access (paid add-on OR bundle-annual)
    const hasAddonAccess = await prisma.recordingAccess.findFirst({
      where: {
        userId: booking.userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    const hasBundleAnnual =
      !hasAddonAccess &&
      (await prisma.membership.findFirst({
        where: {
          userId: booking.userId,
          status: "ACTIVE",
          plan: { product: { type: "BUNDLE" }, interval: "ANNUAL" },
        },
      }));

    if (hasAddonAccess || hasBundleAnnual) {
      await queueNotification({
        userId: booking.userId,
        templateName: "recording_available",
        variables: {
          name: booking.user.name || "there",
          sessionTitle,
          sessionDate: sessionDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        },
      });
    }
  }
}
