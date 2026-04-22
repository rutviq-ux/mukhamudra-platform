import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { getCurrentUser } from "@/lib/auth";
import { joinSessionSchema, validateRequest, createLogger } from "@ru/config";
import { getConfig } from "@/lib/config";

const log = createLogger("api:join");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const validation = validateRequest(joinSessionSchema, { sessionId });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, errors: validation.errors },
        { status: 400 },
      );
    }
    const { sessionId: validatedSessionId } = validation.data;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get session with booking and membership info
    const session = await prisma.session.findUnique({
      where: { id: validatedSessionId },
      include: {
        batch: true,
        bookings: {
          where: { userId: user.id, status: "CONFIRMED" },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Check eligibility — user must have active membership for this product
    let isEligible = false;

    if (session.bookings.length > 0) {
      // User has a confirmed booking
      isEligible = true;
    } else {
      // Check active membership for this product or bundle
      const sessionWithProduct = await prisma.session.findUnique({
        where: { id: validatedSessionId },
        select: { productId: true },
      });

      if (sessionWithProduct) {
        const membership = await prisma.membership.findFirst({
          where: {
            userId: user.id,
            status: "ACTIVE",
            OR: [
              { plan: { productId: sessionWithProduct.productId } },
              { plan: { product: { type: "BUNDLE" } } },
            ],
          },
        });
        isEligible = !!membership;
      }
    }

    if (!isEligible) {
      return NextResponse.json(
        { error: "Not eligible to join this session" },
        { status: 403 }
      );
    }

    // Check time window
    const now = new Date();
    const config = await getConfig();
    const sessionStart = new Date(session.startsAt);
    const sessionEnd = new Date(session.endsAt);

    const joinWindowStart = new Date(
      sessionStart.getTime() - config.JOIN_WINDOW_BEFORE_MIN * 60 * 1000
    );
    const joinWindowEnd = new Date(
      sessionEnd.getTime() + config.JOIN_WINDOW_AFTER_MIN * 60 * 1000
    );

    if (now < joinWindowStart) {
      const minutesUntilOpen = Math.ceil(
        (joinWindowStart.getTime() - now.getTime()) / 60000
      );
      return NextResponse.json(
        {
          error: "Join window not yet open",
          opensIn: minutesUntilOpen,
          message: `You can join ${minutesUntilOpen} minutes before the session starts`,
        },
        { status: 403 }
      );
    }

    if (now > joinWindowEnd) {
      return NextResponse.json(
        { error: "Session has ended" },
        { status: 403 }
      );
    }

    // Return the join URL
    if (!session.joinUrl) {
      return NextResponse.json(
        { error: "Join link not yet available" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      joinUrl: session.joinUrl,
      session: {
        id: session.id,
        title: session.title,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Failed to get join link");
    return NextResponse.json(
      { error: "Failed to get join link" },
      { status: 500 }
    );
  }
}
