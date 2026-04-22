"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@ru/db";
import { createBookingSchema, cancelBookingSchema, createLogger } from "@ru/config";
import { createAuthAction } from "@/lib/actions/safe-action";
import { notifyBookingConfirmed } from "@ru/notifications";
import { getGoogleConfig } from "@/lib/google-config";
import { addAttendee, removeAttendee } from "@ru/google-workspace";

const log = createLogger("action:bookings");

export const createBooking = createAuthAction("createBooking", {
  schema: createBookingSchema,
  handler: async ({ data, user }) => {
    const { sessionId } = data;

    // Get the session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        product: true,
        bookings: { where: { status: "CONFIRMED" } },
      },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.status === "CANCELLED") {
      throw new Error("Session has been cancelled");
    }

    if (session.startsAt < new Date()) {
      throw new Error("Cannot book past sessions");
    }

    // Check capacity
    if (session.bookings.length >= session.capacity) {
      throw new Error("Session is full");
    }

    // Check if user already has a confirmed booking for this session
    const existingBooking = await prisma.booking.findUnique({
      where: { userId_sessionId: { userId: user.id, sessionId } },
    });

    if (existingBooking?.status === "CONFIRMED") {
      throw new Error("Already booked for this session");
    }

    // Check active membership for this product (or bundle)
    const membership = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
        OR: [
          { plan: { productId: session.productId } },
          { plan: { product: { type: "BUNDLE" } } },
        ],
      },
    });

    if (!membership) {
      throw new Error("Active subscription required. Please subscribe first.");
    }

    // Create booking (no credit deduction — membership-based)
    const booking = await prisma.booking.upsert({
      where: { userId_sessionId: { userId: user.id, sessionId } },
      update: { status: "CONFIRMED", cancelledAt: null },
      create: {
        userId: user.id,
        sessionId,
        status: "CONFIRMED",
      },
      include: { session: true },
    });

    // Fire-and-forget notification
    notifyBookingConfirmed({
      userId: user.id,
      sessionType: session.product.name,
      date: session.startsAt.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      time: session.startsAt.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }).catch((err) => log.error({ err }, "Failed to queue booking notification"));

    // Fire-and-forget: sync attendee to Calendar event
    if (session.calendarEventId) {
      const googleConfig = getGoogleConfig();
      if (googleConfig) {
        addAttendee(googleConfig, session.calendarEventId, user.email).catch(
          (err) => log.error({ err }, "Failed to add Calendar attendee"),
        );
      }
    }

    revalidatePath("/app/sessions");

    return { bookingId: booking.id };
  },
});

export const cancelBooking = createAuthAction("cancelBooking", {
  schema: cancelBookingSchema,
  handler: async ({ data, user }) => {
    const { bookingId } = data;

    // Get the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { session: { include: { product: true } } },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.userId !== user.id) {
      throw new Error("Not your booking");
    }

    if (booking.status !== "CONFIRMED") {
      throw new Error("Booking already cancelled");
    }

    // Cancel booking
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    // Fire-and-forget: remove attendee from Calendar event
    if (booking.session.calendarEventId) {
      const googleConfig = getGoogleConfig();
      if (googleConfig) {
        removeAttendee(
          googleConfig,
          booking.session.calendarEventId,
          user.email,
        ).catch((err) =>
          log.error({ err }, "Failed to remove Calendar attendee"),
        );
      }
    }

    revalidatePath("/app/sessions");

    return { message: "Booking cancelled." };
  },
});
