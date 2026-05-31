/**
 * WhatsApp Cloud API Webhook
 *
 * GET  — Meta's webhook verification challenge (one-time setup)
 * POST — Incoming messages & status updates from Meta
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { sendColdInquiryReply } from "@ru/notifications";

const log = createLogger("webhook-whatsapp");

// ─── GET: Webhook verification ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    log.info("WhatsApp webhook verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  log.warn({ mode, token }, "WhatsApp webhook verification failed");
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ─── POST: Incoming events ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify the request came from Meta using the app secret
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    const signature = req.headers.get("x-hub-signature-256") ?? "";
    const expected = `sha256=${crypto
      .createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex")}`;

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      log.warn("WhatsApp webhook signature mismatch — rejecting");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Meta sends an array of entries
  const entries = payload?.entry ?? [];

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;

      const value = change.value;

      // ── Incoming messages ──
      for (const message of value?.messages ?? []) {
        await handleIncomingMessage(message, value?.contacts?.[0]);
      }

      // ── Message status updates (sent/delivered/read/failed) ──
      for (const status of value?.statuses ?? []) {
        await handleStatusUpdate(status);
      }
    }
  }

  // Meta requires a 200 response quickly
  return NextResponse.json({ ok: true }, { status: 200 });
}

// ─── Handle incoming message ──────────────────────────────────────────────────

async function handleIncomingMessage(message: any, contact: any) {
  const from = message.from; // phone number (e.g. "919876543210")
  const msgType = message.type;
  const text = message.text?.body?.trim().toLowerCase() ?? "";
  const name = contact?.profile?.name ?? "there";

  log.info({ from, msgType, text: text.substring(0, 50) }, "Incoming WhatsApp message");

  // Find the user by phone number
  const user = await prisma.user.findFirst({
    where: { phone: { endsWith: from.slice(-10) } },
    include: {
      memberships: { where: { status: "ACTIVE" }, take: 1 },
    },
  });

  // Handle STOP / opt-out
  if (text === "stop" || text === "unsubscribe" || text === "opt out") {
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { whatsappOptIn: false },
      });
      log.info({ from, userId: user.id }, "User opted out of WhatsApp");
    }
    await sendCloudMessage(from, "You have been unsubscribed from Mukha Mudra WhatsApp messages. Reply START to re-subscribe.");
    return;
  }

  // Handle START / opt-in
  if (text === "start" || text === "subscribe") {
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { whatsappOptIn: true },
      });
      log.info({ from, userId: user.id }, "User opted in to WhatsApp");
    }
    await sendCloudMessage(from, `Welcome back to Mukha Mudra, ${name}! 🙏 You are now subscribed to WhatsApp updates.`);
    return;
  }

  // ─── Cold inquiry: non-member messaging for the first time ───
  const isNonMember = !user || user.memberships.length === 0;
  if (isNonMember) {
    // Check if we've already sent them the cold inquiry reply
    const alreadyReplied = await prisma.messageLog.findFirst({
      where: {
        to: from,
        channel: "WHATSAPP",
        body: { contains: "mukhamudra_cold_inquiry" },
      },
    });

    if (!alreadyReplied) {
      sendColdInquiryReply(from).catch((err) =>
        log.error({ err, from }, "Failed to send cold inquiry auto-reply")
      );
    }
    return;
  }

  // Log all incoming messages for admin visibility
  if (user) {
    await prisma.messageLog.create({
      data: {
        channel: "WHATSAPP",
        to: from,
        body: message.text?.body ?? `[${msgType}]`,
        status: "SENT",
        userId: user.id,
        providerMessageId: message.id,
      },
    }).catch((err) => log.error({ err }, "Failed to log incoming message"));
  }
}

// ─── Handle status update ─────────────────────────────────────────────────────

async function handleStatusUpdate(status: any) {
  const { id: providerMessageId, status: msgStatus, errors } = status;

  if (!providerMessageId) return;

  const mappedStatus =
    msgStatus === "sent" ? "SENT"
    : msgStatus === "delivered" ? "DELIVERED"
    : msgStatus === "read" ? "DELIVERED"
    : msgStatus === "failed" ? "FAILED"
    : null;

  if (!mappedStatus) return;

  const errorMsg = errors?.[0]?.message;

  await prisma.messageLog.updateMany({
    where: { providerMessageId },
    data: {
      status: mappedStatus,
      ...(errorMsg ? { error: errorMsg } : {}),
    },
  }).catch((err) => log.error({ err, providerMessageId }, "Failed to update message status"));

  if (mappedStatus === "FAILED") {
    log.warn({ providerMessageId, error: errorMsg }, "WhatsApp message delivery failed");
  }
}

// ─── Send a message directly via Cloud API ────────────────────────────────────

async function sendCloudMessage(to: string, text: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    log.warn("WhatsApp Cloud API not configured — cannot send reply");
    return;
  }

  try {
    await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    });
  } catch (err) {
    log.error({ err, to }, "Failed to send WhatsApp reply");
  }
}
