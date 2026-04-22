// Rate Limiting and Audit Logging for notifications

import { prisma } from "@ru/db";

export interface RateLimitConfig {
  perMinute: number;
  perDay: number;
}

// Simple in-memory rate limiter (use Redis/Upstash in production)
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = Date.now();
  const minuteKey = `${key}:minute`;
  const dayKey = `${key}:day`;

  // Check minute limit
  const minuteBucket = rateLimitBuckets.get(minuteKey);
  if (minuteBucket) {
    if (now < minuteBucket.resetAt) {
      if (minuteBucket.count >= config.perMinute) {
        return { allowed: false, retryAfter: minuteBucket.resetAt - now };
      }
    } else {
      rateLimitBuckets.set(minuteKey, { count: 0, resetAt: now + 60000 });
    }
  } else {
    rateLimitBuckets.set(minuteKey, { count: 0, resetAt: now + 60000 });
  }

  // Check day limit
  const dayBucket = rateLimitBuckets.get(dayKey);
  if (dayBucket) {
    if (now < dayBucket.resetAt) {
      if (dayBucket.count >= config.perDay) {
        return { allowed: false, retryAfter: dayBucket.resetAt - now };
      }
    } else {
      rateLimitBuckets.set(dayKey, { count: 0, resetAt: now + 86400000 });
    }
  } else {
    rateLimitBuckets.set(dayKey, { count: 0, resetAt: now + 86400000 });
  }

  // Increment counters
  const minute = rateLimitBuckets.get(minuteKey)!;
  const day = rateLimitBuckets.get(dayKey)!;
  minute.count++;
  day.count++;

  return { allowed: true };
}

export interface AuditLogEntry {
  channel: "EMAIL" | "WHATSAPP" | "INSTAGRAM" | "PUSH";
  to: string;
  userId?: string;
  templateId?: string;
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
  providerMessageId?: string;
  error?: string;
  body: string;
  subject?: string;
}

export async function logMessage(entry: AuditLogEntry): Promise<string> {
  const log = await prisma.messageLog.create({
    data: {
      channel: entry.channel,
      to: entry.to,
      userId: entry.userId,
      templateId: entry.templateId,
      subject: entry.subject,
      body: entry.body,
      status: entry.status,
      providerMessageId: entry.providerMessageId,
      error: entry.error,
      sentAt: entry.status === "SENT" ? new Date() : null,
      deliveredAt: entry.status === "DELIVERED" ? new Date() : null,
    },
  });
  return log.id;
}

export async function updateMessageStatus(
  logId: string,
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED",
  updates?: { providerMessageId?: string; error?: string }
): Promise<void> {
  await prisma.messageLog.update({
    where: { id: logId },
    data: {
      status,
      providerMessageId: updates?.providerMessageId,
      error: updates?.error,
      sentAt: status === "SENT" ? new Date() : undefined,
      deliveredAt: status === "DELIVERED" ? new Date() : undefined,
    },
  });
}

// Check opt-in status before sending
export async function checkOptIn(
  userId: string,
  channel: "EMAIL" | "WHATSAPP" | "INSTAGRAM" | "PUSH"
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      marketingOptIn: true,
      whatsappOptIn: true,
      pushOptIn: true,
    },
  });

  if (!user) return false;

  if (channel === "EMAIL") return user.marketingOptIn;
  if (channel === "PUSH") return user.pushOptIn;

  return user.whatsappOptIn;
}
