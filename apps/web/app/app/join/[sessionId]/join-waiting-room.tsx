"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@ru/ui";
import { Video, Clock, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface JoinWaitingRoomProps {
  sessionId: string;
  title: string;
  productName: string;
  productType: string;
  startsAt: string;
  endsAt: string;
  joinUrl: string | null;
}

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "Now";
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function JoinWaitingRoom({
  sessionId,
  title,
  productName,
  productType,
  startsAt,
  endsAt,
  joinUrl: initialJoinUrl,
}: JoinWaitingRoomProps) {
  const [joinUrl, setJoinUrl] = useState(initialJoinUrl);
  const [now, setNow] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const diffMs = start.getTime() - now.getTime();
  const isBeforeSession = diffMs > 0;
  const isSessionOver = now > end;
  const isFaceYoga = productType === "FACE_YOGA";

  // Tick every second for the countdown
  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll for joinUrl every 5 seconds if we don't have it yet
  const pollForJoinUrl = useCallback(async () => {
    try {
      const res = await fetch(`/api/join/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.joinUrl) {
          setJoinUrl(data.joinUrl);
        }
      }
    } catch {
      // Silently retry on next interval
    }
  }, [sessionId]);

  useEffect(() => {
    if (joinUrl || isSessionOver) return;
    // Poll immediately once, then every 5 seconds
    pollForJoinUrl();
    const interval = setInterval(pollForJoinUrl, 5000);
    return () => clearInterval(interval);
  }, [joinUrl, isSessionOver, pollForJoinUrl]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const accentColor = isFaceYoga ? "accent" : "primary";

  return (
    <div className="max-w-lg mx-auto">
      {/* Back link */}
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to dashboard
      </Link>

      <Card glass>
        <CardContent className="p-6 sm:p-8">
          {/* Session info */}
          <div className="text-center mb-8">
            <span
              className={`text-[0.6rem] uppercase tracking-wider px-2 py-0.5 rounded bg-${accentColor}/15 text-${accentColor}`}
            >
              {productName}
            </span>
            <h1
              className="text-xl sm:text-2xl font-light mt-3 mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {start.toLocaleDateString("en-IN", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
              {" at "}
              {start.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Status */}
          {isSessionOver ? (
            /* Session ended */
            <div className="text-center py-6">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Clock className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground font-medium">
                This session has ended.
              </p>
              <Link
                href="/app/sessions"
                className={`inline-flex items-center gap-1 text-sm text-${accentColor} hover:text-${accentColor}/80 mt-3 transition-colors`}
              >
                Browse upcoming sessions
              </Link>
            </div>
          ) : joinUrl ? (
            /* Ready to join */
            <div className="text-center py-4">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                {isBeforeSession
                  ? `Session starts in ${formatCountdown(diffMs)}`
                  : "Session is live now!"}
              </p>
              <a
                href={joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium bg-emerald-500 text-white rounded-full hover:bg-emerald-600 active:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
              >
                <Video className="h-4 w-4" />
                Join Google Meet
              </a>
              {isBeforeSession && (
                <p className="text-xs text-muted-foreground/60 mt-3">
                  You can join before the session starts
                </p>
              )}
            </div>
          ) : (
            /* Waiting for link */
            <div className="text-center py-4">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Loader2 className="h-7 w-7 text-muted-foreground animate-spin" />
              </div>
              {isBeforeSession ? (
                <>
                  <p className="font-medium text-foreground mb-1">
                    {formatCountdown(diffMs)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    until session starts
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-4">
                    The meeting link will appear here automatically once your
                    coach generates it.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-foreground mb-1">
                    Waiting for meeting link&hellip;
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    Your coach is setting up the session. This page will update
                    automatically.
                  </p>
                </>
              )}

              {/* Pulsing dot indicator */}
              <div className="flex justify-center gap-1 mt-6">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 animate-pulse" />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 animate-pulse"
                  style={{ animationDelay: "0.3s" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 animate-pulse"
                  style={{ animationDelay: "0.6s" }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
