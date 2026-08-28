"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, Video } from "lucide-react";
import { isJoinWindowOpen, joinWindowBounds } from "@/lib/sessions";
import { SessionTimeDisplay } from "./session-time-display";

export interface SerializedSession {
  id: string;
  startsAt: string;
  endsAt: string;
  title: string | null;
  capacity: number;
  modalities: string[];
  product: { name: string; type: string };
  batch: { name: string; timezone: string } | null;
  bookings: { id: string; userId: string }[];
}

interface SessionCardProps {
  session: SerializedSession;
  userTimezone: string;
  hasFaceYogaAccess: boolean;
  hasPranayamaAccess: boolean;
}

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

function useNow(intervalMs = 5_000) {
  const [now, setNow] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return { now, mounted };
}

export function SessionCard({
  session,
  userTimezone,
  hasFaceYogaAccess,
  hasPranayamaAccess,
}: SessionCardProps) {
  const { now, mounted } = useNow();
  const isFaceYoga = session.product.type === "FACE_YOGA";
  const hasAccess = isFaceYoga ? hasFaceYogaAccess : hasPranayamaAccess;
  const start = new Date(session.startsAt);
  const end = new Date(session.endsAt);
  const { openAt } = joinWindowBounds(start, end);
  const joinOpen = isJoinWindowOpen(start, end, now);
  const beforeOpen = now.getTime() < openAt.getTime();
  const countdown = mounted ? formatCountdown(start.getTime() - now.getTime()) : "";

  const durationMins = Math.round(
    (end.getTime() - start.getTime()) / 60_000
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
        {!hasAccess ? (
          <span className="text-xs text-muted-foreground/60">No membership</span>
        ) : joinOpen ? (
          <Link
            href={`/app/join/${session.id}`}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-emerald-500/90 text-white rounded-full hover:bg-emerald-600 transition-colors"
          >
            <Video className="h-3 w-3" />
            Join
          </Link>
        ) : beforeOpen ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs text-muted-foreground">
              Opens 15 min before
            </span>
            {countdown && (
              <span className="text-[10px] text-muted-foreground">
                {countdown}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
