"use client";

import Link from "next/link";
import { User, Video } from "lucide-react";
import { SessionTimeDisplay } from "./session-time-display";
import { SessionActions } from "./session-actions";

export interface SerializedSession {
  id: string;
  startsAt: string;
  endsAt: string;
  title: string | null;
  capacity: number;
  modalities: string[];
  joinUrl: string | null;
  product: { name: string; type: string };
  batch: { name: string; timezone: string } | null;
  bookings: { id: string; userId: string }[];
}

interface SessionCardProps {
  session: SerializedSession;
  userId: string;
  userTimezone: string;
  hasFaceYogaAccess: boolean;
  hasPranayamaAccess: boolean;
}

function canJoinSession(startsAt: string, endsAt: string): boolean {
  const now = new Date();
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const minutesUntilStart = (start.getTime() - now.getTime()) / (1000 * 60);
  return minutesUntilStart <= 15 && minutesUntilStart > -60 && now < end;
}

export function SessionCard({
  session,
  userId,
  userTimezone,
  hasFaceYogaAccess,
  hasPranayamaAccess,
}: SessionCardProps) {
  const isFull = session.bookings.length >= session.capacity;
  const isBooked = session.bookings.some((b) => b.userId === userId);
  const isFaceYoga = session.product.type === "FACE_YOGA";
  const joinable =
    isBooked && canJoinSession(session.startsAt, session.endsAt) && session.joinUrl;

  let canBook = false;
  let reason = "";

  if (isBooked) {
    // Already booked
  } else if (isFull) {
    reason = "Full";
  } else if (isFaceYoga) {
    canBook = hasFaceYogaAccess;
    reason = !hasFaceYogaAccess ? "No membership" : "";
  } else {
    canBook = hasPranayamaAccess;
    reason = !hasPranayamaAccess ? "No membership" : "";
  }

  const durationMins = Math.round(
    (new Date(session.endsAt).getTime() - new Date(session.startsAt).getTime()) / 60_000
  );
  const hasCustomTitle =
    session.title &&
    session.title !== session.batch?.name &&
    session.title !== session.product.name;

  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <SessionTimeDisplay
        startsAt={session.startsAt}
        endsAt={session.endsAt}
        batchTimezone={session.batch?.timezone ?? "Asia/Kolkata"}
        userTimezone={userTimezone}
      />
      <div className="flex-1 min-w-0 pt-px">
        <p className="text-sm leading-tight">
          <span
            className={`font-medium ${
              isFaceYoga ? "text-accent" : "text-primary"
            }`}
          >
            {session.product.name}
          </span>
          {hasCustomTitle && (
            <span className="text-foreground ml-1.5">{session.title}</span>
          )}
        </p>
        <div className="flex items-center text-xs text-muted-foreground mt-0.5">
          <span>{durationMins}m</span>
          <span className="mx-1 opacity-30">·</span>
          <User className="h-2.5 w-2.5 mr-0.5" />
          <span>
            {session.bookings.length}/{session.capacity}
          </span>
        </div>
        {session.modalities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {session.modalities.map((mod) => (
              <span
                key={mod}
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isFaceYoga
                    ? "bg-accent/10 text-accent/80"
                    : "bg-primary/10 text-primary/80"
                }`}
              >
                {mod}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 pt-px">
        {joinable && (
          <Link
            href={`/app/join/${session.id}`}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-emerald-500/90 text-white rounded-full hover:bg-emerald-600 transition-colors"
          >
            <Video className="h-3 w-3" />
            Join
          </Link>
        )}
        <SessionActions
          sessionId={session.id}
          isBooked={isBooked}
          canBook={canBook}
          reason={reason}
          startsAt={session.startsAt}
          bookingId={
            isBooked
              ? session.bookings.find((b) => b.userId === userId)?.id
              : undefined
          }
        />
      </div>
    </div>
  );
}
