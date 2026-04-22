"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Environment } from "@react-three/drei";
import * as THREE from "three";
import { Lotus } from "./lotus";
import { ParticleField } from "./particles";
import { SceneEffects } from "./effects";
import { useThemeMode } from "./use-theme";
import type { DeviceTier } from "./use-webgl";

interface HeroSceneContentProps {
  scrollProgress?: number;
  tier?: DeviceTier;
}

const PARTICLE_COUNTS: Record<DeviceTier, number> = {
  high: 300,
  medium: 150,
  low: 80,
};

function Lighting() {
  const { colors } = useThemeMode();
  return (
    <>
      <ambientLight intensity={colors.ambientIntensity} color={colors.ambient} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={colors.directionalIntensity}
        color={colors.primary}
      />
      <pointLight
        position={[-3, 2, 2]}
        intensity={0.3}
        color={colors.primary}
        distance={10}
      />
      <pointLight
        position={[2, -2, 3]}
        intensity={0.2}
        color={colors.accent}
        distance={8}
      />
    </>
  );
}

function ThemeOrbs() {
  const { colors } = useThemeMode();
  return (
    <>
      <mesh position={[2.5, 1.2, -2]} scale={0.12}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={colors.primary}
          transparent
          opacity={0.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-2.8, -1, -1.5]} scale={0.08}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          color={colors.surface}
          transparent
          opacity={0.3}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

export function HeroSceneContent({
  scrollProgress = 0,
  tier = "high",
}: HeroSceneContentProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Camera and scene respond to scroll
  useFrame((state) => {
    if (!groupRef.current) return;

    // Zoom out as user scrolls
    const targetZ = 5 + scrollProgress * 8;
    state.camera.position.z = THREE.MathUtils.lerp(
      state.camera.position.z,
      targetZ,
      0.05,
    );

    // Fade out the scene as scroll progresses
    const targetOpacity = Math.max(0, 1 - scrollProgress * 2);
    groupRef.current.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.Material;
        if ("opacity" in mat) {
          (mat as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(
            (mat as THREE.MeshBasicMaterial).opacity,
            targetOpacity,
            0.05,
          );
        }
      }
    });
  });

  const particleCount = PARTICLE_COUNTS[tier];

  return (
    <>
      <Lighting />

      <group ref={groupRef}>
        {/* Main lotus - offset to the left to match hero layout */}
        <Float
          speed={1.5}
          rotationIntensity={0.1}
          floatIntensity={0.3}
          floatingRange={[-0.05, 0.05]}
        >
          <Lotus scale={1.2} position={[-1.2, 0, 0]} />
        </Float>

        {/* Particle field */}
        <ParticleField
          count={particleCount}
          radius={3.5}
          size={0.015}
          speed={0.2}
          opacity={0.5}
          spread={scrollProgress}
        />

        {/* Secondary smaller orbs for depth */}
        <ThemeOrbs />
      </group>

      {tier !== "low" && <SceneEffects tier={tier} />}
      <Environment preset="night" environmentIntensity={0.1} />
    </>
  );
}
