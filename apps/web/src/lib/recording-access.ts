import { prisma } from "@ru/db";

interface RecordingAccessResult {
  hasAccess: boolean;
  expiresAt: Date | null;
  source: "addon" | null;
}

/**
 * Check if a user has recording access via the paid add-on.
 */
export async function getRecordingAccessInfo(
  userId: string,
): Promise<RecordingAccessResult> {
  // Check explicit recording add-on purchase
  const addon = await prisma.recordingAccess.findFirst({
    where: { userId, isActive: true, expiresAt: { gt: new Date() } },
  });

  if (addon) {
    return { hasAccess: true, expiresAt: addon.expiresAt, source: "addon" };
  }

  return { hasAccess: false, expiresAt: null, source: null };
}
