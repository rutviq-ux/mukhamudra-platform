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
import { Loader2, CheckCircle, Clock, XCircle, RefreshCw } from "lucide-react";
import { refundOrder } from "./actions";

interface OrderStatusActionsProps {
  orderId: string;
  status: string;
  planName: string;
  amountPaise: number;
}

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle; color: string; bg: string }
> = {
  PAID: { icon: CheckCircle, color: "text-success", bg: "bg-success/20" },
  PENDING: { icon: Clock, color: "text-warning", bg: "bg-warning/20" },
  FAILED: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/20" },
  REFUNDED: { icon: RefreshCw, color: "text-primary", bg: "bg-primary/20" },
};

export function OrderStatusActions({
  orderId,
  status,
  planName,
  amountPaise,
}: OrderStatusActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const config = STATUS_CONFIG[status] || {
    icon: Clock,
    color: "text-muted-foreground",
    bg: "bg-muted",
  };
  const StatusIcon = config.icon;
  const canRefund = status === "PAID";

  function handleRefund() {
    startTransition(async () => {
      const result = await refundOrder({
        id: orderId,
        status: "REFUNDED",
      });

      if (result.success) {
        toast({ title: "Order marked as REFUNDED" });
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
        onClick={() => canRefund && setOpen(true)}
        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${config.bg} ${config.color} ${
          canRefund
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
            <DialogTitle>Mark as Refunded</DialogTitle>
            <DialogDescription>
              {planName} · ₹
              {(amountPaise / 100).toLocaleString("en-IN")}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-warning/10 border border-warning/20 p-3">
            <p className="text-sm text-warning">
              This does NOT process a refund via Razorpay. It only updates the
              order status in the database. Process the actual refund in
              Razorpay Dashboard first.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleRefund} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Mark as Refunded
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
