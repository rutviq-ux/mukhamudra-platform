import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockFindFirst = vi.fn();
const mockPlanFindUnique = vi.fn();
const mockOrderCreate = vi.fn();

vi.mock("@ru/db", () => ({
  prisma: {
    membership: { findFirst: (...args: any[]) => mockFindFirst(...args) },
    recordingAccess: { findFirst: vi.fn().mockResolvedValue(null) },
    plan: { findUnique: (...args: any[]) => mockPlanFindUnique(...args) },
    order: { create: (...args: any[]) => mockOrderCreate(...args) },
  },
}));

vi.mock("@ru/config", async () => {
  const actual = await vi.importActual<any>("@ru/config");
  return {
    ...actual,
    createLogger: () => ({ error: vi.fn(), info: vi.fn() }),
    getServerEnv: () => ({ RAZORPAY_KEY_ID: "rzp_key" }),
  };
});

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({
    id: "user_1",
    name: "Test User",
    email: "test@example.com",
    phone: "+910000000000",
  }),
}));

vi.mock("@/lib/razorpay", () => ({
  createRazorpayOrder: vi.fn().mockResolvedValue({ id: "order_rzp_1" }),
}));

import { POST } from "../../../app/api/razorpay/recording-addon/route";

function makeRequest() {
  return new NextRequest("http://localhost/api/razorpay/recording-addon", {
    method: "POST",
  });
}

describe("/api/razorpay/recording-addon eligibility", () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockPlanFindUnique.mockReset().mockResolvedValue({
      id: "plan_addon",
      slug: "recording-addon",
      isActive: true,
      amountPaise: 100000,
    });
    mockOrderCreate.mockReset().mockResolvedValue({ id: "order_db_1" });
  });

  it("allows a current annual member", async () => {
    const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    mockFindFirst.mockResolvedValue({
      id: "m1",
      status: "ACTIVE",
      periodEnd: oneYearFromNow,
      plan: { interval: "ANNUAL" },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        status: "ACTIVE",
        plan: { interval: "ANNUAL" },
        OR: [{ periodEnd: null }, { periodEnd: { gte: expect.any(Date) } }],
      },
    });
  });

  it("allows an active annual member with null periodEnd (webhook not yet fired)", async () => {
    // Razorpay sets periodEnd on the subscription.charged webhook; a member
    // who just subscribed may have periodEnd === null before that fires.
    // Status ACTIVE is sufficient when periodEnd is null.
    mockFindFirst.mockResolvedValue({
      id: "m2",
      status: "ACTIVE",
      periodEnd: null,
      plan: { interval: "ANNUAL" },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
  });

  it("allows a legacy GPay-era annual member with no Razorpay subscription", async () => {
    const farFuture = new Date("2027-02-04");
    mockFindFirst.mockResolvedValue({
      id: "legacy_m1",
      status: "ACTIVE",
      periodEnd: farFuture,
      razorpaySubscriptionId: null,
      plan: { interval: "ANNUAL" },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
  });

  it("blocks a monthly-only member", async () => {
    // Prisma's relational where filters in the DB — for the unit test we
    // simulate the query correctly returning null because no membership
    // matches plan.interval === "ANNUAL".
    mockFindFirst.mockResolvedValue(null);

    const res = await POST(makeRequest());
    const data = await res.json();
    expect(res.status).toBe(403);
    expect(data.error).toMatch(/annual/i);
  });

  it("blocks an annual member whose periodEnd has passed but status hasn't been cron-flipped yet", async () => {
    // Simulates the nightly-cron staleness window: status still ACTIVE,
    // periodEnd already in the past. The where clause includes
    // periodEnd: { gte: now }, so Prisma would return null for this row.
    mockFindFirst.mockResolvedValue(null);

    const res = await POST(makeRequest());
    const data = await res.json();
    expect(res.status).toBe(403);
    expect(data.error).toMatch(/annual/i);
  });

  it("blocks a user with no membership at all", async () => {
    mockFindFirst.mockResolvedValue(null);

    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
  });
});
