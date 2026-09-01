import { getServerEnv, createLogger } from "@ru/config";
import {
  addGroupMember,
  addGroupMembers,
  ensureGroup,
  listGroupMemberEmails,
  removeGroupMember,
  removeGroupMembers,
} from "@ru/google-workspace";
import { prisma } from "@ru/db";
import { getGoogleConfig } from "@/lib/google-config";

const log = createLogger("sync-meet-group");

type ProductType = "FACE_YOGA" | "PRANAYAMA" | "BUNDLE";

function groupEmailFor(kind: "FACE_YOGA" | "PRANAYAMA"): string | null {
  const env = getServerEnv();
  const fallbackDomain = env.GOOGLE_IMPERSONATE_EMAIL?.split("@")[1];
  if (kind === "FACE_YOGA") {
    return (
      env.GOOGLE_MEET_GROUP_FACE_YOGA ||
      (fallbackDomain ? `face-yoga-class@${fallbackDomain}` : null)
    );
  }
  return (
    env.GOOGLE_MEET_GROUP_PRANAYAMA ||
    (fallbackDomain ? `pranayama-class@${fallbackDomain}` : null)
  );
}

export function meetGroupEmailsForProduct(
  productType: ProductType,
): string[] {
  if (productType === "BUNDLE") {
    return [groupEmailFor("FACE_YOGA"), groupEmailFor("PRANAYAMA")].filter(
      (email): email is string => Boolean(email),
    );
  }
  const email = groupEmailFor(productType);
  return email ? [email] : [];
}

function groupName(groupEmail: string): string {
  if (groupEmail.startsWith("pranayama")) {
    return "Mukha Mudra Pranayama class";
  }
  return "Mukha Mudra Face Yoga class";
}

export async function ensureMeetGroupsForProduct(
  productType: ProductType,
): Promise<string[]> {
  const config = getGoogleConfig();
  if (!config) return [];

  const ready: string[] = [];
  for (const groupEmail of meetGroupEmailsForProduct(productType)) {
    try {
      await ensureGroup(config, groupEmail, groupName(groupEmail));
      ready.push(groupEmail);
    } catch (err) {
      log.warn({ err, groupEmail }, "Meet group is not available");
    }
  }
  return ready;
}

export async function syncUserMeetGroups(
  email: string,
  productType: ProductType,
  action: "add" | "remove",
): Promise<void> {
  const config = getGoogleConfig();
  if (!config) return;

  const groups = meetGroupEmailsForProduct(productType);
  for (const groupEmail of groups) {
    try {
      await ensureGroup(config, groupEmail, groupName(groupEmail));
      if (action === "add") {
        await addGroupMember(config, groupEmail, email);
      } else {
        await removeGroupMember(config, groupEmail, email);
      }
    } catch (err) {
      log.warn({ err, email, groupEmail, action }, "Meet group sync failed");
    }
  }
}

async function desiredEmails(
  kind: "FACE_YOGA" | "PRANAYAMA",
): Promise<Set<string>> {
  const members = await prisma.user.findMany({
    where: {
      memberships: {
        some: {
          status: "ACTIVE",
          plan: {
            product: {
              type: { in: [kind, "BUNDLE"] },
            },
          },
        },
      },
    },
    select: { email: true },
  });
  return new Set(
    members.map((user) => user.email.trim().toLowerCase()).filter(Boolean),
  );
}

export interface ReconcileMeetGroupsResult {
  added: number;
  addFailed: number;
  removed: number;
  removeFailed: number;
  errors: string[];
}

export async function reconcileMeetGroups(): Promise<ReconcileMeetGroupsResult> {
  const result: ReconcileMeetGroupsResult = {
    added: 0,
    addFailed: 0,
    removed: 0,
    removeFailed: 0,
    errors: [],
  };
  const config = getGoogleConfig();
  if (!config) return result;

  for (const kind of ["FACE_YOGA", "PRANAYAMA"] as const) {
    const groupEmail = groupEmailFor(kind);
    if (!groupEmail) continue;

    try {
      await ensureGroup(config, groupEmail, groupName(groupEmail));
      const desired = await desiredEmails(kind);
      const existing = new Set(
        (await listGroupMemberEmails(config, groupEmail)).map((email) =>
          email.toLowerCase(),
        ),
      );

      const toAdd = [...desired].filter((email) => !existing.has(email));
      const toRemove = [...existing].filter((email) => !desired.has(email));

      if (toAdd.length > 0) {
        const added = await addGroupMembers(config, groupEmail, toAdd);
        result.added += added.added;
        result.addFailed += added.failed;
        if (added.failed > 0) {
          log.warn(
            { groupEmail, kind, added: added.added, failed: added.failed },
            "Some Meet group members could not be added",
          );
        }
      }
      if (toRemove.length > 0) {
        const removed = await removeGroupMembers(config, groupEmail, toRemove);
        result.removed += removed.removed;
        result.removeFailed += removed.failed;
        if (removed.failed > 0) {
          log.warn(
            { groupEmail, kind, removed: removed.removed, failed: removed.failed },
            "Some Meet group members could not be removed",
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Meet group reconcile failed";
      result.errors.push(`${kind}: ${message}`);
      log.warn({ err, groupEmail, kind }, "Meet group reconcile failed");
    }
  }

  return result;
}
