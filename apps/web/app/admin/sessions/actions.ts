"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@ru/db";
import { sessionUpdateSchema } from "@ru/config";
import { createAdminAction } from "@/lib/actions/safe-action";
import { getGoogleConfig } from "@/lib/google-config";
import {
  createMeetingWithAttendees,
  resolveSpaceName,
  setSpaceAccessType,
  findRecording,
} from "@ru/google-workspace";
import {
  generateMeetingTitle,
  generateMeetingDescription,
} from "@/lib/meet-helpers";

// ---------- updateSession ----------

export const updateSession = createAdminAction("updateSession", {
  schema: sessionUpdateSchema.extend({ id: z.string().cuid() }),
  audit: {
    action: "session.update",
    targetType: "Session",
    getTargetId: (data) => data.id,
    getMetadata: (data) => {
      const { id: _id, ...rest } = data;
      return rest;
    },
  },
  handler: async ({ data }) => {
    const { id, ...fields } = data;

    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Session not found");
    }

    const session = await prisma.session.update({
      where: { id },
      data: fields,
    });

    revalidatePath("/admin/sessions");
    return session;
  },
});

// ---------- getMeetPreview ----------

export const getMeetPreview = createAdminAction("getMeetPreview", {
  schema: z.object({ id: z.string().cuid() }),
  allowedRoles: ["ADMIN", "COACH"],
  handler: async ({ data, user }) => {
    const session = await prisma.session.findUnique({
      where: { id: data.id },
      include: {
        product: { select: { name: true } },
        bookings: {
          where: { status: "CONFIRMED" },
          select: { user: { select: { email: true } } },
        },
      },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    // Coach can only preview their own sessions
    if (user.role === "COACH" && session.coachId !== user.id) {
      throw new Error("Unauthorized");
    }

    const title = generateMeetingTitle(
      session.product.name,
      session.modalities,
      session.startsAt,
    );
    const description = generateMeetingDescription(
      session,
      session.product.name,
      session.modalities,
    );
    const attendees = session.bookings.map((b) => b.user.email);

    revalidatePath("/admin/sessions");
    return { title, description, attendees };
  },
});

// ---------- generateMeetLink ----------

export const generateMeetLink = createAdminAction("generateMeetLink", {
  schema: z.object({
    id: z.string().cuid(),
    title: z.string().optional(),
    description: z.string().optional(),
    attendees: z.array(z.string().email()).optional(),
  }),
  allowedRoles: ["ADMIN", "COACH"],
  audit: {
    action: "session.generate_meet",
    targetType: "Session",
    getTargetId: (data) => data.id,
    getMetadata: (_data, result) => ({
      meetLink: result.meetLink,
      calendarEventId: result.calendarEventId,
    }),
  },
  handler: async ({ data, user }) => {
    const session = await prisma.session.findUnique({
      where: { id: data.id },
      include: {
        product: { select: { name: true } },
        bookings: {
          where: { status: "CONFIRMED" },
          select: { user: { select: { email: true } } },
        },
      },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    // Coach can only generate for their own sessions
    if (user.role === "COACH" && session.coachId !== user.id) {
      throw new Error("Unauthorized");
    }

    // Duplicate guard
    if (session.joinUrl) {
      throw new Error("Session already has a Meet link");
    }

    const googleConfig = getGoogleConfig();
    if (!googleConfig) {
      throw new Error("Google Workspace not configured");
    }

    // Build title, description, attendees — use provided values or auto-generate
    const title =
      data.title ||
      generateMeetingTitle(
        session.product.name,
        session.modalities,
        session.startsAt,
      );
    const description =
      data.description ||
      generateMeetingDescription(
        session,
        session.product.name,
        session.modalities,
      );
    const attendeeEmails =
      data.attendees || session.bookings.map((b) => b.user.email);

    const meetResult = await createMeetingWithAttendees(googleConfig, {
      title,
      description,
      startTime: session.startsAt,
      endTime: session.endsAt,
      attendeeEmails,
    });

    // Best-effort: resolve space name from meeting code for recordings + TRUSTED access
    let spaceName: string | null = null;
    try {
      spaceName = await resolveSpaceName(googleConfig, meetResult.meetingId);
    } catch {
      // Space not ready yet — will be resolved later by fetch-recordings cron
    }

    // Store results on session
    await prisma.session.update({
      where: { id: data.id },
      data: {
        joinUrl: meetResult.meetLink,
        calendarEventId: meetResult.calendarEventId,
        meetingId: meetResult.meetingId,
        spaceName,
      },
    });

    // Best-effort: set space access type to TRUSTED
    if (spaceName) {
      setSpaceAccessType(googleConfig, spaceName, "TRUSTED").catch(() => {
        // Swallow — non-critical
      });
    }

    revalidatePath("/admin/sessions");
    return {
      meetLink: meetResult.meetLink,
      calendarEventId: meetResult.calendarEventId,
    };
  },
});

// ---------- fetchSessionRecording ----------

export const fetchSessionRecording = createAdminAction(
  "fetchSessionRecording",
  {
    schema: z.object({ id: z.string().cuid() }),
    allowedRoles: ["ADMIN", "COACH"],
    handler: async ({ data, user }) => {
      const session = await prisma.session.findUnique({
        where: { id: data.id },
      });

      if (!session) {
        throw new Error("Session not found");
      }

      // Coach can only access their own sessions
      if (user.role === "COACH" && session.coachId !== user.id) {
        throw new Error("Unauthorized");
      }

      // Return cached recording URL if it exists
      if (session.recordingUrl) {
        revalidatePath("/admin/sessions");
        return { recordingUrl: session.recordingUrl };
      }

      // Need a Meet space to search for recordings
      const spaceName = session.spaceName;
      if (!spaceName || !spaceName.startsWith("spaces/")) {
        throw new Error("No Meet space available to search for recordings");
      }

      const googleConfig = getGoogleConfig();
      if (!googleConfig) {
        throw new Error("Google Workspace not configured");
      }

      const recording = await findRecording(googleConfig, spaceName);
      if (!recording) {
        throw new Error("No recording found");
      }

      // Cache the recording URL on the session
      await prisma.session.update({
        where: { id: data.id },
        data: { recordingUrl: recording.recordingUrl },
      });

      revalidatePath("/admin/sessions");
      return { recordingUrl: recording.recordingUrl };
    },
  },
);
