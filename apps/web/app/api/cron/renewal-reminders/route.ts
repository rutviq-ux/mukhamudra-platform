import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@ru/config";
import { sendRenewalReminders } from "@ru/notifications";
import { withCronAuth } from "@/lib/cron-auth";

const log = createLogger("cron:renewal-reminders");

async function handler(_request: NextRequest) {
  try {
    const sent = await sendRenewalReminders();
    log.info({ sent }, "Renewal reminders complete");
    return NextResponse.json({ status: "ok", sent });
  } catch (error) {
    log.error({ err: error }, "Renewal reminders failed");
    return NextResponse.json(
      { error: "Renewal reminders failed" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const POST = withCronAuth(handler);
export const GET = POST;
