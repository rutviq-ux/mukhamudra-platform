import { getServerEnv } from "@ru/config";
import type { GoogleSheetsServiceAccountConfig } from "@ru/google-workspace";

export interface LeadsSheetConfig {
  spreadsheetId: string;
  tabName: string;
  serviceAccount: GoogleSheetsServiceAccountConfig;
}

export function getLeadsSheetConfig(): LeadsSheetConfig | null {
  const env = getServerEnv();

  if (
    !env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    !env.GOOGLE_PAID_USERS_SHEET_ID
  ) {
    return null;
  }

  return {
    spreadsheetId: env.GOOGLE_PAID_USERS_SHEET_ID,
    tabName: env.GOOGLE_LEADS_TAB ?? "Leads",
    serviceAccount: {
      serviceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    },
  };
}
