"use server";

import { prisma } from "@ru/db";
import { leadSchema } from "@ru/config";
import { createPublicAction } from "@/lib/actions/safe-action";
import { emitSequenceEvent } from "@ru/notifications";
import { createLogger } from "@ru/config";

const log = createLogger("action:submitLead");

export const submitLead = createPublicAction("submitLead", {
  schema: leadSchema,
  handler: async ({ data }) => {
    const { name, email, phone, source } = data;

    // Normalize empty email to undefined
    const normalizedEmail = email || undefined;

    // Check for duplicate lead by phone (within last 24 hours to allow re-submissions after a day)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60_000);
    const existing = await prisma.lead.findFirst({
      where: {
        phone,
        createdAt: { gte: dayAgo },
      },
    });

    if (existing) {
      // Silently succeed -- don't leak that we already have this lead
      return { id: existing.id };
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        phone,
        source,
      },
    });

    // Enroll lead in automation sequences (fire-and-forget)
    emitSequenceEvent("lead.created", { leadId: lead.id }).catch((err) =>
      log.error({ err }, "Failed to emit lead.created sequence event"),
    );

    return { id: lead.id };
  },
});
