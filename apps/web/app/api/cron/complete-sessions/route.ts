import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { listConferenceParticipants } from "@ru/google-workspace";
import type { ParticipantInfo } from "@ru/google-workspace";
import { emitSequenceEvent } from "@ru/notifications";
import { withCronAuth } from "@/lib/cron-auth";
import { getGoogleConfig } from "@/lib/google-config";

const log = createLogger("cron:complete-sessions");

/** Only process sessions that ended at least 10 minutes ago */
const BUFFER_MINUTES = 10;
/** Don't process sessions older than 24 hours (avoid backlog on first deploy) */
const MAX_AGE_HOURS = 24;
/** Max sessions to process per run to avoid timeout */
const BATCH_SIZE = 20;

async function handler(_request: NextRequest) {
  try {
    const now = new Date();
    const bufferCutoff = new Date(now.getTime() - BUFFER_MINUTES * 60 * 1000);
    const maxAgeCutoff = new Date(now.getTime() - MAX_AGE_HOURS * 60 * 60 * 1000);

    const googleConfig = getGoogleConfig();

    // ── Phase 1: Status Transitions ──────────────────────────────

    // SCHEDULED -> IN_PROGRESS (sessions that have started)
    const startedResult = await prisma.session.updateMany({
      where: {
        status: "SCHEDULED",
        startsAt: { lte: now },
      },
      data: { status: "IN_PROGRESS" },
    });

    // IN_PROGRESS -> COMPLETED (sessions that ended 10+ minutes ago, within 24h)
    const completedSessions = await prisma.session.findMany({
      where: {
        status: "IN_PROGRESS",
        endsAt: {
          lte: bufferCutoff,
          gte: maxAgeCutoff,
        },
      },
      select: { id: true, spaceName: true, meetingId: true },
      take: BATCH_SIZE,
      orderBy: { endsAt: "asc" },
    });

    const completedIds = completedSessions.map((s) => s.id);

    if (completedIds.length > 0) {
      await prisma.session.updateMany({
        where: { id: { in: completedIds } },
        data: { status: "COMPLETED" },
      });
    }

    log.info(
      { started: startedResult.count, completed: completedIds.length },
      "Phase 1: status transitions",
    );

    // ── Phase 2 & 3: Attendance + Booking Updates ────────────────

    let totalAttended = 0;
    let totalNoShow = 0;

    for (const session of completedSessions) {
      try {
        // Attempt to fetch participants from Google Meet
        let participants: ParticipantInfo[] | null = null;

        if (session.spaceName && googleConfig) {
          try {
            participants = await listConferenceParticipants(
              googleConfig,
              session.spaceName,
            );
          } catch (error) {
            log.error(
              { err: error, sessionId: session.id },
              "Failed to fetch Meet participants — skipping auto-attendance",
            );
            // participants stays null; we'll skip booking updates for this session
          }
        }

        // If we couldn't get participant data, skip this session entirely
        // (leave bookings as CONFIRMED for coach to handle manually)
        if (!participants) {
          log.info(
            { sessionId: session.id, spaceName: session.spaceName },
            "No participant data available — leaving bookings as CONFIRMED",
          );
          continue;
        }

        // Build email->participant lookup (case-insensitive)
        const participantsByEmail = new Map<string, ParticipantInfo>();
        for (const p of participants) {
          if (p.email) {
            participantsByEmail.set(p.email.toLowerCase(), p);
          }
        }

        // Get all CONFIRMED bookings with user email
        const bookings = await prisma.booking.findMany({
          where: { sessionId: session.id, status: "CONFIRMED" },
          select: {
            id: true,
            userId: true,
            user: { select: { email: true } },
          },
        });

        // Process each booking in a transaction
        for (const booking of bookings) {
          const participant = participantsByEmail.get(
            booking.user.email.toLowerCase(),
          );

          if (participant) {
            // User attended — upsert attendance + update booking
            await prisma.$transaction(async (tx) => {
              // Check if this is the user's first-ever attendance (before upserting)
              const priorCount = await tx.attendance.count({
                where: { userId: booking.userId },
              });

              await tx.attendance.upsert({
                where: {
                  userId_sessionId: {
                    userId: booking.userId,
                    sessionId: session.id,
                  },
                },
                update: {
                  joinedAt: participant.joinedAt,
                  leftAt: participant.leftAt,
                  durationMin: participant.durationMin,
                },
                create: {
                  userId: booking.userId,
                  sessionId: session.id,
                  joinedAt: participant.joinedAt,
                  leftAt: participant.leftAt,
                  durationMin: participant.durationMin,
                },
              });

              await tx.booking.update({
                where: { id: booking.id },
                data: { status: "COMPLETED" },
              });

              // Emit first-booking event if this is their first attendance
              if (priorCount === 0) {
                emitSequenceEvent("booking.first", {
                  userId: booking.userId,
                }).catch((err) =>
                  log.error(
                    { err, userId: booking.userId },
                    "Failed to emit booking.first sequence event",
                  ),
                );
              }
            });

            totalAttended++;
          } else {
            // User did not attend — mark as NO_SHOW
            await prisma.booking.update({
              where: { id: booking.id },
              data: { status: "NO_SHOW" },
            });

            totalNoShow++;
          }
        }
      } catch (error) {
        log.error(
          { err: error, sessionId: session.id },
          "Failed to process session attendance/bookings",
        );
      }
    }

    log.info(
      {
        started: startedResult.count,
        completed: completedIds.length,
        attended: totalAttended,
        noShow: totalNoShow,
      },
      `Completed ${completedIds.length} sessions, marked ${totalAttended} attended, ${totalNoShow} no-shows`,
    );

    return NextResponse.json({
      status: "ok",
      started: startedResult.count,
      completed: completedIds.length,
      attended: totalAttended,
      noShow: totalNoShow,
    });
  } catch (error) {
    log.error({ err: error }, "Complete-sessions cron failed");
    return NextResponse.json(
      { error: "Complete-sessions cron failed" },
      { status: 500 },
    );
  }
}

export const POST = withCronAuth(handler);
