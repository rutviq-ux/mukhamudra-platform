"use client";

import { Suspense, type ReactNode, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Preload, PerformanceMonitor } from "@react-three/drei";
import { useWebGL, type DeviceTier } from "./use-webgl";
import { useThemeMode } from "./use-theme";

interface SceneProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  frameloop?: "always" | "demand" | "never";
}

const DPR_BY_TIER: Record<DeviceTier, [number, number]> = {
  high: [1, 2],
  medium: [1, 1.5],
  low: [1, 1],
};

export function SceneProvider({
  children,
  fallback = null,
  className,
  style,
  frameloop = "always",
}: SceneProviderProps) {
  const { supported, tier } = useWebGL();
  const { colors } = useThemeMode();

  // Performance monitor callbacks - dynamically adjust quality
  const onDecline = useCallback(() => {
    // Could trigger a state change to reduce quality further
    // For now, the tier-based system handles this
  }, []);

  if (!supported) {
    return <>{fallback}</>;
  }

  return (
    <Canvas
      className={className}
      style={style}
      dpr={DPR_BY_TIER[tier]}
      frameloop={frameloop}
      gl={{
        antialias: tier === "high",
        alpha: true,
        powerPreference: tier === "high" ? "high-performance" : "default",
        failIfMajorPerformanceCaveat: true,
      }}
      scene={{ background: colors.background }}
      camera={{ position: [0, 0, 5], fov: 50 }}
      // Flatten scene graph for better performance
      flat={tier !== "high"}
    >
      {tier === "high" && (
        <PerformanceMonitor
          onDecline={onDecline}
          flipflops={3}
          factor={0.5}
        />
      )}
      <Suspense fallback={null}>
        {children}
        <Preload all />
      </Suspense>
    </Canvas>
  );
}

export { useWebGL, type DeviceTier };
