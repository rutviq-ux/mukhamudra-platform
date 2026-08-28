import { describe, expect, it } from "vitest";
import {
  buildSessionsForBatch,
  isJoinWindowOpen,
  isReusedBatchMeetLink,
  joinWindowBounds,
  type BatchConfig,
} from "@/lib/sessions";

const batch: BatchConfig = {
  id: "batch_1",
  name: "Evening Face Yoga",
  productId: "prod_1",
  startTime: "21:00",
  durationMin: 30,
  timezone: "Asia/Kolkata",
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  capacity: 50,
  modalities: ["Gua Sha"],
  dayModalities: null,
  meetingLink: "https://meet.google.com/aaa-bbbb-ccc",
  meetingId: "aaa-bbbb-ccc",
  endsAt: null,
};

describe("buildSessionsForBatch", () => {
  it("does not copy the batch Meet link onto new sessions", () => {
    const now = new Date("2026-08-27T10:00:00.000Z");
    const sessions = buildSessionsForBatch(batch, now, 3, now);

    expect(sessions.length).toBeGreaterThan(0);
    for (const session of sessions) {
      expect(session.joinUrl).toBeUndefined();
      expect(session.meetingId).toBeUndefined();
    }
  });
});

describe("join window", () => {
  const startsAt = new Date("2026-08-27T15:30:00.000Z");
  const endsAt = new Date("2026-08-27T16:00:00.000Z");

  it("opens 15 minutes before start", () => {
    expect(
      isJoinWindowOpen(startsAt, endsAt, new Date("2026-08-27T15:15:00.000Z")),
    ).toBe(true);
    expect(
      isJoinWindowOpen(startsAt, endsAt, new Date("2026-08-27T15:14:59.000Z")),
    ).toBe(false);
  });

  it("stays open until 30 minutes after end", () => {
    expect(
      isJoinWindowOpen(startsAt, endsAt, new Date("2026-08-27T16:30:00.000Z")),
    ).toBe(true);
    expect(
      isJoinWindowOpen(startsAt, endsAt, new Date("2026-08-27T16:30:01.000Z")),
    ).toBe(false);
  });

  it("computes open and close bounds", () => {
    const { openAt, closeAt } = joinWindowBounds(startsAt, endsAt);
    expect(openAt.toISOString()).toBe("2026-08-27T15:15:00.000Z");
    expect(closeAt.toISOString()).toBe("2026-08-27T16:30:00.000Z");
  });
});

describe("isReusedBatchMeetLink", () => {
  it("detects when a session still points at the batch Meet URL", () => {
    expect(
      isReusedBatchMeetLink(
        "https://meet.google.com/aaa-bbbb-ccc",
        "https://meet.google.com/aaa-bbbb-ccc",
      ),
    ).toBe(true);
    expect(
      isReusedBatchMeetLink(
        "https://meet.google.com/unique-link",
        "https://meet.google.com/aaa-bbbb-ccc",
      ),
    ).toBe(false);
    expect(isReusedBatchMeetLink(null, "https://meet.google.com/aaa-bbbb-ccc")).toBe(
      false,
    );
  });
});
