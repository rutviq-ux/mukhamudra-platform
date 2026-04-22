"use client";

import { useState, useEffect } from "react";

export type DeviceTier = "high" | "medium" | "low";

interface WebGLInfo {
  supported: boolean;
  tier: DeviceTier;
}

function detectWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") || canvas.getContext("webgl")
    );
  } catch {
    return false;
  }
}

function detectTier(): DeviceTier {
  if (typeof window === "undefined") return "low";

  // Respect reduced motion preference
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return "low";
  }

  const cores = navigator.hardwareConcurrency || 2;
  const memory = (navigator as { deviceMemory?: number }).deviceMemory || 4;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const width = window.innerWidth;

  // Low: mobile with small screen or very low resources
  if ((isMobile && width < 768) || cores <= 2 || memory < 2) {
    return "low";
  }

  // Medium: mobile/tablet with decent specs, or older desktop
  if (isMobile || cores <= 4 || memory < 4) {
    return "medium";
  }

  // High: desktop with good specs
  return "high";
}

export function useWebGL(): WebGLInfo {
  const [info, setInfo] = useState<WebGLInfo>({ supported: false, tier: "low" });

  useEffect(() => {
    const supported = detectWebGL();
    const tier = supported ? detectTier() : "low";
    setInfo({ supported, tier });
  }, []);

  return info;
}
