"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "complete">("idle");
  const prevPathname = useRef(pathname);

  // Detect link clicks to start the progress bar before pathname changes
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        anchor.target === "_blank"
      ) {
        return;
      }

      // Only trigger for internal navigations to a different path
      if (href !== pathname) {
        setState("loading");
      }
    }

    document.addEventListener("click", handleClick, { capture: true });
    return () =>
      document.removeEventListener("click", handleClick, { capture: true });
  }, [pathname]);

  // Complete the progress bar when pathname changes
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;

      if (state === "loading") {
        setState("complete");
        const timer = setTimeout(() => setState("idle"), 400);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname, state]);

  if (state === "idle") return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 40,
        pointerEvents: "none",
      }}
    >
      {/* Main progress bar */}
      <div
        style={{
          height: "100%",
          background: "#2E9E86",
          boxShadow:
            "0 0 12px rgba(46, 158, 134, 0.6), 0 0 24px rgba(46, 158, 134, 0.25)",
          transformOrigin: "left",
          position: "relative",
          overflow: "hidden",
          animation:
            state === "loading"
              ? "nav-progress 8s cubic-bezier(0.22, 1, 0.36, 1) forwards"
              : "nav-progress-complete 400ms ease-out forwards",
        }}
      >
        {/* Traveling shimmer highlight */}
        {state === "loading" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              width: "30%",
              height: "100%",
              background:
                "linear-gradient(90deg, transparent, rgba(255, 248, 230, 0.6), transparent)",
              animation: "nav-shimmer 1.5s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {/* Soft glow bloom underneath */}
      <div
        style={{
          height: 4,
          background:
            "linear-gradient(90deg, transparent 5%, rgba(46, 158, 134, 0.15), transparent 95%)",
          transformOrigin: "left",
          animation:
            state === "loading"
              ? "nav-progress 8s cubic-bezier(0.22, 1, 0.36, 1) forwards"
              : "nav-progress-complete 400ms ease-out forwards",
        }}
      />
    </div>
  );
}
