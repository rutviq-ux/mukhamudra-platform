# Google Meet API Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the `@ru/google-workspace` package from Calendar API + Drive search to the Google Meet REST API for creating meeting spaces and fetching recordings.

**Architecture:** Replace `calendar.ts` and `drive.ts` with a single `meet.ts` module using the `googleapis` SDK's `meet_v2` client. Update auth to read service account credentials from separate env vars instead of a base64 blob. Update 3 consumer files to use the new functions.

**Tech Stack:** googleapis SDK (meet_v2), google-auth-library (JWT), Next.js API routes, Prisma, Vercel

**Spec:** `docs/superpowers/specs/2026-03-16-google-meet-migration-design.md`

---

## Chunk 1: Core Package Rewrite

### Task 1: Update types

**Files:**
- Modify: `packages/google-workspace/src/types.ts`

- [ ] **Step 1: Replace all types**

Replace the entire contents of `types.ts` with:

```ts
export interface GoogleWorkspaceConfig {
  serviceAccountEmail: string;
  privateKey: string;
  impersonateEmail: string;
}

export interface MeetSpaceResult {
  /** Full join URL: https://meet.google.com/abc-defg-hij */
  meetLink: string;
  /** Meeting code: abc-defg-hij */
  meetingId: string;
  /** Space resource name: spaces/{id} — needed for recording queries */
  spaceName: string;
}

export interface RecordingResult {
  /** Playable Drive link: https://drive.google.com/file/d/{id}/view */
  recordingUrl: string;
  /** Recording resource name */
  fileName: string;
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd packages/google-workspace && pnpm type-check`
Expected: May have errors in auth.ts/calendar.ts/drive.ts — that's expected, we'll fix those next.

- [ ] **Step 3: Commit**

```bash
git add packages/google-workspace/src/types.ts
git commit -m "refactor(google-workspace): update types for Meet REST API"
```

---

### Task 2: Rewrite auth module

**Files:**
- Modify: `packages/google-workspace/src/auth.ts`

- [ ] **Step 1: Replace auth.ts**

Replace the entire contents of `auth.ts` with:

```ts
import { google } from "googleapis";
import type { JWT } from "google-auth-library";
import type { meet_v2 } from "googleapis";
import type { GoogleWorkspaceConfig } from "./types";

const SCOPES = [
  "https://www.googleapis.com/auth/meetings.space.created",
  "https://www.googleapis.com/auth/meetings.space.readonly",
  "https://www.googleapis.com/auth/drive.meet.readonly",
];

/**
 * Create a Google JWT auth client with domain-wide delegation.
 * The service account impersonates the configured workspace user.
 */
export function createAuthClient(config: GoogleWorkspaceConfig): JWT {
  // Vercel env vars escape newlines as literal \\n — restore them
  const privateKey = config.privateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email: config.serviceAccountEmail,
    key: privateKey,
    scopes: SCOPES,
    subject: config.impersonateEmail,
  });

  return auth;
}

/**
 * Get an authenticated Google Meet API v2 client.
 */
export function getMeetClient(config: GoogleWorkspaceConfig): meet_v2.Meet {
  const auth = createAuthClient(config);
  return google.meet({ version: "v2", auth });
}
```

- [ ] **Step 2: Verify auth compiles**

Run: `cd packages/google-workspace && pnpm type-check`
Expected: Errors in calendar.ts and drive.ts (they import deleted functions). That's expected.

- [ ] **Step 3: Commit**

```bash
git add packages/google-workspace/src/auth.ts
git commit -m "refactor(google-workspace): rewrite auth for Meet API with separate env vars"
```

---

### Task 3: Create meet module

**Files:**
- Create: `packages/google-workspace/src/meet.ts`

- [ ] **Step 1: Create meet.ts**

Create `packages/google-workspace/src/meet.ts` with:

```ts
import { getMeetClient } from "./auth";
import type {
  GoogleWorkspaceConfig,
  MeetSpaceResult,
  RecordingResult,
} from "./types";

/**
 * Create a Google Meet space — a joinable meeting link.
 * No calendar event is created.
 */
export async function createMeetSpace(
  config: GoogleWorkspaceConfig,
): Promise<MeetSpaceResult> {
  const meet = getMeetClient(config);

  const response = await meet.spaces.create({
    requestBody: {},
  });

  const space = response.data;

  if (!space.meetingUri || !space.meetingCode || !space.name) {
    throw new Error(
      "Failed to create Meet space: missing meetingUri, meetingCode, or name",
    );
  }

  return {
    meetLink: space.meetingUri,
    meetingId: space.meetingCode,
    spaceName: space.name,
  };
}

/**
 * Find the most recent recording for a Meet space.
 *
 * Two-step process:
 * 1. Find conference records for the space
 * 2. List recordings from the most recent conference
 *
 * Returns null if no recording with state FILE_GENERATED is found.
 */
export async function findRecording(
  config: GoogleWorkspaceConfig,
  spaceName: string,
): Promise<RecordingResult | null> {
  const meet = getMeetClient(config);

  // Step 1: Find conference records for this space
  const conferenceResponse = await meet.conferenceRecords.list({
    filter: `space.name = "${spaceName}"`,
  });

  const records = conferenceResponse.data.conferenceRecords;
  if (!records || records.length === 0) {
    return null;
  }

  // Use the most recent conference record (first in list)
  const conferenceRecordName = records[0]!.name;
  if (!conferenceRecordName) {
    return null;
  }

  // Step 2: List recordings from this conference
  const recordingsResponse = await meet.conferenceRecords.recordings.list({
    parent: conferenceRecordName,
  });

  const recordings = recordingsResponse.data.recordings;
  if (!recordings || recordings.length === 0) {
    return null;
  }

  // Find the first recording that has finished processing
  const readyRecording = recordings.find((r) => r.state === "FILE_GENERATED");
  if (!readyRecording) {
    return null;
  }

  const exportUri = readyRecording.driveDestination?.exportUri;
  if (!exportUri) {
    return null;
  }

  return {
    recordingUrl: exportUri,
    fileName: readyRecording.name || "recording",
  };
}
```

- [ ] **Step 2: Verify meet.ts compiles**

Run: `cd packages/google-workspace && pnpm type-check`
Expected: Still errors in calendar.ts/drive.ts — will be deleted next.

- [ ] **Step 3: Commit**

```bash
git add packages/google-workspace/src/meet.ts
git commit -m "feat(google-workspace): add Meet REST API module for spaces and recordings"
```

---

### Task 4: Delete old modules and update exports

**Files:**
- Delete: `packages/google-workspace/src/calendar.ts`
- Delete: `packages/google-workspace/src/drive.ts`
- Modify: `packages/google-workspace/src/index.ts`

- [ ] **Step 1: Delete calendar.ts and drive.ts**

```bash
rm packages/google-workspace/src/calendar.ts
rm packages/google-workspace/src/drive.ts
```

- [ ] **Step 2: Replace index.ts**

Replace the entire contents of `index.ts` with:

```ts
export type { GoogleWorkspaceConfig, MeetSpaceResult, RecordingResult } from "./types";
export { createMeetSpace, findRecording } from "./meet";
```

Only export what consumers actually need — no auth internals.

- [ ] **Step 3: Verify package compiles cleanly**

Run: `cd packages/google-workspace && pnpm type-check`
Expected: PASS — no errors. Calendar/drive references are gone.

- [ ] **Step 4: Commit**

```bash
git add -A packages/google-workspace/
git commit -m "refactor(google-workspace): delete calendar.ts and drive.ts, update exports"
```

---

## Chunk 2: Config and Consumer Updates

### Task 5: Update env config

**Files:**
- Modify: `packages/config/src/env.ts`

- [ ] **Step 1: Update zod schema**

In `packages/config/src/env.ts`, find the three Google Workspace env vars and replace them all at once. Find:

```ts
GOOGLE_SERVICE_ACCOUNT_KEY_BASE64: z.string().min(1).optional(),
GOOGLE_IMPERSONATE_EMAIL: z.string().email().optional(),
GOOGLE_CALENDAR_ID: z.string().default("primary"),
```

Replace with (note: `GOOGLE_IMPERSONATE_EMAIL` is kept, `GOOGLE_CALENDAR_ID` is removed):

```ts
GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().min(1).optional(),
GOOGLE_IMPERSONATE_EMAIL: z.string().email().optional(),
```

- [ ] **Step 2: Verify config compiles**

Run: `cd packages/config && pnpm type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/config/src/env.ts
git commit -m "refactor(config): update env vars for Meet API migration"
```

---

### Task 6: Update generate-meet route

**Files:**
- Modify: `apps/web/app/api/admin/sessions/[id]/generate-meet/route.ts`

- [ ] **Step 1: Update imports and getGoogleConfig**

Replace the imports and `getGoogleConfig` function. Change:

```ts
import { createMeetEvent, type GoogleWorkspaceConfig } from "@ru/google-workspace";
```

to:

```ts
import { createMeetSpace, type GoogleWorkspaceConfig } from "@ru/google-workspace";
```

Replace `getGoogleConfig()`:

```ts
function getGoogleConfig(): GoogleWorkspaceConfig | null {
  const env = getServerEnv();
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || !env.GOOGLE_IMPERSONATE_EMAIL) {
    return null;
  }
  return {
    serviceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    impersonateEmail: env.GOOGLE_IMPERSONATE_EMAIL,
  };
}
```

- [ ] **Step 2: Update the Meet link creation call**

Replace the `createMeetEvent` call and DB update. Find:

```ts
const meetResult = await createMeetEvent(googleConfig, {
  requestId: session.id,
  summary: session.title || `${session.product.name} Session`,
  description: `${session.product.name} session`,
  startTime: session.startsAt,
  endTime: session.endsAt,
});

const updated = await prisma.session.update({
  where: { id },
  data: {
    joinUrl: meetResult.meetLink,
    calendarEventId: meetResult.calendarEventId,
    meetingId: meetResult.meetingId,
  },
});
```

Replace with (note: `const updated =` is removed — the variable was unused):

```ts
const meetResult = await createMeetSpace(googleConfig);

await prisma.session.update({
  where: { id },
  data: {
    joinUrl: meetResult.meetLink,
    calendarEventId: meetResult.spaceName,
    meetingId: meetResult.meetingId,
  },
});
```

- [ ] **Step 3: Update audit log and response**

Find the audit log metadata and response. Replace:

```ts
metadata: {
  meetLink: meetResult.meetLink,
  calendarEventId: meetResult.calendarEventId,
},
```

with:

```ts
metadata: {
  meetLink: meetResult.meetLink,
  spaceName: meetResult.spaceName,
},
```

Replace the response:

```ts
return NextResponse.json({
  meetLink: meetResult.meetLink,
  calendarEventId: meetResult.calendarEventId,
});
```

with:

```ts
return NextResponse.json({
  meetLink: meetResult.meetLink,
  spaceName: meetResult.spaceName,
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/admin/sessions/[id]/generate-meet/route.ts
git commit -m "refactor(api): update generate-meet route to use Meet REST API"
```

---

### Task 7: Update recording route

**Files:**
- Modify: `apps/web/app/api/admin/sessions/[id]/recording/route.ts`

- [ ] **Step 1: Update imports and getGoogleConfig**

Replace imports. Change:

```ts
import {
  findRecording,
  extractMeetingId,
  type GoogleWorkspaceConfig,
} from "@ru/google-workspace";
```

to:

```ts
import {
  findRecording,
  type GoogleWorkspaceConfig,
} from "@ru/google-workspace";
```

Replace `getGoogleConfig()` with the same new version as Task 6 Step 1 (reads `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` + `GOOGLE_IMPERSONATE_EMAIL`).

- [ ] **Step 2: Update recording lookup logic**

Find the section that extracts meeting code and calls findRecording:

```ts
const meetingCode =
  session.meetingId || extractMeetingId(session.joinUrl || "");

if (!meetingCode) {
  return NextResponse.json(
    { error: "No meeting ID available to search for recordings" },
    { status: 404 },
  );
}
```

Replace with:

```ts
const spaceName = session.calendarEventId;

if (!spaceName || !spaceName.startsWith("spaces/")) {
  return NextResponse.json(
    { error: "No Meet space available to search for recordings" },
    { status: 404 },
  );
}
```

Then update the `findRecording` call from `findRecording(googleConfig, meetingCode)` to `findRecording(googleConfig, spaceName)`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/admin/sessions/[id]/recording/route.ts
git commit -m "refactor(api): update recording route to use Meet recordings API"
```

---

### Task 8: Update fetch-recordings cron

**Files:**
- Modify: `apps/web/app/api/cron/fetch-recordings/route.ts`

- [ ] **Step 1: Update imports and getGoogleConfig**

Replace imports. Change:

```ts
import {
  findRecording,
  extractMeetingId,
  type GoogleWorkspaceConfig,
} from "@ru/google-workspace";
```

to:

```ts
import {
  findRecording,
  type GoogleWorkspaceConfig,
} from "@ru/google-workspace";
```

Replace `getGoogleConfig()` with the same new version (reads `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` + `GOOGLE_IMPERSONATE_EMAIL`).

- [ ] **Step 2: Update Prisma query filter**

Find:

```ts
const sessions = await prisma.session.findMany({
  where: {
    status: "COMPLETED",
    recordingUrl: null,
    meetingId: { not: null },
    endsAt: { lt: oneHourAgo },
  },
```

Replace `meetingId: { not: null }` with `calendarEventId: { not: null }`:

```ts
const sessions = await prisma.session.findMany({
  where: {
    status: "COMPLETED",
    recordingUrl: null,
    calendarEventId: { not: null },
    endsAt: { lt: oneHourAgo },
  },
```

- [ ] **Step 3: Update recording lookup in the loop**

Find:

```ts
const meetingCode =
  session.meetingId || extractMeetingId(session.joinUrl || "");

if (!meetingCode) continue;

const recording = await findRecording(googleConfig, meetingCode);
```

Replace with:

```ts
const spaceName = session.calendarEventId;

if (!spaceName || !spaceName.startsWith("spaces/")) continue;

const recording = await findRecording(googleConfig, spaceName);
```

The `startsWith("spaces/")` check skips old sessions that have Calendar event IDs in `calendarEventId`.

Leave the `if (recording) { ... }` block and the `notifyRecordingAccessUsers` call unchanged — they don't need any modification.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/cron/fetch-recordings/route.ts
git commit -m "refactor(cron): update fetch-recordings to use Meet recordings API"
```

---

## Chunk 3: Verify and Deploy

### Task 9: Full type check

- [ ] **Step 1: Run type check across the monorepo**

```bash
pnpm type-check
```

Or if that's not a root script, run separately:

```bash
pnpm --filter @ru/google-workspace type-check
pnpm --filter @ru/web type-check
```

Expected: PASS — no type errors.

- [ ] **Step 2: Run build**

```bash
pnpm --filter @ru/web build
```

Expected: PASS — the app builds successfully.

- [ ] **Step 3: Commit any fixes if needed, then push**

```bash
git push
```

---

### Task 10: GCP Console and Vercel setup (manual)

These steps are performed manually in the browser, not in code.

- [ ] **Step 1: Enable Google Meet API**

Go to GCP Console → APIs & Services → Enable APIs → search "Google Meet API" → Enable it for project `mukhamudra`.

- [ ] **Step 2: Update domain-wide delegation scopes**

Go to Google Workspace Admin → Security → API Controls → Domain-wide Delegation → find `meet-bot@mukhamudra.iam.gserviceaccount.com` → update scopes to:
- `https://www.googleapis.com/auth/meetings.space.created`
- `https://www.googleapis.com/auth/meetings.space.readonly`
- `https://www.googleapis.com/auth/drive.meet.readonly`

- [ ] **Step 3: Update Vercel environment variables**

In Vercel dashboard → Project Settings → Environment Variables:
- Add `GOOGLE_SERVICE_ACCOUNT_EMAIL` = `meet-bot@mukhamudra.iam.gserviceaccount.com`
- Add `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` = paste the PEM private key from `secrets/my-key.json`
- Keep `GOOGLE_IMPERSONATE_EMAIL` = `rutviq@mukhamudra.com`
- After confirming the migration works, remove `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` and `GOOGLE_CALENDAR_ID`

- [ ] **Step 4: Deploy and test**

Trigger a deployment. Then:
1. Generate a Meet link via the admin sessions UI → verify a valid `meet.google.com` URL is returned
2. Open the link in a browser → verify it loads the Meet waiting room
3. (Later) After a real session: verify the fetch-recordings cron finds the recording
