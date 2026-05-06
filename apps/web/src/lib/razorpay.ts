import Razorpay from "razorpay";
import { getServerEnv } from "@ru/config";

export function getRazorpay() {
  const env = getServerEnv();
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID.trim(),
    key_secret: env.RAZORPAY_KEY_SECRET.trim(),
  });
}

export interface CreateOrderOptions {
  amount: number; // Amount in paise
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export async function createRazorpayOrder(options: CreateOrderOptions) {
  const razorpay = getRazorpay();
  
  const order = await razorpay.orders.create({
    amount: options.amount,
    currency: options.currency || "INR",
    receipt: options.receipt || `rcpt_${Date.now()}`,
    notes: options.notes || {},
  });

  return order;
}

export interface CreateSubscriptionOptions {
  planId: string;
  totalCount?: number; // Number of billing cycles (must be >= 1)
  quantity?: number;
  customerNotify?: 0 | 1;
  notes?: Record<string, string>;
}

export async function createRazorpaySubscription(
  options: CreateSubscriptionOptions
) {
  const razorpay = getRazorpay();

  const subscription = await razorpay.subscriptions.create({
    plan_id: options.planId,
    total_count: options.totalCount || 120,
    quantity: options.quantity || 1,
    customer_notify: options.customerNotify ?? 1,
    notes: options.notes || {},
  });

  return subscription;
}

// Verify webhook signature
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
