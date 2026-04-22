/**
 * WhatsApp Group Action Queue
 *
 * Queues add/remove group actions that the wa-bot service picks up.
 * This runs in the Next.js process; the wa-bot polls and processes these.
 */

import { prisma } from "@ru/db";

const GROUP_ACTIONS_KEY = "pending_group_actions";

interface GroupAction {
  id: string;
  type: "add" | "remove";
  phone: string;
  batchSlug: string;
  createdAt: string;
}

/**
 * Queue a user to be added to a WhatsApp group.
 * The wa-bot will process this and add the user (or send an invite link as fallback).
 */
export async function queueWhatsAppGroupAdd(
  phone: string,
  batchSlug: string,
): Promise<void> {
  await appendGroupAction("add", phone, batchSlug);
}

/**
 * Queue a user to be removed from a WhatsApp group.
 */
export async function queueWhatsAppGroupRemove(
  phone: string,
  batchSlug: string,
): Promise<void> {
  await appendGroupAction("remove", phone, batchSlug);
}

async function appendGroupAction(
  type: "add" | "remove",
  phone: string,
  batchSlug: string,
): Promise<void> {
  const setting = await prisma.setting.findUnique({
    where: { key: GROUP_ACTIONS_KEY },
  });

  const actions = (setting?.value as GroupAction[] | null) || [];
  actions.push({
    id: crypto.randomUUID(),
    type,
    phone,
    batchSlug,
    createdAt: new Date().toISOString(),
  });

  await prisma.setting.upsert({
    where: { key: GROUP_ACTIONS_KEY },
    update: { value: actions as any },
    create: { key: GROUP_ACTIONS_KEY, value: actions as any },
  });
}
