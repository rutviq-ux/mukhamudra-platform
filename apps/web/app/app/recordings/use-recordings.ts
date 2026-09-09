"use client";

import { useEffect, useState } from "react";

export interface Recording {
  id: string;
  name: string;
  createdAt: string;
  url: string;
  program: string;
}

export interface AccessInfo {
  source: string;
  expiresAt?: string;
}

export function useRecordings() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [noAccess, setNoAccess] = useState(false);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return { recordings, accessInfo, loading, noAccess, notLoggedIn, error };
}
