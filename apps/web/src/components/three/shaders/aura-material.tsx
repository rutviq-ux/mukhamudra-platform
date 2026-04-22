"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { simplexNoise3D } from "./noise";

// Mukha Mudra palette
const COLORS = {
  gold: new THREE.Color("#C4883A"),
  emerald: new THREE.Color("#2E9E86"),
  ivory: new THREE.Color("#F0E8D8"),
  vermillion: new THREE.Color("#C8302C"),
  ambient: new THREE.Color("#0A1512"),
};

const vertexShader = /* glsl */ `
  ${simplexNoise3D}

  uniform float uTime;
  uniform float uNoiseScale;
  uniform float uNoiseStrength;

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying float vNoise;

  void main() {
    vec3 pos = position;
    float noise = snoise(pos * uNoiseScale + uTime * 0.15) * uNoiseStrength;
    pos += normal * noise;
    vNoise = noise;
    vPosition = pos;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying float vNoise;

  void main() {
    // Mix colors based on position and noise
    float mixFactor1 = smoothstep(-1.0, 1.0, vPosition.y + vNoise * 0.5);
    float mixFactor2 = smoothstep(-0.5, 0.5, sin(vPosition.x * 2.0 + uTime * 0.3));

    vec3 color = mix(uColor1, uColor2, mixFactor1);
    color = mix(color, uColor3, mixFactor2 * 0.3);

    // Soft rim lighting
    float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
    rim = pow(rim, 2.0);
    color += rim * 0.15;

    // Fresnel glow
    float fresnel = pow(rim, 3.0) * 0.4;

    gl_FragColor = vec4(color, (uOpacity - fresnel * 0.3) * smoothstep(0.0, 0.3, uOpacity));
  }
`;

interface AuraMaterialProps {
  noiseScale?: number;
  noiseStrength?: number;
  opacity?: number;
  colorSet?: "gold" | "ivory";
}

export function AuraMaterial({
  noiseScale = 1.2,
  noiseStrength = 0.15,
  opacity = 0.85,
  colorSet = "gold",
}: AuraMaterialProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => {
    const colors = colorSet === "gold"
      ? { c1: COLORS.gold, c2: COLORS.ivory, c3: COLORS.ambient }
      : { c1: COLORS.ivory, c2: COLORS.gold, c3: COLORS.emerald };

    return {
      uTime: { value: 0 },
      uNoiseScale: { value: noiseScale },
      uNoiseStrength: { value: noiseStrength },
      uOpacity: { value: opacity },
      uColor1: { value: colors.c1 },
      uColor2: { value: colors.c2 },
      uColor3: { value: colors.c3 },
    };
  }, [noiseScale, noiseStrength, opacity, colorSet]);

  useFrame((_, delta) => {
    if (materialRef.current?.uniforms.uTime) {
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <shaderMaterial
      ref={materialRef}
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={uniforms}
      transparent
      side={THREE.DoubleSide}
      depthWrite={false}
    />
  );
}

export { COLORS as AURA_COLORS };
