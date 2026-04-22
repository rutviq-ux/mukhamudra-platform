"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  ToneMapping,
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { useThemeMode } from "./use-theme";
import { simplexNoise3D } from "./shaders/noise";
import type { DeviceTier } from "./use-webgl";

/* ════════════════════════════════════════════════════
   QUALITY CONFIG — tier-based rendering budget
   ════════════════════════════════════════════════════ */

interface QualityConfig {
  fbmOctaves: number;
  coreSegments: number;
  shell1Segments: number;
  shell2Segments: number;
  ringSegments: number;
  innerParticles: number;
  outerParticles: number;
  msaa: number;
  enableChromatic: boolean;
  bloomIntensity: number;
  bloomRadius: number;
}

const QUALITY: Record<DeviceTier, QualityConfig> = {
  high: {
    fbmOctaves: 5,
    coreSegments: 128,
    shell1Segments: 64,
    shell2Segments: 48,
    ringSegments: 256,
    innerParticles: 120,
    outerParticles: 80,
    msaa: 4,
    enableChromatic: true,
    bloomIntensity: 1.8,
    bloomRadius: 0.85,
  },
  medium: {
    fbmOctaves: 4,
    coreSegments: 80,
    shell1Segments: 48,
    shell2Segments: 32,
    ringSegments: 192,
    innerParticles: 80,
    outerParticles: 50,
    msaa: 0,
    enableChromatic: false,
    bloomIntensity: 1.6,
    bloomRadius: 0.8,
  },
  low: {
    fbmOctaves: 3,
    coreSegments: 48,
    shell1Segments: 32,
    shell2Segments: 24,
    ringSegments: 128,
    innerParticles: 50,
    outerParticles: 30,
    msaa: 0,
    enableChromatic: false,
    bloomIntensity: 1.4,
    bloomRadius: 0.75,
  },
};

/* ════════════════════════════════════════════════════
   BREATH ENGINE
   ════════════════════════════════════════════════════ */

const PHASES = { inhale: 4, hold: 4, exhale: 6 };
const TOTAL_CYCLE = PHASES.inhale + PHASES.hold + PHASES.exhale;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getBreathProgress(elapsed: number) {
  const t = elapsed % TOTAL_CYCLE;
  if (t < PHASES.inhale) {
    const p = t / PHASES.inhale;
    return { scale: easeInOutCubic(p), phase: "inhale" as const, phaseProgress: p };
  } else if (t < PHASES.inhale + PHASES.hold) {
    const p = (t - PHASES.inhale) / PHASES.hold;
    return { scale: 1, phase: "hold" as const, phaseProgress: p };
  } else {
    const p = (t - PHASES.inhale - PHASES.hold) / PHASES.exhale;
    return { scale: 1 - easeInOutCubic(p), phase: "exhale" as const, phaseProgress: p };
  }
}

/* ════════════════════════════════════════════════════
   GLSL — Tier-aware FBM noise
   ════════════════════════════════════════════════════ */

function makeFbmGLSL(octaves: number) {
  return /* glsl */ `
${simplexNoise3D}

float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < ${octaves}; i++) {
    value += amplitude * snoise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.1;
  }
  return value;
}
`;
}

/* ════════════════════════════════════════════════════
   SHADER FACTORIES
   ════════════════════════════════════════════════════ */

function makeCoreVertexShader(octaves: number) {
  return /* glsl */ `
${makeFbmGLSL(octaves)}

uniform float uTime;
uniform float uBreath;
uniform float uDisplaceStrength;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;
varying float vDisplacement;
varying float vFresnel;

void main() {
  // FBM displacement — breathing, living surface
  vec3 noiseCoord = position * 1.8 + uTime * 0.12;
  float displacement = fbm(noiseCoord) * uDisplaceStrength;

  // Secondary faster turbulence layer
  float turbulence = snoise(position * 4.0 + uTime * 0.4) * uDisplaceStrength * 0.3;

  vec3 displaced = position + normal * (displacement + turbulence);
  vDisplacement = displacement + turbulence;

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);

  // Fresnel — view-angle dependent edge glow
  vFresnel = 1.0 - max(dot(vViewDir, vNormal), 0.0);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;
}

function makeCoreFragmentShader(octaves: number) {
  return /* glsl */ `
${makeFbmGLSL(octaves)}

uniform float uTime;
uniform float uBreath;
uniform float uEmissiveBoost;
uniform vec3 uColorHot;     // white-hot center
uniform vec3 uColorWarm;    // primary gold
uniform vec3 uColorCool;    // accent indigo
uniform vec3 uColorRim;     // rim glow color

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;
varying float vDisplacement;
varying float vFresnel;

void main() {
  float fresnel = vFresnel;
  float fresnelPow2 = pow(fresnel, 2.0);
  float fresnelPow4 = pow(fresnel, 4.0);

  // Animated internal noise — the "plasma" look
  float plasma = fbm(vWorldPos * 2.5 + uTime * 0.2);
  float plasma2 = snoise(vWorldPos * 5.0 - uTime * 0.35) * 0.5 + 0.5;

  // Color temperature gradient: hot center -> warm -> cool rim
  vec3 baseColor = mix(uColorHot, uColorWarm, smoothstep(0.0, 0.6, fresnel));
  baseColor = mix(baseColor, uColorCool, smoothstep(0.4, 1.0, fresnel) * 0.4);

  // Plasma veins — bright streaks across the surface
  float veins = smoothstep(0.2, 0.8, plasma2) * 0.6;
  baseColor = mix(baseColor, uColorHot, veins * (1.0 - fresnelPow2) * 0.5);

  // Subsurface scattering approximation
  float sss = pow(max(0.0, dot(vNormal, normalize(vec3(1.0, 0.5, 0.5)))), 2.0);
  sss += pow(max(0.0, dot(vNormal, normalize(vec3(-0.5, -0.3, 0.8)))), 2.0) * 0.5;
  baseColor += uColorWarm * sss * 0.15;

  // Rim glow — bright edge emission drives the bloom
  vec3 rimGlow = uColorRim * fresnelPow4 * (1.5 + uEmissiveBoost * 0.5);

  // Emissive core — everything glows, center glows most
  float coreGlow = (1.0 - fresnel) * (0.8 + plasma * 0.4) * uEmissiveBoost;

  vec3 finalColor = baseColor * (1.0 + coreGlow) + rimGlow;

  // Add breath-reactive pulse — subtle brightening
  finalColor *= 1.0 + uBreath * 0.3;

  gl_FragColor = vec4(finalColor, 0.95 - fresnelPow4 * 0.1);
}
`;
}

// Atmosphere vertex — pure pass-through, no noise needed
const atmosVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

function makeAtmosFragmentShader(octaves: number) {
  return /* glsl */ `
${makeFbmGLSL(octaves)}

uniform float uTime;
uniform float uBreath;
uniform float uOpacity;
uniform vec3 uColorInner;
uniform vec3 uColorOuter;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;

void main() {
  float fresnel = 1.0 - max(dot(vViewDir, vNormal), 0.0);
  float fresnelEdge = pow(fresnel, 3.0);

  // Wispy noise pattern — like atmospheric haze
  float noise1 = fbm(vWorldPos * 1.2 + uTime * 0.08);
  float noise2 = snoise(vWorldPos * 3.0 - uTime * 0.15) * 0.5 + 0.5;
  float wisps = smoothstep(0.1, 0.7, noise1) * noise2;

  // Color gradient from inner warm to outer cool
  vec3 color = mix(uColorInner, uColorOuter, fresnelEdge);

  // Opacity: visible only at edges + wispy patches
  float alpha = fresnelEdge * (0.15 + wisps * 0.2) * uOpacity;
  alpha += wisps * 0.05 * uOpacity; // subtle interior wisps

  // Boost emission so bloom catches it
  color *= 1.5;

  gl_FragColor = vec4(color, alpha);
}
`;
}

// Ring shaders — only need snoise, not full FBM
const ringVertexShader = /* glsl */ `
${simplexNoise3D}

uniform float uTime;

varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const ringFragmentShader = /* glsl */ `
${simplexNoise3D}

uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;

varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  // Flowing noise along the ring
  float noise = snoise(vWorldPos * 2.0 + vec3(uTime * 0.3, 0.0, uTime * 0.2));
  float pattern = smoothstep(-0.3, 0.5, noise);

  // Pulse running along the ring
  float pulse = sin(vUv.x * 6.283 * 3.0 + uTime * 1.5) * 0.5 + 0.5;

  float alpha = pattern * uOpacity * (0.5 + pulse * 0.5);

  // Bright enough to trigger bloom
  vec3 color = uColor * (1.5 + pulse * 0.5);

  gl_FragColor = vec4(color, alpha);
}
`;

/* ════════════════════════════════════════════════════
   COMPONENT: VFX Plasma Core
   ════════════════════════════════════════════════════ */

function VFXCore({
  breathRef,
  octaves,
  segments,
}: {
  breathRef: React.RefObject<{ scale: number; emissive: number }>;
  octaves: number;
  segments: number;
}) {
  const { colors } = useThemeMode();
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const shaders = useMemo(
    () => ({
      vertex: makeCoreVertexShader(octaves),
      fragment: makeCoreFragmentShader(octaves),
    }),
    [octaves],
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBreath: { value: 0 },
      uDisplaceStrength: { value: 0.06 },
      uEmissiveBoost: { value: 0.5 },
      uColorHot: { value: new THREE.Color("#FFF5E6") },
      uColorWarm: { value: colors.primary.clone() },
      uColorCool: { value: colors.accent.clone() },
      uColorRim: { value: colors.primary.clone().multiplyScalar(1.5) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state) => {
    if (!matRef.current || !meshRef.current || !breathRef.current) return;
    const t = state.clock.elapsedTime;
    const b = breathRef.current;

    matRef.current.uniforms.uTime!.value = t;
    matRef.current.uniforms.uBreath!.value = b.scale;
    matRef.current.uniforms.uEmissiveBoost!.value = 0.4 + b.emissive * 0.8;
    matRef.current.uniforms.uDisplaceStrength!.value = 0.04 + b.scale * 0.06;

    // Smooth scale
    const s = 0.7 + b.scale * 0.35;
    meshRef.current.scale.setScalar(s);
    meshRef.current.rotation.y = t * 0.03;

    // Lerp colors to theme
    matRef.current.uniforms.uColorWarm!.value.lerp(colors.primary, 0.03);
    matRef.current.uniforms.uColorCool!.value.lerp(colors.accent, 0.03);
    matRef.current.uniforms.uColorRim!.value
      .copy(colors.primary)
      .multiplyScalar(1.5);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, segments, segments]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={shaders.vertex}
        fragmentShader={shaders.fragment}
        uniforms={uniforms}
        transparent
        depthWrite
      />
    </mesh>
  );
}

/* ════════════════════════════════════════════════════
   COMPONENT: Volumetric Atmosphere Shells
   Two concentric shells at different scales/rotations
   ════════════════════════════════════════════════════ */

function VFXAtmosphere({
  breathRef,
  octaves,
  shell1Segments,
  shell2Segments,
}: {
  breathRef: React.RefObject<{ scale: number; emissive: number }>;
  octaves: number;
  shell1Segments: number;
  shell2Segments: number;
}) {
  const { colors } = useThemeMode();
  const shell1Ref = useRef<THREE.Mesh>(null);
  const shell2Ref = useRef<THREE.Mesh>(null);
  const mat1Ref = useRef<THREE.ShaderMaterial>(null);
  const mat2Ref = useRef<THREE.ShaderMaterial>(null);

  const atmosFragment = useMemo(
    () => makeAtmosFragmentShader(octaves),
    [octaves],
  );

  const uniforms1 = useMemo(
    () => ({
      uTime: { value: 0 },
      uBreath: { value: 0 },
      uOpacity: { value: 0.8 },
      uColorInner: { value: colors.primary.clone() },
      uColorOuter: { value: colors.accent.clone() },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const uniforms2 = useMemo(
    () => ({
      uTime: { value: 0 },
      uBreath: { value: 0 },
      uOpacity: { value: 0.5 },
      uColorInner: { value: colors.primary.clone() },
      uColorOuter: { value: new THREE.Color("#FFF5E6") },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const b = breathRef.current;
    if (!b) return;

    const baseScale = 0.7 + b.scale * 0.35;

    // Shell 1 — primary atmosphere
    if (shell1Ref.current && mat1Ref.current) {
      const s1 = baseScale * 1.25 + Math.sin(t * 0.5) * 0.02;
      shell1Ref.current.scale.setScalar(s1);
      shell1Ref.current.rotation.y = -t * 0.015;
      shell1Ref.current.rotation.x = t * 0.01;
      mat1Ref.current.uniforms.uTime!.value = t;
      mat1Ref.current.uniforms.uBreath!.value = b.scale;
      mat1Ref.current.uniforms.uOpacity!.value = 0.6 + b.emissive * 0.4;
      mat1Ref.current.uniforms.uColorInner!.value.lerp(colors.primary, 0.03);
      mat1Ref.current.uniforms.uColorOuter!.value.lerp(colors.accent, 0.03);
    }

    // Shell 2 — outer haze
    if (shell2Ref.current && mat2Ref.current) {
      const s2 = baseScale * 1.55 + Math.sin(t * 0.3 + 1.5) * 0.03;
      shell2Ref.current.scale.setScalar(s2);
      shell2Ref.current.rotation.y = t * 0.008;
      shell2Ref.current.rotation.z = t * 0.005;
      mat2Ref.current.uniforms.uTime!.value = t;
      mat2Ref.current.uniforms.uBreath!.value = b.scale;
      mat2Ref.current.uniforms.uOpacity!.value = 0.3 + b.emissive * 0.3;
      mat2Ref.current.uniforms.uColorInner!.value.lerp(colors.primary, 0.03);
    }
  });

  return (
    <>
      <mesh ref={shell1Ref}>
        <sphereGeometry args={[1, shell1Segments, shell1Segments]} />
        <shaderMaterial
          ref={mat1Ref}
          vertexShader={atmosVertexShader}
          fragmentShader={atmosFragment}
          uniforms={uniforms1}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh ref={shell2Ref}>
        <sphereGeometry args={[1, shell2Segments, shell2Segments]} />
        <shaderMaterial
          ref={mat2Ref}
          vertexShader={atmosVertexShader}
          fragmentShader={atmosFragment}
          uniforms={uniforms2}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  );
}

/* ════════════════════════════════════════════════════
   COMPONENT: Inner Glow Core (bloom driver)
   Tiny bright sphere at center — this is what makes
   the bloom look volumetric and "hot"
   ════════════════════════════════════════════════════ */

function VFXInnerGlow({ breathRef }: { breathRef: React.RefObject<{ scale: number; emissive: number }> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (!meshRef.current || !matRef.current || !breathRef.current) return;
    const t = state.clock.elapsedTime;
    const b = breathRef.current;

    // Pulsing hot center
    const s = (0.7 + b.scale * 0.35) * (0.25 + b.emissive * 0.15);
    const pulse = 1 + Math.sin(t * 2.5) * 0.08;
    meshRef.current.scale.setScalar(s * pulse);

    // Opacity driven by breath
    matRef.current.opacity = 0.6 + b.emissive * 0.4;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        ref={matRef}
        color="#FFF8EE"
        transparent
        opacity={0.7}
        toneMapped={false}
      />
    </mesh>
  );
}

/* ════════════════════════════════════════════════════
   COMPONENT: Energy Rings (shader-driven)
   Multiple torus rings with noise-animated glow
   ════════════════════════════════════════════════════ */

function VFXEnergyRing({
  breathRef,
  rotationOffset,
  scale,
  speed,
  color,
  opacity,
  segments,
}: {
  breathRef: React.RefObject<{ scale: number; emissive: number }>;
  rotationOffset: [number, number, number];
  scale: number;
  speed: number;
  color: THREE.Color;
  opacity: number;
  segments: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: opacity },
      uColor: { value: color.clone() },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state) => {
    if (!meshRef.current || !matRef.current || !breathRef.current) return;
    const t = state.clock.elapsedTime;
    const b = breathRef.current;

    // Rings expand inversely to breath
    const ringScale = scale + (1 - b.scale) * 0.4;
    meshRef.current.scale.setScalar(ringScale);
    meshRef.current.rotation.z += speed * 0.016;
    meshRef.current.rotation.x =
      rotationOffset[0] + Math.sin(t * 0.15 + rotationOffset[1]) * 0.08;

    matRef.current.uniforms.uTime!.value = t;
    matRef.current.uniforms.uOpacity!.value = opacity * (0.5 + b.emissive * 0.5);
    matRef.current.uniforms.uColor!.value.lerp(color, 0.05);
  });

  return (
    <mesh ref={meshRef} rotation={rotationOffset}>
      <torusGeometry args={[1, 0.003, 8, segments]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={ringVertexShader}
        fragmentShader={ringFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function VFXEnergyRings({
  breathRef,
  segments,
}: {
  breathRef: React.RefObject<{ scale: number; emissive: number }>;
  segments: number;
}) {
  const { colors } = useThemeMode();

  return (
    <>
      {/* Equatorial ring — gold, fast */}
      <VFXEnergyRing
        breathRef={breathRef}
        rotationOffset={[Math.PI / 2, 0, 0]}
        scale={1.5}
        speed={0.08}
        color={colors.primary}
        opacity={0.3}
        segments={segments}
      />
      {/* Tilted ring — accent, slower */}
      <VFXEnergyRing
        breathRef={breathRef}
        rotationOffset={[Math.PI / 3, Math.PI / 4, 0]}
        scale={1.7}
        speed={-0.05}
        color={colors.accent}
        opacity={0.2}
        segments={segments}
      />
      {/* Opposite tilt — surface color, very subtle */}
      <VFXEnergyRing
        breathRef={breathRef}
        rotationOffset={[Math.PI / 5, Math.PI / 2, Math.PI / 6]}
        scale={1.9}
        speed={0.03}
        color={colors.surface}
        opacity={0.12}
        segments={segments}
      />
    </>
  );
}

/* ════════════════════════════════════════════════════
   COMPONENT: Dense Particle System
   Two layers: close fast particles + far ambient dust
   ════════════════════════════════════════════════════ */

function VFXParticles({
  breathRef,
  innerCount,
  outerCount,
}: {
  breathRef: React.RefObject<{ scale: number; emissive: number }>;
  innerCount: number;
  outerCount: number;
}) {
  const { colors } = useThemeMode();
  const innerRef = useRef<THREE.InstancedMesh>(null);
  const outerRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D()).current;

  // Pre-compute particle orbits
  const innerOffsets = useMemo(
    () =>
      Array.from({ length: innerCount }, (_, i) => ({
        angle: (i / innerCount) * Math.PI * 2 + Math.random() * 0.3,
        speed: 0.06 + Math.random() * 0.14,
        yOffset: (Math.random() - 0.5) * 1.6,
        ySpeed: 0.15 + Math.random() * 0.35,
        size: 0.008 + Math.random() * 0.012,
        radiusOffset: Math.random() * 0.4,
        phaseOffset: Math.random() * Math.PI * 2,
        tilt: (Math.random() - 0.5) * 0.8,
      })),
    [innerCount],
  );

  const outerOffsets = useMemo(
    () =>
      Array.from({ length: outerCount }, (_, i) => ({
        angle: (i / outerCount) * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.04,
        yOffset: (Math.random() - 0.5) * 3.0,
        ySpeed: 0.05 + Math.random() * 0.15,
        size: 0.004 + Math.random() * 0.008,
        radiusOffset: Math.random() * 0.8,
        phaseOffset: Math.random() * Math.PI * 2,
      })),
    [outerCount],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const b = breathRef.current;
    if (!b) return;

    // Inner particles — close, bright, fast
    if (innerRef.current) {
      const baseRadius = 1.2 + (1 - b.scale) * 0.6;
      for (let i = 0; i < innerCount; i++) {
        const o = innerOffsets[i]!;
        const angle = o.angle + t * o.speed;
        const radius = baseRadius + o.radiusOffset;
        const y =
          Math.sin(t * o.ySpeed + o.phaseOffset) * 0.4 * o.yOffset +
          o.tilt * Math.cos(angle);

        dummy.position.set(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius,
        );

        // Particles pulse and vary with breath
        const pulse =
          o.size * (1 + Math.sin(t * 2.0 + o.phaseOffset) * 0.3) *
          (0.8 + b.emissive * 0.4);
        dummy.scale.setScalar(pulse);
        dummy.updateMatrix();
        innerRef.current.setMatrixAt(i, dummy.matrix);
      }
      innerRef.current.instanceMatrix.needsUpdate = true;
    }

    // Outer particles — far, dim, slow drift
    if (outerRef.current) {
      const baseRadius = 2.2 + (1 - b.scale) * 0.5;
      for (let i = 0; i < outerCount; i++) {
        const o = outerOffsets[i]!;
        const angle = o.angle + t * o.speed;
        const radius = baseRadius + o.radiusOffset;
        const y = Math.sin(t * o.ySpeed + o.phaseOffset) * 0.6 * o.yOffset;

        dummy.position.set(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius,
        );

        const pulse = o.size * (1 + Math.sin(t * 0.8 + o.phaseOffset) * 0.2);
        dummy.scale.setScalar(pulse);
        dummy.updateMatrix();
        outerRef.current.setMatrixAt(i, dummy.matrix);
      }
      outerRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      {/* Inner bright particles */}
      <instancedMesh ref={innerRef} args={[undefined, undefined, innerCount]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial
          color={colors.surface}
          transparent
          opacity={0.6}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Outer dust field */}
      <instancedMesh ref={outerRef} args={[undefined, undefined, outerCount]}>
        <sphereGeometry args={[1, 4, 4]} />
        <meshBasicMaterial
          color={colors.primary}
          transparent
          opacity={0.2}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  );
}

/* ════════════════════════════════════════════════════
   COMPONENT: Cinematic Lighting Rig
   ════════════════════════════════════════════════════ */

function VFXLighting() {
  const { colors } = useThemeMode();

  return (
    <>
      {/* Key light — warm gold, high position */}
      <pointLight position={[3, 3, 4]} intensity={0.8} color={colors.primary} distance={15} />
      {/* Fill light — cool accent, opposite side */}
      <pointLight position={[-3, -1, 3]} intensity={0.3} color={colors.accent} distance={12} />
      {/* Rim light — behind and below for silhouette edge */}
      <pointLight position={[0, -3, -3]} intensity={0.4} color={colors.primary} distance={10} />
      {/* Top kicker — subtle white for specular highlights */}
      <pointLight position={[0, 5, 0]} intensity={0.15} distance={8} />
      {/* Ambient — very low, prevents pure black shadows */}
      <ambientLight intensity={colors.ambientIntensity * 0.5} color={colors.ambient} />
    </>
  );
}

/* ════════════════════════════════════════════════════
   COMPONENT: Tier-aware Post-Processing Stack
   ════════════════════════════════════════════════════ */

function VFXPostProcessing({ q }: { q: QualityConfig }) {
  if (q.enableChromatic) {
    return (
      <EffectComposer multisampling={q.msaa}>
        <Bloom
          intensity={q.bloomIntensity}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.7}
          mipmapBlur
          radius={q.bloomRadius}
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0006, 0.0006)}
          radialModulation
          modulationOffset={0.2}
        />
        <Vignette
          offset={0.3}
          darkness={0.7}
          blendFunction={BlendFunction.NORMAL}
        />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={q.msaa}>
      <Bloom
        intensity={q.bloomIntensity}
        luminanceThreshold={0.15}
        luminanceSmoothing={0.7}
        mipmapBlur
        radius={q.bloomRadius}
      />
      <Vignette
        offset={0.3}
        darkness={0.7}
        blendFunction={BlendFunction.NORMAL}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

/* ════════════════════════════════════════════════════
   COMPONENT: Camera Breathing
   Subtle camera drift synced to breath
   ════════════════════════════════════════════════════ */

function CameraBreathing({ breathRef }: { breathRef: React.RefObject<{ scale: number; emissive: number }> }) {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const b = breathRef.current;
    if (!b) return;

    // Very subtle camera drift — VFX studios never keep the camera perfectly still
    const driftX = Math.sin(t * 0.12) * 0.08;
    const driftY = Math.cos(t * 0.09) * 0.05;

    // Camera pushes in slightly during hold, pulls back during exhale
    const zBreath = 5 - b.scale * 0.15;

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, driftX, 0.02);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, driftY, 0.02);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, zBreath, 0.02);
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}

/* ════════════════════════════════════════════════════
   MAIN EXPORT: BreathingSceneContent
   ════════════════════════════════════════════════════ */

interface BreathingOrbProps {
  isActive: boolean;
  tier?: DeviceTier;
}

export function BreathingSceneContent({ isActive, tier = "high" }: BreathingOrbProps) {
  const q = QUALITY[tier];

  // Shared breath state — mutable ref updated every frame, consumed by all children
  const breathRef = useRef({ scale: 0, emissive: 0.2 });

  // Smooth interpolation targets
  const smoothScale = useRef(0.0);
  const smoothEmissive = useRef(0.2);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (isActive) {
      const breath = getBreathProgress(t);
      const targetScale = breath.scale;
      smoothScale.current += (targetScale - smoothScale.current) * 0.06;

      const targetEmissive =
        breath.phase === "hold"
          ? 0.8
          : breath.phase === "inhale"
            ? 0.2 + breath.phaseProgress * 0.6
            : 0.8 - breath.phaseProgress * 0.6;
      smoothEmissive.current += (targetEmissive - smoothEmissive.current) * 0.05;
    } else {
      // Idle — cinematic slow pulse
      const idle = 0.3 + Math.sin(t * 0.5) * 0.08 + Math.sin(t * 0.23) * 0.04;
      smoothScale.current += (idle - smoothScale.current) * 0.03;
      smoothEmissive.current += (0.35 - smoothEmissive.current) * 0.03;
    }

    breathRef.current.scale = smoothScale.current;
    breathRef.current.emissive = smoothEmissive.current;
  });

  return (
    <>
      <VFXLighting />
      <CameraBreathing breathRef={breathRef} />

      {/* Render order matters: inner -> outer for correct transparency */}
      <VFXInnerGlow breathRef={breathRef} />
      <VFXCore breathRef={breathRef} octaves={q.fbmOctaves} segments={q.coreSegments} />
      <VFXAtmosphere
        breathRef={breathRef}
        octaves={q.fbmOctaves}
        shell1Segments={q.shell1Segments}
        shell2Segments={q.shell2Segments}
      />
      <VFXEnergyRings breathRef={breathRef} segments={q.ringSegments} />
      <VFXParticles
        breathRef={breathRef}
        innerCount={q.innerParticles}
        outerCount={q.outerParticles}
      />

      <VFXPostProcessing q={q} />
    </>
  );
}
