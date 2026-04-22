import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { withCronAuth } from "@/lib/cron-auth";

const log = createLogger("cron:expire-recording-access");

/**
 * POST /api/cron/expire-recording-access
 *
 * Daily cron: deactivates RecordingAccess rows that have passed their expiresAt date.
 */
async function handler(request: NextRequest) {
  try {
    const result = await prisma.recordingAccess.updateMany({
      where: {
        isActive: true,
        expiresAt: { lte: new Date() },
      },
      data: { isActive: false },
    });

    log.info({ expired: result.count }, "Recording access expiry complete");

    return NextResponse.json({
      status: "ok",
      expired: result.count,
    });
  } catch (error) {
    log.error({ err: error }, "Recording access expiry failed");
    return NextResponse.json(
      { error: "Recording access expiry failed" },
      { status: 500 }
    );
  }
}

export const POST = withCronAuth(handler);
