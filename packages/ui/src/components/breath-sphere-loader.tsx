/**
 * Cosmic Breath Sphere — Pure CSS/SVG animated loader
 * Matches the "Dark Gallery" aesthetic with gold + indigo accents.
 * Zero JS, zero dependencies. Renders on first paint.
 *
 * Scale life comes from layered breathing:
 *  - Container:  slow 6s whole-sphere micro-breathe
 *  - Core:       4s inhale/exhale with hold-at-peak
 *  - Orbits:     individual scale pulses at staggered delays
 *  - Particles:  drift in/out synced to breath
 */

const sizes = {
  sm: 32,
  md: 48,
  lg: 80,
  xl: 120,
} as const;

type BreathSphereSize = keyof typeof sizes;

interface BreathSphereLoaderProps {
  size?: BreathSphereSize;
  className?: string;
}

export function BreathSphereLoader({
  size = "md",
  className = "",
}: BreathSphereLoaderProps) {
  const px = sizes[size];
  const r = px / 2;
  const coreR = r * 0.35;
  const showParticles = size === "lg" || size === "xl";
  const showThirdOrbit = size === "xl";

  return (
    <div
      className={className}
      role="status"
      aria-label="Loading"
      style={{
        width: px,
        height: px,
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "sphere-container-breathe 6s ease-in-out infinite",
      }}
    >
      {/* Core glow sphere */}
      <div
        style={{
          position: "absolute",
          width: coreR * 2,
          height: coreR * 2,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(255,248,230,0.9) 0%, rgba(196,136,58,0.4) 50%, transparent 70%)`,
          animation:
            "breath-sphere-pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite, breath-sphere-glow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          zIndex: 2,
        }}
      />

      {/* Orbit rings container */}
      <div
        style={{
          position: "absolute",
          width: px,
          height: px,
          transformStyle: "preserve-3d",
          perspective: px * 3,
        }}
      >
        {/* Orbit ring 1 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "orbit-spin-1 8s linear infinite",
          }}
        >
          <div
            style={{
              width: px * 0.85,
              height: px * 0.85,
              borderRadius: "50%",
              border: `${Math.max(1, px * 0.015)}px solid rgba(46, 93, 168, 0.4)`,
              animation: "orbit-breathe 5s ease-in-out infinite",
            }}
          />
        </div>

        {/* Orbit ring 2 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "orbit-spin-2 12s linear infinite",
          }}
        >
          <div
            style={{
              width: px * 0.7,
              height: px * 0.7,
              borderRadius: "50%",
              border: `${Math.max(1, px * 0.012)}px solid rgba(46, 93, 168, 0.25)`,
              animation: "orbit-breathe 7s ease-in-out 1.5s infinite",
            }}
          />
        </div>

        {/* Orbit ring 3 — only on xl */}
        {showThirdOrbit && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "orbit-spin-3 16s linear infinite",
            }}
          >
            <div
              style={{
                width: px * 0.95,
                height: px * 0.95,
                borderRadius: "50%",
                border: `1px solid rgba(46, 93, 168, 0.15)`,
                animation: "orbit-breathe 9s ease-in-out 3s infinite",
              }}
            />
          </div>
        )}
      </div>

      {/* Floating particles — only for lg and xl */}
      {showParticles && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
          }}
        >
          {[
            { x: "20%", y: "15%", delay: "0s", type: "out" },
            { x: "75%", y: "20%", delay: "1s", type: "out" },
            { x: "85%", y: "60%", delay: "2s", type: "in" },
            { x: "15%", y: "70%", delay: "3s", type: "in" },
            { x: "50%", y: "10%", delay: "0.5s", type: "out" },
            { x: "60%", y: "80%", delay: "2.5s", type: "in" },
          ].map((p, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: p.x,
                top: p.y,
                width: Math.max(2, px * 0.03),
                height: Math.max(2, px * 0.03),
                borderRadius: "50%",
                backgroundColor: "rgba(196, 136, 58, 0.6)",
                animation: `${p.type === "out" ? "particle-drift" : "particle-drift-in"} 6s ease-in-out ${p.delay} infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* Screen reader text */}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
