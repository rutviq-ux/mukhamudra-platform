import { getCalendarClient } from "./auth";
import type {
  GoogleWorkspaceConfig,
  MeetingWithAttendeesInput,
  MeetingWithAttendeesResult,
} from "./types";

const CALENDAR_ATTENDEE_BATCH = 100;

function uniqueAttendeeEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const email of emails) {
    const trimmed = email.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export async function createMeetingWithAttendees(
  config: GoogleWorkspaceConfig,
  input: MeetingWithAttendeesInput,
): Promise<MeetingWithAttendeesResult> {
  const calendar = getCalendarClient(config);
  const attendeeEmails = uniqueAttendeeEmails(input.attendeeEmails);
  const initialAttendees = attendeeEmails.slice(0, CALENDAR_ATTENDEE_BATCH);
  const remainingAttendees = attendeeEmails.slice(CALENDAR_ATTENDEE_BATCH);

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
      attendees: initialAttendees.map((email) => ({ email })),
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: false,
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

  if (remainingAttendees.length > 0) {
    await addAttendees(config, eventId, remainingAttendees);
  }

  return {
    meetLink: hangoutLink,
    meetingId: conferenceId,
    calendarEventId: eventId,
  };
}

export async function addAttendees(
  config: GoogleWorkspaceConfig,
  calendarEventId: string,
  emails: string[],
): Promise<void> {
  const toAdd = uniqueAttendeeEmails(emails);
  if (toAdd.length === 0) {
    return;
  }

  const calendar = getCalendarClient(config);

  for (let i = 0; i < toAdd.length; i += CALENDAR_ATTENDEE_BATCH) {
    const chunk = toAdd.slice(i, i + CALENDAR_ATTENDEE_BATCH);
    const event = await calendar.events.get({
      calendarId: "primary",
      eventId: calendarEventId,
    });

    const existingAttendees = event.data.attendees || [];
    const existing = new Set(
      existingAttendees
        .map((attendee) => attendee.email?.toLowerCase())
        .filter((email): email is string => Boolean(email)),
    );
    const newcomers = chunk.filter((email) => !existing.has(email.toLowerCase()));
    if (newcomers.length === 0) {
      continue;
    }

    await calendar.events.patch({
      calendarId: "primary",
      eventId: calendarEventId,
      sendUpdates: "none",
      requestBody: {
        attendees: [
          ...existingAttendees,
          ...newcomers.map((email) => ({ email })),
        ],
      },
    });
  }
}

export async function addAttendee(
  config: GoogleWorkspaceConfig,
  calendarEventId: string,
  email: string,
): Promise<void> {
  await addAttendees(config, calendarEventId, [email]);
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
