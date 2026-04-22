# Google Meet Integration Migration

## Summary

Migrate the `@ru/google-workspace` package from Calendar API + Drive-based recording search to the Google Meet REST API (`meet.googleapis.com/v2`). Improve auth by splitting the base64 service account key into separate env vars. Drop calendar event creation entirely — Meet spaces are created directly.

## Decisions

- **Auth**: Keep service account + domain-wide delegation (impersonating rutviq@mukhamudra.com). Split base64 key blob into `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`.
- **Meet links**: Switch from Calendar API (`calendar.events.insert` with conferenceData) to Meet REST API (`POST /v2/spaces`). No calendar events created.
- **Recordings**: Switch from Drive filename search to Meet REST API (`conferenceRecords.recordings.list`). Two-step: find conference record by space name, then list recordings.

## Architecture

### Auth (`packages/google-workspace/src/auth.ts`)

**Before:**
```ts
const keyJson = JSON.parse(Buffer.from(config.serviceAccountKeyBase64, "base64").toString("utf-8"));
const auth = new google.auth.JWT({ email: keyJson.client_email, key: keyJson.private_key, scopes, subject });
```

**After:**
```ts
const auth = new google.auth.JWT({
  email: config.serviceAccountEmail,
  key: config.privateKey,
  scopes: SCOPES,
  subject: config.impersonateEmail,
});
```

**New scopes:**
- `https://www.googleapis.com/auth/meetings.space.created`
- `https://www.googleapis.com/auth/meetings.space.readonly`
- `https://www.googleapis.com/auth/drive.meet.readonly`

**Old scopes removed:**
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/drive.readonly`

**Helper functions:**
- Delete `getCalendarClient()` and `getDriveClient()`
- Add `getMeetClient()` returning `google.meet({ version: "v2", auth })`
- `createAuthClient()` stays with updated scopes

### Types (`packages/google-workspace/src/types.ts`)

**Remove:**
- `GoogleWorkspaceConfig.serviceAccountKeyBase64`
- `GoogleWorkspaceConfig.calendarId`
- `MeetEventInput` (entire type)
- `MeetEventResult` (entire type)

**Add:**
```ts
export interface GoogleWorkspaceConfig {
  serviceAccountEmail: string;
  privateKey: string;
  impersonateEmail: string;
}

export interface MeetSpaceResult {
  meetLink: string;     // meetingUri from API
  meetingId: string;    // meetingCode from API
  spaceName: string;    // "spaces/{id}" — needed for recording queries
}

export interface RecordingResult {
  recordingUrl: string; // driveDestination.exportUri
  fileName: string;     // recording resource name
}
```

### Meet module (`packages/google-workspace/src/meet.ts`) — NEW

Replaces both `calendar.ts` and `drive.ts`. Uses the `googleapis` SDK (`google.meet({ version: "v2", auth })`) — not raw HTTP. No new dependencies needed; `googleapis@144.0.0` already includes `meet_v2`.

**`createMeetSpace(config)`**
- Calls `meet.spaces.create({ requestBody: {} })`
- Returns `{ meetLink: space.meetingUri, meetingId: space.meetingCode, spaceName: space.name }`
- No `summary` parameter — the Meet API's Space resource has no title concept. The calendar event title is no longer relevant.
- Scope: `meetings.space.created`

**`findRecording(config, spaceName)`**
- Step 1: `meet.conferenceRecords.list({ filter: 'space.name = "spaces/xyz"' })` → get conference record names. Uses canonical filter syntax with spaces around `=`. If multiple conference records exist for the space, uses the most recent (first in list, ordered by `startTime desc`). Returns `null` if empty.
- Step 2: `meet.conferenceRecords.recordings.list({ parent: conferenceRecordName })` → get recordings. Filters for `state === "FILE_GENERATED"` only (recordings still processing are skipped; cron will retry).
- Returns first ready recording as `{ recordingUrl: driveDestination.exportUri, fileName: recording.name }`, or `null` if none found.
- Scopes: `meetings.space.readonly` + `drive.meet.readonly`

### Files deleted

- `packages/google-workspace/src/calendar.ts`
- `packages/google-workspace/src/drive.ts`

### Files updated

- `packages/google-workspace/src/index.ts` — export from `meet.ts` instead of calendar/drive. Stop exporting auth internals (`createAuthClient`, `getCalendarClient`, `getDriveClient`) — consumers only use high-level functions.
- `packages/google-workspace/src/auth.ts` — new scopes, direct key fields, delete `getCalendarClient`/`getDriveClient`, add `getMeetClient`
- `packages/google-workspace/src/types.ts` — new types as above

## Environment Variables

### Remove
- `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64`
- `GOOGLE_CALENDAR_ID`

### Add
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — `meet-bot@mukhamudra.iam.gserviceaccount.com`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — the PEM private key string

### Keep
- `GOOGLE_IMPERSONATE_EMAIL` — `rutviq@mukhamudra.com`

### Private key newline handling

PEM keys contain `\n` characters. When stored as a Vercel env var, the newlines are typically escaped as literal `\\n`. The auth module must handle this:

```ts
const key = config.privateKey.replace(/\\n/g, "\n");
```

This replacement is applied in `createAuthClient()` before passing the key to `google.auth.JWT`.

### Config (`packages/config/src/env.ts`)
Update zod schema to reflect new env vars. Feature-flag by presence of `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`.

## Consumer Changes

### 3 files total:

**1. `apps/web/app/api/admin/sessions/[id]/generate-meet/route.ts`**
- `getGoogleConfig()` reads new env vars (returns new `GoogleWorkspaceConfig` shape)
- `createMeetEvent(config, { requestId, summary, ... })` → `createMeetSpace(config)`
- Store result: `joinUrl = meetLink`, `meetingId = meetingId`, `calendarEventId = spaceName`
- The `calendarEventId` field is reused to store `spaceName` (avoids DB migration)
- Update audit log: `calendarEventId` → `spaceName` in metadata
- Update JSON response: return `{ meetLink, spaceName }` instead of `{ meetLink, calendarEventId }`

**2. `apps/web/app/api/admin/sessions/[id]/recording/route.ts`**
- `getGoogleConfig()` reads new env vars
- `findRecording(config, meetingCode)` → `findRecording(config, spaceName)` where `spaceName = session.calendarEventId`
- Remove `extractMeetingId` import

**3. `apps/web/app/api/cron/fetch-recordings/route.ts`**
- `getGoogleConfig()` reads new env vars
- `findRecording(config, meetingCode)` → `findRecording(config, spaceName)` where `spaceName = session.calendarEventId`
- Query filter changes: `meetingId: { not: null }` → `calendarEventId: { not: null }` (calendarEventId now holds spaceName)
- Remove `extractMeetingId` import
- Note: old sessions with Calendar event IDs in `calendarEventId` will be picked up but `findRecording` will return `null` for them (invalid space name). This is a harmless no-op since old recordings are already cached in `recordingUrl`. The filter `recordingUrl: null` already prevents re-processing cached sessions.

## Database

No schema migration needed. We reuse the existing `calendarEventId` field on Session to store the Meet space name (`spaces/{id}`). The field name is slightly misleading but avoids a migration. Can be renamed in a future cleanup.

The `meetingId` field continues to store the meeting code for display/reference.

## GCP Console Setup Required

Before deploying, the service account `meet-bot@mukhamudra.iam.gserviceaccount.com` needs:

1. **Google Meet API enabled** in GCP project `mukhamudra`
2. **Domain-wide delegation** updated with new scopes:
   - `https://www.googleapis.com/auth/meetings.space.created`
   - `https://www.googleapis.com/auth/meetings.space.readonly`
   - `https://www.googleapis.com/auth/drive.meet.readonly`
3. Old Calendar/Drive scopes can be removed from delegation after migration is confirmed stable

## Vercel Environment

Update environment variables in Vercel dashboard:
- Remove: `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64`, `GOOGLE_CALENDAR_ID`
- Add: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (paste the PEM key with `\n` — the code handles escaped newlines)
- Preserve `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` value in a password manager until migration is confirmed stable

## Risk & Rollback

- **Low risk**: Only 3 consumer files, all server-side API routes/crons
- **Rollback**: Revert the commit and restore old env vars in Vercel. Sessions created during the migration window will have `calendarEventId` in `spaces/...` format, which the old code cannot use for recording lookup — but recordings would need to be manually fetched or those sessions would lack recording URLs.
- **Testing**: Generate a Meet link via admin UI, verify join URL works, run a test meeting and verify recording fetch
- **Backward compatibility**: Existing sessions with old `calendarEventId` values (Google Calendar event IDs) won't match the new `spaces/` format, so recording fetch for old sessions will return null. This is acceptable — old recordings are already cached in `recordingUrl`.
- **No new dependencies**: `googleapis@144.0.0` already includes `meet_v2` SDK support.
