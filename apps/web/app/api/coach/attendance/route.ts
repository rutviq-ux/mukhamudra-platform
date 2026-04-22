import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { attendanceSchema, validateRequest, createLogger } from "@ru/config";
import { getCurrentUser } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit-log";
import { emitSequenceEvent } from "@ru/notifications";

const log = createLogger("api:coach:attendance");

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !["ADMIN", "OPS", "COACH"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateRequest(attendanceSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, errors: validation.errors },
        { status: 400 }
      );
    }
    const { sessionId, userId, attended } = validation.data;

    if (attended) {
      // Check if this is the user's first-ever attendance (before upserting)
      const priorCount = await prisma.attendance.count({
        where: { userId },
      });

      await prisma.attendance.upsert({
        where: {
          userId_sessionId: { userId, sessionId },
        },
        update: { joinedAt: new Date() },
        create: {
          userId,
          sessionId,
          joinedAt: new Date(),
        },
      });

      // Emit first-booking event to trigger engagement sequences
      if (priorCount === 0) {
        emitSequenceEvent("booking.first", { userId }).catch((err) =>
          log.error({ err }, "Failed to emit booking.first sequence event")
        );
      }
    } else {
      await prisma.attendance.deleteMany({
        where: { userId, sessionId },
      });
    }

    await logAdminAction({
      actor: user,
      action: attended ? "attendance.mark" : "attendance.unmark",
      targetType: "Attendance",
      targetId: `${userId}:${sessionId}`,
      metadata: { sessionId, userId, attended },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Failed to update attendance");
    return NextResponse.json(
      { error: "Failed to update attendance" },
      { status: 500 },
    );
  }
}
