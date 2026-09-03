"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ru/ui";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";
import { grantRecordingAccess } from "../actions";

interface RecordingAccessActionsProps {
  userId: string;
}

export function RecordingAccessActions({
  userId,
}: RecordingAccessActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [granting, startGranting] = useTransition();

  function handleGrant() {
    startGranting(async () => {
      const result = await grantRecordingAccess({ userId, months: 12 });

      if (!result.success) {
        toast({
          title: "Grant failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Recording access granted for 12 months" });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3 w-3 mr-1" />
        Grant Access
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Recording Access</DialogTitle>
            <DialogDescription>
              This will grant 12 months of recording access to this user.
              The action is audit-logged and cannot be undone automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={granting}
            >
              Cancel
            </Button>
            <Button onClick={handleGrant} disabled={granting}>
              {granting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
