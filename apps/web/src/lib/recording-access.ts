import { prisma } from "@ru/db";

interface RecordingAccessResult {
  hasAccess: boolean;
  expiresAt: Date | null;
  source: "addon" | "bundle-annual" | null;
}

/**
 * Check if a user has recording access — either via the paid add-on
 * or via a bundle-annual membership (which includes it for free).
 */
export async function getRecordingAccessInfo(
  userId: string,
): Promise<RecordingAccessResult> {
  // 1. Check explicit recording add-on purchase
  const addon = await prisma.recordingAccess.findFirst({
    where: { userId, isActive: true, expiresAt: { gt: new Date() } },
  });

  if (addon) {
    return { hasAccess: true, expiresAt: addon.expiresAt, source: "addon" };
  }

  // 2. Bundle-annual includes recording access for free
  const bundleAnnual = await prisma.membership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      plan: { product: { type: "BUNDLE" }, interval: "ANNUAL" },
    },
    select: { periodEnd: true },
  });

  if (bundleAnnual) {
    return {
      hasAccess: true,
      expiresAt: bundleAnnual.periodEnd,
      source: "bundle-annual",
    };
  }

  return { hasAccess: false, expiresAt: null, source: null };
}
