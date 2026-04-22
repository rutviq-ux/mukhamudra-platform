import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { newsletterSubscribeSchema, validateRequest, createLogger } from "@ru/config";
import { createListmonkClient } from "@ru/listmonk-client";

const log = createLogger("api:newsletter");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateRequest(newsletterSubscribeSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, errors: validation.errors },
        { status: 400 }
      );
    }
    const { email, name, optIn } = validation.data;

    if (!optIn) {
      return NextResponse.json(
        { error: "Opt-in consent required" },
        { status: 400 }
      );
    }

    const listmonk = createListmonkClient();

    // Check if subscriber already exists
    const existing = await listmonk.getSubscriberByEmail(email);

    if (existing) {
      // Add to newsletter list if not already
      // List ID 1 is typically the default public list
      await listmonk.addSubscriberToLists(
        existing.data.id!,
        [1], // Newsletter list ID
        "unconfirmed" // Trigger double opt-in
      );

      return NextResponse.json({
        success: true,
        message: "Check your email to confirm subscription",
      });
    }

    // Create new subscriber with double opt-in
    await listmonk.createSubscriber({
      email,
      name,
      status: "enabled",
      lists: [1], // Newsletter list
      preconfirm_subscriptions: false, // Requires email confirmation
    });

    return NextResponse.json({
      success: true,
      message: "Check your email to confirm subscription",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    log.error({ err: error }, "Failed to subscribe to newsletter");
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
