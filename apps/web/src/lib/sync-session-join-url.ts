import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import {
  createSheetsClient,
  ensurePaidUsersTab,
  updatePaidUserJoinUrls,
} from "@ru/google-workspace";
import { getPaidUsersSheetConfig } from "@/lib/paid-user-sheet-config";

const log = createLogger("sync-session-join-url");

export async function getSessionJoinRecipientIds(session: {
  id: string;
  product: { type: "FACE_YOGA" | "PRANAYAMA" | "BUNDLE" };
}): Promise<string[]> {
  const members = await prisma.user.findMany({
    where: {
      memberships: {
        some: {
          status: "ACTIVE",
          plan: {
            product: {
              type: { in: [session.product.type, "BUNDLE"] },
            },
          },
        },
      },
    },
    select: { id: true },
  });

  const bookings = await prisma.booking.findMany({
    where: { sessionId: session.id, status: "CONFIRMED" },
    select: { userId: true },
  });

  return [
    ...new Set([
      ...members.map((user) => user.id),
      ...bookings.map((booking) => booking.userId),
    ]),
  ];
}

export async function syncSessionJoinUrlToSheet(
  session: {
    id: string;
    product: { type: "FACE_YOGA" | "PRANAYAMA" | "BUNDLE" };
  },
  joinUrl: string,
): Promise<{ updated: number } | { status: "disabled" }> {
  const config = getPaidUsersSheetConfig();
  if (!config) {
    return { status: "disabled" };
  }

  const userIds = await getSessionJoinRecipientIds(session);
  if (userIds.length === 0) {
    return { updated: 0 };
  }

  const sheets = createSheetsClient(config.serviceAccount);
  await ensurePaidUsersTab(sheets, config.spreadsheetId, config.tabName);
  const result = await updatePaidUserJoinUrls(
    sheets,
    config.spreadsheetId,
    config.tabName,
    userIds,
    joinUrl,
  );

  log.info(
    { sessionId: session.id, updated: result.updated, recipients: userIds.length },
    "Paid-user Join URL column updated",
  );

  return result;
}
