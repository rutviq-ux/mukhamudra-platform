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
 * We trust status: "ACTIVE" the same way the Sessions page does —
 * the expire-memberships cron handles flipping status nightly, so
 * we do not need a redundant periodEnd check here.
 */
export async function getRecordingAccessInfo(
  userId: string,
): Promise<RecordingAccessResult> {
  const activeMembership = await prisma.membership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
  });

  if (!activeMembership) {
    return { hasAccess: false, expiresAt: null, source: null };
  }

  return { hasAccess: true, expiresAt: activeMembership.periodEnd, source: "membership" };
}
