import { createLogger } from "@ru/config";
import {
  configureMeetSpace,
  createConfiguredMeetSpace,
  createMeetingWithAttendees,
  waitForMeetSpaceName,
} from "@ru/google-workspace";
import type { GoogleWorkspaceConfig } from "@ru/google-workspace";
import {
  generateMeetingDescription,
  generateMeetingTitle,
} from "@/lib/meet-helpers";
import { ensureMeetGroupsForProduct } from "@/lib/sync-meet-group";

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
  const groupEmails = await ensureMeetGroupsForProduct(session.product.type);

  if (groupEmails.length > 0) {
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
      const meetResult = await createMeetingWithAttendees(googleConfig, {
        title,
        description,
        startTime: session.startsAt,
        endTime: session.endsAt,
        attendeeEmails: groupEmails,
      });
      let spaceName: string | null = null;
      try {
        spaceName = await waitForMeetSpaceName(
          googleConfig,
          meetResult.meetingId,
        );
      } catch {
      }
      if (spaceName) {
        try {
          await configureMeetSpace(googleConfig, spaceName, "TRUSTED");
        } catch (err) {
          log.warn({ err, sessionId: session.id }, "Could not configure Meet space");
        }
      }
      return {
        meetLink: meetResult.meetLink,
        meetingId: meetResult.meetingId,
        spaceName,
        calendarEventId: meetResult.calendarEventId,
      };
    } catch (err) {
      log.warn(
        { err, sessionId: session.id },
        "Calendar group invite failed; creating an open Meet instead",
      );
    }
  }

  const space = await createConfiguredMeetSpace(googleConfig);
  return {
    meetLink: space.meetLink,
    meetingId: space.meetingId,
    spaceName: space.spaceName,
  };
}
