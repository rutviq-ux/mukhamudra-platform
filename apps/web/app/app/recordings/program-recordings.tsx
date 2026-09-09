"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ru/ui";
import { Film, Lock, Play, Calendar, Loader2, ArrowLeft } from "lucide-react";
import { RecordingAddonCheckout } from "@/components/recording-addon-checkout";
import { useRecordings } from "./use-recordings";

export function ProgramRecordings({
  program,
  title,
  subtitle,
}: {
  program: string;
  title: string;
  subtitle: string;
}) {
  const { recordings, accessInfo, loading, noAccess, notLoggedIn, error } = useRecordings();

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
          <h1 className="text-2xl md:text-3xl font-light tracking-wide" style={{ fontFamily: "var(--font-display)" }}>{title}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>
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
          <h1 className="text-2xl md:text-3xl font-light tracking-wide" style={{ fontFamily: "var(--font-display)" }}>{title}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>
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
        <h1 className="text-2xl md:text-3xl font-light tracking-wide" style={{ fontFamily: "var(--font-display)" }}>{title}</h1>
        <Card className="void-card text-center py-12">
          <CardContent><p className="text-muted-foreground">{error}</p></CardContent>
        </Card>
      </div>
    );
  }

  const programRecordings = recordings.filter((r) => r.program === program);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/app/recordings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-3.5 h-3.5" />
          All Recordings
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-light tracking-wide" style={{ fontFamily: "var(--font-display)" }}>{title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {subtitle}
              {accessInfo?.expiresAt && (
                <> · expires {new Date(accessInfo.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#C4883A]">
            <Film className="w-4 h-4" />
            <span>{programRecordings.length} recordings</span>
          </div>
        </div>
      </div>

      {programRecordings.length === 0 ? (
        <Card className="void-card text-center py-12">
          <CardContent>
            <Film className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No recordings available yet. New recordings will appear here automatically as your teacher uploads them.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programRecordings.map((recording) => (
            <Card key={recording.id} className="void-card group">
              <CardContent className="p-5 space-y-3">
                <p className="font-medium text-sm leading-snug">{recording.name.replace(/\.[^.]+$/, "")}</p>
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
