import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { getCurrentUser } from "@/lib/auth";

const log = createLogger("api:admin:sessions");

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (batchId) where.batchId = batchId;
    if (status) where.status = status;
    if (from || to) {
      where.startsAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const sessions = await prisma.session.findMany({
      where,
      orderBy: { startsAt: "asc" },
      take: 200,
      include: {
        batch: { select: { name: true, slug: true } },
        product: { select: { name: true } },
        coach: { select: { name: true, email: true } },
        _count: { select: { bookings: true } },
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    log.error({ err: error }, "Failed to list sessions");
    return NextResponse.json(
      { error: "Failed to list sessions" },
      { status: 500 }
    );
  }
}
