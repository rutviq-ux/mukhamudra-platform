import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import {
  createSheetsClient,
  ensurePaidUsersTab,
  updatePaidUserJoinUrls,
} from "@ru/google-workspace";
import { getPaidUsersSheetConfig } from "@/lib/paid-user-sheet-config";

const log = createLogger("sync-session-join-url");

async function getSessionJoinRecipients(session: {
  id: string;
  product: { type: "FACE_YOGA" | "PRANAYAMA" | "BUNDLE" };
}): Promise<{ id: string; email: string }[]> {
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
    select: { id: true, email: true },
  });

  const bookings = await prisma.booking.findMany({
    where: { sessionId: session.id, status: "CONFIRMED" },
    select: { user: { select: { id: true, email: true } } },
  });

  const byId = new Map<string, { id: string; email: string }>();
  for (const user of members) {
    byId.set(user.id, user);
  }
  for (const booking of bookings) {
    byId.set(booking.user.id, booking.user);
  }
  return [...byId.values()];
}

export async function getSessionJoinRecipientIds(session: {
  id: string;
  product: { type: "FACE_YOGA" | "PRANAYAMA" | "BUNDLE" };
}): Promise<string[]> {
  const recipients = await getSessionJoinRecipients(session);
  return recipients.map((user) => user.id);
}

export async function getSessionJoinRecipientEmails(session: {
  id: string;
  product: { type: "FACE_YOGA" | "PRANAYAMA" | "BUNDLE" };
}): Promise<string[]> {
  const recipients = await getSessionJoinRecipients(session);
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const user of recipients) {
    const email = user.email.trim();
    const key = email.toLowerCase();
    if (!email || seen.has(key)) continue;
    seen.add(key);
    emails.push(email);
  }
  return emails;
}

export async function getSessionMeetAttendeeEmails(session: {
  id: string;
  product: { type: "FACE_YOGA" | "PRANAYAMA" | "BUNDLE" };
  coach?: { email: string } | null;
}): Promise<string[]> {
  const emails = await getSessionJoinRecipientEmails(session);
  const coachEmail = session.coach?.email?.trim();
  if (
    coachEmail &&
    !emails.some((email) => email.toLowerCase() === coachEmail.toLowerCase())
  ) {
    emails.push(coachEmail);
  }
  return emails;
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
