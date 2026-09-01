"use server";

import { z } from "zod";
import { createAdminAction } from "@/lib/actions/safe-action";
import { getGoogleConfig } from "@/lib/google-config";
import { reconcileMeetGroups } from "@/lib/sync-meet-group";

export const syncMeetGroups = createAdminAction("syncMeetGroups", {
  schema: z.object({}),
  audit: {
    action: "meet_groups.reconcile",
    targetType: "GoogleGroup",
  },
  handler: async () => {
    if (!getGoogleConfig()) {
      throw new Error("Google Workspace not configured");
    }
    return reconcileMeetGroups();
  },
});
