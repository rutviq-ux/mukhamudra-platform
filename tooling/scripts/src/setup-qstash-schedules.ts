/**
 * Creates QStash schedules for all cron jobs.
 *
 * Usage:
 *   QSTASH_TOKEN=... APP_URL=https://your-app.vercel.app npx tsx src/setup-qstash-schedules.ts
 *
 * Requires:
 *   - QSTASH_TOKEN: from https://console.upstash.com/qstash
 *   - APP_URL: your deployed app URL (e.g., https://mukhamudra.com)
 */

const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const APP_URL = process.env.APP_URL;

if (!QSTASH_TOKEN || !APP_URL) {
  console.error("Missing QSTASH_TOKEN or APP_URL environment variables.");
  console.error(
    "Usage: QSTASH_TOKEN=... APP_URL=https://your-app.vercel.app npx tsx src/setup-qstash-schedules.ts"
  );
  process.exit(1);
}

const SCHEDULES = [
  {
    path: "/api/cron/generate-sessions",
    cron: "0 18 * * *", // Daily 18:00 UTC = 23:30 IST
    comment: "Generate upcoming sessions from batch schedules",
  },
  {
    path: "/api/cron/session-reminders",
    cron: "* * * * *", // Every minute
    comment: "Send 15-min-before session reminders",
  },
  {
    path: "/api/cron/send-emails",
    cron: "*/5 * * * *", // Every 5 minutes
    comment: "Process queued email notifications via Listmonk",
  },
  {
    path: "/api/cron/send-push",
    cron: "*/2 * * * *", // Every 2 minutes
    comment: "Process queued push notifications via Web Push",
  },
  {
    path: "/api/cron/retry-messages",
    cron: "*/5 * * * *", // Every 5 minutes
    comment: "Retry stale/failed messages",
  },
  {
    path: "/api/cron/fetch-recordings",
    cron: "*/15 * * * *", // Every 15 minutes
    comment: "Poll Google Drive for completed session recordings",
  },
  {
    path: "/api/cron/expire-recording-access",
    cron: "30 18 * * *", // Daily 18:30 UTC = 00:00 IST
    comment: "Deactivate expired recording access",
  },
  {
    path: "/api/cron/sync-payments",
    cron: "*/10 * * * *", // Every 10 minutes
    comment: "Reconcile stale PENDING payments/memberships with Razorpay",
  },
  {
    path: "/api/cron/auto-generate-meet",
    cron: "* * * * *", // Every minute
    comment: "Auto-generate Meet links for sessions starting within 5 minutes",
  },
  {
    path: "/api/cron/process-sequences",
    cron: "*/2 * * * *", // Every 2 minutes
    comment: "Process automation sequences — send next step for active enrollments",
  },
  {
    path: "/api/cron/process-broadcasts",
    cron: "*/2 * * * *", // Every 2 minutes
    comment: "Process scheduled broadcasts — send messages in batches",
  },
  {
    path: "/api/cron/complete-sessions",
    cron: "*/5 * * * *", // Every 5 minutes
    comment: "Auto-complete sessions: status transitions, Meet attendance, booking updates",
  },
];

async function listExistingSchedules(): Promise<
  { scheduleId: string; destination: string; cron: string }[]
> {
  const res = await fetch("https://qstash-us-east-1.upstash.io/v2/schedules", {
    headers: { Authorization: `Bearer ${QSTASH_TOKEN}` },
  });
  if (!res.ok) {
    console.error("Failed to list schedules:", await res.text());
    return [];
  }
  return res.json();
}

async function deleteSchedule(scheduleId: string) {
  const res = await fetch(
    `https://qstash-us-east-1.upstash.io/v2/schedules/${scheduleId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${QSTASH_TOKEN}` },
    }
  );
  if (!res.ok) {
    console.error(`Failed to delete schedule ${scheduleId}:`, await res.text());
  }
}

async function createSchedule(schedule: (typeof SCHEDULES)[number]) {
  const url = `${APP_URL}${schedule.path}`;

  const res = await fetch("https://qstash-us-east-1.upstash.io/v2/schedules", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${QSTASH_TOKEN}`,
      "Content-Type": "application/json",
      "Upstash-Cron": schedule.cron,
    },
    body: JSON.stringify({
      destination: url,
      method: "POST",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  FAILED: ${err}`);
    return null;
  }

  const data = await res.json();
  return data.scheduleId;
}

async function main() {
  console.log(`Setting up QStash schedules for ${APP_URL}\n`);

  // List existing schedules for this app
  const existing = await listExistingSchedules();
  const appSchedules = existing.filter((s) =>
    s.destination?.startsWith(APP_URL!)
  );

  if (appSchedules.length > 0) {
    console.log(
      `Found ${appSchedules.length} existing schedules for this app. Removing...\n`
    );
    for (const s of appSchedules) {
      await deleteSchedule(s.scheduleId);
      console.log(`  Deleted: ${s.destination} (${s.cron})`);
    }
    console.log();
  }

  // Create new schedules
  console.log("Creating schedules:\n");
  let success = 0;

  for (const schedule of SCHEDULES) {
    console.log(`  ${schedule.path}`);
    console.log(`    Cron: ${schedule.cron} — ${schedule.comment}`);

    const id = await createSchedule(schedule);
    if (id) {
      console.log(`    OK: ${id}\n`);
      success++;
    } else {
      console.log(`    FAILED\n`);
    }
  }

  console.log(`\nDone! ${success}/${SCHEDULES.length} schedules created.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
