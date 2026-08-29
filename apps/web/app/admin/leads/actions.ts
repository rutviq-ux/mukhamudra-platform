"use server";

import { z } from "zod";
import { createAdminAction } from "@/lib/actions/safe-action";
import { reconcileAllPaidUsersToSheet } from "@/lib/sync-paid-user-sheet";
import { reconcileAllLeadsToSheet } from "@/lib/sync-lead-sheet";

export const reconcileGoogleSheets = createAdminAction("reconcileGoogleSheets", {
  schema: z.object({}),
  audit: {
    action: "sheets.reconcile",
    targetType: "GoogleSheet",
  },
  handler: async () => {
    const [paidUsers, leads] = await Promise.all([
      reconcileAllPaidUsersToSheet(),
      reconcileAllLeadsToSheet(),
    ]);

    return { paidUsers, leads };
  },
});
