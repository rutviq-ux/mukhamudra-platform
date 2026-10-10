/**
 * Interakt Webhook Receiver
 *
 * This route receives inbound events that Interakt POSTs to our server.
 * These are DIFFERENT from the API integration we already built (which is
 * our backend calling Interakt's API outbound). This is Interakt → us.
 *
 * ─── How to activate ──────────────────────────────────────────────────────────
 *
 *   1. Deploy this file (it's already safe to deploy — it just logs until
 *      you wire up handlers below).
 *   2. In Interakt dashboard → Developer Settings → Configure Webhook:
 *      Set the URL to: https://www.mukhamudra.com/api/interakt/webhook
 *   3. Copy the webhook secret Interakt provides and add it to Vercel:
 *      INTERAKT_WEBHOOK_SECRET=<value>
 *
 * ─── Events Interakt sends ────────────────────────────────────────────────────
 *
 *   message_status   — delivery/read/failed receipts for templates we send
 *   message_received — a customer reply. First reply gets mm_pre_payment_info.
 *   user_opted_out   — member blocks or opts out of WhatsApp
 *
 * ─── FILE LOCATION ────────────────────────────────────────────────────────────
 *
 *   apps/web/app/api/interakt/webhook/route.ts
 *
 * ENV VARS REQUIRED (when activating):
 *   INTERAKT_WEBHOOK_SECRET  — from Interakt dashboard → Developer Settings → Configure Webhook
 */

import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { sendPrePaymentNotice } from "@ru/notifications";
import { NextRequest, NextResponse } from "next/server";

const log = createLogger("interakt-webhook");

// ─── Types ────────────────────────────────────────────────────────────────────

interface InteraktWebhookPayload {
  type: "message_status" | "inbound_message" | "message_received" | "user_opted_out" | string;
  payload?: Record<string, unknown>;
  data?: {
    customer?: {
      channel_phone_number?: string;
      phone_number?: string;
      country_code?: string;
      traits?: { name?: string };
    };
    message?: {
      message?: string;
      message_content_type?: string;
      chat_message_type?: string;
      is_template_message?: boolean;
    };
  };
}

interface MessageStatusPayload {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  to: {
    phone_number: string;
    country_code: string;
  };
  timestamp: number;
  error?: {
    code: number;
    message: string;
  };
}

interface InboundMessagePayload {
  from: {
    phone_number: string;
    country_code: string;
  };
  message: {
    type: "text" | "image" | "audio" | "document" | "video" | "interactive";
    text?: string;
  };
  timestamp: number;
}

interface UserOptedOutPayload {
  phone_number: string;
  country_code: string;
  timestamp: number;
}

// ─── Signature verification ───────────────────────────────────────────────────

/**
 * Verify the request is genuinely from Interakt.
 * Interakt sends a signature in the X-Interakt-Signature header (HMAC-SHA256).
 *
 * NOTE: Confirm the exact header name and signing method in Interakt docs
 * before activating — they may differ slightly from this implementation.
 */
async function verifySignature(
  req: NextRequest,
  rawBody: string,
): Promise<boolean> {
  const secret = process.env.INTERAKT_WEBHOOK_SECRET;

  // If no secret is set, skip verification in development (log a warning)
  if (!secret) {
    log.warn(
      "[Interakt Webhook] INTERAKT_WEBHOOK_SECRET not set — skipping signature verification. Set it before going live.",
    );
    return true;
  }

  const signature = req.headers.get("x-interakt-signature");
  if (!signature) {
    log.warn("[Interakt Webhook] Missing x-interakt-signature header");
    return false;
  }

  // HMAC-SHA256 verification
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawBody),
  );
  const expected =
    "sha256=" +
    Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  return expected === signature;
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleMessageStatus(payload: MessageStatusPayload) {
  const { id, status, to } = payload;

  log.info(
    { messageId: id, status, phone: to.phone_number },
    `[Interakt Webhook] Template message ${status}`,
  );

  if (status === "failed" && payload.error) {
    log.error(
      { messageId: id, errorCode: payload.error.code, errorMsg: payload.error.message, phone: to.phone_number },
      "[Interakt Webhook] Template message failed — check Interakt logs",
    );
    // TODO (Phase 2): flag member for retry or alert Haripriya's dashboard
  }

  if (status === "read") {
    // TODO (Phase 2): could update whatsappOptIn = true if currently unknown
  }
}

function phoneVariants(digits: string): string[] {
  const local = digits.slice(-10);
  return [...new Set([digits, `+${digits}`, local, `+91${local}`])];
}

function readCustomerReply(event: InteraktWebhookPayload): {
  phone: string;
  text: string;
  name?: string;
} | null {
  if (event.type === "message_received") {
    const customer = event.data?.customer;
    const message = event.data?.message;
    const phone = String(customer?.channel_phone_number ?? "").replace(/\D/g, "");
    if (!phone) return null;
    if (message?.is_template_message) return null;
    if (message?.chat_message_type && message.chat_message_type !== "CustomerMessage") {
      return null;
    }
    const name = customer?.traits?.name?.trim();
    return { phone, text: message?.message ?? "", name: name || undefined };
  }

  if (event.type === "inbound_message" && event.payload) {
    const payload = event.payload as unknown as InboundMessagePayload;
    const country = String(payload.from?.country_code ?? "").replace(/\D/g, "");
    const local = String(payload.from?.phone_number ?? "").replace(/\D/g, "");
    const phone = `${country}${local}`;
    if (!phone) return null;
    return { phone, text: payload.message?.text ?? "" };
  }

  return null;
}

async function handleInboundMessage(reply: { phone: string; text: string; name?: string }) {
  const text = reply.text.trim().toLowerCase();
  if (text === "stop" || text === "unsubscribe" || text === "opt out" || text === "start" || text === "subscribe") {
    return;
  }

  log.info({ phone: reply.phone }, "[Interakt Webhook] Inbound WhatsApp message received");

  const alreadyReplied = await prisma.messageLog.findFirst({
    where: {
      channel: "WHATSAPP",
      to: { in: phoneVariants(reply.phone) },
      OR: [
        { body: "mukhamudra_cold_inquiry" },
        { body: "mm_pre_payment_info", status: { in: ["SENT", "DELIVERED"] } },
      ],
    },
    select: { id: true },
  });
  if (alreadyReplied) return;

  const user = await prisma.user.findFirst({
    where: { phone: { endsWith: reply.phone.slice(-10) } },
    select: { id: true, name: true },
  });

  await sendPrePaymentNotice({
    rawPhone: reply.phone,
    logTo: reply.phone,
    userId: user?.id,
    profileName: user?.name || reply.name,
  });
}

async function handleUserOptedOut(payload: UserOptedOutPayload) {
  const { phone_number } = payload;

  log.info(
    { phone: phone_number },
    "[Interakt Webhook] User opted out of WhatsApp",
  );

  // TODO (Phase 2): set user.whatsappOptIn = false in DB so we stop sending
  // await prisma.user.updateMany({
  //   where: { phone: { contains: phone_number } },
  //   data: { whatsappOptIn: false },
  // });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let rawBody: string;

  try {
    rawBody = await req.text();
  } catch {
    log.error("[Interakt Webhook] Failed to read request body");
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Verify the request is from Interakt
  const isValid = await verifySignature(req, rawBody);
  if (!isValid) {
    log.warn("[Interakt Webhook] Signature verification failed — rejected");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: InteraktWebhookPayload;
  try {
    event = JSON.parse(rawBody) as InteraktWebhookPayload;
  } catch {
    log.error("[Interakt Webhook] Failed to parse JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  log.info({ type: event.type }, "[Interakt Webhook] Event received");

  // Route to the right handler — always return 200 so Interakt doesn't retry
  try {
    switch (event.type) {
      case "message_status":
        await handleMessageStatus(event.payload as unknown as MessageStatusPayload);
        break;
      case "message_received":
      case "inbound_message": {
        const reply = readCustomerReply(event);
        if (reply) await handleInboundMessage(reply);
        break;
      }
      case "user_opted_out":
        await handleUserOptedOut(event.payload as unknown as UserOptedOutPayload);
        break;
      default:
        // Log unknown event types — useful during initial testing
        log.info(
          { type: event.type, payload: event.payload },
          "[Interakt Webhook] Unknown event type — logged for review",
        );
    }
  } catch (err) {
    // Never return 5xx — Interakt will retry on non-2xx and spam us
    log.error({ err, type: event.type }, "[Interakt Webhook] Handler threw unexpectedly");
  }

  // Always acknowledge
  return NextResponse.json({ received: true }, { status: 200 });
}
