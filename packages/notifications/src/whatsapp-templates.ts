/**
 * Mukha Mudra WhatsApp enrollment templates
 * Fires immediately after Razorpay payment confirmation.
 *
 * Template names must match exactly what was approved in Meta WhatsApp Manager.
 */

import { prisma } from "@ru/db";
import { sendWhatsApp } from "./send-whatsapp";
import { createLogger } from "@ru/config";

const log = createLogger("whatsapp-templates");

const DASHBOARD_URL = "https://www.mukhamudra.com/app";
const RECORDINGS_URL = "https://www.mukhamudra.com/app/recordings";

/** Format a Date as "25 May 2027" (India style) */
function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Format batch startTime "21:00" → "9 PM" */
function fmtBatchTime(startTime: string): string {
  const [hStr] = startTime.split(":");
  const h = parseInt(hStr ?? "0", 10);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}

/**
 * Get the user's first name from their full name.
 */
function firstName(fullName: string | null): string {
  if (!fullName) return "there";
  return fullName.split(" ")[0] ?? fullName;
}

/**
 * Get active batches for a product type, sorted by startTime.
 * Returns the first batch time as a string like "9 PM".
 */
async function getBatchTime(productType: string): Promise<string> {
  const batch = await prisma.batch.findFirst({
    where: { isActive: true, product: { type: productType as any } },
    orderBy: { startTime: "asc" },
  });
  return batch ? fmtBatchTime(batch.startTime) : "scheduled time";
}

async function getBothBatchTimes(): Promise<{
  pranayama: string;
  faceYoga: string;
}> {
  const [pranayama, faceYoga] = await Promise.all([
    getBatchTime("PRANAYAMA"),
    getBatchTime("FACE_YOGA"),
  ]);
  return { pranayama, faceYoga };
}

// ─── Template A: Face Yoga Annual ─────────────────────────────────────────────

export async function sendEnrollFaceYogaAnnual(opts: {
  userId: string;
  periodEnd: Date;
}) {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true, phone: true, whatsappOptIn: true },
  });
  if (!user?.phone || !user.whatsappOptIn) return;

  const batchTime = await getBatchTime("FACE_YOGA");

  await sendWhatsApp({
    userId: opts.userId,
    phone: user.phone,
    body: "", // body is unused when templateName is set
    templateName: "mukhamudra_enroll_faceyoga_annual",
    templateParams: [
      firstName(user.name),
      fmtDate(opts.periodEnd),
      batchTime,
      DASHBOARD_URL,
    ],
  });

  log.info({ userId: opts.userId }, "Sent Face Yoga Annual enrollment WA");
}

// ─── Template B: Pranayama Annual ─────────────────────────────────────────────

export async function sendEnrollPranayamaAnnual(opts: {
  userId: string;
  periodEnd: Date;
}) {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true, phone: true, whatsappOptIn: true },
  });
  if (!user?.phone || !user.whatsappOptIn) return;

  const batchTime = await getBatchTime("PRANAYAMA");

  await sendWhatsApp({
    userId: opts.userId,
    phone: user.phone,
    body: "",
    templateName: "mukhamudra_enroll_pranayama_annual",
    templateParams: [
      firstName(user.name),
      fmtDate(opts.periodEnd),
      batchTime,
      DASHBOARD_URL,
    ],
  });

  log.info({ userId: opts.userId }, "Sent Pranayama Annual enrollment WA");
}

// ─── Template C: Bundle Annual ────────────────────────────────────────────────

export async function sendEnrollBundleAnnual(opts: {
  userId: string;
  periodEnd: Date;
}) {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true, phone: true, whatsappOptIn: true },
  });
  if (!user?.phone || !user.whatsappOptIn) return;

  const { pranayama, faceYoga } = await getBothBatchTimes();

  await sendWhatsApp({
    userId: opts.userId,
    phone: user.phone,
    body: "",
    templateName: "mukhamudra_enroll_bundle_annual",
    templateParams: [
      firstName(user.name),
      fmtDate(opts.periodEnd),
      pranayama,
      faceYoga,
      DASHBOARD_URL,
    ],
  });

  log.info({ userId: opts.userId }, "Sent Bundle Annual enrollment WA");
}

// ─── Template D: Monthly (Bundle or standalone) ───────────────────────────────

export async function sendEnrollMonthly(opts: {
  userId: string;
  periodEnd: Date;
}) {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true, phone: true, whatsappOptIn: true },
  });
  if (!user?.phone || !user.whatsappOptIn) return;

  const { pranayama, faceYoga } = await getBothBatchTimes();

  await sendWhatsApp({
    userId: opts.userId,
    phone: user.phone,
    body: "",
    templateName: "mukhamudra_enroll_monthly",
    templateParams: [
      firstName(user.name),
      fmtDate(opts.periodEnd),
      pranayama,
      faceYoga,
      DASHBOARD_URL,
    ],
  });

  log.info({ userId: opts.userId }, "Sent Monthly enrollment WA");
}

// ─── Template E: Recordings Add-on ───────────────────────────────────────────

export async function sendEnrollRecordingsAddon(opts: {
  userId: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true, phone: true, whatsappOptIn: true },
  });
  if (!user?.phone || !user.whatsappOptIn) return;

  await sendWhatsApp({
    userId: opts.userId,
    phone: user.phone,
    body: "",
    templateName: "mukhamudra_enroll_recordings_addon",
    templateParams: [firstName(user.name), RECORDINGS_URL],
  });

  log.info({ userId: opts.userId }, "Sent Recordings Add-on enrollment WA");
}

// ─── Cold inquiry auto-reply ──────────────────────────────────────────────────

export async function sendColdInquiryReply(to: string) {
  const cloud = new (await import("./providers/whatsapp")).WhatsAppBusinessProvider({
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  });

  // Use plain text until the mukhamudra_cold_inquiry template is approved by Meta
  const body = `Namaste 🌿 This is Ru from Mukha Mudra — so glad you reached out 🫶🏻

Here's a quick look at what we offer:

🧘 Face Yoga — live classes, Mon / Wed / Fri 9 PM IST or 10 PM IST (pick your batch)

🌬️ Pranayama — live classes, daily 8 AM IST or 9 AM IST (pick your batch)
30 mins — 20 min practice + 10 min Q&A

💰 Plans:
₹3,000/year — Face Yoga OR Pranayama
₹6,000/year — Face Yoga + Pranayama (bundle)
₹1,111/month — Face Yoga + Pranayama

All live, small group, on Google Meet. I know everyone by name 😇

To sign up: www.mukhamudra.com

If you have any questions, just reply here — I read everything personally 🌿`;

  const result = await cloud.send({ to, body });

  // Log with template name as body so we can check if already replied
  const { prisma } = await import("@ru/db");
  await prisma.messageLog.create({
    data: {
      channel: "WHATSAPP",
      to,
      body: "mukhamudra_cold_inquiry",
      status: result.success ? "SENT" : "FAILED",
      providerMessageId: result.messageId,
      error: result.error,
    },
  }).catch((err) => log.error({ err }, "Failed to log cold inquiry message"));

  if (!result.success) {
    log.error({ to, error: result.error }, "Cold inquiry auto-reply failed");
  } else {
    log.info({ to }, "Sent cold inquiry auto-reply");
  }
}
