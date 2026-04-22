/**
 * Shared session-generation helpers used by both the cron job
 * (generate-sessions) and the admin regenerate endpoint.
 */

export interface BatchConfig {
  id: string;
  name: string;
  productId: string;
  startTime: string; // "HH:mm" in batch timezone
  durationMin: number;
  timezone: string;
  daysOfWeek: number[];
  capacity: number;
  modalities: string[];
  dayModalities: unknown; // JSON – Record<string, string[]> | null
  endsAt: Date | null;
}

export interface SessionToCreate {
  productId: string;
  batchId: string;
  type: "GROUP";
  status: "SCHEDULED";
  title: string | null;
  modalities: string[];
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  coachId?: string | null;
}

/**
 * Get the UTC offset in milliseconds for a given IANA timezone at a given date.
 */
export function getTimezoneOffsetMs(timezone: string, date: Date): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = date.toLocaleString("en-US", { timeZone: timezone });
  return new Date(tzStr).getTime() - new Date(utcStr).getTime();
}

/**
 * Build a list of sessions for a batch over a date range.
 *
 * @param batch      - Batch configuration
 * @param startDate  - First date to consider (sessions before `now` are skipped)
 * @param days       - How many days to generate for
 * @param now        - Current time (used to skip past sessions)
 */
export function buildSessionsForBatch(
  batch: BatchConfig,
  startDate: Date,
  days: number,
  now: Date,
  coachId?: string | null,
): SessionToCreate[] {
  const dayMods = (batch.dayModalities ?? {}) as Record<string, string[]>;
  const [hours, minutes] = batch.startTime.split(":").map(Number);
  const sessions: SessionToCreate[] = [];

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayOffset);

    // Respect batch end date
    if (batch.endsAt && date > batch.endsAt) break;

    // Check if this day matches the batch schedule
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, etc.
    if (!batch.daysOfWeek.includes(dayOfWeek)) continue;

    // Build the datetime as explicit UTC, then shift by the batch timezone offset.
    // The `Z` suffix is critical — without it, `new Date()` parses as local time
    // which causes double-conversion when the server isn't in UTC.
    const localDateStr = date.toISOString().split("T")[0];
    const startsAt = new Date(
      `${localDateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00Z`,
    );

    const tzOffset = getTimezoneOffsetMs(batch.timezone, startsAt);
    const startsAtUtc = new Date(startsAt.getTime() - tzOffset);
    const endsAtUtc = new Date(startsAtUtc.getTime() + batch.durationMin * 60_000);

    // Skip past sessions
    if (startsAtUtc < now) continue;

    // Per-day modalities take priority, then flat modalities, then batch name
    const sessionMods = dayMods[String(dayOfWeek)] ?? batch.modalities ?? [];
    const title = sessionMods.length > 0 ? sessionMods.join(" + ") : batch.name;

    sessions.push({
      productId: batch.productId,
      batchId: batch.id,
      type: "GROUP",
      status: "SCHEDULED",
      title,
      modalities: sessionMods,
      startsAt: startsAtUtc,
      endsAt: endsAtUtc,
      capacity: batch.capacity,
      ...(coachId ? { coachId } : {}),
    });
  }

  return sessions;
}
