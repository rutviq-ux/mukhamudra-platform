import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { getCurrentUser } from "@/lib/auth";

const log = createLogger("api:push:subscribe");

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Invalid subscription: endpoint, keys.p256dh, and keys.auth are required" },
        { status: 400 },
      );
    }

    const userAgent = request.headers.get("user-agent") || undefined;

    // Upsert by endpoint (same browser re-subscribing)
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: user.id,
        userAgent,
      },
      create: {
        userId: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
      },
    });

    // Enable push opt-in
    if (!user.pushOptIn) {
      await prisma.user.update({
        where: { id: user.id },
        data: { pushOptIn: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Failed to save push subscription");
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 },
    );
  }
}
