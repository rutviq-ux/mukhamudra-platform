import type { meet_v2 } from "googleapis";
import { createAuthClient, getMeetClient } from "./auth";
import type {
  GoogleWorkspaceConfig,
  MeetSpaceResult,
  ParticipantInfo,
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

export async function resolveSpaceName(
  config: GoogleWorkspaceConfig,
  meetingCode: string,
): Promise<string | null> {
  const meet = getMeetClient(config);

  try {
    const response = await meet.spaces.get({
      name: `spaces/${meetingCode}`,
    });
    if (response.data.name) {
      return response.data.name;
    }
  } catch {
  }

  try {
    const response = await meet.conferenceRecords.list({
      filter: `space.meeting_code = "${meetingCode}"`,
    });

    const records = response.data.conferenceRecords;
    if (!records || records.length === 0) {
      return null;
    }

    return records[0]!.space || null;
  } catch {
    return null;
  }
}

export async function waitForMeetSpaceName(
  config: GoogleWorkspaceConfig,
  meetingCode: string,
  attempts = 4,
  delayMs = 400,
): Promise<string | null> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const spaceName = await resolveSpaceName(config, meetingCode);
    if (spaceName) {
      return spaceName;
    }
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
}

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

export async function configureMeetSpace(
  config: GoogleWorkspaceConfig,
  spaceName: string,
  accessType: "OPEN" | "TRUSTED" = "OPEN",
): Promise<{ autoRecord: boolean }> {
  const auth = createAuthClient(config);
  const tokenResponse = await auth.getAccessToken();
  const token = tokenResponse.token;
  if (!token) {
    throw new Error("Failed to get Google access token");
  }

  const patchSpace = async (updateMask: string, body: unknown) => {
    const url = new URL(`https://meet.googleapis.com/v2/${spaceName}`);
    url.searchParams.set("updateMask", updateMask);
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Meet space patch failed (${response.status}): ${details}`);
    }
  };

  try {
    await patchSpace(
      "config.accessType,config.artifactConfig.recordingConfig.autoRecordingGeneration",
      {
        config: {
          accessType,
          artifactConfig: {
            recordingConfig: {
              autoRecordingGeneration: "ON",
            },
          },
        },
      },
    );
    return { autoRecord: true };
  } catch {
    await setSpaceAccessType(config, spaceName, accessType);
    return { autoRecord: false };
  }
}

export async function createConfiguredMeetSpace(
  config: GoogleWorkspaceConfig,
): Promise<MeetSpaceResult & { autoRecord: boolean }> {
  const space = await createMeetSpace(config);
  let autoRecord = false;
  try {
    const configured = await configureMeetSpace(config, space.spaceName);
    autoRecord = configured.autoRecord;
  } catch {
  }
  return { ...space, autoRecord };
}

/**
 * List signed-in participants from the most recent conference in a Meet space.
 *
 * Steps:
 * 1. Find conference records for the space (most recent first)
 * 2. List all participants from the most recent conference (handles pagination)
 * 3. Filter to signed-in users only and map to ParticipantInfo
 *
 * Returns an empty array if no conference records exist or no signed-in participants are found.
 */
export async function listConferenceParticipants(
  config: GoogleWorkspaceConfig,
  spaceName: string,
): Promise<ParticipantInfo[]> {
  const meet = getMeetClient(config);

  // Step 1: Find conference records for this space
  const conferenceResponse = await meet.conferenceRecords.list({
    filter: `space.name = "${spaceName}"`,
  });

  const records = conferenceResponse.data.conferenceRecords;
  if (!records || records.length === 0) {
    return [];
  }

  // Use the most recent conference record (first in list)
  const conferenceRecordName = records[0]!.name;
  if (!conferenceRecordName) {
    return [];
  }

  // Step 2: List all participants, handling pagination
  const allParticipants: meet_v2.Schema$Participant[] = [];

  let pageToken: string | undefined;
  do {
    const participantsResponse =
      await meet.conferenceRecords.participants.list({
        parent: conferenceRecordName,
        ...(pageToken ? { pageToken } : {}),
      });

    const participants = participantsResponse.data.participants;
    if (participants) {
      allParticipants.push(...participants);
    }

    pageToken = participantsResponse.data.nextPageToken ?? undefined;
  } while (pageToken);

  // Step 3: Filter to signed-in users and map to ParticipantInfo
  const result: ParticipantInfo[] = [];

  for (const participant of allParticipants) {
    const signedinUser = participant.signedinUser;
    if (!signedinUser) {
      continue;
    }

    // The user field is in the format "users/{email}" — extract the email
    const email = signedinUser.user
      ? signedinUser.user.replace(/^users\//, "")
      : null;

    const displayName = signedinUser.displayName ?? null;

    const joinedAt = participant.earliestStartTime
      ? new Date(participant.earliestStartTime)
      : new Date();

    const leftAt = participant.latestEndTime
      ? new Date(participant.latestEndTime)
      : null;

    let durationMin: number | null = null;
    if (leftAt) {
      const diffMs = leftAt.getTime() - joinedAt.getTime();
      durationMin = Math.round(diffMs / 60_000);
    }

    result.push({ email, displayName, joinedAt, leftAt, durationMin });
  }

  return result;
}
