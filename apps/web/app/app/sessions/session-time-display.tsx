"use client";

import { useState, useEffect } from "react";
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ru/ui";

interface SessionTimeDisplayProps {
  startsAt: string;
  endsAt: string;
  batchTimezone: string;
  userTimezone: string;
}

function formatTimeInTz(date: Date, tz: string): string {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });
}

function getTzAbbreviation(date: Date, tz: string): string {
  return (
    new Intl.DateTimeFormat("en", {
      timeZone: tz,
      timeZoneName: "short",
    })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? tz
  );
}

export function SessionTimeDisplay({
  startsAt,
  endsAt,
  batchTimezone,
  userTimezone,
}: SessionTimeDisplayProps) {
  const [now, setNow] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const isLive = now >= start && now < end;

  const showBatchTz = batchTimezone !== userTimezone;
  const timeStr = formatTimeInTz(start, userTimezone);

  const timeContent = (
    <p
      className={`text-sm font-semibold tabular-nums ${
        showBatchTz
          ? "cursor-help decoration-dashed underline underline-offset-2 decoration-muted-foreground/30"
          : ""
      }`}
    >
      {timeStr}
    </p>
  );

  return (
    <div className="shrink-0 w-[4.5rem]">
      {showBatchTz ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>{timeContent}</TooltipTrigger>
            <TooltipContent>
              Batch: {formatTimeInTz(start, batchTimezone)}{" "}
              {getTzAbbreviation(start, batchTimezone)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        timeContent
      )}

      {mounted && isLive && (
        <Badge
          variant="outline"
          className="mt-1 text-[10px] px-1.5 py-0 h-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
          Live
        </Badge>
      )}
    </div>
  );
}
