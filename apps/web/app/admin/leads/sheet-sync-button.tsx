"use client";

import { useTransition } from "react";
import { Button } from "@ru/ui";
import { toast } from "@/hooks/use-toast";
import { reconcileGoogleSheets } from "./actions";

export function SheetSyncButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await reconcileGoogleSheets({});
          if (!result.success) {
            toast({
              title: "Sheet sync failed",
              description: result.error,
              variant: "destructive",
            });
            return;
          }
          toast({
            title: "Sheets updated",
            description: `Paid Users ${result.data.paidUsers.upserted} · Leads ${result.data.leads.upserted}`,
          });
        });
      }}
    >
      {isPending ? "Syncing…" : "Sync Google Sheets"}
    </Button>
  );
}
