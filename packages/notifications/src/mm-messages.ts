import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { logMessage } from "./audit";
import { formatPhone, sendTemplate } from "./interakt";
import { MM, MM_EMAIL_TEMPLATES, firstName } from "./mm-templates";

const log = createLogger("mm-messages");

export async function ensureMmEmailTemplates(): Promise<void> {
  for (const template of MM_EMAIL_TEMPLATES) {
    await prisma.messageTemplate.upsert({
      where: { name: template.name },
      update:
        template.name === "mm_no_live_session_email"
          ? {
              subject: template.subject,
              body: template.body,
              variables: template.variables,
            }
          : {},
      create: {
        channel: "EMAIL",
        name: template.name,
        subject: template.subject,
        body: template.body,
        variables: template.variables,
        isActive: true,
        isTransactional: template.isTransactional,
      },
    });
  }
}

export async function deliverInteraktTemplate(opts: {
  rawPhone: string;
  logTo: string;
  userId?: string;
  templateName: string;
  bodyValues?: string[];
  headerValues?: string[];
  buttonValues?: Record<string, string[]>;
  logBody: string;
}): Promise<boolean> {
  const phone = formatPhone(opts.rawPhone);
  if (!phone) {
    log.warn({ templateName: opts.templateName }, "Skipping WhatsApp, phone unusable");
    return false;
  }

  const ok = await sendTemplate({
    phoneNumber: phone.local,
    countryCode: phone.countryCode,
    templateName: opts.templateName,
    languageCode: "en",
    bodyValues: opts.bodyValues,
    headerValues: opts.headerValues,
    buttonValues: opts.buttonValues,
  });

  await logMessage({
    channel: "WHATSAPP",
    to: opts.logTo,
    userId: opts.userId,
    body: opts.logBody,
    status: ok ? "SENT" : "FAILED",
    error: ok ? undefined : "Interakt template send failed",
  }).catch((err) => log.error({ err }, "Failed to log WhatsApp template"));

  return ok;
}

export function prePaymentImageUrl(): string | null {
  const url = process.env.WHATSAPP_PREPAYMENT_IMAGE_URL?.trim();
  return url || null;
}

export async function newNoticesEnabled(
  productTypes?: string[],
): Promise<boolean> {
  const batches = await prisma.batch.findMany({
    where: {
      isActive: true,
      ...(productTypes && productTypes.length > 0
        ? { product: { type: { in: productTypes as never } } }
        : {}),
    },
    select: { remindersEnabled: true },
  });
  if (batches.length === 0) return true;
  return batches.some((batch) => batch.remindersEnabled);
}

export async function sendTrialClassNotice(opts: {
  rawPhone: string;
  name?: string | null;
  userId?: string;
}): Promise<boolean> {
  if (!(await newNoticesEnabled())) {
    log.info("Skipping trial class WhatsApp, batch reminders disabled");
    return false;
  }

  const parsed = formatPhone(opts.rawPhone);
  if (!parsed) {
    log.warn("Skipping trial class WhatsApp, phone unusable");
    return false;
  }

  const logTo = `${parsed.countryCode}${parsed.local}`;
  const candidates = [
    ...new Set(
      [
        opts.rawPhone.trim(),
        parsed.local,
        logTo,
        `${parsed.countryCode.replace("+", "")}${parsed.local}`,
      ].filter(Boolean),
    ),
  ];

  const alreadySent = await prisma.messageLog.findFirst({
    where: {
      channel: "WHATSAPP",
      body: MM.TRIAL,
      status: { in: ["SENT", "DELIVERED"] },
      to: { in: candidates },
    },
    select: { id: true },
  });
  if (alreadySent) return false;

  return deliverInteraktTemplate({
    rawPhone: opts.rawPhone,
    logTo,
    userId: opts.userId,
    templateName: MM.TRIAL,
    bodyValues: [firstName(opts.name)],
    logBody: MM.TRIAL,
  });
}
