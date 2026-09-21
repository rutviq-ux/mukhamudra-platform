import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import {
  createSheetsClient,
  ensurePaidUsersTab,
  updatePaidUserJoinUrls,
} from "@ru/google-workspace";
import { getPaidUsersSheetConfig } from "@/lib/paid-user-sheet-config";

const log = createLogger("sync-session-join-url");

export function sessionJoinProductTypes(
  sessionType: "FACE_YOGA" | "PRANAYAMA" | "BUNDLE",
): Array<"FACE_YOGA" | "PRANAYAMA" | "BUNDLE"> {
  if (sessionType === "BUNDLE") {
    return ["BUNDLE", "FACE_YOGA", "PRANAYAMA"];
  }
  return [sessionType, "BUNDLE"];
}

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
              type: { in: sessionJoinProductTypes(session.product.type) },
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

export async function getUpcomingJoinUrlForUser(
  userId: string,
): Promise<string | null> {
  const memberships = await prisma.membership.findMany({
    where: { userId, status: "ACTIVE" },
    select: { plan: { select: { product: { select: { type: true } } } } },
  });

  const types = new Set<"FACE_YOGA" | "PRANAYAMA" | "BUNDLE">();
  for (const membership of memberships) {
    const type = membership.plan.product.type;
    if (type === "BUNDLE") {
      types.add("BUNDLE");
      types.add("FACE_YOGA");
      types.add("PRANAYAMA");
    } else if (type === "FACE_YOGA" || type === "PRANAYAMA") {
      types.add(type);
    }
  }

  if (types.size === 0) return null;

  const session = await prisma.session.findFirst({
    where: {
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      joinUrl: { not: null },
      endsAt: { gt: new Date() },
      product: { type: { in: [...types] } },
    },
    orderBy: { startsAt: "asc" },
    select: { joinUrl: true },
  });

  return session?.joinUrl ?? null;
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

  const recipients = await getSessionJoinRecipients(session);
  if (recipients.length === 0) {
    return { updated: 0 };
  }

  const sheets = createSheetsClient(config.serviceAccount);
  await ensurePaidUsersTab(sheets, config.spreadsheetId, config.tabName);
  const result = await updatePaidUserJoinUrls(
    sheets,
    config.spreadsheetId,
    config.tabName,
    recipients.map((user) => user.id),
    joinUrl,
    recipients.map((user) => user.email),
    true,
  );

  log.info(
    { sessionId: session.id, updated: result.updated, recipients: recipients.length },
    "Paid-user Join URL column updated",
  );

  return result;
}
