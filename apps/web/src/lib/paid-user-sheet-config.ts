import { getServerEnv } from "@ru/config";
import type { GoogleSheetsServiceAccountConfig } from "@ru/google-workspace";

export interface PaidUsersSheetConfig {
  spreadsheetId: string;
  tabName: string;
  serviceAccount: GoogleSheetsServiceAccountConfig;
}

export function getPaidUsersSheetConfig(): PaidUsersSheetConfig | null {
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
    tabName: env.GOOGLE_PAID_USERS_TAB ?? "Paid Users",
    serviceAccount: {
      serviceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    },
  };
}
