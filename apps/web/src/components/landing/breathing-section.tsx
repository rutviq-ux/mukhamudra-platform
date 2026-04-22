"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useThree } from "@react-three/fiber";
import { Button } from "@ru/ui";
import { Wind } from "lucide-react";
import { SceneProvider } from "@/components/three/scene-provider";
import { useWebGL } from "@/components/three/use-webgl";

const BreathingSceneContent = dynamic(
  () =>
    import("@/components/three/breathing-scene").then(
      (m) => m.BreathingSceneContent,
    ),
  { ssr: false },
);

const PHASES = { inhale: 4, hold: 4, exhale: 6 };
const TOTAL = PHASES.inhale + PHASES.hold + PHASES.exhale;

type BreathPhase = "idle" | "inhale" | "hold" | "exhale";

const PHASE_LABELS: Record<BreathPhase, string> = {
  idle: "Press start to begin",
  inhale: "Breathe in\u2026",
  hold: "Hold\u2026",
  exhale: "Breathe out\u2026",
};

function useBreathPhase(isActive: boolean): {
  phase: BreathPhase;
  progress: number;
  elapsed: number;
} {
  const [state, setState] = useState<{
    phase: BreathPhase;
    progress: number;
    elapsed: number;
  }>({
    phase: "idle",
    progress: 0,
    elapsed: 0,
  });
  const raf = useRef<number>(0);
  const startTime = useRef(0);

  const tick = useCallback(() => {
    const elapsed = (performance.now() - startTime.current) / 1000;
    const t = elapsed % TOTAL;

    let phase: BreathPhase;
    let progress: number;

    if (t < PHASES.inhale) {
      phase = "inhale";
      progress = t / PHASES.inhale;
    } else if (t < PHASES.inhale + PHASES.hold) {
      phase = "hold";
      progress = (t - PHASES.inhale) / PHASES.hold;
    } else {
      phase = "exhale";
      progress = (t - PHASES.inhale - PHASES.hold) / PHASES.exhale;
    }

    setState({ phase, progress, elapsed });
    raf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (isActive) {
      startTime.current = performance.now();
      raf.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf.current);
      setState({ phase: "idle", progress: 0, elapsed: 0 });
    }
    return () => cancelAnimationFrame(raf.current);
  }, [isActive, tick]);

  return state;
}

function BreathingGuideText({ phase }: { phase: BreathPhase }) {
  return (
    <div className="h-8 flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={phase}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="text-lg font-light text-muted-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {PHASE_LABELS[phase]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/** Throttles R3F renders to a target fps in "demand" frameloop mode */
function FrameLimiter({ fps }: { fps: number }) {
  const { invalidate } = useThree();
  useEffect(() => {
    const id = setInterval(() => invalidate(), 1000 / fps);
    return () => clearInterval(id);
  }, [fps, invalidate]);
  return null;
}

export function BreathingSection() {
  const [isActive, setIsActive] = useState(false);
  const { supported, tier } = useWebGL();
  const { phase } = useBreathPhase(isActive);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // Pause WebGL render loop when section is out of viewport
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(!!entry?.isIntersecting),
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Non-high tiers use demand mode to free main thread for scroll processing
  const frameloop = !inView ? "never" : tier === "high" ? "always" : "demand";
  const targetFps = tier === "low" ? 24 : 30;

  return (
    <section className="aura-bg relative py-24 sm:py-32 px-6 section-warm overflow-hidden">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/3.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-6"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-6">
            Try it right now
          </div>
          <h2
            className="heading-gold text-3xl sm:text-4xl md:text-5xl font-light"
          >
            Feel the difference in 14 seconds.
          </h2>
          <p className="text-muted-foreground mt-4 max-w-lg mx-auto">
            One breath cycle. {PHASES.inhale}s in, {PHASES.hold}s hold,{" "}
            {PHASES.exhale}s out. This is what our sessions feel like.
          </p>
        </motion.div>

        {/* 3D Breathing Visualization — cinematic viewport */}
        <motion.div
          ref={sectionRef}
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto rounded-2xl overflow-hidden"
          style={{ height: "min(500px, 60vh)", maxWidth: "600px" }}
        >
          {supported ? (
            <SceneProvider
              className="!absolute inset-0"
              style={{ background: "transparent" }}
              frameloop={frameloop}
              fallback={<CssBreathingFallback isActive={isActive} phase={phase} />}
            >
              <BreathingSceneContent isActive={isActive} tier={tier} />
              {frameloop === "demand" && <FrameLimiter fps={targetFps} />}
            </SceneProvider>
          ) : (
            <CssBreathingFallback isActive={isActive} phase={phase} />
          )}
        </motion.div>

        <div className="text-center mt-4 space-y-5">
          <BreathingGuideText phase={phase} />
          <Button
            onClick={() => setIsActive(!isActive)}
            variant="gold"
            className="px-8 py-5 text-base"
          >
            <Wind className="w-4 h-4 mr-2" />
            {isActive ? "Pause" : "Start breathing"}
          </Button>
        </div>
      </div>
    </section>
  );
}

/** CSS fallback — phase-aware concentric rings */
function CssBreathingFallback({
  isActive,
  phase,
}: {
  isActive: boolean;
  phase: BreathPhase;
}) {
  const scaleMap: Record<BreathPhase, string> = {
    idle: "scale-100",
    inhale: "scale-125",
    hold: "scale-125",
    exhale: "scale-100",
  };

  const glowMap: Record<BreathPhase, string> = {
    idle: "shadow-[0_0_40px_color-mix(in_srgb,var(--color-primary)_15%,transparent)]",
    inhale: "shadow-[0_0_60px_color-mix(in_srgb,var(--color-primary)_30%,transparent)]",
    hold: "shadow-[0_0_80px_color-mix(in_srgb,var(--color-primary)_40%,transparent)]",
    exhale: "shadow-[0_0_40px_color-mix(in_srgb,var(--color-accent)_25%,transparent)]",
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Outer pulse ring */}
      <div
        className={`absolute w-52 h-52 rounded-full border border-primary/10 transition-transform ease-in-out ${
          isActive ? "duration-[4000ms]" : "duration-1000"
        } ${isActive ? (phase === "exhale" ? "scale-110" : "scale-90") : ""}`}
      />
      {/* Mid ring */}
      <div
        className={`absolute w-40 h-40 rounded-full border border-primary/15 transition-transform ease-in-out ${
          isActive ? "duration-[3500ms]" : "duration-1000"
        } ${isActive ? (phase === "inhale" ? "scale-110" : "scale-95") : ""}`}
      />
      {/* Core orb */}
      <div
        className={`w-28 h-28 rounded-full bg-primary/25 border border-primary/30 transition-all ease-in-out ${
          isActive ? "duration-[4000ms]" : "duration-1000"
        } ${scaleMap[phase]} ${glowMap[phase]}`}
      />
    </div>
  );
}
