import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@ru/config";
import { sendSessionReminders } from "@ru/notifications";
import { withCronAuth } from "@/lib/cron-auth";

const log = createLogger("cron:session-reminders");

async function handler(request: NextRequest) {
  try {
    const sent = await sendSessionReminders();

    log.info({ sent }, "Session reminders complete");

    return NextResponse.json({
      status: "ok",
      sent,
    });
  } catch (error) {
    log.error({ err: error }, "Session reminders failed");
    return NextResponse.json(
      { error: "Session reminders failed" },
      { status: 500 }
    );
  }
}

export const POST = withCronAuth(handler);
