import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { Prisma, prisma } from "@ru/db";
import { createLogger, getServerEnv } from "@ru/config";
import { getPostHogServer } from "@/lib/posthog-server";
import {
  ResendEmailProvider,
  ListmonkEmailProvider,
  ConsoleEmailProvider,
  type EmailProvider,
} from "@ru/notifications";

const log = createLogger("webhook:clerk");

type ClerkEmailAddress = {
  email_address: string;
};

type ClerkPhoneNumber = {
  phone_number: string;
};

type ClerkUserEvent = {
  data: {
    id: string;
    email_addresses: ClerkEmailAddress[];
    phone_numbers: ClerkPhoneNumber[];
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
  type: string;
};

// Shape of the emails.created event data, per Clerk's docs. Clerk
// pre-renders the full HTML body server-side, so we just relay it -- we
// don't need to know the template slug or reconstruct the OTP ourselves.
type ClerkEmailEvent = {
  data: {
    to_email_address: string;
    subject: string;
    body: string; // pre-rendered HTML
    body_plain?: string;
    from_email_name?: string; // local part, e.g. "notifications"
  };
  type: string;
};

function resolveEmailProvider(): EmailProvider {
  const env = getServerEnv();
  if (env.RESEND_API_KEY) {
    return new ResendEmailProvider({
      apiKey: env.RESEND_API_KEY,
      defaultFrom: env.RESEND_FROM_EMAIL,
    });
  }
  if (env.LISTMONK_URL && env.LISTMONK_API_USER && env.LISTMONK_API_PASSWORD) {
    return new ListmonkEmailProvider({
      url: env.LISTMONK_URL,
      username: env.LISTMONK_API_USER,
      password: env.LISTMONK_API_PASSWORD,
    });
  }
  return new ConsoleEmailProvider();
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log.warn(
      "CLERK_WEBHOOK_SECRET not configured — skipping webhook processing",
    );
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    );
  }

  // Verify the webhook signature
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 },
    );
  }

  const body = await request.text();

  let event: ClerkUserEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent;
  } catch (err) {
    log.error({ err }, "Webhook verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { type } = event;

  // emails.created has a completely different payload shape (no user id) --
  // handle it before we assume event.data.id exists.
  if (type === "email.created" || type === "emails.created") {
    return handleEmailCreated(event as unknown as ClerkEmailEvent, svixId);
  }

  const { data } = event;
  log.info({ type, clerkId: data.id }, "Clerk webhook received");

  // Use svix-id for idempotency
  const eventId = svixId;

  // Idempotency check — have we already processed this event?
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { eventId },
  });

  if (existingEvent) {
    log.info({ eventId }, "Clerk webhook event already processed");
    return NextResponse.json({ status: "already_processed" });
  }

  // Store webhook event for audit
  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      provider: "clerk",
      eventType: type,
      eventId,
      payload: JSON.parse(body),
      status: "PENDING",
    },
  });

  try {
    if (type === "user.created" || type === "user.updated") {
      await handleUserSync(data, type);
    } else if (type === "user.deleted") {
      // Soft-handle deletion: log but don't delete DB records (preserve order history etc.)
      log.info(
        { clerkId: data.id },
        "User deleted in Clerk — DB record preserved",
      );
    } else {
      log.info({ type }, "Unhandled Clerk event type");
    }

    // Mark as processed
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });

    return NextResponse.json({ status: "processed" });
  } catch (error) {
    // Mark as failed
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    log.error(
      { err: error, clerkId: data.id },
      "Failed to process Clerk webhook",
    );
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

async function handleUserSync(data: ClerkUserEvent["data"], eventType: string) {
  const email = data.email_addresses[0]?.email_address || "";
  const fullName =
    [data.first_name, data.last_name].filter(Boolean).join(" ") || undefined;
  const phone = data.phone_numbers[0]?.phone_number || undefined;

  // Try to find existing user by clerkId
  let dbUser = await prisma.user.findUnique({
    where: { clerkId: data.id },
  });

  if (dbUser) {
    // Update existing user
    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        email,
        name: dbUser.name || fullName,
        avatarUrl: data.image_url || undefined,
        phone: dbUser.phone || phone,
      },
    });
  } else {
    // Try to find by email (pre-seeded user)
    dbUser = email ? await prisma.user.findUnique({ where: { email } }) : null;

    if (dbUser) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          clerkId: data.id,
          name: dbUser.name || fullName,
          avatarUrl: data.image_url || undefined,
          phone: dbUser.phone || phone,
        },
      });
    } else {
      // Create new user
      try {
        await prisma.user.create({
          data: {
            clerkId: data.id,
            email,
            name: fullName,
            avatarUrl: data.image_url || undefined,
            phone,
          },
        });
      } catch (error) {
        // Handle race condition with lazy creation in getCurrentUser
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          log.info(
            { clerkId: data.id },
            "User already exists (race condition) — linking",
          );
          const existing = await prisma.user.findFirst({
            where: {
              OR: [{ clerkId: data.id }, ...(email ? [{ email }] : [])],
            },
          });
          if (existing && !existing.clerkId) {
            await prisma.user.update({
              where: { id: existing.id },
              data: { clerkId: data.id },
            });
          }
        } else {
          throw error;
        }
      }
    }
  }

  log.info({ clerkId: data.id, email }, "User synced successfully");

  const posthog = getPostHogServer();
  if (eventType === "user.created") {
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: data.id },
    });
    const distinctId = dbUser?.id ?? data.id;
    posthog.identify({
      distinctId,
      properties: {
        $set: {
          email,
          name: fullName || undefined,
          phone: phone || undefined,
          clerk_id: data.id,
        },
        $set_once: { signed_up_at: new Date().toISOString() },
      },
    });
    posthog.capture({
      distinctId,
      event: "user_signed_up",
      properties: { email_domain: email.split("@")[1] },
    });
  }
  await posthog.flush();
}

/**
 * Handle the emails.created webhook — fired when "Delivered by Clerk" is
 * turned OFF for a template. Clerk pre-renders the full email (subject +
 * HTML body, OTP/link already filled in) and hands it to us; we just relay
 * it through our own provider (Resend) instead of Clerk's SendGrid
 * integration. This exists because Clerk's SendGrid-routed emails were
 * landing in spam for some providers (GMX, Hotmail) even when sent from
 * our verified domain — routing through Resend, which we already use
 * reliably for transactional email, avoids that shared-pool reputation
 * issue.
 *
 * Idempotency and audit follow the same pattern as user.* events above,
 * keyed on the svix-id header.
 */
async function handleEmailCreated(
  event: ClerkEmailEvent,
  svixId: string,
): Promise<NextResponse> {
  const { data } = event;
  const to = data.to_email_address;

  log.info({ to, subject: data.subject }, "Clerk emails.created received");

  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { eventId: svixId },
  });
  if (existingEvent) {
    log.info({ eventId: svixId }, "Clerk email event already processed");
    return NextResponse.json({ status: "already_processed" });
  }

  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      provider: "clerk",
      eventType: "email.created",
      eventId: svixId,
      payload: { to, subject: data.subject },
      status: "PENDING",
    },
  });

  try {
    if (!to) {
      throw new Error("emails.created event missing to_email_address");
    }

    const provider = resolveEmailProvider();
    const result = await provider.send({
      to,
      subject: data.subject,
      html: data.body,
      text: data.body_plain,
    });

    if (!result.success) {
      throw new Error(result.error || "Email provider send failed");
    }

    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });

    log.info({ to, messageId: result.messageId }, "Clerk auth email relayed via Resend");
    return NextResponse.json({ status: "processed" });
  } catch (error) {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    log.error({ err: error, to }, "Failed to relay Clerk auth email");
    return NextResponse.json(
      { error: "Failed to send auth email" },
      { status: 500 },
    );
  }
}
