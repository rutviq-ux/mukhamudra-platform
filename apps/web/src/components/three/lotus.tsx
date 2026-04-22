"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AuraMaterial } from "./shaders/aura-material";
import { useThemeMode } from "./use-theme";

interface LotusPetalProps {
  index: number;
  total: number;
  layer: number;
}

function LotusPetal({ index, total, layer }: LotusPetalProps) {
  const ref = useRef<THREE.Group>(null);
  const angle = (index / total) * Math.PI * 2;
  const layerOffset = layer * 0.3;
  const layerScale = 1 - layer * 0.2;
  const openAngle = 0.4 + layer * 0.25; // outer petals more open

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // Gentle breathing oscillation
    const breathe = Math.sin(t * 0.4 + index * 0.3) * 0.03;
    ref.current.rotation.x = -openAngle + breathe;
    ref.current.position.y = layerOffset + Math.sin(t * 0.3 + index * 0.2) * 0.02;
  });

  return (
    <group rotation={[0, angle, 0]}>
      <group ref={ref} position={[0, layerOffset, 0]}>
        <mesh
          position={[0, 0, 0.35 * layerScale]}
          scale={[0.3 * layerScale, 0.02, 0.5 * layerScale]}
        >
          <sphereGeometry args={[1, 16, 12]} />
          <AuraMaterial
            noiseScale={2}
            noiseStrength={0.08}
            opacity={0.7 - layer * 0.1}
            colorSet={layer % 2 === 0 ? "gold" : "ivory"}
          />
        </mesh>
      </group>
    </group>
  );
}

interface LotusProps {
  scale?: number;
  position?: [number, number, number];
}

export function Lotus({ scale = 1, position = [0, 0, 0] }: LotusProps) {
  const { colors } = useThemeMode();
  const groupRef = useRef<THREE.Group>(null);

  // Build petal layers
  const petalConfig = useMemo(
    () => [
      { count: 5, layer: 0 },
      { count: 7, layer: 1 },
      { count: 9, layer: 2 },
    ],
    [],
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Very slow rotation
    groupRef.current.rotation.y = t * 0.05;
    // Gentle float
    groupRef.current.position.y = position[1] + Math.sin(t * 0.25) * 0.05;
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Center core - glowing orb */}
      <mesh scale={0.18}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial
          color={colors.primary}
          emissive={colors.primary}
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* Petal layers */}
      {petalConfig.map((config) =>
        Array.from({ length: config.count }).map((_, i) => (
          <LotusPetal
            key={`${config.layer}-${i}`}
            index={i}
            total={config.count}
            layer={config.layer}
          />
        )),
      )}

      {/* Halo ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={1.4}>
        <torusGeometry args={[1, 0.01, 8, 64]} />
        <meshBasicMaterial
          color={colors.surface}
          transparent
          opacity={0.2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
