import { describe, expect, it } from "vitest";
import { getSubscriptionPeriod } from "@/lib/memberships";

describe("getSubscriptionPeriod", () => {
  it("maps timestamps to dates", () => {
    const { periodStart, periodEnd } = getSubscriptionPeriod({
      current_start: 1738368000,
      current_end: 1738972800,
    });

    expect(periodStart.toISOString()).toBe("2025-02-01T00:00:00.000Z");
    expect(periodEnd.toISOString()).toBe("2025-02-08T00:00:00.000Z");
  });
});
