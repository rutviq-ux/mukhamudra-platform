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
import { Loader2 } from "lucide-react";
import { updateMembershipStatus } from "./actions";

interface Membership {
  id: string;
  status: string;
  periodEnd: string | null;
  plan: {
    name: string;
    product?: { name: string } | null;
  };
}

const STATUSES = ["PENDING", "ACTIVE", "PAUSED", "CANCELLED", "EXPIRED"] as const;

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-success/20 text-success",
  CANCELLED: "bg-destructive/20 text-destructive",
  PENDING: "bg-warning/20 text-warning",
  PAUSED: "bg-warning/20 text-warning",
  EXPIRED: "bg-muted text-muted-foreground",
};

export function MembershipStatus({ membership }: { membership: Membership }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(membership.status);
  const [saving, startSaving] = useTransition();

  function handleSave() {
    if (newStatus === membership.status) return;

    startSaving(async () => {
      const result = await updateMembershipStatus({
        id: membership.id,
        status: newStatus as "PENDING" | "ACTIVE" | "PAUSED" | "CANCELLED" | "EXPIRED",
      });

      if (!result.success) {
        toast({
          title: "Update failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({ title: `Membership → ${newStatus}` });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setNewStatus(membership.status);
          setOpen(true);
        }}
        className={`px-2 py-1 rounded text-xs cursor-pointer hover:ring-1 hover:ring-foreground/20 transition-all ${STATUS_STYLE[membership.status] || "bg-muted text-muted-foreground"}`}
      >
        {membership.status}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Membership</DialogTitle>
            <DialogDescription>
              {membership.plan.name}
              {membership.plan.product?.name
                ? ` · ${membership.plan.product.name}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNewStatus(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    newStatus === s
                      ? STATUS_STYLE[s] + " ring-1 ring-foreground/20"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {newStatus !== membership.status && (
              <p className="text-xs text-muted-foreground">
                {membership.status} → {newStatus}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || newStatus === membership.status}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
