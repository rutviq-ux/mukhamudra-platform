import { google } from "googleapis";
import { createAuthClient, getAdminDirectoryClient } from "./auth";
import type { GoogleWorkspaceConfig } from "./types";

function httpStatus(error: unknown): number | undefined {
  const err = error as { code?: number | string; response?: { status?: number } };
  const raw = err.response?.status ?? err.code;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw)) return Number(raw);
  return undefined;
}

function errorReason(error: unknown): string {
  const err = error as {
    errors?: Array<{ reason?: string }>;
    message?: string;
  };
  return err.errors?.[0]?.reason || "";
}

function isAlreadyExists(error: unknown): boolean {
  return httpStatus(error) === 409;
}

function isNotFound(error: unknown): boolean {
  return httpStatus(error) === 404;
}

function isRateLimited(error: unknown): boolean {
  if (httpStatus(error) === 429) return true;
  const reason = errorReason(error);
  return (
    reason === "rateLimitExceeded" ||
    reason === "userRateLimitExceeded" ||
    reason === "quotaExceeded"
  );
}

const MEMBER_BATCH_SIZE = 10;
const MEMBER_BATCH_PAUSE_MS = 250;

async function pause(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureGroup(
  config: GoogleWorkspaceConfig,
  groupEmail: string,
  name: string,
): Promise<void> {
  const admin = getAdminDirectoryClient(config);
  try {
    await admin.groups.get({ groupKey: groupEmail });
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
    await admin.groups.insert({
      requestBody: {
        email: groupEmail,
        name,
        description: name,
      },
    });
  }

  try {
    const settings = google.groupssettings({
      version: "v1",
      auth: createAuthClient(config),
    });
    await settings.groups.patch({
      groupUniqueId: groupEmail,
      requestBody: {
        allowExternalMembers: "true",
        whoCanJoin: "INVITED_CAN_JOIN",
        whoCanViewMembership: "ALL_MANAGERS_CAN_VIEW",
        whoCanPostMessage: "ALL_MANAGERS_CAN_POST",
      },
    });
  } catch {
  }
}

export async function addGroupMember(
  config: GoogleWorkspaceConfig,
  groupEmail: string,
  memberEmail: string,
): Promise<void> {
  const admin = getAdminDirectoryClient(config);
  const insert = () =>
    admin.members.insert({
      groupKey: groupEmail,
      requestBody: {
        email: memberEmail,
        role: "MEMBER",
        type: "USER",
      },
    });

  try {
    await insert();
  } catch (error) {
    if (isAlreadyExists(error)) {
      return;
    }
    if (isRateLimited(error)) {
      await pause(1000);
      try {
        await insert();
        return;
      } catch (retryError) {
        if (isAlreadyExists(retryError)) {
          return;
        }
        throw retryError;
      }
    }
    throw error;
  }
}

async function runMemberBatches(
  emails: string[],
  fn: (email: string) => Promise<void>,
): Promise<{ ok: number; failed: number }> {
  const unique = [...new Set(emails.map((email) => email.trim()).filter(Boolean))];
  let ok = 0;
  let failed = 0;

  for (let i = 0; i < unique.length; i += MEMBER_BATCH_SIZE) {
    const chunk = unique.slice(i, i + MEMBER_BATCH_SIZE);
    const results = await Promise.allSettled(chunk.map((email) => fn(email)));
    for (const result of results) {
      if (result.status === "fulfilled") {
        ok++;
      } else {
        failed++;
      }
    }
    if (i + MEMBER_BATCH_SIZE < unique.length) {
      await pause(MEMBER_BATCH_PAUSE_MS);
    }
  }

  return { ok, failed };
}

export async function addGroupMembers(
  config: GoogleWorkspaceConfig,
  groupEmail: string,
  memberEmails: string[],
): Promise<{ added: number; failed: number }> {
  const result = await runMemberBatches(memberEmails, (email) =>
    addGroupMember(config, groupEmail, email),
  );
  return { added: result.ok, failed: result.failed };
}

export async function removeGroupMember(
  config: GoogleWorkspaceConfig,
  groupEmail: string,
  memberEmail: string,
): Promise<void> {
  const admin = getAdminDirectoryClient(config);
  try {
    await admin.members.delete({
      groupKey: groupEmail,
      memberKey: memberEmail,
    });
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
  }
}

export async function removeGroupMembers(
  config: GoogleWorkspaceConfig,
  groupEmail: string,
  memberEmails: string[],
): Promise<{ removed: number; failed: number }> {
  const result = await runMemberBatches(memberEmails, (email) =>
    removeGroupMember(config, groupEmail, email),
  );
  return { removed: result.ok, failed: result.failed };
}

export async function listGroupMemberEmails(
  config: GoogleWorkspaceConfig,
  groupEmail: string,
): Promise<string[]> {
  const admin = getAdminDirectoryClient(config);
  const emails: string[] = [];
  let pageToken: string | undefined;

  do {
    const response = await admin.members.list({
      groupKey: groupEmail,
      pageToken,
    });
    for (const member of response.data.members || []) {
      if (member.email) {
        emails.push(member.email);
      }
    }
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return emails;
}
