import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/razorpay", () => ({
  verifyWebhookSignature: vi.fn().mockReturnValue(true),
}));

vi.mock("@ru/config", async () => {
  const actual = await vi.importActual<any>("@ru/config");
  return {
    ...actual,
    getServerEnv: () => ({
      RAZORPAY_KEY_ID: "rzp_key",
      RAZORPAY_KEY_SECRET: "secret",
      RAZORPAY_WEBHOOK_SECRET: "secret",
    }),
  };
});

const tx = {
  order: {
    findUnique: vi.fn().mockResolvedValue({
      id: "order_db_1",
      userId: "user_1",
      status: "PENDING",
      couponId: null,
      plan: { slug: "recording-addon", name: "Recording Add-on" },
    }),
    update: vi.fn().mockResolvedValue({}),
  },
  recordingAccess: {
    create: vi.fn().mockResolvedValue({}),
  },
  coupon: {
    update: vi.fn().mockResolvedValue({}),
  },
};

vi.mock("@ru/db", () => ({
  prisma: {
    webhookEvent: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "event_1" }),
      update: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn().mockImplementation(async (fn: any) => fn(tx)),
  },
}));

import { POST } from "../../../app/api/razorpay/webhook/route";

describe("/api/razorpay/webhook", () => {
  it("returns 400 when signature is missing", async () => {
    const request = new NextRequest("http://localhost/api/razorpay/webhook", {
      method: "POST",
      body: JSON.stringify({ event: "payment.captured" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("processes payment captured event", async () => {
    const payload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_1",
            order_id: "order_1",
          },
        },
      },
    };

    const request = new NextRequest("http://localhost/api/razorpay/webhook", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": "sig",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("processed");
  });
});
