import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@ru/config";
import { drainMmOutbox, enqueueRecentCancellations, sendSessionReminders } from "@ru/notifications";
import { withCronAuth } from "@/lib/cron-auth";

const log = createLogger("cron:session-reminders");

async function handler(request: NextRequest) {
  try {
    await enqueueRecentCancellations();
    const queued = await sendSessionReminders();
    const drained = await drainMmOutbox();

    log.info({ queued, ...drained }, "Session reminders complete");

    return NextResponse.json({
      status: "ok",
      queued,
      ...drained,
    });
  } catch (error) {
    log.error({ err: error }, "Session reminders failed");
    return NextResponse.json(
      { error: "Session reminders failed" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const POST = withCronAuth(handler);
export const GET = POST;
