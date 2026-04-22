"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ru/ui";
import { toast } from "@/hooks/use-toast";
import { Video, Film, ExternalLink, Loader2 } from "lucide-react";
import {
  generateMeetLink as generateMeetLinkAction,
  fetchSessionRecording as fetchSessionRecordingAction,
} from "../admin/sessions/actions";

interface SessionActionsProps {
  sessionId: string;
  joinUrl: string | null;
  calendarEventId: string | null;
  meetingId: string | null;
  recordingUrl: string | null;
  status: string;
}

export function SessionActions({
  sessionId,
  joinUrl,
  calendarEventId,
  meetingId,
  recordingUrl,
  status,
}: SessionActionsProps) {
  const router = useRouter();
  const [generatingMeet, startGenerateMeet] = useTransition();
  const [fetchingRecording, startFetchRecording] = useTransition();

  function handleGenerateMeetLink() {
    startGenerateMeet(async () => {
      const result = await generateMeetLinkAction({ id: sessionId });

      if (!result.success) {
        toast({
          title: "Failed to generate Meet link",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Meet link generated" });
      router.refresh();
    });
  }

  function handleFetchRecording() {
    startFetchRecording(async () => {
      const result = await fetchSessionRecordingAction({ id: sessionId });

      if (!result.success) {
        toast({
          title: "No recording found",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Recording found" });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Meet Link */}
      {joinUrl ? (
        <Button variant="outline" size="sm" asChild>
          <a href={joinUrl} target="_blank" rel="noopener noreferrer">
            <Video className="h-4 w-4 mr-2" />
            Join Session
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </Button>
      ) : !calendarEventId && status !== "COMPLETED" && status !== "CANCELLED" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={generatingMeet}
          onClick={handleGenerateMeetLink}
        >
          {generatingMeet ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Video className="h-4 w-4 mr-2" />
          )}
          Generate Meet Link
        </Button>
      ) : null}

      {/* Recording */}
      {recordingUrl ? (
        <Button variant="outline" size="sm" asChild>
          <a href={recordingUrl} target="_blank" rel="noopener noreferrer">
            <Film className="h-4 w-4 mr-2" />
            View Recording
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </Button>
      ) : status === "COMPLETED" && meetingId ? (
        <Button
          variant="outline"
          size="sm"
          disabled={fetchingRecording}
          onClick={handleFetchRecording}
        >
          {fetchingRecording ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Film className="h-4 w-4 mr-2" />
          )}
          Fetch Recording
        </Button>
      ) : null}
    </div>
  );
}
