import { getServerEnv } from "@ru/config";
import type { GoogleWorkspaceConfig } from "@ru/google-workspace";

export function getGoogleConfig(): GoogleWorkspaceConfig | null {
  const env = getServerEnv();
  if (
    !env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    !env.GOOGLE_IMPERSONATE_EMAIL
  ) {
    return null;
  }
  return {
    serviceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    impersonateEmail: env.GOOGLE_IMPERSONATE_EMAIL,
  };
}
