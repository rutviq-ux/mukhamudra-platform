import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { getCurrentUser } from "@/lib/auth";

const log = createLogger("api:admin:sequences:enrollments");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sequenceId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const where: any = { sequenceId };
    if (status) {
      where.status = status;
    }

    const [enrollments, total] = await Promise.all([
      prisma.sequenceEnrollment.findMany({
        where,
        orderBy: { enrolledAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          lead: { select: { id: true, name: true, phone: true } },
          _count: { select: { messageLogs: true } },
        },
      }),
      prisma.sequenceEnrollment.count({ where }),
    ]);

    return NextResponse.json({
      enrollments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    log.error({ err: error }, "Failed to list enrollments");
    return NextResponse.json(
      { error: "Failed to list enrollments" },
      { status: 500 },
    );
  }
}
