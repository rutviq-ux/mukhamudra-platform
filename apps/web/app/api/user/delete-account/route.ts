import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@ru/db";
import { clerkClient } from "@clerk/nextjs/server";

export async function DELETE() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Delete from Clerk first
  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(clerkId);
  } catch {
    // May already be deleted from Clerk — continue
  }

  // Delete all user data in a transaction
  await prisma.$transaction(async (tx) => {
    await tx.booking.deleteMany({ where: { userId: user.id } });
    await tx.attendance.deleteMany({ where: { userId: user.id } });
    await tx.order.deleteMany({ where: { userId: user.id } });
    await tx.membership.deleteMany({ where: { userId: user.id } });
    await tx.progressMedia.deleteMany({ where: { userId: user.id } });
    await tx.userCourseProgress.deleteMany({ where: { userId: user.id } });
    await tx.messageLog.deleteMany({ where: { userId: user.id } });
    await tx.auditLog.deleteMany({ where: { actorId: user.id } });
    await tx.recordingAccess.deleteMany({ where: { userId: user.id } });
    await tx.pushSubscription.deleteMany({ where: { userId: user.id } });
    await tx.user.delete({ where: { id: user.id } });
  });

  return NextResponse.json({ success: true });
}
