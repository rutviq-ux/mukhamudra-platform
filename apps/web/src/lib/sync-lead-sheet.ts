import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import {
  createSheetsClient,
  ensureLeadsTab,
  upsertLeadRow,
} from "@ru/google-workspace";
import { buildLeadSheetRow } from "@/lib/build-lead-row";
import { getLeadsSheetConfig } from "@/lib/leads-sheet-config";

const log = createLogger("sync-lead-sheet");

export interface SyncLeadResult {
  status: "synced" | "skipped_no_phone" | "skipped_no_row" | "disabled";
  action?: "created" | "updated" | "skipped";
}

export interface ReconcileLeadsResult {
  tabCreated: boolean;
  headerWritten: boolean;
  upserted: number;
  skippedNoPhone: number;
  errors: number;
}

export async function syncLeadToSheet(leadId: string): Promise<SyncLeadResult> {
  const config = getLeadsSheetConfig();
  if (!config) {
    return { status: "disabled" };
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });
  if (!lead) {
    return { status: "skipped_no_row" };
  }

  const row = buildLeadSheetRow({
    leadId: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    source: lead.source,
    createdAt: lead.createdAt,
  });

  if (!row) {
    log.info({ leadId }, "Skipped lead sheet sync — unparseable phone");
    return { status: "skipped_no_phone" };
  }

  const sheets = createSheetsClient(config.serviceAccount);
  await ensureLeadsTab(sheets, config.spreadsheetId, config.tabName);
  const result = await upsertLeadRow(
    sheets,
    config.spreadsheetId,
    config.tabName,
    row,
  );

  log.info(
    { leadId, action: result.action, rowNumber: result.rowNumber },
    "Lead sheet row synced",
  );

  return {
    status: "synced",
    action: result.action,
  };
}

export async function reconcileAllLeadsToSheet(): Promise<ReconcileLeadsResult> {
  const config = getLeadsSheetConfig();
  if (!config) {
    throw new Error("Leads sheet sync is not configured");
  }

  const sheets = createSheetsClient(config.serviceAccount);
  const tabResult = await ensureLeadsTab(
    sheets,
    config.spreadsheetId,
    config.tabName,
  );

  const leads = await prisma.lead.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  let upserted = 0;
  let skippedNoPhone = 0;
  let errors = 0;

  const concurrency = 5;
  for (let i = 0; i < leads.length; i += concurrency) {
    const batch = leads.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((lead) => syncLeadToSheet(lead.id)),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        errors++;
        log.error({ err: result.reason }, "Lead sheet reconcile failed");
        continue;
      }

      switch (result.value.status) {
        case "synced":
          upserted++;
          break;
        case "skipped_no_phone":
          skippedNoPhone++;
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
    errors,
  };
}
