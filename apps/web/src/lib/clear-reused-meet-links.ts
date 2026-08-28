import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";

const log = createLogger("clear-reused-meet-links");

export async function clearReusedBatchMeetingLinks(): Promise<number> {
  const batches = await prisma.batch.findMany({
    where: {
      OR: [{ meetingLink: { not: null } }, { meetingId: { not: null } }],
    },
    select: { meetingLink: true, meetingId: true },
  });

  const links = [
    ...new Set(
      batches
        .map((b) => b.meetingLink)
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  const meetingIds = [
    ...new Set(
      batches
        .map((b) => b.meetingId)
        .filter((v): v is string => Boolean(v)),
    ),
  ];

  if (links.length === 0 && meetingIds.length === 0) return 0;

  const result = await prisma.session.updateMany({
    where: {
      status: "SCHEDULED",
      startsAt: { gt: new Date() },
      OR: [
        ...(links.length > 0 ? [{ joinUrl: { in: links } }] : []),
        ...(meetingIds.length > 0 ? [{ meetingId: { in: meetingIds } }] : []),
      ],
    },
    data: {
      joinUrl: null,
      meetingId: null,
    },
  });

  if (result.count > 0) {
    log.info(
      { cleared: result.count },
      "Cleared reused batch Meet links from future sessions",
    );
  }

  return result.count;
}
