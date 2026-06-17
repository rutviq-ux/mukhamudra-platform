import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRecordingAccessFindFirst = vi.fn();
const mockMembershipFindFirst = vi.fn();

vi.mock("@ru/db", () => ({
  prisma: {
    recordingAccess: {
      findFirst: (...args: any[]) => mockRecordingAccessFindFirst(...args),
    },
    membership: {
      findFirst: (...args: any[]) => mockMembershipFindFirst(...args),
    },
  },
}));

import { getRecordingAccessInfo } from "../lib/recording-access";

describe("getRecordingAccessInfo", () => {
  beforeEach(() => {
    mockRecordingAccessFindFirst.mockReset();
    mockMembershipFindFirst.mockReset();
  });

  it("grants access when add-on is active and membership is currently active", async () => {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    mockRecordingAccessFindFirst.mockResolvedValue({ expiresAt });
    mockMembershipFindFirst.mockResolvedValue({ id: "m1", status: "ACTIVE" });

    const result = await getRecordingAccessInfo("user_1");
    expect(result.hasAccess).toBe(true);
    expect(result.expiresAt).toBe(expiresAt);
  });

  it("denies access when the add-on is active but the membership has expired", async () => {
    // This is the scenario the user flagged: someone bought the 1-year
    // add-on, then let their membership lapse mid-term. The add-on's own
    // expiresAt hasn't passed, but membership.findFirst returns null
    // because the membership is no longer ACTIVE / periodEnd has passed.
    const expiresAt = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000);
    mockRecordingAccessFindFirst.mockResolvedValue({ expiresAt });
    mockMembershipFindFirst.mockResolvedValue(null);

    const result = await getRecordingAccessInfo("user_1");
    expect(result.hasAccess).toBe(false);
    expect(result.expiresAt).toBeNull();
  });

  it("denies access when there's no add-on purchase at all", async () => {
    mockRecordingAccessFindFirst.mockResolvedValue(null);

    const result = await getRecordingAccessInfo("user_1");
    expect(result.hasAccess).toBe(false);
    expect(mockMembershipFindFirst).not.toHaveBeenCalled();
  });
});
