"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createBooking, cancelBooking } from "@/actions/bookings";

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "";
  const totalMin = Math.ceil(diffMs / 60_000);
  if (totalMin < 1) return "< 1m";
  if (totalMin >= 1440) {
    const d = Math.floor(totalMin / 1440);
    const h = Math.floor((totalMin % 1440) / 60);
    return h > 0 ? `${d}d ${h}h` : `${d}d`;
  }
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function useCountdown(startsAt?: string) {
  const [now, setNow] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!startsAt || !mounted) return "";
  const diffMs = new Date(startsAt).getTime() - now.getTime();
  if (diffMs <= 0) return "";
  return formatCountdown(diffMs);
}

interface SessionActionsProps {
  sessionId: string;
  isBooked: boolean;
  canBook: boolean;
  reason: string;
  bookingId?: string;
  startsAt?: string;
}

export function SessionActions({
  sessionId,
  isBooked,
  canBook,
  reason,
  bookingId,
  startsAt,
}: SessionActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const countdown = useCountdown(startsAt);

  const handleBook = () => {
    if (isPending) return;
    startTransition(async () => {
      const result = await createBooking({ sessionId });
      if (!result.success) {
        alert(result.error || "Failed to book session");
        return;
      }
      router.refresh();
    });
  };

  const handleCancel = () => {
    if (isPending || !bookingId) return;
    if (!confirm("Cancel this booking?")) return;
    startTransition(async () => {
      const result = await cancelBooking({ bookingId });
      if (!result.success) {
        alert(result.error || "Failed to cancel booking");
        return;
      }
      router.refresh();
    });
  };

  if (isBooked) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-primary">Booked</span>
          {bookingId && (
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="p-0.5 text-muted-foreground/60 hover:text-destructive transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <span className="text-[10px]">...</span>
              ) : (
                <X className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
        {countdown && (
          <span className="text-[10px] text-muted-foreground">{countdown}</span>
        )}
      </div>
    );
  }

  if (!canBook) {
    return (
      <span className="text-xs text-muted-foreground/60">{reason || "Full"}</span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        onClick={handleBook}
        disabled={isPending}
        className="text-xs font-medium px-3 py-1 rounded-full border border-accent/30 text-accent hover:bg-accent/10 active:bg-accent/15 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {isPending ? "..." : "Book"}
      </button>
      {countdown && !isPending && (
        <span className="text-[10px] text-muted-foreground">{countdown}</span>
      )}
    </div>
  );
}
