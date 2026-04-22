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

export interface ParticipantInfo {
  /** Email address of the signed-in participant */
  email: string | null;
  /** Display name shown in the meeting */
  displayName: string | null;
  /** When the participant first joined the meeting */
  joinedAt: Date;
  /** When the participant last left the meeting (null if still in meeting) */
  leftAt: Date | null;
  /** Duration in the meeting, rounded to nearest minute (null if still in meeting) */
  durationMin: number | null;
}
