import { google } from "googleapis";
import { createAuthClient, getAdminDirectoryClient } from "./auth";
import type { GoogleWorkspaceConfig } from "./types";

function isAlreadyExists(error: unknown): boolean {
  const err = error as { code?: number; status?: number };
  return err.code === 409 || err.status === 409;
}

function isNotFound(error: unknown): boolean {
  const err = error as { code?: number; status?: number };
  return err.code === 404 || err.status === 404;
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
  try {
    await admin.members.insert({
      groupKey: groupEmail,
      requestBody: {
        email: memberEmail,
        role: "MEMBER",
        type: "USER",
      },
    });
  } catch (error) {
    if (!isAlreadyExists(error)) {
      throw error;
    }
  }
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
