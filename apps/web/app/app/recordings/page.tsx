"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ru/ui";
import { Film, Lock, Play, Calendar, Loader2 } from "lucide-react";
import { RecordingAddonCheckout } from "@/components/recording-addon-checkout";

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

  // NEW: which program tab is active. "All" always exists; program-specific
  // tabs are derived from whatever the API actually returned, so a user
  // enrolled in only one program never sees a tab for the other one.
  const [activeFilter, setActiveFilter] = useState<string>("All");

  useEffect(() => {
    let cancelled = false;

    async function fetchRecordings() {
      // If returning from a successful add-on checkout, the webhook may still
      // be in-flight — retry on 403 with backoff for up to ~10s.
      const justPaid =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).has("addon");
      const maxAttempts = justPaid ? 8 : 1;
      const delays = [500, 1000, 1500, 1500, 1500, 1500, 1500, 2000];

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const res = await fetch("/api/recordings", { cache: "no-store" });

          if (res.status === 401) {
            if (!cancelled) setNotLoggedIn(true);
            return;
          }

          if (res.status === 403) {
            if (attempt < maxAttempts - 1) {
              await new Promise((r) => setTimeout(r, delays[attempt]));
              continue;
            }
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

            // Clean up the ?addon=1 hint from the URL once we've loaded
            if (justPaid && typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.delete("addon");
              window.history.replaceState({}, "", url.toString());
            }
          }
          return;
        } catch (err: any) {
          if (attempt === maxAttempts - 1 && !cancelled) {
            setError(err?.message ?? "Failed to load recordings. Please try again.");
            return;
          }
          await new Promise((r) => setTimeout(r, delays[attempt] ?? 1500));
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

  // NEW: distinct programs actually present in this user's recordings.
  // Because /api/recordings already scopes results to the user's active
  // membership(s), this list can never include a program the user isn't
  // enrolled in — it's purely a display grouping, not an access check.
  const availablePrograms = useMemo(
    () => Array.from(new Set(recordings.map((r) => r.program))).sort(),
    [recordings],
  );

  const filteredRecordings = useMemo(
    () =>
      activeFilter === "All"
        ? recordings
        : recordings.filter((r) => r.program === activeFilter),
    [recordings, activeFilter],
  );

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
              Recording access is ₹1,000/year and is available to all active members (monthly or annual). Sign in and make sure your subscription is current, then add access below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecordingAddonCheckout />
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
          <p className="text-muted-foreground mt-1 text-sm">
            Recording Add-on
            {accessInfo?.expiresAt && (
              <> · expires {new Date(accessInfo.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#C4883A]">
          <Film className="w-4 h-4" />
          <span>{filteredRecordings.length} recordings</span>
        </div>
      </div>

      {/* NEW: program filter — only rendered when there's more than one
          program to choose between, so single-program members never see it */}
      {availablePrograms.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {["All", ...availablePrograms].map((program) => (
            <button
              key={program}
              type="button"
              onClick={() => setActiveFilter(program)}
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                activeFilter === program
                  ? "bg-[#C4883A] text-white border-[#C4883A]"
                  : "border-[rgba(196,136,58,0.3)] text-muted-foreground hover:text-[#C4883A]"
              }`}
            >
              {program}
            </button>
          ))}
        </div>
      )}

      {filteredRecordings.length === 0 ? (
        <Card className="void-card text-center py-12">
          <CardContent>
            <Film className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {recordings.length === 0
                ? "No recordings available yet. New recordings will appear here automatically as your teacher uploads them."
                : `No ${activeFilter} recordings yet.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecordings.map((recording) => (
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
