import { getServerEnv, createLogger } from "@ru/config";
import {
  addGroupMember,
  ensureGroup,
  listGroupMemberEmails,
  removeGroupMember,
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

export async function reconcileMeetGroups(): Promise<void> {
  const config = getGoogleConfig();
  if (!config) return;

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

      for (const email of toAdd) {
        await addGroupMember(config, groupEmail, email);
      }
      for (const email of toRemove) {
        await removeGroupMember(config, groupEmail, email);
      }
    } catch (err) {
      log.warn({ err, groupEmail, kind }, "Meet group reconcile failed");
    }
  }
}
