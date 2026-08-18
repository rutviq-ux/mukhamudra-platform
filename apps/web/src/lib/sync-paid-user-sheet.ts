import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import {
  createSheetsClient,
  ensurePaidUsersTab,
  upsertPaidUserRow,
} from "@ru/google-workspace";
import {
  buildPaidUserSheetRow,
  isClassMembership,
} from "@/lib/build-paid-user-row";
import { getPaidUsersSheetConfig } from "@/lib/paid-user-sheet-config";

const log = createLogger("sync-paid-user-sheet");

export interface SyncPaidUserResult {
  status:
    | "synced"
    | "skipped_no_phone"
    | "skipped_no_membership"
    | "skipped_no_row"
    | "disabled";
  action?: "created" | "updated";
}

export interface ReconcilePaidUsersResult {
  tabCreated: boolean;
  headerWritten: boolean;
  upserted: number;
  skippedNoPhone: number;
  skippedNoMembership: number;
  errors: number;
}

async function loadPaidUserContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      timezone: true,
      bookings: {
        where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          session: {
            select: {
              batch: { select: { name: true, startTime: true } },
            },
          },
        },
      },
      memberships: {
        include: {
          plan: {
            include: { product: true },
          },
        },
      },
      orders: {
        where: {
          status: "PAID",
          plan: { slug: { not: "recording-addon" } },
        },
        orderBy: { paidAt: "desc" },
        take: 1,
        select: { paidAt: true },
      },
    },
  });

  if (!user) return null;

  const classMemberships = user.memberships.filter((m) =>
    isClassMembership(m.plan.slug),
  );
  const latestPaidOrder = user.orders[0] ?? null;

  const batches = user.bookings
    .map((booking) => booking.session.batch)
    .filter((batch): batch is { name: string; startTime: string } =>
      Boolean(batch?.name && batch.startTime),
    );

  return {
    user,
    classMemberships,
    batches,
    paidAt: latestPaidOrder?.paidAt ?? null,
  };
}

/**
 * Upsert one paid user's row on the Paid Users sheet.
 * No-op when sheet config is missing, phone is absent, or user has no class membership history.
 * Never throws — callers should still fire-and-forget with .catch() for extra safety.
 */
export async function syncPaidUserToSheet(
  userId: string,
): Promise<SyncPaidUserResult> {
  const config = getPaidUsersSheetConfig();
  if (!config) {
    return { status: "disabled" };
  }

  const context = await loadPaidUserContext(userId);
  if (!context) {
    return { status: "skipped_no_membership" };
  }

  const { user, classMemberships, batches, paidAt } = context;

  if (!user.phone?.trim()) {
    log.info({ userId }, "Skipped paid-user sheet sync — no phone");
    return { status: "skipped_no_phone" };
  }

  if (classMemberships.length === 0) {
    return { status: "skipped_no_membership" };
  }

  const row = buildPaidUserSheetRow({
    userId: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    timezone: user.timezone,
    batches,
    memberships: classMemberships,
    paidAt,
  });

  if (!row) {
    return { status: "skipped_no_membership" };
  }

  const sheets = createSheetsClient(config.serviceAccount);
  await ensurePaidUsersTab(sheets, config.spreadsheetId, config.tabName);
  const result = await upsertPaidUserRow(
    sheets,
    config.spreadsheetId,
    config.tabName,
    row,
    { allowCreate: row.status === "ACTIVE" },
  );

  if (result.action === "skipped") {
    log.info({ userId, status: row.status }, "Skipped paid-user sheet sync — no existing row");
    return { status: "skipped_no_row" };
  }

  log.info(
    { userId, action: result.action, rowNumber: result.rowNumber },
    "Paid-user sheet row synced",
  );

  return {
    status: "synced",
    action: result.action,
  };
}

/**
 * Bootstrap/reconcile: ensure tab + header, then upsert all paid users with phones.
 */
export async function reconcileAllPaidUsersToSheet(): Promise<ReconcilePaidUsersResult> {
  const config = getPaidUsersSheetConfig();
  if (!config) {
    throw new Error("Paid users sheet sync is not configured");
  }

  const sheets = createSheetsClient(config.serviceAccount);
  const tabResult = await ensurePaidUsersTab(
    sheets,
    config.spreadsheetId,
    config.tabName,
  );

  const users = await prisma.user.findMany({
    where: {
      phone: { not: null },
      memberships: {
        some: {
          status: "ACTIVE",
          plan: { slug: { not: "recording-addon" } },
        },
      },
    },
    select: { id: true },
  });

  let upserted = 0;
  let skippedNoPhone = 0;
  let skippedNoMembership = 0;
  let errors = 0;

  const concurrency = 5;
  for (let i = 0; i < users.length; i += concurrency) {
    const batch = users.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((user) => syncPaidUserToSheet(user.id)),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        errors++;
        log.error({ err: result.reason }, "Paid-user sheet reconcile failed");
        continue;
      }

      switch (result.value.status) {
        case "synced":
          upserted++;
          break;
        case "skipped_no_phone":
          skippedNoPhone++;
          break;
        case "skipped_no_membership":
          skippedNoMembership++;
          break;
        default:
          break;
      }
    }
  }

  return {
    tabCreated: tabResult.tabCreated,
    headerWritten: tabResult.headerWritten,
    upserted,
    skippedNoPhone,
    skippedNoMembership,
    errors,
  };
}
