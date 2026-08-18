import type { sheets_v4 } from "googleapis";
import { getSheetsClient, type GoogleSheetsServiceAccountConfig } from "./sheets-auth";

export const PAID_USER_SHEET_HEADERS = [
  "Name",
  "Email",
  "Country Code",
  "Phone",
  "Plan",
  "Product",
  "Interval",
  "Batch",
  "Timezone",
  "Paid At",
  "Period End",
  "Status",
  "User Id",
] as const;

export type PaidUserSheetStatus = "ACTIVE" | "CANCELLED" | "EXPIRED";

export interface PaidUserSheetRow {
  name: string;
  email: string;
  countryCode: string;
  phone: string;
  plan: string;
  product: string;
  interval: string;
  batch: string;
  timezone: string;
  paidAt: string;
  periodEnd: string;
  status: PaidUserSheetStatus;
  userId: string;
}

export interface EnsurePaidUsersTabResult {
  tabCreated: boolean;
  headerWritten: boolean;
}

export interface UpsertPaidUserRowResult {
  action: "created" | "updated" | "skipped";
  rowNumber?: number;
}

function columnLetter(index: number): string {
  return String.fromCharCode("A".charCodeAt(0) + index);
}

const PHONE_COL = PAID_USER_SHEET_HEADERS.indexOf("Phone");
const EMAIL_COL = PAID_USER_SHEET_HEADERS.indexOf("Email");
const USER_ID_COL = PAID_USER_SHEET_HEADERS.indexOf("User Id");
const LAST_COL = columnLetter(PAID_USER_SHEET_HEADERS.length - 1);

function rowToValues(row: PaidUserSheetRow): string[] {
  return [
    row.name,
    row.email,
    row.countryCode,
    row.phone,
    row.plan,
    row.product,
    row.interval,
    row.batch,
    row.timezone,
    row.paidAt,
    row.periodEnd,
    row.status,
    row.userId,
  ];
}

function normalizeCell(value: string | undefined | null): string {
  return (value ?? "").trim();
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code: unknown }).code === "number"
          ? (error as { code: number }).code
          : undefined;
      const retryable = status === 429 || (status !== undefined && status >= 500);
      if (!retryable || i === attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * (i + 1)));
    }
  }
  throw lastError;
}

/**
 * Parse E.164 or common Indian local numbers into country code + national number.
 */
export function parsePhoneForSheet(
  phone: string,
): { countryCode: string; nationalNumber: string } | null {
  const cleaned = phone.replace(/[\s\-().]/g, "");
  if (!cleaned) return null;

  const digits = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;

  if (/^91[6-9]\d{9}$/.test(digits)) {
    return { countryCode: "91", nationalNumber: digits.slice(2) };
  }

  if (/^1\d{10}$/.test(digits)) {
    return { countryCode: "1", nationalNumber: digits.slice(1) };
  }

  if (cleaned.startsWith("+")) {
    const match = digits.match(/^(\d{2,3})(\d{4,14})$/);
    const countryCode = match?.[1];
    const nationalNumber = match?.[2];
    if (!countryCode || !nationalNumber) return null;
    return { countryCode, nationalNumber };
  }

  if (/^[6-9]\d{9}$/.test(digits)) {
    return { countryCode: "91", nationalNumber: digits };
  }

  return null;
}

function findMatchingRowIndex(
  rows: string[][],
  row: PaidUserSheetRow,
): number | null {
  const targetPhone = normalizeCell(row.phone);
  const targetUserId = normalizeCell(row.userId);
  const targetEmail = normalizeCell(row.email).toLowerCase();

  for (let i = 1; i < rows.length; i++) {
    const existing = rows[i] ?? [];
    const existingPhone = normalizeCell(existing[PHONE_COL]);
    const existingUserId = normalizeCell(existing[USER_ID_COL]);
    const existingEmail = normalizeCell(existing[EMAIL_COL]).toLowerCase();

    if (targetPhone && existingPhone === targetPhone) return i + 1;
    if (targetUserId && existingUserId === targetUserId) return i + 1;
    if (targetEmail && existingEmail === targetEmail) return i + 1;
  }

  return null;
}

export async function ensurePaidUsersTab(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabName: string,
): Promise<EnsurePaidUsersTabResult> {
  const meta = await withRetry(() =>
    sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    }),
  );

  const existing = meta.data.sheets?.find(
    (sheet) => sheet.properties?.title === tabName,
  );

  let tabCreated = false;
  if (!existing) {
    await withRetry(() =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: tabName } } }],
        },
      }),
    );
    tabCreated = true;
  }

  const headerRange = `${tabName}!A1:${LAST_COL}1`;
  const headerResponse = await withRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
    }),
  );

  const currentHeader = headerResponse.data.values?.[0] ?? [];
  const headerMatches =
    currentHeader.length === PAID_USER_SHEET_HEADERS.length &&
    PAID_USER_SHEET_HEADERS.every(
      (header, index) => normalizeCell(currentHeader[index]) === header,
    );

  let headerWritten = false;
  if (!headerMatches) {
    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: headerRange,
        valueInputOption: "RAW",
        requestBody: { values: [Array.from(PAID_USER_SHEET_HEADERS)] },
      }),
    );
    headerWritten = true;
  }

  return { tabCreated, headerWritten };
}

export async function upsertPaidUserRow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabName: string,
  row: PaidUserSheetRow,
  options?: { allowCreate?: boolean },
): Promise<UpsertPaidUserRowResult> {
  const allowCreate = options?.allowCreate ?? true;
  const range = `${tabName}!A:${LAST_COL}`;
  const response = await withRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    }),
  );

  const rows = (response.data.values ?? []) as string[][];
  const matchRowNumber = findMatchingRowIndex(rows, row);
  const values = [rowToValues(row)];

  if (matchRowNumber) {
    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tabName}!A${matchRowNumber}:${LAST_COL}${matchRowNumber}`,
        valueInputOption: "RAW",
        requestBody: { values },
      }),
    );
    return { action: "updated", rowNumber: matchRowNumber };
  }

  if (!allowCreate) {
    return { action: "skipped" };
  }

  const appendResponse = await withRetry(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tabName}!A:${LAST_COL}`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    }),
  );

  const updatedRange = appendResponse.data.updates?.updatedRange ?? "";
  const rowMatch = updatedRange.match(/!A(\d+):/);
  const rowNumber = rowMatch?.[1]
    ? Number.parseInt(rowMatch[1], 10)
    : rows.length + 1;

  return { action: "created", rowNumber };
}

export function createSheetsClient(config: GoogleSheetsServiceAccountConfig) {
  return getSheetsClient(config);
}
