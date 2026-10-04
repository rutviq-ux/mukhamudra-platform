"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ru/ui";
import { Film, Lock, Play, Calendar, Loader2 } from "lucide-react";

interface Recording {
  id: string;
  name: string;
  createdAt: string;
  url: string;
  program: string;
}

interface AccessInfo {
  source: string;
  expiresAt?: string;
}

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [noAccess, setNoAccess] = useState(false);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRecordings() {
      try {
        const res = await fetch("/api/recordings", { cache: "no-store" });

        if (res.status === 401) {
          if (!cancelled) setNotLoggedIn(true);
          return;
        }

        if (res.status === 403) {
          if (!cancelled) setNoAccess(true);
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load recordings");
        }

        const data = await res.json();
        if (!cancelled) {
          setRecordings(data.recordings);
          setAccessInfo(data.accessInfo);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Failed to load recordings. Please try again.");
        }
      }
    }

    fetchRecordings().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notLoggedIn) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-light tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Recordings</h1>
          <p className="text-muted-foreground mt-2 text-sm">Revisit your sessions anytime</p>
        </div>
        <Card className="void-card max-w-lg mx-auto text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-[rgba(196,136,58,0.1)] flex items-center justify-center mb-3">
              <Lock className="w-6 h-6 text-[#C4883A]" />
            </div>
            <CardTitle className="text-xl" style={{ fontFamily: "var(--font-display)" }}>Sign in to continue</CardTitle>
            <CardDescription>
              Please sign in to access your recordings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/auth/sign-in?redirect_url=/app/recordings"
              className="inline-flex items-center justify-center rounded-md bg-[#C4883A] text-white px-6 py-2 text-sm font-medium hover:bg-[#d4984a] transition-colors">
              Sign in
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (noAccess) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-light tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Recordings</h1>
          <p className="text-muted-foreground mt-2 text-sm">Revisit your sessions anytime</p>
        </div>
        <Card className="void-card max-w-lg mx-auto text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-[rgba(196,136,58,0.1)] flex items-center justify-center mb-3">
              <Lock className="w-6 h-6 text-[#C4883A]" />
            </div>
            <CardTitle className="text-xl" style={{ fontFamily: "var(--font-display)" }}>Recording Access</CardTitle>
            <CardDescription>
              Recordings are included with all active Mukha Mudra memberships. Get a membership to access all your class recordings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/pricing"
              className="inline-flex items-center justify-center rounded-md bg-[#C4883A] text-white px-6 py-2 text-sm font-medium hover:bg-[#d4984a] transition-colors">
              Get a Membership
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl md:text-3xl font-light tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Recordings</h1>
        <Card className="void-card text-center py-12">
          <CardContent><p className="text-muted-foreground">{error}</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-light tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Recordings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Included with your membership</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#C4883A]">
          <Film className="w-4 h-4" />
          <span>{recordings.length} recordings</span>
        </div>
      </div>

      {recordings.length === 0 ? (
        <Card className="void-card text-center py-12">
          <CardContent>
            <Film className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No recordings available yet. New recordings will appear here automatically as your teacher uploads them.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recordings.map((recording) => (
            <Card key={recording.id} className="void-card group">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm leading-snug">{recording.name.replace(/\.[^.]+$/, "")}</p>
                  <span className="text-xs px-2 py-0.5 rounded bg-[rgba(196,136,58,0.1)] text-[#C4883A] flex-shrink-0">
                    {recording.program}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {new Date(recording.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
                <a href={recording.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#C4883A] hover:text-[#d4984a] transition-colors">
                  <Play className="w-4 h-4" />
                  Watch Recording
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
