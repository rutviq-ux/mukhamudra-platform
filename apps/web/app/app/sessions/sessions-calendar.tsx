"use client";

import { useState, useMemo } from "react";
import { Calendar, Sparkles, Users } from "lucide-react";
import { Card, CardContent } from "@ru/ui";
import { CalendarDayStrip } from "./calendar-day-strip";
import { SessionCard, type SerializedSession } from "./session-card";

interface SessionsCalendarProps {
  sessions: SerializedSession[];
  userId: string;
  userTimezone: string;
  hasFaceYogaAccess: boolean;
  hasPranayamaAccess: boolean;
}

/** Generate all 14 date keys starting from today in the user's timezone */
function generateDateRange(userTimezone: string): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    dates.push(d.toLocaleDateString("en-CA", { timeZone: userTimezone }));
  }
  // Deduplicate (DST edge case could produce a duplicate)
  return [...new Set(dates)];
}

/** Group sessions by date in the user's timezone (fixes UTC grouping bug) */
function groupByDate(
  sessions: SerializedSession[],
  userTimezone: string
): Record<string, SerializedSession[]> {
  const groups: Record<string, SerializedSession[]> = {};
  for (const session of sessions) {
    const dateKey = new Date(session.startsAt).toLocaleDateString("en-CA", {
      timeZone: userTimezone,
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(session);
  }
  return groups;
}

export function SessionsCalendar({
  sessions,
  userId,
  userTimezone,
  hasFaceYogaAccess,
  hasPranayamaAccess,
}: SessionsCalendarProps) {
  const dates = useMemo(() => generateDateRange(userTimezone), [userTimezone]);

  const sessionsByDate = useMemo(
    () => groupByDate(sessions, userTimezone),
    [sessions, userTimezone]
  );

  // Default to first date that has sessions, or today
  const firstDateWithSessions = dates.find((d) => sessionsByDate[d]?.length);
  const [selectedDate, setSelectedDate] = useState(
    firstDateWithSessions || dates[0]!
  );

  const selectedSessions = sessionsByDate[selectedDate] || [];

  // Format selected date for display
  const selectedDateDisplay = new Date(
    selectedDate + "T12:00:00"
  ).toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-light mb-1 sm:mb-2">
              Sessions
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Browse and book sessions for the next 14 days.
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Card glass className="px-3 py-1.5 sm:px-4 sm:py-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-xs sm:text-sm">
                  Face Yoga:{" "}
                  <span
                    className={
                      hasFaceYogaAccess
                        ? "text-success font-bold"
                        : "text-muted-foreground"
                    }
                  >
                    {hasFaceYogaAccess ? "Active" : "No access"}
                  </span>
                </span>
              </div>
            </Card>
            <Card glass className="px-3 py-1.5 sm:px-4 sm:py-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs sm:text-sm">
                  Pranayama:{" "}
                  <span
                    className={
                      hasPranayamaAccess
                        ? "text-success font-bold"
                        : "text-muted-foreground"
                    }
                  >
                    {hasPranayamaAccess ? "Active" : "No access"}
                  </span>
                </span>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Day strip */}
      <Card glass className="p-3 mb-4">
        <CalendarDayStrip
          dates={dates}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          sessionsByDate={sessionsByDate}
          userTimezone={userTimezone}
        />
      </Card>

      {/* Selected day label */}
      <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        {selectedDateDisplay}
      </h2>

      {/* Session list */}
      {selectedSessions.length === 0 ? (
        <Card glass>
          <CardContent className="py-10 text-center">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">
              No sessions on this day.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card glass>
          <CardContent className="pt-4 pb-2">
            <div className="divide-y divide-border/10">
              {selectedSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  userId={userId}
                  userTimezone={userTimezone}
                  hasFaceYogaAccess={hasFaceYogaAccess}
                  hasPranayamaAccess={hasPranayamaAccess}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
