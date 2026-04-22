"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hook that tracks scroll progress of the page (0 = top, 1 = bottom).
 * Returns a ref that updates every frame for smooth Three.js integration.
 */
export function useScrollProgress() {
  const progressRef = useRef(0);

  useEffect(() => {
    function onScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      progressRef.current = docHeight > 0 ? scrollTop / docHeight : 0;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // Initial value
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return progressRef;
}

/**
 * Component version that provides scroll progress as state (for non-Three.js usage).
 */
export function useScrollProgressState() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? scrollTop / docHeight : 0);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return progress;
}
