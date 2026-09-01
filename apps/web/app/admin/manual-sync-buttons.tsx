"use client";

import { useTransition } from "react";
import { Button } from "@ru/ui";
import { toast } from "@/hooks/use-toast";
import { syncMeetGroups } from "./sync-actions";

export function ManualSyncButtons() {
  const [meetPending, startMeet] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={meetPending}
      onClick={() => {
        startMeet(async () => {
          const result = await syncMeetGroups({});
          if (!result.success) {
            toast({
              title: "Meet group sync failed",
              description: result.error,
              variant: "destructive",
            });
            return;
          }
          const { added, addFailed, removed, removeFailed, errors } =
            result.data;
          const failed = addFailed + removeFailed + errors.length;
          toast({
            title: failed > 0 ? "Meet groups synced with errors" : "Meet groups synced",
            description:
              errors.length > 0
                ? errors.join(" · ")
                : `Added ${added} · Removed ${removed}` +
                  (failed > 0
                    ? ` · Failed ${addFailed + removeFailed}`
                    : ""),
            variant: failed > 0 ? "destructive" : "default",
          });
        });
      }}
    >
      {meetPending ? "Syncing…" : "Sync Meet groups"}
    </Button>
  );
}
