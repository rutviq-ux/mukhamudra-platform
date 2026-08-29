import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { withCronAuth } from "@/lib/cron-auth";
import { getConfig } from "@/lib/config";
import { notifyPaymentHealthWeekly } from "@ru/notifications";
import {
  formatInrFromPaise,
  formatPaymentHealthBody,
  getPaymentHealthSummary,
} from "@/lib/payment-health";

const log = createLogger("cron:payment-health");

async function handler(_request: NextRequest) {
  try {
    const summary = await getPaymentHealthSummary();
    const body = formatPaymentHealthBody(summary);
    const config = await getConfig();

    const recipients = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "OPS"] },
      },
      select: { id: true, email: true },
    });

    const emails = new Set(recipients.map((u) => u.email.toLowerCase()));
    if (
      config.DEFAULT_COACH_EMAIL &&
      !emails.has(config.DEFAULT_COACH_EMAIL.toLowerCase())
    ) {
      const coach = await prisma.user.findUnique({
        where: { email: config.DEFAULT_COACH_EMAIL },
        select: { id: true, email: true },
      });
      if (coach) recipients.push(coach);
    }

    let queued = 0;
    for (const recipient of recipients) {
      await notifyPaymentHealthWeekly({
        userId: recipient.id,
        failedCount: String(summary.failedCount),
        failedAmount: formatInrFromPaise(summary.failedAmountPaise),
        pendingCount: String(summary.pendingCount),
        paidCount: String(summary.paidCount),
        details: body,
      });
      queued++;
    }

    log.info(
      {
        queued,
        failedCount: summary.failedCount,
        pendingCount: summary.pendingCount,
      },
      "Payment health report queued",
    );

    return NextResponse.json({
      status: "ok",
      queued,
      failedCount: summary.failedCount,
      pendingCount: summary.pendingCount,
      paidCount: summary.paidCount,
    });
  } catch (error) {
    log.error({ err: error }, "Payment health cron failed");
    return NextResponse.json(
      { error: "Payment health cron failed" },
      { status: 500 },
    );
  }
}

export const POST = withCronAuth(handler);
