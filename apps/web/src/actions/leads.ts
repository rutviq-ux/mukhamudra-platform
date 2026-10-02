"use server";

import { prisma } from "@ru/db";
import { leadSchema } from "@ru/config";
import { createPublicAction } from "@/lib/actions/safe-action";
import { emitSequenceEvent, sendTrialClassNotice } from "@ru/notifications";
import { createLogger } from "@ru/config";
import {
  leadPhoneVariants,
  normalizeLeadPhone,
} from "@/lib/leads";
import { syncLeadToSheet } from "@/lib/sync-lead-sheet";

const log = createLogger("action:submitLead");

export const submitLead = createPublicAction("submitLead", {
  schema: leadSchema,
  handler: async ({ data }) => {
    const { name, email, source } = data;
    const phone = normalizeLeadPhone(data.phone);
    const phoneVariants = leadPhoneVariants(phone);
    const normalizedEmail = email || undefined;

    const matchingUsers = await prisma.user.findMany({
      where: {
        OR: [
          { phone: { in: phoneVariants } },
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ],
      },
      select: {
        id: true,
        memberships: {
          where: { status: "ACTIVE" },
          select: { id: true },
          take: 1,
        },
      },
    });

    const existingLead = await prisma.lead.findFirst({
      where: {
        OR: [
          { phone: { in: phoneVariants } },
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    const account = matchingUsers[0];
    const hasActiveMembership = matchingUsers.some(
      (user) => user.memberships.length > 0,
    );

    if (!hasActiveMembership) {
      await sendTrialClassNotice({
        rawPhone: phone,
        name,
        userId: account?.id,
      }).catch((err) =>
        log.error({ err }, "Failed to send trial class WhatsApp"),
      );
    }

    const existingId = existingLead?.id ?? account?.id;
    if (existingId) {
      return { id: existingId };
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        phone,
        source,
      },
    });

    emitSequenceEvent("lead.created", { leadId: lead.id }).catch((err) =>
      log.error({ err }, "Failed to emit lead.created sequence event"),
    );

    syncLeadToSheet(lead.id).catch((err) =>
      log.error({ err }, "Failed to sync lead to Google Sheet"),
    );

    return { id: lead.id };
  },
});
