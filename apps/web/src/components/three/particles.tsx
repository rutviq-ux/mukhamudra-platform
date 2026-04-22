"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useThemeMode } from "./use-theme";

interface ParticleFieldProps {
  count?: number;
  radius?: number;
  size?: number;
  speed?: number;
  opacity?: number;
  spread?: number; // 0-1, controlled by scroll
}

export function ParticleField({
  count = 200,
  radius = 3,
  size = 0.02,
  speed = 0.3,
  opacity = 0.5,
  spread = 0,
}: ParticleFieldProps) {
  const { colors: themeColors } = useThemeMode();
  const colors = [themeColors.particle1, themeColors.particle2, themeColors.particle3, themeColors.particle4];
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const timeRef = useRef(0);

  const { positions, colorAttrib, speeds, offsets } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const off = new Float32Array(count * 3);
    const colorObjects = colors;

    for (let i = 0; i < count; i++) {
      // Distribute in a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * Math.cbrt(Math.random());

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      // Random color from palette
      const color = colorObjects[Math.floor(Math.random() * colorObjects.length)]!;
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;

      // Random speed multiplier
      spd[i] = 0.5 + Math.random() * 1.0;

      // Random offset for orbit
      off[i * 3] = Math.random() * Math.PI * 2;
      off[i * 3 + 1] = Math.random() * Math.PI * 2;
      off[i * 3 + 2] = Math.random() * Math.PI * 2;
    }

    return { positions: pos, colorAttrib: col, speeds: spd, offsets: off };
  }, [count, radius, colors]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta * speed;
    const t = timeRef.current;
    const spreadFactor = 1 + spread * 2;

    for (let i = 0; i < count; i++) {
      const baseX = positions[i * 3]!;
      const baseY = positions[i * 3 + 1]!;
      const baseZ = positions[i * 3 + 2]!;
      const si = speeds[i]!;
      const ox = offsets[i * 3]!;
      const oy = offsets[i * 3 + 1]!;
      const oz = offsets[i * 3 + 2]!;

      // Gentle orbital motion
      dummy.position.set(
        baseX * spreadFactor + Math.sin(t * si + ox) * 0.15,
        baseY * spreadFactor + Math.cos(t * si * 0.7 + oy) * 0.1,
        baseZ * spreadFactor + Math.sin(t * si * 0.5 + oz) * 0.12,
      );

      // Gentle pulsing scale
      const scale = size * (0.8 + 0.4 * Math.sin(t * si * 0.5 + ox));
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        transparent
        opacity={opacity}
        vertexColors={false}
        color={themeColors.surface}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
