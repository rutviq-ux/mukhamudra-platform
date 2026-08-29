import { describe, expect, it } from "vitest";
import {
  formatInrFromPaise,
  formatPaymentHealthBody,
  paymentHealthSince,
} from "@/lib/payment-health";

describe("formatInrFromPaise", () => {
  it("formats rupees from paise", () => {
    expect(formatInrFromPaise(111100)).toBe("₹1,111");
  });
});

describe("paymentHealthSince", () => {
  it("is 7 days before now", () => {
    const now = new Date("2026-08-28T08:00:00.000Z");
    expect(paymentHealthSince(now).toISOString()).toBe(
      "2026-08-21T08:00:00.000Z",
    );
  });
});

describe("formatPaymentHealthBody", () => {
  it("summarizes failed and pending counts", () => {
    const body = formatPaymentHealthBody({
      failedCount: 1,
      failedAmountPaise: 111100,
      pendingCount: 2,
      paidCount: 5,
      failedOrders: [
        {
          user: { name: "Asha", email: "asha@example.com" },
          plan: { name: "Face Yoga Monthly" },
          amountPaise: 111100,
        },
      ],
    });

    expect(body).toContain("Failed orders (7 days): 1 (₹1,111)");
    expect(body).toContain("Pending orders (7 days): 2");
    expect(body).toContain("Asha — Face Yoga Monthly — ₹1,111");
  });
});
