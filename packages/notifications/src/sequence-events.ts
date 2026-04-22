// Sequence lifecycle event emitter
// Handles enrollment and cancellation based on trigger/cancel events

import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";

const log = createLogger("notifications:sequences");

/**
 * Emit a sequence lifecycle event.
 * - Cancels active enrollments whose sequence.cancelEvents contains this event
 * - Enrolls the target in active sequences whose triggerEvent matches
 */
export async function emitSequenceEvent(
  event: string,
  target: { userId?: string; leadId?: string },
): Promise<void> {
  const { userId, leadId } = target;

  if (!userId && !leadId) {
    log.warn({ event }, "emitSequenceEvent called without userId or leadId");
    return;
  }

  const targetFilter = userId ? { userId } : { leadId };

  // 1. Cancel: find ACTIVE enrollments where sequence.cancelEvents contains this event
  try {
    const enrollmentsToCancel = await prisma.sequenceEnrollment.findMany({
      where: {
        status: "ACTIVE",
        ...targetFilter,
        sequence: { cancelEvents: { has: event } },
      },
      select: { id: true },
    });

    if (enrollmentsToCancel.length > 0) {
      await prisma.sequenceEnrollment.updateMany({
        where: { id: { in: enrollmentsToCancel.map((e) => e.id) } },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: event,
        },
      });

      log.info(
        { event, ...targetFilter, cancelled: enrollmentsToCancel.length },
        "Cancelled enrollments",
      );
    }
  } catch (err) {
    log.error({ err, event, ...targetFilter }, "Failed to cancel enrollments");
  }

  // 2. Enroll: find active sequences whose triggerEvent matches
  try {
    const sequences = await prisma.sequence.findMany({
      where: { triggerEvent: event, isActive: true },
    });

    for (const seq of sequences) {
      // Determine the unique constraint key
      const uniqueKey = userId
        ? { sequenceId_userId: { sequenceId: seq.id, userId } }
        : { sequenceId_leadId: { sequenceId: seq.id, leadId: leadId! } };

      await prisma.sequenceEnrollment
        .upsert({
          where: uniqueKey,
          update: {}, // Already enrolled, skip
          create: {
            sequenceId: seq.id,
            userId: userId || undefined,
            leadId: leadId || undefined,
            status: "ACTIVE",
            currentStep: 0,
          },
        })
        .catch((err) => {
          // Ignore unique constraint errors (race condition)
          log.debug({ err, sequenceId: seq.id }, "Enrollment upsert conflict — likely already enrolled");
        });
    }

    if (sequences.length > 0) {
      log.info(
        { event, ...targetFilter, enrolled: sequences.length },
        "Enrolled in sequences",
      );
    }
  } catch (err) {
    log.error({ err, event, ...targetFilter }, "Failed to enroll in sequences");
  }
}
