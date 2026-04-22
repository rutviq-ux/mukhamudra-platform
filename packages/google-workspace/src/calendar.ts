import { getCalendarClient } from "./auth";
import type {
  GoogleWorkspaceConfig,
  MeetingWithAttendeesInput,
  MeetingWithAttendeesResult,
} from "./types";

/**
 * Create a Google Calendar event with Meet conference auto-generation and attendees.
 * Uses conferenceDataVersion: 1 with createRequest for automatic Meet link creation.
 */
export async function createMeetingWithAttendees(
  config: GoogleWorkspaceConfig,
  input: MeetingWithAttendeesInput,
): Promise<MeetingWithAttendeesResult> {
  const calendar = getCalendarClient(config);

  const event = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: "none",
    requestBody: {
      summary: input.title,
      description: input.description,
      start: {
        dateTime: input.startTime.toISOString(),
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime: input.endTime.toISOString(),
        timeZone: "Asia/Kolkata",
      },
      attendees: input.attendeeEmails.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const hangoutLink = event.data.hangoutLink;
  const conferenceId = event.data.conferenceData?.conferenceId;
  const eventId = event.data.id;

  if (!hangoutLink || !conferenceId || !eventId) {
    throw new Error(
      "Failed to create Calendar event with Meet conference: missing hangoutLink, conferenceId, or eventId",
    );
  }

  return {
    meetLink: hangoutLink,
    meetingId: conferenceId,
    calendarEventId: eventId,
  };
}

/**
 * Add an attendee to an existing Calendar event.
 * Fire-and-forget safe — caller should catch errors.
 */
export async function addAttendee(
  config: GoogleWorkspaceConfig,
  calendarEventId: string,
  email: string,
): Promise<void> {
  const calendar = getCalendarClient(config);

  const event = await calendar.events.get({
    calendarId: "primary",
    eventId: calendarEventId,
  });

  const existingAttendees = event.data.attendees || [];

  // Don't add if already present
  if (existingAttendees.some((a) => a.email === email)) {
    return;
  }

  await calendar.events.patch({
    calendarId: "primary",
    eventId: calendarEventId,
    sendUpdates: "none",
    requestBody: {
      attendees: [...existingAttendees, { email }],
    },
  });
}

/**
 * Remove an attendee from an existing Calendar event.
 * Fire-and-forget safe — caller should catch errors.
 */
export async function removeAttendee(
  config: GoogleWorkspaceConfig,
  calendarEventId: string,
  email: string,
): Promise<void> {
  const calendar = getCalendarClient(config);

  const event = await calendar.events.get({
    calendarId: "primary",
    eventId: calendarEventId,
  });

  const existingAttendees = event.data.attendees || [];
  const filtered = existingAttendees.filter((a) => a.email !== email);

  // No change needed
  if (filtered.length === existingAttendees.length) {
    return;
  }

  await calendar.events.patch({
    calendarId: "primary",
    eventId: calendarEventId,
    sendUpdates: "none",
    requestBody: {
      attendees: filtered,
    },
  });
}
