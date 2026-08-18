import { google } from "googleapis";
import type { sheets_v4 } from "googleapis";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export interface GoogleSheetsServiceAccountConfig {
  serviceAccountEmail: string;
  privateKey: string;
}

/**
 * Sheets API client authenticated as the service account itself (no domain-wide delegation).
 * The target spreadsheet must be shared with the service account email as Editor.
 */
export function getSheetsClient(
  config: GoogleSheetsServiceAccountConfig,
): sheets_v4.Sheets {
  const privateKey = config.privateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email: config.serviceAccountEmail,
    key: privateKey,
    scopes: [SHEETS_SCOPE],
  });

  return google.sheets({ version: "v4", auth });
}
