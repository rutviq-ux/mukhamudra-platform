"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@ru/db";
import { bookingStatusSchema } from "@ru/config";
import { createLogger } from "@ru/config";
import { createAdminAction } from "@/lib/actions/safe-action";
import { getGoogleConfig } from "@/lib/google-config";
import { removeAttendee } from "@ru/google-workspace";

const log = createLogger("action:updateBookingStatus");

const updateBookingStatusSchema = bookingStatusSchema.extend({
  id: z.string().cuid(),
});

const TERMINAL_STATUSES = ["COMPLETED", "NO_SHOW", "CANCELLED"];

export const updateBookingStatus = createAdminAction("updateBookingStatus", {
  schema: updateBookingStatusSchema,
  audit: {
    action: "booking.update_status",
    targetType: "Booking",
    getTargetId: (data) => data.id,
    getMetadata: (data, result) => ({
      userId: result.userId,
      userEmail: result.userEmail,
      from: result.from,
      to: data.status,
    }),
  },
  handler: async ({ data }) => {
    const { id, status: newStatus } = data;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (newStatus === booking.status) {
      throw new Error("Status is already " + newStatus);
    }

    // Only allow transitions from non-terminal states
    if (TERMINAL_STATUSES.includes(booking.status)) {
      throw new Error("Can only update bookings with CONFIRMED status");
    }

    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === "CANCELLED") {
      updateData.cancelledAt = new Date();
    }

    await prisma.booking.update({ where: { id }, data: updateData });

    // Fire-and-forget: remove attendee from Calendar event on cancellation
    if (newStatus === "CANCELLED") {
      const session = await prisma.session.findUnique({
        where: { id: booking.sessionId },
        select: { calendarEventId: true },
      });
      if (session?.calendarEventId) {
        const googleConfig = getGoogleConfig();
        if (googleConfig) {
          removeAttendee(
            googleConfig,
            session.calendarEventId,
            booking.user.email,
          ).catch((err) =>
            log.error({ err }, "Failed to remove Calendar attendee"),
          );
        }
      }
    }

    revalidatePath("/admin/bookings");

    return {
      userId: booking.user.id,
      userEmail: booking.user.email,
      from: booking.status,
    };
  },
});
