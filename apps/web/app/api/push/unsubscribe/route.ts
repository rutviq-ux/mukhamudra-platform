import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { getCurrentUser } from "@/lib/auth";

const log = createLogger("api:push:unsubscribe");

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const endpoint = body.endpoint;

    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { userId: user.id, endpoint },
      });
    } else {
      await prisma.pushSubscription.deleteMany({
        where: { userId: user.id },
      });
    }

    // Check if user still has any subscriptions
    const remaining = await prisma.pushSubscription.count({
      where: { userId: user.id },
    });
    if (remaining === 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { pushOptIn: false },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Failed to unsubscribe push");
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 },
    );
  }
}
