"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ru/ui";
import { Lock, Loader2, ChevronRight, Wind, Sparkles } from "lucide-react";
import { RecordingAddonCheckout } from "@/components/recording-addon-checkout";
import { useRecordings } from "./use-recordings";

const PROGRAMS = [
  {
    key: "Pranayama",
    title: "Pranayama",
    blurb: "Breathwork practice recordings",
    href: "/app/recordings/pranayama",
    icon: Wind,
  },
  {
    key: "Face Yoga",
    title: "Face Yoga",
    blurb: "Face yoga practice recordings",
    href: "/app/recordings/face-yoga",
    icon: Sparkles,
  },
];

export default function RecordingsPage() {
  const router = useRouter();
  const { recordings, accessInfo, loading, noAccess, notLoggedIn, error } = useRecordings();

  const programsPresent = useMemo(
    () => Array.from(new Set(recordings.map((r) => r.program))),
    [recordings]
  );

  const singleProgram =
    !loading && !noAccess && !notLoggedIn && !error && programsPresent.length === 1
      ? PROGRAMS.find((p) => p.key === programsPresent[0])
      : null;

  useEffect(() => {
    if (singleProgram) {
      router.replace(singleProgram.href);
    }
  }, [singleProgram, router]);

  if (loading || singleProgram) {
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
      <div>
        <h1 className="text-2xl md:text-3xl font-light tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Recordings</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Revisit your sessions anytime
          {accessInfo?.expiresAt && (
            <> · expires {new Date(accessInfo.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</>
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PROGRAMS.map((program) => {
          const count = recordings.filter((r) => r.program === program.key).length;
          return (
            <Link key={program.key} href={program.href}>
              <Card className="void-card group cursor-pointer h-full transition-colors hover:border-[rgba(196,136,58,0.4)]">
                <CardContent className="p-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-[rgba(196,136,58,0.1)] flex items-center justify-center flex-shrink-0">
                      <program.icon className="w-5 h-5 text-[#C4883A]" />
                    </div>
                    <div>
                      <p className="font-medium" style={{ fontFamily: "var(--font-display)" }}>{program.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{program.blurb}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                    <span className="text-xs">{count} {count === 1 ? "recording" : "recordings"}</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
