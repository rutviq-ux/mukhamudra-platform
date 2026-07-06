import { prisma } from "@ru/db";

interface RecordingAccessResult {
  hasAccess: boolean;
  expiresAt: Date | null;
  source: "addon" | null;
}

/**
 * Check if a user has recording access via the paid add-on.
 *
 * Recording access requires BOTH an active, unexpired add-on purchase AND a
 * currently active (non-expired) membership. The add-on rides on top of an
 * active package — if the underlying membership expires or lapses, access
 * is revoked immediately even if the add-on's own expiresAt (1 year from
 * purchase) hasn't been reached yet. Applies to members of any interval
 * (monthly or annual) and any payment source. We check membership periodEnd directly
 * here rather than relying solely on status, for the same reason as the
 * purchase route: the expire-memberships cron only runs nightly.
 */
export async function getRecordingAccessInfo(
  userId: string,
): Promise<RecordingAccessResult> {
  // Check explicit recording add-on purchase
  const addon = await prisma.recordingAccess.findFirst({
    where: { userId, isActive: true, expiresAt: { gt: new Date() } },
  });

  if (!addon) {
    return { hasAccess: false, expiresAt: null, source: null };
  }

  // The add-on alone isn't enough — the underlying membership must still be
  // currently active. We require periodEnd to be set AND in the future, so
  // access is automatically cut off the moment a subscription expires (any
  // interval, any payment source). This is intentionally strict: no
  // open-ended access for memberships lacking an end date.
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

  return { hasAccess: true, expiresAt: addon.expiresAt, source: "addon" };
}
