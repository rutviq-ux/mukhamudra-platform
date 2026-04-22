import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import {
  logMessage,
  queueNotification,
  emitSequenceEvent,
} from "@ru/notifications";
import { withCronAuth } from "@/lib/cron-auth";

const log = createLogger("cron:process-sequences");

/** Interpolate {{variables}} in a template body */
function interpolate(
  text: string,
  variables: Record<string, string>,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    key in variables ? variables[key]! : match,
  );
}

async function handler(request: NextRequest) {
  try {
    const now = new Date();
    let processed = 0;
    let skipped = 0;

    // ── Step 0: Detect inactive users and enroll in at-risk sequences ──
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60_000);

    const inactiveUsers = await prisma.user.findMany({
      where: {
        memberships: { some: { status: "ACTIVE" } },
        attendances: { none: { joinedAt: { gte: threeDaysAgo } } },
        onboardedAt: { not: null },
        // Not already in an active at-risk sequence
        sequenceEnrollments: {
          none: {
            status: "ACTIVE",
            sequence: { triggerEvent: "user.inactive_3d" },
          },
        },
      },
      select: { id: true },
      take: 50,
    });

    for (const user of inactiveUsers) {
      await emitSequenceEvent("user.inactive_3d", { userId: user.id });
    }

    if (inactiveUsers.length > 0) {
      log.info(
        { count: inactiveUsers.length },
        "Detected inactive users, enrolled in at-risk sequences",
      );
    }

    // ── Step 1: Find all ACTIVE enrollments with pending steps ──
    const enrollments = await prisma.sequenceEnrollment.findMany({
      where: { status: "ACTIVE" },
      include: {
        sequence: {
          include: {
            steps: {
              where: { isActive: true },
              orderBy: { stepOrder: "asc" },
              include: { template: true },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            whatsappOptIn: true,
            marketingOptIn: true,
            pushOptIn: true,
          },
        },
        lead: {
          select: { id: true, name: true, phone: true },
        },
      },
      take: 100,
    });

    for (const enrollment of enrollments) {
      const { sequence, user, lead } = enrollment;

      // Skip inactive sequences
      if (!sequence.isActive) continue;

      // Find the next step
      const nextStep = sequence.steps.find(
        (s) => s.stepOrder > enrollment.currentStep,
      );

      if (!nextStep) {
        // All steps completed
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "COMPLETED", completedAt: now },
        });
        continue;
      }

      // Check if enough time has elapsed (delayMinutes from enrollment)
      const sendAfter = new Date(
        enrollment.enrolledAt.getTime() + nextStep.delayMinutes * 60_000,
      );
      if (now < sendAfter) {
        skipped++;
        continue;
      }

      // Check idempotency: don't re-send the same step
      const alreadySent = await prisma.messageLog.findFirst({
        where: {
          sequenceEnrollmentId: enrollment.id,
          templateId: nextStep.templateId,
        },
      });
      if (alreadySent) {
        // Step already sent — advance and continue
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { currentStep: nextStep.stepOrder, lastStepAt: now },
        });
        continue;
      }

      // Check opt-in
      const channel = nextStep.template.channel;
      if (user) {
        if (channel === "WHATSAPP" && !user.whatsappOptIn) { skipped++; continue; }
        if (channel === "EMAIL" && !user.marketingOptIn) { skipped++; continue; }
        if (channel === "PUSH" && !user.pushOptIn) { skipped++; continue; }
      }

      // Resolve recipient
      const recipient = user || lead;
      if (!recipient) { skipped++; continue; }

      const to =
        channel === "EMAIL"
          ? (user?.email || null)
          : channel === "PUSH"
            ? (user?.id || null)
            : (recipient.phone || null);

      if (!to) { skipped++; continue; }

      // Build variables
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mukhamudra.com";
      const variables: Record<string, string> = {
        name: recipient.name || "there",
        dashboard_link: `${appUrl}/app`,
        schedule_link: `${appUrl}/app/schedule`,
        link: `${appUrl}/pricing`,
      };

      // Interpolate template
      const body = interpolate(nextStep.template.body, variables);
      const subject = nextStep.template.subject
        ? interpolate(nextStep.template.subject, variables)
        : undefined;

      // Queue the message
      if (user) {
        // Use queueNotification for users (respects opt-in + creates proper log)
        const logId = await queueNotification({
          userId: user.id,
          templateName: nextStep.template.name,
          variables,
        });

        // Link to enrollment
        if (logId) {
          await prisma.messageLog.update({
            where: { id: logId },
            data: { sequenceEnrollmentId: enrollment.id },
          });
        }
      } else if (lead) {
        // For leads, create message log directly
        await logMessage({
          channel: channel as "WHATSAPP" | "EMAIL" | "PUSH" | "INSTAGRAM",
          to,
          templateId: nextStep.templateId,
          body,
          subject,
          status: "QUEUED",
        }).then(async (logId) => {
          await prisma.messageLog.update({
            where: { id: logId },
            data: { sequenceEnrollmentId: enrollment.id },
          });
        });
      }

      // Advance enrollment
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { currentStep: nextStep.stepOrder, lastStepAt: now },
      });

      processed++;

      // Check if this was the last step
      const isLastStep = !sequence.steps.find(
        (s) => s.stepOrder > nextStep.stepOrder,
      );
      if (isLastStep) {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "COMPLETED", completedAt: now },
        });
      }
    }

    log.info(
      { processed, skipped, inactive: inactiveUsers.length },
      "Sequence processing complete",
    );

    return NextResponse.json({
      status: "ok",
      processed,
      skipped,
      inactiveDetected: inactiveUsers.length,
    });
  } catch (error) {
    log.error({ err: error }, "Sequence processing failed");
    return NextResponse.json(
      { error: "Sequence processing failed" },
      { status: 500 },
    );
  }
}

export const POST = withCronAuth(handler);
