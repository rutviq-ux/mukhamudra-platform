"use client";

import { EffectComposer, Bloom } from "@react-three/postprocessing";
import type { DeviceTier } from "./use-webgl";

interface SceneEffectsProps {
  tier?: DeviceTier;
}

export function SceneEffects({ tier = "high" }: SceneEffectsProps) {
  // Skip post-processing on low-end devices
  if (tier === "low") return null;

  return (
    <EffectComposer multisampling={tier === "high" ? 4 : 0}>
      <Bloom
        intensity={0.4}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
    </EffectComposer>
  );
}
