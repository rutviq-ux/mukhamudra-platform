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
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { updateBookingStatus } from "./actions";

interface BookingStatusActionsProps {
  bookingId: string;
  status: string;
  sessionInfo: string;
}

const STATUSES = ["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

const STATUS_STYLE: Record<
  string,
  { color: string; bg: string; icon: typeof CheckCircle }
> = {
  CONFIRMED: {
    color: "text-success",
    bg: "bg-success/20",
    icon: CheckCircle,
  },
  CANCELLED: {
    color: "text-destructive",
    bg: "bg-destructive/20",
    icon: XCircle,
  },
  COMPLETED: {
    color: "text-primary",
    bg: "bg-primary/20",
    icon: CheckCircle,
  },
  NO_SHOW: {
    color: "text-warning",
    bg: "bg-warning/20",
    icon: AlertTriangle,
  },
};

const TERMINAL_STATUSES = ["COMPLETED", "NO_SHOW", "CANCELLED"];

export function BookingStatusActions({
  bookingId,
  status,
  sessionInfo,
}: BookingStatusActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(status);
  const [isPending, startTransition] = useTransition();

  const config = STATUS_STYLE[status] || {
    color: "text-muted-foreground",
    bg: "bg-muted",
    icon: Clock,
  };
  const StatusIcon = config.icon;
  const isTerminal = TERMINAL_STATUSES.includes(status);

  function handleSave() {
    if (newStatus === status) return;
    startTransition(async () => {
      const result = await updateBookingStatus({
        id: bookingId,
        status: newStatus as "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW",
      });

      if (result.success) {
        toast({ title: `Booking → ${newStatus}` });
        setOpen(false);
        router.refresh();
      } else {
        toast({
          title: "Update failed",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isTerminal) return;
          setNewStatus(status);
          setOpen(true);
        }}
        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${config.bg} ${config.color} ${
          !isTerminal
            ? "cursor-pointer hover:ring-1 hover:ring-foreground/20 transition-all"
            : ""
        }`}
      >
        <StatusIcon className="h-3 w-3" />
        {status}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Booking Status</DialogTitle>
            <DialogDescription>{sessionInfo}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {STATUSES.filter((s) => s !== "CONFIRMED").map((s) => {
                const style = STATUS_STYLE[s]!;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNewStatus(s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      newStatus === s
                        ? style.bg +
                          " " +
                          style.color +
                          " ring-1 ring-foreground/20"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {newStatus !== status && (
              <p className="text-xs text-muted-foreground">
                {status} → {newStatus}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || newStatus === status}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
