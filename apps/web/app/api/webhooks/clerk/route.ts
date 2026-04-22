import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { Prisma, prisma } from "@ru/db";
import { createLogger } from "@ru/config";

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

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log.warn("CLERK_WEBHOOK_SECRET not configured — skipping webhook processing");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Verify the webhook signature
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
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

  const { type, data } = event;
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
      await handleUserSync(data);
    } else if (type === "user.deleted") {
      // Soft-handle deletion: log but don't delete DB records (preserve order history etc.)
      log.info({ clerkId: data.id }, "User deleted in Clerk — DB record preserved");
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

    log.error({ err: error, clerkId: data.id }, "Failed to process Clerk webhook");
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function handleUserSync(data: ClerkUserEvent["data"]) {
  const email = data.email_addresses[0]?.email_address || "";
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || undefined;
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
          log.info({ clerkId: data.id }, "User already exists (race condition) — linking");
          const existing = await prisma.user.findFirst({
            where: { OR: [{ clerkId: data.id }, ...(email ? [{ email }] : [])] },
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
}
