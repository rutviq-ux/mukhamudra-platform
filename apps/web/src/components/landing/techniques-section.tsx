"use client";

import { motion } from "framer-motion";

const TECHNIQUES = [
  {
    name: "Face Yoga",
    vibeCheck:
      "Targeted isometric and isotonic exercises for all 53 facial muscles. Builds muscle memory, activates dormant fibres, and creates a natural scaffolding effect.",
    glowUp:
      "Snatched jawline, lifted cheeks, smoother forehead, all without needles. Your face gets toned the same way your body does at the gym.",
  },
  {
    name: "Gua Sha",
    vibeCheck:
      "A flat stone tool that scrapes along facial meridians in specific strokes, breaking up fascia adhesions and flushing stagnant lymph towards drainage nodes.",
    glowUp:
      "De-puffed face, sculpted cheekbones, reduced dark circles. Moves the lymphatic waste that's been sitting on your face making you look tired.",
  },
  {
    name: "Roller Therapy",
    vibeCheck:
      "Jade or rose quartz roller that creates micro-vibrations through the skin layers, stimulating blood flow and pushing active ingredients deeper into the dermis.",
    glowUp:
      "Better product absorption, reduced inflammation, tension release. Your serums actually do something instead of just sitting on top of your skin.",
  },
  {
    name: "Trataka",
    vibeCheck:
      "Candle-light gazing (Dharana practice). Fixed-point focus that strengthens the orbicularis oculi muscles and trains your facial composure under stillness.",
    glowUp:
      "Sharper eyes, reduced eye strain, zero forehead cracking. Trains your face to stay composed in any situation: the ultimate poker face glow.",
  },
  {
    name: "Osteopathy",
    vibeCheck:
      "Gentle cranial and jaw manipulation techniques that release tension held in the TMJ, temporal bones, and sphenoid: the structural foundation of your face.",
    glowUp:
      "TMJ relief, reduced jaw clenching, symmetry restoration. If your jaw is tight, your whole face is tight. This unlocks it.",
  },
  {
    name: "Cupping",
    vibeCheck:
      "Small silicone cups that create negative pressure, pulling blood flow to the surface and stimulating fibroblast activity in the deep fascia layer.",
    glowUp:
      "Wrinkle reduction, plumper skin, accelerated collagen production. The vacuum effect literally tells your skin to make more collagen.",
  },
  {
    name: "Acupressure",
    vibeCheck:
      "Finger-pressure on specific marma/meridian points across the face, activating the body's energy highways and releasing blocked prana.",
    glowUp:
      "Headache and sinus relief, reduced tension lines, energy flow restoration. Hits the reset button on your face's stress patterns.",
  },
];

export function TechniquesSection() {
  return (
    <section className="aura-bg relative py-32 px-6 section-warm">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/5.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

      <div className="max-w-6xl mx-auto space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
            Face Yoga
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-light"
            style={{ fontFamily: "var(--font-display)" }}
          >
            7 Techniques. One Practice.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-4">
            Each Face Yoga session weaves together multiple modalities.
            You don&apos;t just exercise your face. You treat it.
          </p>
        </motion.div>

        <div className="space-y-4">
          {TECHNIQUES.map((tech, i) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="void-card p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground/40 font-mono">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3
                  className="text-lg font-light"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {tech.name}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <div className="space-y-1.5">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/60">
                    How it works: The Vibe Check
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tech.vibeCheck}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">
                    What it does: The Glow Up
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tech.glowUp}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
