"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { useThemeMode } from "./use-theme";

interface FloatingIconContentProps {
  variant: "sparkle" | "spiral";
}

function SparkleGeometry() {
  const ref = useRef<THREE.Group>(null);
  const { colors } = useThemeMode();

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.3;
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
  });

  return (
    <group ref={ref}>
      {/* Central star shape from intersecting planes */}
      {[0, 60, 120].map((angle) => (
        <mesh key={angle} rotation={[0, (angle * Math.PI) / 180, 0]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshStandardMaterial
            color={colors.primary}
            emissive={colors.primary}
            emissiveIntensity={0.4}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
      {/* Glowing center */}
      <mesh scale={0.08}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color={colors.surface} toneMapped={false} />
      </mesh>
    </group>
  );
}

function SpiralGeometry() {
  const ref = useRef<THREE.Group>(null);
  const { colors } = useThemeMode();

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.4;
  });

  return (
    <group ref={ref}>
      {/* Spiral torus knot */}
      <mesh>
        <torusKnotGeometry args={[0.2, 0.05, 64, 8, 2, 3]} />
        <meshStandardMaterial
          color={colors.accent}
          emissive={colors.accent}
          emissiveIntensity={0.3}
          transparent
          opacity={0.7}
          roughness={0.4}
        />
      </mesh>
      {/* Orbit ring */}
      <mesh rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[0.35, 0.005, 8, 32]} />
        <meshBasicMaterial
          color={colors.surface}
          transparent
          opacity={0.4}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export function FloatingIconContent({ variant }: FloatingIconContentProps) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[2, 2, 2]} intensity={0.4} />
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        {variant === "sparkle" ? <SparkleGeometry /> : <SpiralGeometry />}
      </Float>
    </>
  );
}
