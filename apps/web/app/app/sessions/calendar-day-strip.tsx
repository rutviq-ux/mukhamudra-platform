"use client";

import { useRef, useEffect, useState } from "react";
import type { SerializedSession } from "./session-card";

interface CalendarDayStripProps {
  dates: string[]; // YYYY-MM-DD in user timezone
  selectedDate: string;
  onSelectDate: (date: string) => void;
  sessionsByDate: Record<string, SerializedSession[]>;
  userTimezone: string;
}

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function CalendarDayStrip({
  dates,
  selectedDate,
  onSelectDate,
  sessionsByDate,
  userTimezone,
}: CalendarDayStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll to selected day on mount
  useEffect(() => {
    if (mounted && selectedRef.current) {
      selectedRef.current.scrollIntoView({
        inline: "center",
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [mounted, selectedDate]);

  const todayKey = mounted
    ? new Date().toLocaleDateString("en-CA", { timeZone: userTimezone })
    : null;

  return (
    <div
      ref={scrollRef}
      className="flex gap-1.5 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-1 -mx-1 px-1"
    >
      {dates.map((dateKey) => {
        const date = new Date(dateKey + "T12:00:00"); // noon to avoid DST issues
        const dayOfWeek = DAY_ABBR[date.getDay()]!;
        const dayNum = date.getDate();
        const isSelected = dateKey === selectedDate;
        const isToday = dateKey === todayKey;
        const daySessions = sessionsByDate[dateKey] || [];

        const hasFaceYoga = daySessions.some(
          (s) => s.product.type === "FACE_YOGA"
        );
        const hasPranayama = daySessions.some(
          (s) => s.product.type === "PRANAYAMA" || s.product.type === "BUNDLE"
        );

        return (
          <button
            key={dateKey}
            ref={isSelected ? selectedRef : undefined}
            onClick={() => onSelectDate(dateKey)}
            className={`
              snap-center shrink-0 flex flex-col items-center gap-0.5
              w-12 py-2 rounded-xl transition-all cursor-pointer
              ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "hover:bg-muted/50"
              }
            `}
          >
            <span
              className={`text-[10px] font-medium uppercase tracking-wide ${
                isSelected
                  ? "text-primary-foreground/80"
                  : isToday
                    ? "text-primary"
                    : "text-muted-foreground"
              }`}
            >
              {dayOfWeek}
            </span>
            <span
              className={`text-lg font-semibold leading-none ${
                isSelected
                  ? ""
                  : isToday
                    ? "text-primary"
                    : ""
              }`}
            >
              {dayNum}
            </span>
            {isToday && !isSelected && (
              <span className="text-[8px] font-bold text-primary uppercase leading-none">
                Today
              </span>
            )}
            {/* Session indicator dots */}
            <div className="flex gap-0.5 h-1.5 mt-0.5">
              {hasFaceYoga && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? "bg-primary-foreground/70" : "bg-accent"
                  }`}
                />
              )}
              {hasPranayama && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? "bg-primary-foreground/70" : "bg-primary"
                  }`}
                />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
