# Meet Invitations, Auto-Generation, and Admin Preview

## Summary

Enhance the Google Meet integration so that booked users are pre-invited as Calendar event attendees (no knocking required), meeting links auto-generate 5 minutes before sessions, and admins can preview/edit meeting details before generating.

## Decisions

- **Meeting creation**: Calendar API (creates event with attendees + auto-generates Meet conference). Meet REST API continues to handle recordings.
- **Access control**: Space `accessType` set to `TRUSTED` after creation — org members and invited external users join without knocking.
- **Attendee sync**: Auto-add/remove attendees on booking create/cancel.
- **Auto-gen**: New cron creates meeting links 5 minutes before session start for any session without one.
- **Admin UX**: Preview modal with editable title, description, and attendee list before generating.
- **Meeting title format**: `"{Product} ({Modalities}) — {Day} {Date} {Month}"` e.g. "Face Yoga (Gua Sha, Cupping) — Mon 17 Mar"
- **Calendar description**: Session time with timezone, modalities list, link to join page.

## Architecture

### Google Workspace Package

#### Auth (`packages/google-workspace/src/auth.ts`)

Add Calendar scopes back alongside Meet scopes:

```
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/meetings.space.created
https://www.googleapis.com/auth/meetings.space.readonly
https://www.googleapis.com/auth/drive.meet.readonly
```

Add `getCalendarClient(config)` returning `google.calendar({ version: "v3", auth })`.

#### New `calendar.ts`

Three functions:

**`createMeetingWithAttendees(config, input)`**
- Input: `{ title, description, startTime, endTime, attendeeEmails: string[] }`
- Creates Calendar event via `calendar.events.insert` with `conferenceDataVersion: 1` and `createRequest` for Meet conference auto-generation
- Adds attendees from input
- Timezone: `Asia/Kolkata`
- Returns: `{ meetLink: hangoutLink, meetingId: conferenceId, calendarEventId: event.id, spaceName }` where `spaceName` is derived by querying `meet.spaces` or constructed from the meeting code

**`addAttendee(config, calendarEventId, email)`**
- Fetches current event via `calendar.events.get`
- Appends new attendee email to existing attendees list
- Patches event via `calendar.events.patch`
- Sets `sendUpdates: "none"` to avoid spamming Calendar invite emails (users get notified through the app's own notification system)

**`removeAttendee(config, calendarEventId, email)`**
- Fetches current event
- Filters out the email from attendees
- Patches event
- Sets `sendUpdates: "none"`

#### Updated `meet.ts`

Add one function:

**`setSpaceAccessType(config, spaceName, accessType)`**
- Calls `meet.spaces.patch` with `updateMask: "config.accessType"` and `requestBody: { config: { accessType } }`
- Used to set `TRUSTED` after meeting creation

Note: To get the `spaceName` from a Calendar-created meeting, use `meet.conferenceRecords.list` with filter `space.meeting_code = "{meetingCode}"` to find the space, or construct it. If the space lookup fails (conference hasn't started yet), store the meeting code and derive the space later when needed for recordings.

#### Updated `types.ts`

Add:

```ts
export interface MeetingWithAttendeesInput {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendeeEmails: string[];
}

export interface MeetingWithAttendeesResult {
  meetLink: string;
  meetingId: string;
  calendarEventId: string;
  spaceName?: string;  // May be null if space lookup fails before conference starts
}
```

#### Updated `index.ts`

Export new functions: `createMeetingWithAttendees`, `addAttendee`, `removeAttendee`, `setSpaceAccessType`.
Keep existing exports: `createMeetSpace`, `findRecording`.

### Database Migration

Add `spaceName` field to Session model:

```prisma
spaceName       String?       // Meet space resource name: spaces/{id}
```

Data migration for existing sessions:
- Sessions where `calendarEventId` starts with `spaces/` → copy value to `spaceName`, set `calendarEventId` to `null`
- These are leftovers from the earlier migration where `calendarEventId` was temporarily used to store space names

Add `@@index([spaceName])` to the Session model for efficient recording queries.

Going forward:
- `calendarEventId` = actual Google Calendar event ID (for attendee management)
- `spaceName` = Meet space resource name (for recording queries)
- `meetingId` = meeting code (for display and space lookup)

### Consumer Updates for `spaceName`

Update the two routes that currently read the space name from `calendarEventId` to use the new `spaceName` field instead:

**`apps/web/app/api/cron/fetch-recordings/route.ts`**:
- Query filter: `spaceName: { not: null }` instead of `calendarEventId: { not: null }`
- Use `session.spaceName` instead of `session.calendarEventId` when calling `findRecording()`

**`apps/web/app/api/admin/sessions/[id]/recording/route.ts`**:
- Use `session.spaceName` instead of `session.calendarEventId` when calling `findRecording()`
- Guard with `session.spaceName?.startsWith("spaces/")` instead of `session.calendarEventId`

### API Routes

#### New: `GET /api/admin/sessions/[id]/meet-preview`

Returns auto-generated meeting details for admin preview. No side effects.

Response:
```ts
{
  title: string;        // Auto-generated: "{Product} ({Modalities}) — {Day} {Date} {Month}"
  description: string;  // Auto-generated: time, modalities, join link
  attendees: string[];  // Emails from confirmed bookings
}
```

Authorization: ADMIN, OPS, or assigned COACH.

#### Updated: `POST /api/admin/sessions/[id]/generate-meet`

Now accepts optional request body for admin-edited values:

```ts
{
  title?: string;
  description?: string;
  attendees?: string[];
}
```

If body is provided, uses admin's values. If no body (cron call), generates defaults.

**Duplicate guard**: Check `session.joinUrl` — if already set, return error (session already has a Meet link). This replaces the previous `calendarEventId` check, since `calendarEventId` may be `null` after the data migration.

Flow:
1. Build title/description/attendees (from body or auto-generated defaults)
2. Call `createMeetingWithAttendees(config, { title, description, startTime, endTime, attendeeEmails })`
3. Store `joinUrl`, `calendarEventId`, `meetingId`, and `spaceName` (if resolved) on Session
4. Attempt to set space access type to `TRUSTED` — look up space via meeting code, call `setSpaceAccessType()`. If space lookup fails (no conference record yet), log and skip (access type defaults to org settings). Store `spaceName` if resolved.
5. Return `{ meetLink, calendarEventId }`

#### Booking attendee sync

**On booking creation** (wherever bookings are created/confirmed):
- If `session.calendarEventId` exists, call `addAttendee(config, calendarEventId, userEmail)`
- Fire-and-forget: catch and log errors, don't block the booking

**On booking cancellation**:
- If `session.calendarEventId` exists, call `removeAttendee(config, calendarEventId, userEmail)`
- Fire-and-forget: catch and log errors, don't block the cancellation

Find the booking creation and cancellation code paths and add the Calendar attendee sync there.

### New Cron: Auto-Generate Meet Links

**Endpoint**: `POST /api/cron/auto-generate-meet`

**Schedule**: Every minute (`* * * * *`) via QStash — same frequency as session-reminders.

**Logic**:
1. Find sessions where: `status = "SCHEDULED"`, `joinUrl = null`, `startsAt` is between now and 5 minutes from now
2. Skip any that already have a Meet link
3. For each session (max 5 per run):
   a. Fetch confirmed bookings for attendee emails
   b. Generate default title and description
   c. Call `createMeetingWithAttendees()` with attendees
   d. Attempt `setSpaceAccessType("TRUSTED")`
   e. Store results on Session
4. Log results

**QStash schedule addition**: Add to `tooling/scripts/src/setup-qstash-schedules.ts`.

### Admin UI: Preview/Edit Modal

**File**: `apps/web/app/admin/sessions/session-table.tsx`

Replace the current "Generate" button's direct POST behavior:

1. Admin clicks "Generate Meet Link"
2. Modal opens, shows loading spinner
3. Fetches `GET /api/admin/sessions/[id]/meet-preview`
4. Modal displays:
   - **Title**: editable text input, pre-filled with auto-generated title
   - **Description**: editable textarea, pre-filled with auto-generated description
   - **Attendees**: list of emails with checkboxes (all checked by default), plus an "Add email" input to add extra attendees
5. Admin reviews, edits if needed, clicks "Create Meeting"
6. POSTs to `generate-meet` with the edited values: `{ title, description, attendees }`
7. Modal shows success state with the Meet link
8. Table row updates with the new link

Uses existing component patterns and styling from the codebase (`void-card`, existing modal patterns, `Button` component from `@ru/ui`).

## GCP Console Setup

Update domain-wide delegation scopes for `meet-bot@mukhamudra.iam.gserviceaccount.com` to include:
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/meetings.space.created`
- `https://www.googleapis.com/auth/meetings.space.readonly`
- `https://www.googleapis.com/auth/drive.meet.readonly`

## Title and Description Generation

**Location**: `apps/web/src/lib/meet-helpers.ts` — shared between the preview endpoint and the auto-gen cron (both within the web app).

**`APP_URL`**: Use `process.env.NEXT_PUBLIC_APP_URL` (available in server-side Next.js code).

**Title helper**:

```ts
function generateMeetingTitle(productName: string, modalities: string[], startsAt: Date): string {
  const modsStr = modalities.length > 0 ? ` (${modalities.join(", ")})` : "";
  const dateStr = startsAt.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
  return `${productName}${modsStr} — ${dateStr}`;
}
```

**Description helper**:

```ts
function generateMeetingDescription(session, productName: string, modalities: string[]): string {
  const timeStr = session.startsAt.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  const endTimeStr = session.endsAt.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  const lines = [
    `${timeStr} – ${endTimeStr} IST`,
    modalities.length > 0 ? `Modalities: ${modalities.join(", ")}` : null,
    `Join via app: ${APP_URL}/app/join/${session.id}`,
  ].filter(Boolean);
  return lines.join("\n");
}
```

## Risk

- **Low risk for core flow**: Calendar API meeting creation is well-established, we used it before.
- **Attendee sync is fire-and-forget**: failures don't block bookings.
- **Auto-gen cron**: only triggers for sessions without links, max 5 per run, safe to run frequently.
- **Space access type**: best-effort — if the space can't be looked up yet (no conference record), falls back to default access settings. The `TRUSTED` setting is applied when possible.
- **Backward compatibility**: existing sessions with space names in `calendarEventId` are migrated to the new `spaceName` field.
