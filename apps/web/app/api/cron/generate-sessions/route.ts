import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { withCronAuth } from "@/lib/cron-auth";
import { buildSessionsForBatch } from "@/lib/sessions";
import { getConfig } from "@/lib/config";

const log = createLogger("cron:generate-sessions");

async function handler(request: NextRequest) {
  try {
    const batches = await prisma.batch.findMany({
      where: { isActive: true },
      include: { product: true },
    });

    if (batches.length === 0) {
      log.info("No active batches found");
      return NextResponse.json({ status: "ok", generated: 0 });
    }

    let totalGenerated = 0;
    const now = new Date();
    const config = await getConfig();

    // Look up default coach by email
    const defaultCoach = config.DEFAULT_COACH_EMAIL
      ? await prisma.user.findUnique({
          where: { email: config.DEFAULT_COACH_EMAIL },
          select: { id: true },
        })
      : null;

    for (const batch of batches) {
      const daysToGenerate = config.SESSION_GENERATION_DAYS;
      const sessionsToCreate = buildSessionsForBatch(
        batch, now, daysToGenerate, now, defaultCoach?.id,
      );

      if (sessionsToCreate.length === 0) continue;

      // Batch check existing sessions to avoid duplicates
      const existingSessions = await prisma.session.findMany({
        where: {
          batchId: batch.id,
          startsAt: {
            gte: now,
            lte: new Date(
              now.getTime() + daysToGenerate * 24 * 60 * 60_000
            ),
          },
        },
        select: { startsAt: true },
      });

      const existingTimes = new Set(
        existingSessions.map((s) => s.startsAt.getTime())
      );

      const newSessions = sessionsToCreate.filter(
        (s) => !existingTimes.has(s.startsAt.getTime())
      );

      if (newSessions.length > 0) {
        await prisma.session.createMany({ data: newSessions });
        totalGenerated += newSessions.length;
        log.info(
          { batch: batch.name, count: newSessions.length },
          "Sessions generated for batch"
        );
      }
    }

    log.info(
      { totalGenerated, batchCount: batches.length },
      "Session generation complete"
    );

    return NextResponse.json({
      status: "ok",
      generated: totalGenerated,
      batches: batches.length,
    });
  } catch (error) {
    log.error({ err: error }, "Session generation failed");
    return NextResponse.json(
      { error: "Session generation failed" },
      { status: 500 }
    );
  }
}

export const POST = withCronAuth(handler);
