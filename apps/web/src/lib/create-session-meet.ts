import { createLogger } from "@ru/config";
import { createConfiguredMeetSpace } from "@ru/google-workspace";
import type { GoogleWorkspaceConfig } from "@ru/google-workspace";

const log = createLogger("create-session-meet");

export async function createSessionMeet(
  googleConfig: GoogleWorkspaceConfig,
  session: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    modalities: string[];
    product: { name: string; type: "FACE_YOGA" | "PRANAYAMA" | "BUNDLE" };
  },
): Promise<{
  meetLink: string;
  meetingId: string;
  spaceName: string | null;
  calendarEventId?: string;
}> {
  const space = await createConfiguredMeetSpace(googleConfig);
  log.info({ sessionId: session.id }, "Created Meet space");
  return {
    meetLink: space.meetLink,
    meetingId: space.meetingId,
    spaceName: space.spaceName,
  };
}
