import { prisma } from "@ru/db";

interface RecordingAccessResult {
  hasAccess: boolean;
  expiresAt: Date | null;
  source: "membership" | "addon" | null;
}

/**
 * Check if a user has recording access.
 *
 * Recordings are included with all active Mukha Mudra memberships.
 * Any user with an active, non-expired membership gets access.
 * We check membership periodEnd directly rather than relying solely
 * on status, for the same reason as other purchase routes: the
 * expire-memberships cron only runs nightly.
 */
export async function getRecordingAccessInfo(
  userId: string,
): Promise<RecordingAccessResult> {
  const activeMembership = await prisma.membership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      periodEnd: { gte: new Date() },
    },
  });

  if (!activeMembership) {
    return { hasAccess: false, expiresAt: null, source: null };
  }

  return { hasAccess: true, expiresAt: activeMembership.periodEnd, source: "membership" };
}
