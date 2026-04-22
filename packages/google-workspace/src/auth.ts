import { google } from "googleapis";
import type { JWT } from "google-auth-library";
import type { calendar_v3, meet_v2 } from "googleapis";
import type { GoogleWorkspaceConfig } from "./types";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/meetings.space.created",
  "https://www.googleapis.com/auth/meetings.space.readonly",
  "https://www.googleapis.com/auth/drive.meet.readonly",
];

/**
 * Create a Google JWT auth client with domain-wide delegation.
 * The service account impersonates the configured workspace user.
 */
export function createAuthClient(config: GoogleWorkspaceConfig): JWT {
  // Vercel env vars escape newlines as literal \\n — restore them
  const privateKey = config.privateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email: config.serviceAccountEmail,
    key: privateKey,
    scopes: SCOPES,
    subject: config.impersonateEmail,
  });

  return auth;
}

/**
 * Get an authenticated Google Meet API v2 client.
 */
export function getMeetClient(config: GoogleWorkspaceConfig): meet_v2.Meet {
  const auth = createAuthClient(config);
  return google.meet({ version: "v2", auth });
}

/**
 * Get an authenticated Google Calendar API v3 client.
 */
export function getCalendarClient(config: GoogleWorkspaceConfig): calendar_v3.Calendar {
  const auth = createAuthClient(config);
  return google.calendar({ version: "v3", auth });
}
