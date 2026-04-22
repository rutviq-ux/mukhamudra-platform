# Meet Invitations, Auto-Generation & Admin Preview — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring back Calendar API for meeting creation with attendees (invitations), auto-generate Meet links 5 min before sessions, and give admins a preview/edit modal before generating.

**Architecture:** Calendar API creates events with `conferenceDataVersion: 1` to auto-generate Meet conferences + attach attendees. Meet REST API continues for recordings and space access control. A new cron auto-generates links for sessions approaching their start time. Booking create/cancel fire-and-forget syncs attendees on the Calendar event.

**Tech Stack:** `googleapis` v144 (Calendar v3 + Meet v2), Prisma, Next.js API routes, QStash crons, Radix Dialog (`@ru/ui`).

**Spec:** `docs/superpowers/specs/2026-03-16-meet-invitations-and-auto-gen-design.md`

**Prerequisite (manual):** Before deploying, update domain-wide delegation scopes for `meet-bot@mukhamudra.iam.gserviceaccount.com` in GCP Console to include Calendar scopes (`calendar`, `calendar.events`) alongside existing Meet scopes.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `packages/google-workspace/src/auth.ts` | Add Calendar scopes + `getCalendarClient()` |
| Modify | `packages/google-workspace/src/types.ts` | Add `MeetingWithAttendeesInput`, `MeetingWithAttendeesResult` |
| Create | `packages/google-workspace/src/calendar.ts` | `createMeetingWithAttendees`, `addAttendee`, `removeAttendee` |
| Modify | `packages/google-workspace/src/meet.ts` | Add `setSpaceAccessType()` |
| Modify | `packages/google-workspace/src/index.ts` | Export new functions |
| Modify | `packages/db/prisma/schema.prisma` | Add `spaceName` field + index to Session |
| Create | `apps/web/src/lib/meet-helpers.ts` | `generateMeetingTitle()`, `generateMeetingDescription()` |
| Create | `apps/web/src/lib/google-config.ts` | Shared `getGoogleConfig()` (DRY — currently duplicated in 3 files) |
| Modify | `apps/web/app/api/admin/sessions/[id]/generate-meet/route.ts` | Use Calendar API, accept body, duplicate guard on `joinUrl` |
| Create | `apps/web/app/api/admin/sessions/[id]/meet-preview/route.ts` | Preview endpoint (no side effects) |
| Modify | `apps/web/app/api/admin/sessions/[id]/recording/route.ts` | Read from `spaceName` field |
| Modify | `apps/web/app/api/cron/fetch-recordings/route.ts` | Read from `spaceName` field |
| Create | `apps/web/app/api/cron/auto-generate-meet/route.ts` | Auto-gen cron |
| Modify | `apps/web/app/api/bookings/route.ts` | Attendee sync on create/cancel |
| Modify | `apps/web/app/admin/sessions/session-table.tsx` | Preview/edit modal for Generate button |
| Modify | `tooling/scripts/src/setup-qstash-schedules.ts` | Add auto-generate-meet schedule |

---

## Chunk 1: Google Workspace Package & Database

### Task 1: Add Calendar types to google-workspace

**Files:**
- Modify: `packages/google-workspace/src/types.ts`

- [ ] **Step 1: Add new interfaces**

Add after the existing `RecordingResult` interface:

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
  spaceName?: string;
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @ru/google-workspace exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/google-workspace/src/types.ts
git commit -m "feat(google-workspace): add Calendar meeting types"
```

---

### Task 2: Add Calendar scopes and client to auth

**Files:**
- Modify: `packages/google-workspace/src/auth.ts`

- [ ] **Step 1: Add Calendar scopes and `getCalendarClient`**

Replace the `SCOPES` array (line 6-10) to include Calendar scopes:

```ts
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/meetings.space.created",
  "https://www.googleapis.com/auth/meetings.space.readonly",
  "https://www.googleapis.com/auth/drive.meet.readonly",
];
```

Add a new import for `calendar_v3` at the top alongside `meet_v2`:

```ts
import type { calendar_v3, meet_v2 } from "googleapis";
```

Add after the `getMeetClient` function:

```ts
/**
 * Get an authenticated Google Calendar API v3 client.
 */
export function getCalendarClient(config: GoogleWorkspaceConfig): calendar_v3.Calendar {
  const auth = createAuthClient(config);
  return google.calendar({ version: "v3", auth });
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @ru/google-workspace exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/google-workspace/src/auth.ts
git commit -m "feat(google-workspace): add Calendar scopes and client"
```

---

### Task 3: Create calendar.ts with meeting + attendee functions

**Files:**
- Create: `packages/google-workspace/src/calendar.ts`

- [ ] **Step 1: Create calendar.ts**

```ts
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
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @ru/google-workspace exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/google-workspace/src/calendar.ts
git commit -m "feat(google-workspace): add Calendar meeting creation and attendee management"
```

---

### Task 4: Add `setSpaceAccessType` to meet.ts

**Files:**
- Modify: `packages/google-workspace/src/meet.ts`

- [ ] **Step 1: Add the function after `findRecording`**

Add at the end of the file (after line 92):

```ts
/**
 * Set the access type on a Meet space.
 * Use "TRUSTED" to allow org members and invited external users to join without knocking.
 */
export async function setSpaceAccessType(
  config: GoogleWorkspaceConfig,
  spaceName: string,
  accessType: "OPEN" | "TRUSTED" | "RESTRICTED",
): Promise<void> {
  const meet = getMeetClient(config);

  await meet.spaces.patch({
    name: spaceName,
    updateMask: "config.accessType",
    requestBody: {
      config: { accessType },
    },
  });
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @ru/google-workspace exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/google-workspace/src/meet.ts
git commit -m "feat(google-workspace): add setSpaceAccessType for Meet spaces"
```

---

### Task 5: Update package exports

**Files:**
- Modify: `packages/google-workspace/src/index.ts`

- [ ] **Step 1: Update exports**

Replace the full content of `index.ts`:

```ts
export type {
  GoogleWorkspaceConfig,
  MeetSpaceResult,
  RecordingResult,
  MeetingWithAttendeesInput,
  MeetingWithAttendeesResult,
} from "./types";
export { createMeetSpace, findRecording, setSpaceAccessType } from "./meet";
export {
  createMeetingWithAttendees,
  addAttendee,
  removeAttendee,
} from "./calendar";
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @ru/google-workspace exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/google-workspace/src/index.ts
git commit -m "feat(google-workspace): export calendar and access type functions"
```

---

### Task 6: Database migration — add `spaceName` field

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add `spaceName` field to Session model**

In the Session model (around line 252, after `meetingId`), add:

```prisma
  spaceName       String?       // Meet space resource name: spaces/{id} (for recording queries)
```

Add an index at the bottom of the model (after the `@@index([calendarEventId])` line):

```prisma
  @@index([spaceName])
```

- [ ] **Step 2: Generate Prisma migration (without applying)**

Run: `pnpm --filter @ru/db exec prisma migrate dev --create-only --name add-session-space-name`
Expected: Migration file created but NOT applied

- [ ] **Step 3: Add data migration SQL**

Find the latest migration file in `packages/db/prisma/migrations/` (the one just created). Append this SQL to the end of the migration file:

```sql
-- Data migration: move space names from calendarEventId to spaceName
UPDATE "Session"
SET "spaceName" = "calendarEventId",
    "calendarEventId" = NULL
WHERE "calendarEventId" LIKE 'spaces/%';
```

- [ ] **Step 4: Apply migration**

Run: `pnpm --filter @ru/db exec prisma migrate dev`
Expected: Migration applied (both schema change and data migration)

- [ ] **Step 5: Regenerate Prisma client**

Run: `pnpm --filter @ru/db exec prisma generate`
Expected: Client generated

- [ ] **Step 6: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/
git commit -m "feat(db): add spaceName field to Session with data migration"
```

---

## Chunk 2: Shared Helpers & API Routes

### Task 7: Create shared `getGoogleConfig` helper (DRY)

Currently `getGoogleConfig()` is duplicated in 3 files. Extract to a shared module.

**Files:**
- Create: `apps/web/src/lib/google-config.ts`
- Modify: `apps/web/app/api/admin/sessions/[id]/generate-meet/route.ts` (remove local `getGoogleConfig`)
- Modify: `apps/web/app/api/admin/sessions/[id]/recording/route.ts` (remove local `getGoogleConfig`)
- Modify: `apps/web/app/api/cron/fetch-recordings/route.ts` (remove local `getGoogleConfig`)

- [ ] **Step 1: Create the shared helper**

Create `apps/web/src/lib/google-config.ts`:

```ts
import { getServerEnv } from "@ru/config";
import type { GoogleWorkspaceConfig } from "@ru/google-workspace";

export function getGoogleConfig(): GoogleWorkspaceConfig | null {
  const env = getServerEnv();
  if (
    !env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    !env.GOOGLE_IMPERSONATE_EMAIL
  ) {
    return null;
  }
  return {
    serviceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    impersonateEmail: env.GOOGLE_IMPERSONATE_EMAIL,
  };
}
```

- [ ] **Step 2: Update generate-meet route**

In `apps/web/app/api/admin/sessions/[id]/generate-meet/route.ts`:

Remove the local `getGoogleConfig` function (lines 10-20) and the `getServerEnv` import from `@ru/config`.

Add import:
```ts
import { getGoogleConfig } from "@/lib/google-config";
```

Remove `type GoogleWorkspaceConfig` from the `@ru/google-workspace` import (line 6) — it's no longer needed directly.

- [ ] **Step 3: Update recording route**

In `apps/web/app/api/admin/sessions/[id]/recording/route.ts`:

Remove the local `getGoogleConfig` function (lines 12-22) and the `getServerEnv` import from `@ru/config`.

Add import:
```ts
import { getGoogleConfig } from "@/lib/google-config";
```

Remove `type GoogleWorkspaceConfig` from the `@ru/google-workspace` import.

- [ ] **Step 4: Update fetch-recordings cron**

In `apps/web/app/api/cron/fetch-recordings/route.ts`:

Remove the local `getGoogleConfig` function (lines 13-23) and the `getServerEnv` import from `@ru/config`.

Add import:
```ts
import { getGoogleConfig } from "@/lib/google-config";
```

Remove `type GoogleWorkspaceConfig` from the `@ru/google-workspace` import.

- [ ] **Step 5: Verify build**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/google-config.ts apps/web/app/api/admin/sessions/\[id\]/generate-meet/route.ts apps/web/app/api/admin/sessions/\[id\]/recording/route.ts apps/web/app/api/cron/fetch-recordings/route.ts
git commit -m "refactor: extract shared getGoogleConfig helper (DRY)"
```

---

### Task 8: Create meet-helpers.ts (title & description generators)

**Files:**
- Create: `apps/web/src/lib/meet-helpers.ts`

- [ ] **Step 1: Create the helpers file**

```ts
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Generate a meeting title in format: "Product (Modalities) — Day Date Month"
 * e.g., "Face Yoga (Gua Sha, Cupping) — Mon 17 Mar"
 */
export function generateMeetingTitle(
  productName: string,
  modalities: string[],
  startsAt: Date,
): string {
  const modsStr = modalities.length > 0 ? ` (${modalities.join(", ")})` : "";
  const dateStr = startsAt.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
  return `${productName}${modsStr} — ${dateStr}`;
}

/**
 * Generate a meeting description with time, modalities, and join link.
 */
export function generateMeetingDescription(
  session: { id: string; startsAt: Date; endsAt: Date },
  productName: string,
  modalities: string[],
): string {
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

- [ ] **Step 2: Verify build**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/meet-helpers.ts
git commit -m "feat: add meeting title and description generation helpers"
```

---

### Task 9: Update recording routes to use `spaceName` field

**Files:**
- Modify: `apps/web/app/api/admin/sessions/[id]/recording/route.ts`
- Modify: `apps/web/app/api/cron/fetch-recordings/route.ts`

- [ ] **Step 1: Update admin recording route**

In `apps/web/app/api/admin/sessions/[id]/recording/route.ts`, change the space name lookup (lines 55-63):

Replace:
```ts
    const spaceName = session.calendarEventId;

    if (!spaceName || !spaceName.startsWith("spaces/")) {
```

With:
```ts
    const spaceName = session.spaceName;

    if (!spaceName || !spaceName.startsWith("spaces/")) {
```

- [ ] **Step 2: Update fetch-recordings cron**

In `apps/web/app/api/cron/fetch-recordings/route.ts`, change the query filter (line 42):

Replace:
```ts
        calendarEventId: { not: null },
```

With:
```ts
        spaceName: { not: null },
```

Change the space name lookup (line 57):

Replace:
```ts
        const spaceName = session.calendarEventId;
```

With:
```ts
        const spaceName = session.spaceName;
```

- [ ] **Step 3: Verify build**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/admin/sessions/\[id\]/recording/route.ts apps/web/app/api/cron/fetch-recordings/route.ts
git commit -m "refactor: use spaceName field for recording lookup instead of calendarEventId"
```

---

### Task 10: Rewrite generate-meet route with Calendar API

**Files:**
- Modify: `apps/web/app/api/admin/sessions/[id]/generate-meet/route.ts`

- [ ] **Step 1: Rewrite the route**

Replace the full content of `apps/web/app/api/admin/sessions/[id]/generate-meet/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { getCurrentUser } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit-log";
import { getGoogleConfig } from "@/lib/google-config";
import {
  createMeetingWithAttendees,
  setSpaceAccessType,
} from "@ru/google-workspace";
import {
  generateMeetingTitle,
  generateMeetingDescription,
} from "@/lib/meet-helpers";

const log = createLogger("api:admin:sessions:generate-meet");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isStaff = user.role === "ADMIN" || user.role === "OPS";
    const { id } = await params;

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        product: { select: { name: true } },
        bookings: {
          where: { status: "CONFIRMED" },
          select: { user: { select: { email: true } } },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Coach can only generate for their own sessions
    if (!isStaff) {
      if (user.role !== "COACH" || session.coachId !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Duplicate guard: check joinUrl instead of calendarEventId
    if (session.joinUrl) {
      return NextResponse.json(
        { error: "Session already has a Meet link", meetLink: session.joinUrl },
        { status: 409 },
      );
    }

    const googleConfig = getGoogleConfig();
    if (!googleConfig) {
      return NextResponse.json(
        { error: "Google Workspace not configured" },
        { status: 501 },
      );
    }

    // Accept optional admin-edited values from request body
    let body: { title?: string; description?: string; attendees?: string[] } = {};
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch {
      // No body or invalid JSON — use defaults
    }

    // Build title, description, attendees
    const title = body.title || generateMeetingTitle(
      session.product.name,
      session.modalities,
      session.startsAt,
    );
    const description = body.description || generateMeetingDescription(
      session,
      session.product.name,
      session.modalities,
    );
    const attendeeEmails = body.attendees || session.bookings.map((b) => b.user.email);

    const meetResult = await createMeetingWithAttendees(googleConfig, {
      title,
      description,
      startTime: session.startsAt,
      endTime: session.endsAt,
      attendeeEmails,
    });

    // Store results on session
    await prisma.session.update({
      where: { id },
      data: {
        joinUrl: meetResult.meetLink,
        calendarEventId: meetResult.calendarEventId,
        meetingId: meetResult.meetingId,
        spaceName: meetResult.spaceName || null,
      },
    });

    // Best-effort: set space access type to TRUSTED
    // Space may not be available yet if conference hasn't started
    if (meetResult.spaceName) {
      setSpaceAccessType(googleConfig, meetResult.spaceName, "TRUSTED").catch(
        (err) => log.warn({ err }, "Could not set space access type to TRUSTED"),
      );
    }

    await logAdminAction({
      actor: user,
      action: "session.generate_meet",
      targetType: "Session",
      targetId: id,
      metadata: {
        meetLink: meetResult.meetLink,
        calendarEventId: meetResult.calendarEventId,
      },
      request,
    });

    return NextResponse.json({
      meetLink: meetResult.meetLink,
      calendarEventId: meetResult.calendarEventId,
    });
  } catch (error) {
    log.error({ err: error }, "Failed to generate Meet link");
    return NextResponse.json(
      { error: "Failed to generate Meet link" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/admin/sessions/\[id\]/generate-meet/route.ts
git commit -m "feat: rewrite generate-meet to use Calendar API with attendees"
```

---

### Task 11: Create meet-preview endpoint

**Files:**
- Create: `apps/web/app/api/admin/sessions/[id]/meet-preview/route.ts`

- [ ] **Step 1: Create the preview route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { getCurrentUser } from "@/lib/auth";
import {
  generateMeetingTitle,
  generateMeetingDescription,
} from "@/lib/meet-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isStaff = user.role === "ADMIN" || user.role === "OPS";
    const { id } = await params;

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        product: { select: { name: true } },
        bookings: {
          where: { status: "CONFIRMED" },
          select: { user: { select: { email: true } } },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Coach can only preview their own sessions
    if (!isStaff) {
      if (user.role !== "COACH" || session.coachId !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
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

    return NextResponse.json({ title, description, attendees });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/admin/sessions/\[id\]/meet-preview/route.ts
git commit -m "feat: add meet-preview endpoint for admin preview modal"
```

---

### Task 12: Create auto-generate-meet cron

**Files:**
- Create: `apps/web/app/api/cron/auto-generate-meet/route.ts`

- [ ] **Step 1: Create the cron route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ru/db";
import { createLogger } from "@ru/config";
import { withCronAuth } from "@/lib/cron-auth";
import { getGoogleConfig } from "@/lib/google-config";
import {
  createMeetingWithAttendees,
  setSpaceAccessType,
} from "@ru/google-workspace";
import {
  generateMeetingTitle,
  generateMeetingDescription,
} from "@/lib/meet-helpers";

const log = createLogger("cron:auto-generate-meet");

async function handler(request: NextRequest) {
  try {
    const googleConfig = getGoogleConfig();
    if (!googleConfig) {
      return NextResponse.json({
        status: "skipped",
        reason: "Google Workspace not configured",
      });
    }

    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Find sessions starting within 5 minutes that don't have a Meet link
    const sessions = await prisma.session.findMany({
      where: {
        status: "SCHEDULED",
        joinUrl: null,
        startsAt: { gt: now, lte: fiveMinutesFromNow },
      },
      include: {
        product: { select: { name: true } },
        bookings: {
          where: { status: "CONFIRMED" },
          select: { user: { select: { email: true } } },
        },
      },
      take: 5,
      orderBy: { startsAt: "asc" },
    });

    if (sessions.length === 0) {
      return NextResponse.json({ status: "ok", generated: 0 });
    }

    let generated = 0;

    for (const session of sessions) {
      try {
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
        const attendeeEmails = session.bookings.map((b) => b.user.email);

        const meetResult = await createMeetingWithAttendees(googleConfig, {
          title,
          description,
          startTime: session.startsAt,
          endTime: session.endsAt,
          attendeeEmails,
        });

        await prisma.session.update({
          where: { id: session.id },
          data: {
            joinUrl: meetResult.meetLink,
            calendarEventId: meetResult.calendarEventId,
            meetingId: meetResult.meetingId,
            spaceName: meetResult.spaceName || null,
          },
        });

        // Best-effort TRUSTED access
        if (meetResult.spaceName) {
          setSpaceAccessType(googleConfig, meetResult.spaceName, "TRUSTED").catch(
            (err) => log.warn({ err, sessionId: session.id }, "Could not set TRUSTED access"),
          );
        }

        generated++;
        log.info({ sessionId: session.id }, "Auto-generated Meet link");
      } catch (error) {
        log.error(
          { err: error, sessionId: session.id },
          "Failed to auto-generate Meet link for session",
        );
      }
    }

    log.info({ generated, total: sessions.length }, "Auto-generate batch complete");
    return NextResponse.json({ status: "ok", generated, total: sessions.length });
  } catch (error) {
    log.error({ err: error }, "Auto-generate Meet cron failed");
    return NextResponse.json(
      { error: "Auto-generate Meet cron failed" },
      { status: 500 },
    );
  }
}

export const POST = withCronAuth(handler);
```

- [ ] **Step 2: Add to QStash schedules**

In `tooling/scripts/src/setup-qstash-schedules.ts`, add to the `SCHEDULES` array (after the `sync-payments` entry, before the closing `]`):

```ts
  {
    path: "/api/cron/auto-generate-meet",
    cron: "* * * * *", // Every minute
    comment: "Auto-generate Meet links for sessions starting within 5 minutes",
  },
```

- [ ] **Step 3: Verify build**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/cron/auto-generate-meet/route.ts tooling/scripts/src/setup-qstash-schedules.ts
git commit -m "feat: add auto-generate-meet cron (runs every minute, 5-min window)"
```

---

## Chunk 3: Booking Sync & Admin UI

### Task 13: Add attendee sync to bookings route

**Files:**
- Modify: `apps/web/app/api/bookings/route.ts`

- [ ] **Step 1: Add imports**

At the top of `apps/web/app/api/bookings/route.ts`, add:

```ts
import { getGoogleConfig } from "@/lib/google-config";
import { addAttendee, removeAttendee } from "@ru/google-workspace";
```

- [ ] **Step 2: Add attendee sync after booking creation**

In the POST handler, after the `notifyBookingConfirmed(...)` block (after line 182), add:

```ts
    // Fire-and-forget: sync attendee to Calendar event
    if (session.calendarEventId) {
      const googleConfig = getGoogleConfig();
      if (googleConfig) {
        addAttendee(googleConfig, session.calendarEventId, user.email).catch(
          (err) => log.error({ err }, "Failed to add Calendar attendee"),
        );
      }
    }
```

Note: The `session` query (line 104) already includes the needed fields. We need to check that `calendarEventId` is available. Looking at the existing query, it fetches the session with `product` and `bookings`. The `calendarEventId` field is part of the Session model, so it's already included in `session`.

- [ ] **Step 3: Add attendee removal on booking cancellation**

In the DELETE handler, after the `prisma.booking.update` call (after line 234), add:

```ts
    // Fire-and-forget: remove attendee from Calendar event
    if (booking.session.calendarEventId) {
      const googleConfig = getGoogleConfig();
      if (googleConfig) {
        removeAttendee(googleConfig, booking.session.calendarEventId, user.email).catch(
          (err) => log.error({ err }, "Failed to remove Calendar attendee"),
        );
      }
    }
```

Note: The `booking` query (line 213) already includes `session: { include: { product: true } }`, so `booking.session.calendarEventId` is available.

- [ ] **Step 4: Verify build**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/bookings/route.ts
git commit -m "feat: sync Calendar attendees on booking create/cancel (fire-and-forget)"
```

---

### Task 14: Add preview/edit modal to session table

**Files:**
- Modify: `apps/web/app/admin/sessions/session-table.tsx`

- [ ] **Step 1: Add Dialog imports**

At the top, add to the `@ru/ui` import:

```ts
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@ru/ui";
```

Add new lucide icons:

```ts
import { Video, Film, ExternalLink, Loader2, Plus, X as XIcon } from "lucide-react";
```

- [ ] **Step 2: Add modal state**

After the existing state declarations (line 56), add:

```ts
  const [previewSession, setPreviewSession] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    title: string;
    description: string;
    attendees: string[];
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [newAttendeeEmail, setNewAttendeeEmail] = useState("");
  const [creating, setCreating] = useState(false);
```

- [ ] **Step 3: Add modal open/close functions**

After the existing `fetchRecording` function (after line 175), add:

```ts
  async function openMeetPreview(id: string) {
    setPreviewSession(id);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await fetch(`/api/admin/sessions/${id}/meet-preview`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load preview");
      setPreviewData(data);
    } catch (error) {
      toast({
        title: "Failed to load preview",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
      setPreviewSession(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function createMeetFromPreview() {
    if (!previewSession || !previewData) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/admin/sessions/${previewSession}/generate-meet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: previewData.title,
          description: previewData.description,
          attendees: previewData.attendees,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate Meet link");

      setSessions((prev) =>
        prev.map((s) =>
          s.id === previewSession
            ? { ...s, joinUrl: data.meetLink, calendarEventId: data.calendarEventId }
            : s,
        ),
      );
      toast({ title: "Meet link generated" });
      setPreviewSession(null);
      setPreviewData(null);
    } catch (error) {
      toast({
        title: "Failed to generate Meet link",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  function addPreviewAttendee() {
    if (!newAttendeeEmail || !previewData) return;
    const email = newAttendeeEmail.trim().toLowerCase();
    if (!email || previewData.attendees.includes(email)) {
      setNewAttendeeEmail("");
      return;
    }
    setPreviewData({
      ...previewData,
      attendees: [...previewData.attendees, email],
    });
    setNewAttendeeEmail("");
  }

  function removePreviewAttendee(email: string) {
    if (!previewData) return;
    setPreviewData({
      ...previewData,
      attendees: previewData.attendees.filter((a) => a !== email),
    });
  }
```

- [ ] **Step 4: Update the Generate button to open modal**

Replace the Generate button block (lines 301-315). Find:

```tsx
                    ) : session.status === "SCHEDULED" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={generatingMeet === session.id}
                        onClick={() => generateMeetLink(session.id)}
                      >
                        {generatingMeet === session.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Video className="h-3 w-3 mr-1" />
                        )}
                        Generate
                      </Button>
```

Replace with:

```tsx
                    ) : session.status === "SCHEDULED" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => openMeetPreview(session.id)}
                      >
                        <Video className="h-3 w-3 mr-1" />
                        Generate
                      </Button>
```

- [ ] **Step 5: Add the Dialog component**

Just before the closing `</div>` of the return statement (before the final `</div>` on line 379), add the modal:

```tsx
      {/* Meet Preview/Edit Modal */}
      <Dialog
        open={previewSession !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewSession(null);
            setPreviewData(null);
            setNewAttendeeEmail("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Meet Link</DialogTitle>
            <DialogDescription>
              Review and edit meeting details before creating.
            </DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : previewData ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Title
                </label>
                <input
                  type="text"
                  value={previewData.title}
                  onChange={(e) =>
                    setPreviewData({ ...previewData, title: e.target.value })
                  }
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Description
                </label>
                <textarea
                  value={previewData.description}
                  onChange={(e) =>
                    setPreviewData({ ...previewData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Attendees ({previewData.attendees.length})
                </label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {previewData.attendees.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1"
                    >
                      <span className="truncate">{email}</span>
                      <button
                        onClick={() => removePreviewAttendee(email)}
                        className="ml-2 text-muted-foreground hover:text-destructive flex-shrink-0"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="email"
                    placeholder="Add attendee email"
                    value={newAttendeeEmail}
                    onChange={(e) => setNewAttendeeEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPreviewAttendee();
                      }
                    }}
                    className="flex-1 h-8 rounded-lg border border-border bg-background px-3 text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={addPreviewAttendee}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPreviewSession(null);
                setPreviewData(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!previewData || creating}
              onClick={createMeetFromPreview}
            >
              {creating ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Video className="h-3 w-3 mr-1" />
              )}
              Create Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 6: Remove unused `generateMeetLink` function and state**

Remove both:
1. The `generateMeetLink` function (lines 125-151) — no longer called since the button now uses `openMeetPreview`
2. The `generatingMeet` state declaration (line 54: `const [generatingMeet, setGeneratingMeet] = useState<string | null>(null);`) — replaced by the modal flow

- [ ] **Step 7: Verify build**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/admin/sessions/session-table.tsx
git commit -m "feat: add preview/edit modal for Meet link generation"
```

---

### Task 15: Full build verification

- [ ] **Step 1: Run full type check**

Run: `pnpm --filter @ru/google-workspace exec tsc --noEmit && pnpm --filter web exec tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run build**

Run: `pnpm --filter web build`
Expected: Build succeeds

- [ ] **Step 3: Commit any fixes if needed**
